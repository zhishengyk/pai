import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from '../server.js';

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
});

test('Qube: conversation -> run -> approval -> artifact', async () => {
  const conversation = await post('/api/chat/conversations', { title: 'smoke' });
  assert.match(conversation.conversation_id, /^conv_/);

  const run = await post('/api/chat/runs', {
    conversation_id: conversation.conversation_id,
    input: '帮我生成一个双均线策略并回测 2024 年',
    model: 'mock-quant',
    approval_mode: 'manual',
  });
  assert.match(run.run_id, /^run_/);

  const firstStream = await fetch(
    `${base}/api/chat/runs/${run.run_id}/events?after_sequence=0`,
  );
  assert.equal(firstStream.status, 200);
  assert.match(firstStream.headers.get('content-type'), /text\/event-stream/);
  const firstEvents = await collectSse(firstStream, 'approval.requested');
  const approvalEvent = firstEvents.find((event) => event.type === 'approval.requested');
  assert.ok(approvalEvent, 'approval.requested should be emitted');
  const approvalId = approvalEvent.data.approval_id;

  const resolved = await post(
    `/api/chat/runs/${run.run_id}/strategy-run-approvals/${approvalId}/resolve`,
    { decision: 'approve' },
  );
  assert.equal(resolved.status, 'approved');

  const lastSequence = firstEvents.at(-1).sequence;
  const secondStream = await fetch(
    `${base}/api/chat/runs/${run.run_id}/events?after_sequence=${lastSequence}`,
  );
  const secondEvents = await collectSse(secondStream, 'run.completed');
  assert.equal(secondEvents.at(-1).type, 'run.completed');

  const artifacts = await get(
    `/api/chat/conversations/${conversation.conversation_id}/artifacts`,
  );
  assert.ok(artifacts.artifacts.length >= 2, 'strategy + backtest report');
  assert.ok(artifacts.artifacts.some((artifact) => artifact.type === 'strategy'));
  assert.ok(artifacts.artifacts.some((artifact) => artifact.type === 'backtest_report'));

  const messages = await get(
    `/api/chat/conversations/${conversation.conversation_id}/messages`,
  );
  assert.ok(messages.messages.length >= 2);
  assert.ok(messages.messages.some((message) => message.role === 'user'));
  assert.ok(messages.messages.some((message) => message.role === 'assistant'));
});

test('Qube: tools catalog is exposed', async () => {
  const catalog = await get('/api/tools');
  assert.equal(catalog.tool_count, 101);
  assert.equal(catalog.capability_count, 47);
  assert.equal(catalog.tools_list.length, 101);
  assert.equal(catalog.capabilities_list.length, 47);
});

test('QuantFlow: stream stages -> workflow -> run -> logs -> output', async () => {
  const response = await fetch(`${base}/api/workflow-graph/stream`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: '生成一个双均线策略工作流，包含回测和报告' }),
  });
  assert.equal(response.status, 200);
  const events = await collectSse(response, 'end');
  const types = events.map((event) => event.type);
  assert.ok(types.includes('workflow_init'));
  assert.ok(types.includes('workflow_layout'));
  assert.ok(types.includes('workflow_generating'));
  assert.ok(types.includes('code_merged'));
  assert.ok(types.includes('workflow_structure_complete'));
  assert.ok(types.includes('result'));
  assert.ok(types.includes('workflow_complete_success'));
  assert.equal(types.at(-1), 'end');

  const complete = events.find((event) => event.type === 'workflow_complete_success');
  const workflowId = complete.data.workflow_id;
  assert.match(workflowId, /^wf_/);

  const graph = await get(`/api/workflow-graph/${workflowId}`);
  assert.ok(graph.workflow.nodes.length >= 5);
  assert.ok(graph.workflow.edges.length >= 4);
  assert.ok(graph.workflow.nodes.every((node) => node.code));
  assert.equal(graph.workflow.content_hash.length, 16);

  const run = await post(`/api/workflow-graph/${workflowId}/run`, {});
  assert.match(run.workflow_run_id, /^wfr_/);

  let status = 'running';
  let logs = [];
  for (let attempt = 0; attempt < 40 && status === 'running'; attempt += 1) {
    await sleep(250);
    const data = await get(
      `/api/workflow-runs/${run.workflow_run_id}/logs?last_sequence=0`,
    );
    status = data.status;
    logs = data.logs;
  }
  assert.equal(status, 'completed');
  assert.ok(logs.length >= graph.workflow.nodes.length * 2);

  const output = await get(`/api/workflow-runs/${run.workflow_run_id}/output`);
  assert.equal(output.status, 'completed');
  assert.match(output.output_obj_id, /^obj_/);
  assert.ok(output.output.metrics);
});

async function collectSse(response, untilType) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const events = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = block
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n');
        if (!data) continue;
        const event = JSON.parse(data);
        events.push(event);
        if (untilType && event.type === untilType) {
          await reader.cancel();
          return events;
        }
      }
    }
  } finally {
    reader.releaseLock?.();
  }
  return events;
}

async function post(path, body) {
  return fetchJson(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function get(path) {
  return fetchJson(`${base}${path}`);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(data.message ?? `${response.status} ${response.statusText}`);
  }
  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

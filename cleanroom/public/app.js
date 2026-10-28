const $ = (selector) => document.querySelector(selector);

const q = {
  conversationId: null,
  runId: null,
  es: null,
  messages: [],
  artifacts: [],
  activeAssistantId: null,
};

const qf = {
  workflowId: null,
  runId: null,
  graph: null,
  lastLog: 0,
  pollTimer: null,
};

const qStatus = $('#q-status');
const qMessages = $('#q-messages');
const qArtifacts = $('#q-artifacts');
const qTools = $('#q-tools');
const qInput = $('#q-input');
const qSend = $('#q-send');
const qApprovalMode = $('#q-approval-mode');

const qfStatus = $('#qf-status');
const qfStages = $('#qf-stages');
const qfGraph = $('#qf-graph');
const qfLogs = $('#qf-logs');
const qfOutput = $('#qf-output');
const qfRun = $('#qf-run');
const qfTerminate = $('#qf-terminate');

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('active'));
    tab.classList.add('active');
    $(`#panel-${tab.dataset.tab}`).classList.add('active');
  });
});

$('#q-new').addEventListener('click', () => {
  newConversation().catch((error) => setQStatus(`error: ${error.message}`));
});

$('#q-form').addEventListener('submit', (event) => {
  event.preventDefault();
  sendQubeMessage().catch((error) => setQStatus(`error: ${error.message}`));
});

qInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    $('#q-form').requestSubmit();
  }
});

$('#artifact-close').addEventListener('click', () => {
  $('#artifact-dialog').close();
});

$('#qf-form').addEventListener('submit', (event) => {
  event.preventDefault();
  generateWorkflow().catch((error) => setQfStatus(`error: ${error.message}`));
});

qfRun.addEventListener('click', () => {
  runWorkflow().catch((error) => setQfStatus(`error: ${error.message}`));
});

qfTerminate.addEventListener('click', () => {
  terminateWorkflow().catch((error) => setQfStatus(`error: ${error.message}`));
});

loadTools();
renderArtifacts();

async function loadTools() {
  try {
    const catalog = await fetchJson('/api/tools');
    qTools.textContent = `${catalog.tool_count} tools / ${catalog.capability_count} capabilities`;
    qTools.title = Object.keys(catalog.tools).slice(0, 20).join(', ');
  } catch (error) {
    qTools.textContent = `加载失败: ${error.message}`;
  }
}

async function newConversation() {
  closeQubeStream();
  q.conversationId = null;
  q.runId = null;
  q.messages = [];
  q.artifacts = [];
  q.activeAssistantId = null;
  renderMessages();
  renderArtifacts();
  setQStatus('creating conversation');
  const data = await fetchJson('/api/chat/conversations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Clean-room Qube session' }),
  });
  q.conversationId = data.conversation_id;
  setQStatus(`conversation ${q.conversationId.slice(0, 12)}…`);
  qInput.focus();
}

async function sendQubeMessage() {
  const text = qInput.value.trim();
  if (!text) return;
  if (!q.conversationId) await newConversation();
  qInput.value = '';
  qSend.disabled = true;
  setQStatus('creating run');

  const localUserId = `local-user-${Date.now()}`;
  q.messages.push({
    id: localUserId,
    role: 'user',
    parts: [{ id: `${localUserId}-part`, type: 'text', text }],
  });
  renderMessages();

  try {
    const data = await fetchJson('/api/chat/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        conversation_id: q.conversationId,
        input: text,
        model: 'mock-quant',
        approval_mode: qApprovalMode.value,
      }),
    });
    q.runId = data.run_id;
    setQStatus('streaming');
    openQubeStream(q.runId, localUserId);
  } finally {
    qSend.disabled = false;
  }
}

function openQubeStream(runId, localUserId) {
  closeQubeStream();
  const es = new EventSource(
    `/api/chat/runs/${encodeURIComponent(runId)}/events?after_sequence=0`,
  );
  q.es = es;
  es.onmessage = (event) => {
    let parsed;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      return;
    }
    if (parsed.type === 'run.created' && localUserId) {
      const local = q.messages.find((message) => message.id === localUserId);
      if (local && parsed.data?.user_message_id) local.id = parsed.data.user_message_id;
    }
    handleQubeEvent(parsed);
  };
  es.onerror = () => {
    if (q.es !== es) return;
    setQStatus('stream disconnected; EventSource will retry');
  };
}

function closeQubeStream() {
  if (q.es) {
    q.es.close();
    q.es = null;
  }
}

function handleQubeEvent(event) {
  const data = event.data ?? {};
  switch (event.type) {
    case 'run.created':
      setQStatus('running');
      break;
    case 'message.created':
      ensureMessage(data.message_id, data.role ?? 'assistant');
      if ((data.role ?? 'assistant') === 'assistant') q.activeAssistantId = data.message_id;
      renderMessages();
      break;
    case 'part.create':
      ensureMessage(data.message_id, 'assistant');
      ensurePart(data.message_id, data.part);
      renderMessages();
      break;
    case 'part.append': {
      ensureMessage(data.message_id, 'assistant');
      const part = ensurePart(data.message_id, {
        id: data.part_id,
        type: 'text',
        text: '',
      });
      part.text = (part.text ?? '') + (data.text ?? '');
      renderMessages();
      break;
    }
    case 'part.patch': {
      const part = findPart(data.message_id, data.part_id);
      if (part && data.patch) Object.assign(part, data.patch);
      renderMessages();
      break;
    }
    case 'approval.requested': {
      ensureMessage(q.activeAssistantId, 'assistant');
      const approvalId = data.approval_id;
      if (!findPart(q.activeAssistantId, `approval-${approvalId}`)) {
        const message = q.messages.find((item) => item.id === q.activeAssistantId);
        message?.parts.push({
          id: `approval-${approvalId}`,
          type: 'approval',
          approval_id: approvalId,
          approval_type: data.approval_type,
          payload: data.payload,
          status: 'pending',
        });
      }
      setQStatus('waiting for approval');
      renderMessages();
      break;
    }
    case 'approval.resolved': {
      const part = findPart(q.activeAssistantId, `approval-${data.approval_id}`);
      if (part) part.status = data.status ?? data.decision ?? 'resolved';
      setQStatus('running');
      renderMessages();
      break;
    }
    case 'artifact.created':
      if (data.artifact && !q.artifacts.some((item) => item.id === data.artifact.id)) {
        q.artifacts.push(data.artifact);
        renderArtifacts();
      }
      break;
    case 'run.awaiting_approval':
      setQStatus('waiting for approval');
      break;
    case 'run.completed':
      setQStatus('completed');
      closeQubeStream();
      loadConversationArtifacts().catch(() => {});
      break;
    case 'run.failed':
      setQStatus('failed');
      closeQubeStream();
      appendSystemMessage(`运行失败：${data.error?.message ?? 'unknown error'}`);
      break;
    case 'run.cancelled':
      setQStatus('cancelled');
      closeQubeStream();
      break;
    case 'run.started':
      setQStatus('running');
      break;
    default:
      break;
  }
}

function ensureMessage(messageId, role = 'assistant') {
  if (!messageId) return null;
  let message = q.messages.find((item) => item.id === messageId);
  if (!message) {
    message = { id: messageId, role, parts: [] };
    q.messages.push(message);
  }
  return message;
}

function ensurePart(messageId, part) {
  if (!part?.id) return null;
  const message = ensureMessage(messageId, 'assistant');
  let existing = message.parts.find((item) => item.id === part.id);
  if (!existing) {
    existing = { ...part };
    message.parts.push(existing);
  } else {
    Object.assign(existing, part);
  }
  return existing;
}

function findPart(messageId, partId) {
  const message = q.messages.find((item) => item.id === messageId);
  return message?.parts.find((item) => item.id === partId) ?? null;
}

function appendSystemMessage(text) {
  q.messages.push({
    id: `system-${Date.now()}`,
    role: 'assistant',
    parts: [{ id: `system-part-${Date.now()}`, type: 'text', text }],
  });
  renderMessages();
}

function renderMessages() {
  qMessages.replaceChildren();
  if (q.messages.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '点击“新会话”，输入例如：帮我生成一个双均线策略并回测';
    qMessages.append(empty);
    return;
  }

  for (const message of q.messages) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${message.role}`;

    const role = document.createElement('div');
    role.className = 'message-role';
    role.textContent = message.role;

    const parts = document.createElement('div');
    parts.className = 'message-parts';
    parts.style.display = 'flex';
    parts.style.flexDirection = 'column';
    parts.style.gap = '0.45rem';

    for (const part of message.parts) {
      parts.append(renderPart(part));
    }

    wrapper.append(role, parts);
    qMessages.append(wrapper);
  }
  qMessages.scrollTop = qMessages.scrollHeight;
}

function renderPart(part) {
  if (part.type === 'text') {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = part.text || '…';
    return bubble;
  }

  if (part.type === 'activity') {
    const activity = document.createElement('div');
    activity.className = `activity ${part.status === 'completed' ? 'completed' : ''}`;
    const dot = document.createElement('span');
    dot.className = 'dot';
    const label = document.createElement('span');
    label.textContent = `${part.label ?? part.name ?? 'activity'}`;
    const status = document.createElement('span');
    status.className = 'pill';
    status.textContent = part.status ?? 'running';
    activity.append(dot, label, status);
    return activity;
  }

  if (part.type === 'card') {
    const card = document.createElement('div');
    card.className = 'card-part';
    const title = document.createElement('h4');
    title.textContent = part.title ?? 'Card';
    const dl = document.createElement('dl');
    for (const field of part.fields ?? []) {
      const dt = document.createElement('dt');
      dt.textContent = field.label ?? '';
      const dd = document.createElement('dd');
      dd.textContent = String(field.value ?? '');
      dl.append(dt, dd);
    }
    card.append(title, dl);
    return card;
  }

  if (part.type === 'approval') {
    const box = document.createElement('div');
    box.className = 'approval';
    const title = document.createElement('h4');
    title.textContent = `需要审批：${part.approval_type ?? 'approval'}`;
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(part.payload ?? {}, null, 2);
    const actions = document.createElement('div');
    actions.className = 'approval-actions';

    if (part.status === 'pending') {
      const approve = document.createElement('button');
      approve.className = 'btn primary';
      approve.type = 'button';
      approve.textContent = '通过';
      approve.addEventListener('click', () => {
        approve.disabled = true;
        reject.disabled = true;
        resolveApproval(part.approval_id, 'approve').catch((error) =>
          setQStatus(`approval error: ${error.message}`),
        );
      });

      const reject = document.createElement('button');
      reject.className = 'btn danger';
      reject.type = 'button';
      reject.textContent = '拒绝';
      reject.addEventListener('click', () => {
        approve.disabled = true;
        reject.disabled = true;
        resolveApproval(part.approval_id, 'reject').catch((error) =>
          setQStatus(`approval error: ${error.message}`),
        );
      });

      actions.append(approve, reject);
    } else {
      const status = document.createElement('span');
      status.className = 'pill';
      status.textContent = part.status;
      actions.append(status);
    }

    box.append(title, pre, actions);
    return box;
  }

  const fallback = document.createElement('pre');
  fallback.className = 'bubble';
  fallback.textContent = JSON.stringify(part, null, 2);
  return fallback;
}

async function resolveApproval(approvalId, decision) {
  setQStatus(`${decision}…`);
  await fetchJson(`/api/chat/approvals/${encodeURIComponent(approvalId)}/resolve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decision }),
  });
}

async function loadConversationArtifacts() {
  if (!q.conversationId) return;
  const data = await fetchJson(
    `/api/chat/conversations/${encodeURIComponent(q.conversationId)}/artifacts`,
  );
  q.artifacts = data.artifacts ?? [];
  renderArtifacts();
}

function renderArtifacts() {
  qArtifacts.replaceChildren();
  if (q.artifacts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = '还没有产物';
    qArtifacts.append(empty);
    return;
  }
  for (const artifact of q.artifacts) {
    const button = document.createElement('button');
    button.className = 'artifact-item';
    button.type = 'button';
    button.textContent = artifact.title;
    const meta = document.createElement('small');
    meta.textContent = `${artifact.type} · v${artifact.version}`;
    button.append(meta);
    button.addEventListener('click', () => showArtifact(artifact.id).catch(() => {}));
    qArtifacts.append(button);
  }
}

async function showArtifact(artifactId) {
  const data = await fetchJson(`/api/chat/artifacts/${encodeURIComponent(artifactId)}`);
  $('#artifact-title').textContent = data.artifact.title;
  $('#artifact-content').textContent = data.artifact.content || '(empty)';
  $('#artifact-dialog').showModal();
}

async function generateWorkflow() {
  const prompt = $('#qf-input').value.trim();
  if (!prompt) return;
  qf.workflowId = null;
  qf.runId = null;
  qf.graph = null;
  qf.lastLog = 0;
  if (qf.pollTimer) clearTimeout(qf.pollTimer);
  qfRun.disabled = true;
  qfTerminate.disabled = true;
  qfStages.replaceChildren();
  qfGraph.replaceChildren();
  qfLogs.replaceChildren();
  qfOutput.textContent = '生成中...';
  setQfStatus('generating');

  const response = await fetch('/api/workflow-graph/stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: prompt, model: 'mock-quant' }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? response.statusText);
  }
  await readSse(response, handleQuantflowEvent);
  setQfStatus(qf.workflowId ? 'workflow ready' : 'stream ended');
}

async function readSse(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const dataLines = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart());
      if (dataLines.length === 0) continue;
      try {
        onEvent(JSON.parse(dataLines.join('\n')));
      } catch {
        // Ignore malformed demo events.
      }
    }
  }
}

function handleQuantflowEvent(event) {
  const data = event.data ?? {};
  addStage(event.type, data.workflow_progress);

  if (data.workflow_json) {
    qf.graph = data.workflow_json;
    renderGraph(qf.graph);
  }
  if (event.type === 'workflow_complete_success') {
    qf.workflowId = data.workflow_id ?? null;
    qfRun.disabled = !qf.workflowId;
    setQfStatus('workflow ready');
  }
  if (event.type === 'end') {
    setQfStatus(qf.workflowId ? 'workflow ready' : 'stream ended');
  }
}

function addStage(type, progress) {
  let row = qfStages.querySelector(`[data-stage="${type}"]`);
  if (!row) {
    row = document.createElement('div');
    row.className = 'stage';
    row.dataset.stage = type;
    const name = document.createElement('span');
    name.className = 'stage-name';
    name.textContent = type;
    const bar = document.createElement('div');
    bar.className = 'stage-bar';
    const fill = document.createElement('span');
    bar.append(fill);
    const value = document.createElement('span');
    value.className = 'stage-progress';
    value.textContent = '—';
    row.append(name, bar, value);
    qfStages.append(row);
  }
  const fill = row.querySelector('.stage-bar span');
  const value = row.querySelector('.stage-progress');
  if (typeof progress === 'number') {
    fill.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
    value.textContent = `${Math.round(progress * 100)}%`;
  } else {
    fill.style.width = '100%';
    value.textContent = 'done';
  }
}

function renderGraph(graph) {
  qfGraph.replaceChildren();
  if (!graph?.nodes?.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = '没有节点';
    qfGraph.append(empty);
    return;
  }
  for (const node of graph.nodes) {
    const details = document.createElement('details');
    details.className = 'node';
    const summary = document.createElement('summary');
    const type = document.createElement('span');
    type.className = 'pill';
    type.textContent = node.type ?? 'node';
    const name = document.createElement('strong');
    name.textContent = node.name ?? node.uuid;
    const uuid = document.createElement('code');
    uuid.textContent = node.uuid;
    summary.append(type, name, uuid);

    const description = document.createElement('p');
    description.textContent = node.description ?? '';
    const code = document.createElement('pre');
    code.textContent = node.code ?? '(no code)';
    details.append(summary, description, code);
    qfGraph.append(details);
  }
  const edgeBox = document.createElement('div');
  edgeBox.className = 'edges';
  edgeBox.textContent = `edges: ${graph.edges.map((edge) => `${edge.source} → ${edge.target}`).join('  ')}`;
  qfGraph.append(edgeBox);
}

async function runWorkflow() {
  if (!qf.workflowId) return;
  qfRun.disabled = true;
  qfTerminate.disabled = false;
  qfLogs.replaceChildren();
  qfOutput.textContent = '运行中...';
  qf.lastLog = 0;
  setQfStatus('running workflow');
  const data = await fetchJson(`/api/workflow-graph/${encodeURIComponent(qf.workflowId)}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  qf.runId = data.workflow_run_id ?? data.run_id;
  pollWorkflowLogs();
}

async function pollWorkflowLogs() {
  if (!qf.runId) return;
  try {
    const data = await fetchJson(
      `/api/workflow-runs/${encodeURIComponent(qf.runId)}/logs?last_sequence=${qf.lastLog}`,
    );
    appendLogs(data.logs ?? []);
    qf.lastLog = data.next_sequence ?? qf.lastLog;
    if (['completed', 'cancelled', 'failed'].includes(data.status)) {
      setQfStatus(data.status);
      qfRun.disabled = false;
      qfTerminate.disabled = true;
      await loadWorkflowOutput();
      return;
    }
    qf.pollTimer = setTimeout(pollWorkflowLogs, 500);
  } catch (error) {
    setQfStatus(`log error: ${error.message}`);
    qf.pollTimer = setTimeout(pollWorkflowLogs, 1000);
  }
}

function appendLogs(logs) {
  for (const log of logs) {
    const line = document.createElement('div');
    line.className = `log-line ${log.level ?? ''}`;
    const seq = document.createElement('span');
    seq.className = 'node-id';
    seq.textContent = `#${log.sequence}`;
    const text = document.createElement('span');
    text.textContent = ` [${log.level ?? 'info'}]${log.node_id ? ` [${log.node_id}]` : ''} ${log.message}`;
    line.append(seq, text);
    qfLogs.append(line);
  }
  qfLogs.scrollTop = qfLogs.scrollHeight;
}

async function loadWorkflowOutput() {
  if (!qf.runId) return;
  const data = await fetchJson(`/api/workflow-runs/${encodeURIComponent(qf.runId)}/output`);
  if (data.status !== 'completed') {
    qfOutput.textContent = JSON.stringify(data, null, 2);
    return;
  }
  qfOutput.textContent = JSON.stringify(
    { output_obj_id: data.output_obj_id, output: data.output },
    null,
    2,
  );
}

async function terminateWorkflow() {
  if (!qf.runId) return;
  setQfStatus('terminating');
  await fetchJson(`/api/workflow-runs/${encodeURIComponent(qf.runId)}/terminate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
}

function setQStatus(text) {
  qStatus.textContent = text;
}

function setQfStatus(text) {
  qfStatus.textContent = text;
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

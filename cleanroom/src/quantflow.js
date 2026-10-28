import { id, now, shortHash, sleep } from './ids.js';
import { HttpError, readJson, sendJson } from './router.js';
import { initSSE, writeSSE } from './sse.js';

const PREFIXES = ['', '/pandaApi/quantflow'];

const METRICS = {
  annual_return: 0.184,
  max_drawdown: -0.092,
  sharpe: 1.37,
  trades: 24,
  win_rate: 0.58,
};

export function registerQuantFlowRoutes(router, store) {
  const get = (path, handler) => PREFIXES.forEach((prefix) => router.get(prefix + path, handler));
  const post = (path, handler) => PREFIXES.forEach((prefix) => router.post(prefix + path, handler));

  post('/api/workflow-graph/stream', async ({ req, res }) => {
    const body = await readJson(req);
    const prompt = String(body.message ?? body.input ?? '').trim();
    if (!prompt) throw new HttpError(400, 'message is required');

    const session = body.workflow_session_id
      ? store.workflowSessions.get(String(body.workflow_session_id)) ?? store.createWorkflowSession(prompt)
      : store.createWorkflowSession(prompt);
    const base = body.base_workflow_id ? store.workflows.get(String(body.base_workflow_id)) : null;
    const generated = buildWorkflow(prompt, base);
    const workflow = store.createWorkflow({
      session_id: session.id,
      name: generated.name,
      nodes: generated.nodes,
      edges: generated.edges,
    });
    store.addWorkflowRevision(workflow, base ? 'edited' : 'generated');

    const finalGraph = workflowJson(workflow);
    const layoutGraph = {
      nodes: workflow.nodes.map(({ uuid, name, type, position }) => ({ uuid, name, type, position })),
      edges: workflow.edges,
    };
    const codeGraph = {
      nodes: workflow.nodes.map(({ uuid, name, type, position, code }) => ({
        uuid,
        name,
        type,
        position,
        code,
      })),
      edges: workflow.edges,
    };
    const descriptions = Object.fromEntries(workflow.nodes.map((node) => [node.uuid, node.description]));
    const descriptionObjects = Object.fromEntries(
      workflow.nodes.map((node) => [node.uuid, { description: node.description, time: '0.4s' }]),
    );

    const stages = [
      {
        type: 'intent',
        delay: 120,
        data: { intent: 'create_workflow', confidence: 0.92 },
      },
      {
        type: 'architect',
        delay: 260,
        data: { message: `需求已拆成 ${workflow.nodes.length} 个节点，开始生成 workflow JSON。` },
      },
      {
        type: 'workflow_init',
        delay: 260,
        data: { nodes: Object.fromEntries(workflow.nodes.map((node) => [node.uuid, node.name])) },
      },
      {
        type: 'workflow_layout',
        delay: 280,
        data: { workflow_json: layoutGraph, workflow_progress: 0.18 },
      },
      {
        type: 'workflow_generating',
        delay: 320,
        data: { workflow_progress: 0.38, node_desc_map: descriptions },
      },
      {
        type: 'code_merged',
        delay: 340,
        data: { workflow_progress: 0.68, workflow_json: codeGraph, node_desc_map: descriptions },
      },
      {
        type: 'workflow_structure_complete',
        delay: 340,
        data: {
          workflow_progress: 0.9,
          workflow_json: finalGraph,
          revision_id: workflow.revision_id,
          content_hash: workflow.content_hash,
          node_desc_map: descriptionObjects,
        },
      },
      {
        type: 'result',
        delay: 260,
        data: {
          workflow_progress: 1,
          workflow_json: finalGraph,
          revision_id: workflow.revision_id,
          content_hash: workflow.content_hash,
          node_desc_map: descriptionObjects,
        },
      },
      {
        type: 'workflow_complete_success',
        delay: 180,
        data: {
          workflow_id: workflow.id,
          session_id: session.id,
          revision_id: workflow.revision_id,
          content_hash: workflow.content_hash,
          workflow_json: finalGraph,
        },
      },
      {
        type: 'end',
        delay: 80,
        data: { reason: 'complete', workflow_id: workflow.id },
      },
    ];

    initSSE(res);
    let closed = false;
    const close = () => {
      closed = true;
    };
    req.on('close', close);
    res.on('close', close);

    let seq = 0;
    for (const stage of stages) {
      if (closed || res.destroyed) return;
      await sleep(stage.delay);
      if (closed || res.destroyed) return;
      writeSSE(res, { seq: ++seq, type: stage.type, data: stage.data });
    }
    if (!res.writableEnded) res.end();
  });

  get('/api/workflow-graph/sessions/list', ({ res }) => {
    const sessions = [...store.workflowSessions.values()]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((session) => ({
        session_id: session.id,
        workflow_id: session.workflow_id,
        prompt: session.prompt,
        created_at: session.created_at,
        updated_at: session.updated_at,
      }));
    sendJson(res, 200, { sessions, total: sessions.length });
  });

  post('/api/workflow-graph/sessions/checkpoint', async ({ req, res }) => {
    const body = await readJson(req);
    const session = store.workflowSessions.get(String(body.session_id));
    if (!session) throw new HttpError(404, 'session not found');
    const workflow = session.workflow_id ? store.workflows.get(session.workflow_id) : null;
    if (!workflow) throw new HttpError(404, 'workflow not found');
    const revision = workflow.revisions.find((item) => item.revision_id === body.revision_id)
      ?? workflow.revisions.at(-1);
    if (!revision) throw new HttpError(404, 'revision not found');
    sendJson(res, 200, {
      session_id: session.id,
      workflow_id: workflow.id,
      revision_id: revision.revision_id,
      content_hash: revision.content_hash,
      workflow_json: revision.workflow_json,
    });
  });

  post('/api/workflow-graph/sessions/bind-workflow', async ({ req, res }) => {
    const body = await readJson(req);
    const session = store.workflowSessions.get(String(body.session_id));
    const workflow = store.workflows.get(String(body.workflow_id));
    if (!session) throw new HttpError(404, 'session not found');
    if (!workflow) throw new HttpError(404, 'workflow not found');
    session.workflow_id = workflow.id;
    session.updated_at = now();
    sendJson(res, 200, { session_id: session.id, workflow_id: workflow.id });
  });

  get('/api/workflow-graph/:workflow_id/revisions', ({ res, params }) => {
    const workflow = getWorkflowOrThrow(store, params.workflow_id);
    sendJson(res, 200, {
      workflow_id: workflow.id,
      revisions: workflow.revisions,
      current_revision_id: workflow.revision_id,
    });
  });

  get('/api/workflow-graph/:workflow_id', ({ res, params }) => {
    const workflow = getWorkflowOrThrow(store, params.workflow_id);
    sendJson(res, 200, { workflow: workflowJson(workflow), revisions: workflow.revisions });
  });

  post('/api/workflow-graph/:workflow_id/run', ({ res, params }) => {
    const workflow = getWorkflowOrThrow(store, params.workflow_id);
    const run = startWorkflowRun(store, workflow);
    sendJson(res, 202, {
      workflow_run_id: run.id,
      run_id: run.id,
      workflow_id: workflow.id,
      status: run.status,
    });
  });

  get('/api/workflow-runs/:run_id', ({ res, params }) => {
    const run = getWorkflowRunOrThrow(store, params.run_id);
    sendJson(res, 200, { run: workflowRunSummary(run) });
  });

  get('/api/workflow-runs/:run_id/logs', ({ res, params, query }) => {
    const run = getWorkflowRunOrThrow(store, params.run_id);
    sendLogs(res, run, query);
  });

  get('/api/workflow/run/log', ({ res, query }) => {
    const runId = query.get('workflow_run_id') ?? query.get('run_id');
    if (!runId) throw new HttpError(400, 'workflow_run_id is required');
    const run = getWorkflowRunOrThrow(store, runId);
    sendLogs(res, run, query);
  });

  get('/api/workflow-runs/:run_id/output', ({ res, params }) => {
    const run = getWorkflowRunOrThrow(store, params.run_id);
    if (run.status !== 'completed') {
      sendJson(res, 202, { run_id: run.id, status: run.status, output_obj_id: null, output: null });
      return;
    }
    sendJson(res, 200, {
      run_id: run.id,
      status: run.status,
      output_obj_id: run.output_obj_id,
      output: run.output,
    });
  });

  get('/api/workflow/run/output', ({ res, query }) => {
    const outputObjId = query.get('output_obj_id');
    if (!outputObjId) throw new HttpError(400, 'output_obj_id is required');
    const run = [...store.workflowRuns.values()].find((item) => item.output_obj_id === outputObjId);
    if (!run) throw new HttpError(404, 'output not found');
    sendJson(res, 200, {
      run_id: run.id,
      status: run.status,
      output_obj_id: run.output_obj_id,
      output: run.output,
    });
  });

  post('/api/workflow-runs/:run_id/terminate', ({ res, params }) => {
    const run = getWorkflowRunOrThrow(store, params.run_id);
    terminateWorkflowRun(store, run);
    sendJson(res, 200, { run_id: run.id, status: run.status });
  });

  get('/api/workflow/run/list', ({ res }) => {
    const runs = [...store.workflowRuns.values()]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(workflowRunSummary);
    sendJson(res, 200, { runs, total: runs.length });
  });

  get('/api/workflow/all', ({ res }) => sendJson(res, 200, listWorkflows(store)));
  get('/api/workflow/query', ({ res }) => sendJson(res, 200, listWorkflows(store)));

  post('/api/workflow/run', async ({ req, res }) => {
    const body = await readJson(req);
    const workflow = getWorkflowOrThrow(store, String(body.workflow_id ?? ''));
    const run = startWorkflowRun(store, workflow);
    sendJson(res, 202, {
      workflow_run_id: run.id,
      run_id: run.id,
      workflow_id: workflow.id,
      status: run.status,
    });
  });

  post('/api/workflow/run_with_store', async ({ req, res }) => {
    const body = await readJson(req);
    const workflow = getWorkflowOrThrow(store, String(body.workflow_id ?? ''));
    const run = startWorkflowRun(store, workflow);
    sendJson(res, 202, { workflow_run_id: run.id, run_id: run.id, workflow_id: workflow.id, status: run.status });
  });
}

function buildWorkflow(prompt, base) {
  if (base) {
    return {
      name: `${base.name} / edited`,
      nodes: base.nodes.map((node) => ({ ...node })),
      edges: base.edges.map((edge) => ({ ...edge })),
    };
  }

  const isFactor = /因子|factor/i.test(prompt);
  const isMa = /均线|双均线|cross|ma\b/i.test(prompt);
  const kind = isFactor ? 'factor' : isMa ? 'ma' : 'generic';
  const name = prompt.slice(0, 48) || 'Generated workflow';

  if (kind === 'ma') {
    return {
      name,
      nodes: [
        node('n1', '加载行情数据', 'data', 0, 0, '读取标的日线收盘价，作为后续均线计算的输入。', `# load data\nclose = get_price(asset, start, end, "1d", "close")`),
        node('n2', '短周期均线', 'compute', 1, 0, '计算 5 日均线。', `fast = close.rolling(5).mean()`),
        node('n3', '长周期均线', 'compute', 1, 1, '计算 20 日均线。', `slow = close.rolling(20).mean()`),
        node('n4', '交叉信号', 'signal', 2, 0, '短均线上穿长均线时做多，下穿时平仓。', `signal = (fast > slow).astype(int)\nsignal = signal.shift(1).fillna(0)`),
        node('n5', '回测执行', 'backtest', 3, 0, '按信号执行回测并计算收益、回撤和 Sharpe。', `result = run_backtest(signal, close, fee=0.0003)`),
        node('n6', '报告输出', 'report', 4, 0, '输出净值曲线、指标和交易明细。', `report(result, title="MA crossover")`),
      ],
      edges: [
        edge('n1', 'n2'),
        edge('n1', 'n3'),
        edge('n2', 'n4'),
        edge('n3', 'n4'),
        edge('n4', 'n5'),
        edge('n5', 'n6'),
      ],
    };
  }

  if (kind === 'factor') {
    return {
      name,
      nodes: [
        node('n1', '加载面板数据', 'data', 0, 0, '读取股票池的价量面板数据。', `panel = load_panel(universe, start, end)`),
        node('n2', '计算因子', 'compute', 1, 0, '用 5/20 日均线比值构造动量因子。', `factor = panel["close"].rolling(5).mean() / panel["close"].rolling(20).mean() - 1`),
        node('n3', '因子检验', 'analysis', 2, 0, '计算 IC、Rank IC 和换手率。', `ic = factor_ic(factor, forward_returns)`),
        node('n4', '分层回测', 'backtest', 3, 0, '按因子值分层并回测多空组合。', `result = quantile_backtest(factor, returns, quantiles=5)`),
        node('n5', '报告输出', 'report', 4, 0, '输出因子表现和分层收益。', `report(result, title="Factor analysis")`),
      ],
      edges: [
        edge('n1', 'n2'),
        edge('n2', 'n3'),
        edge('n2', 'n4'),
        edge('n3', 'n5'),
        edge('n4', 'n5'),
      ],
    };
  }

  return {
    name,
    nodes: [
      node('n1', '加载输入', 'data', 0, 0, '加载工作流所需的输入数据。', `data = load_input()`),
      node('n2', '转换/计算', 'compute', 1, 0, '执行核心计算。', `result = transform(data)`),
      node('n3', '分析', 'analysis', 2, 0, '汇总计算 result 的关键指标。', `metrics = analyze(result)`),
      node('n4', '报告输出', 'report', 3, 0, '输出最终报告。', `report(metrics)`),
    ],
    edges: [edge('n1', 'n2'), edge('n2', 'n3'), edge('n3', 'n4')],
  };
}

function node(uuid, name, type, x, y, description, code) {
  return {
    uuid,
    name,
    type,
    position: { x: 180 + x * 220, y: 120 + y * 140 },
    description,
    code,
  };
}

function edge(source, target) {
  return { source, target };
}

function workflowJson(workflow) {
  return {
    workflow_id: workflow.id,
    session_id: workflow.session_id,
    name: workflow.name,
    revision_id: workflow.revision_id,
    content_hash: workflow.content_hash,
    nodes: workflow.nodes,
    edges: workflow.edges,
    created_at: workflow.created_at,
    updated_at: workflow.updated_at,
  };
}

function startWorkflowRun(store, workflow) {
  const run = store.createWorkflowRun(workflow);
  const nodes = workflow.nodes;
  let index = 0;

  const finish = () => {
    if (run.status !== 'running') return;
    store.appendWorkflowLog(run, { level: 'info', message: 'workflow completed' });
    run.status = 'completed';
    run.output_obj_id = id('obj');
    run.output = {
      workflow_id: workflow.id,
      metrics: METRICS,
      nodes: nodes.map((node) => ({
        uuid: node.uuid,
        name: node.name,
        status: 'completed',
      })),
      series: [
        { t: '2024-01', equity: 1.0 },
        { t: '2024-04', equity: 1.06 },
        { t: '2024-07', equity: 1.11 },
        { t: '2024-10', equity: 1.15 },
        { t: '2024-12', equity: 1.184 },
      ],
      note: 'Synthetic output produced by the clean-room mock.',
    };
  };

  const tick = () => {
    if (run.status !== 'running') return;
    if (index >= nodes.length) {
      finish();
      return;
    }
    const currentNode = nodes[index];
    store.appendWorkflowLog(run, {
      level: 'info',
      node_id: currentNode.uuid,
      message: `node ${currentNode.name} started`,
    });
    run.timer = setTimeout(() => {
      if (run.status !== 'running') return;
      store.appendWorkflowLog(run, {
        level: 'info',
        node_id: currentNode.uuid,
        message: `node ${currentNode.name} completed`,
      });
      index += 1;
      run.timer = setTimeout(tick, 220);
    }, 320);
  };

  run.timer = setTimeout(tick, 180);
  return run;
}

function terminateWorkflowRun(store, run) {
  if (run.status !== 'running') throw new HttpError(409, 'workflow run already finished');
  run.status = 'cancelled';
  if (run.timer) clearTimeout(run.timer);
  run.timer = null;
  store.appendWorkflowLog(run, { level: 'warn', message: 'workflow terminated by user' });
}

function getWorkflowOrThrow(store, workflowId) {
  const workflow = store.workflows.get(workflowId);
  if (!workflow) throw new HttpError(404, 'workflow not found');
  return workflow;
}

function getWorkflowRunOrThrow(store, runId) {
  const run = store.workflowRuns.get(runId);
  if (!run) throw new HttpError(404, 'workflow run not found');
  return run;
}

function sendLogs(res, run, query) {
  const after = Number(query.get('last_sequence') ?? query.get('after_sequence') ?? 0) || 0;
  const logs = run.logs.filter((log) => log.sequence > after);
  sendJson(res, 200, {
    run_id: run.id,
    workflow_id: run.workflow_id,
    status: run.status,
    logs,
    next_sequence: run.next_log_sequence,
  });
}

function workflowRunSummary(run) {
  return {
    run_id: run.id,
    workflow_run_id: run.id,
    workflow_id: run.workflow_id,
    workflow_name: run.workflow_name,
    status: run.status,
    created_at: run.created_at,
    updated_at: run.updated_at,
    last_sequence: run.next_log_sequence,
    output_obj_id: run.output_obj_id,
  };
}

function listWorkflows(store) {
  const workflows = [...store.workflows.values()]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((workflow) => ({
      workflow_id: workflow.id,
      name: workflow.name,
      session_id: workflow.session_id,
      revision_id: workflow.revision_id,
      content_hash: workflow.content_hash,
      node_count: workflow.nodes.length,
      edge_count: workflow.edges.length,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,
    }));
  return { workflows, total: workflows.length };
}

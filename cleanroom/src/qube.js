import { id, now, shortHash } from './ids.js';
import { HttpError, readJson, sendJson } from './router.js';
import { initSSE, writeHeartbeat, writeSSE } from './sse.js';

const PREFIXES = ['', '/pandaApi/agent_quant'];
const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

const STRATEGY_CODE = `# Clean-room demo strategy. Not copied from the target.
def initialize(context):
    context.short_window = 5
    context.long_window = 20
    context.asset = "000300.XSHG"

def handle_data(context):
    closes = history(context.asset, context.long_window, "1d", "close")
    fast = closes[-context.short_window:].mean()
    slow = closes.mean()
    if fast > slow and not context.portfolio.positions:
        order_target_percent(context.asset, 0.95)
    elif fast < slow and context.portfolio.positions:
        order_target_percent(context.asset, 0.0)
`;

const FACTOR_CODE = `# Clean-room demo factor. Not copied from the target.
import numpy as np

def factor(frame):
    close = frame["close"]
    fast = close.rolling(5).mean()
    slow = close.rolling(20).mean()
    return (fast / slow - 1.0).replace([np.inf, -np.inf], np.nan).fillna(0.0)
`;

const BACKTEST_METRICS = {
  annual_return: 0.184,
  max_drawdown: -0.092,
  sharpe: 1.37,
  trades: 24,
  win_rate: 0.58,
};

export function registerQubeRoutes(router, store, catalog) {
  const get = (path, handler) => PREFIXES.forEach((prefix) => router.get(prefix + path, handler));
  const post = (path, handler) => PREFIXES.forEach((prefix) => router.post(prefix + path, handler));
  const patch = (path, handler) => PREFIXES.forEach((prefix) => router.patch(prefix + path, handler));
  const del = (path, handler) => PREFIXES.forEach((prefix) => router.delete(prefix + path, handler));
  const put = (path, handler) => PREFIXES.forEach((prefix) => router.put(prefix + path, handler));

  get('/api/tools', ({ res }) => sendJson(res, 200, catalog));
  get('/api/chat/tools', ({ res }) => sendJson(res, 200, catalog));

  get('/api/chat/models', ({ res }) => {
    sendJson(res, 200, {
      models: [
        { id: 'mock-quant', name: 'Mock Quant Agent', provider: 'cleanroom', reasoning: true },
        { id: 'mock-fast', name: 'Mock Fast Agent', provider: 'cleanroom', reasoning: false },
      ],
    });
  });

  get('/api/chat/conversations', ({ res }) => {
    const conversations = [...store.conversations.values()]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((conversation) => ({
        conversation_id: conversation.id,
        title: conversation.title,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        message_count: conversation.messages.length,
        artifact_count: conversation.artifacts.length,
      }));
    sendJson(res, 200, { conversations, total: conversations.length });
  });

  post('/api/chat/conversations', async ({ req, res }) => {
    const body = await readJson(req);
    const conversation = store.createConversation(
      typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'New conversation',
    );
    sendJson(res, 201, {
      conversation_id: conversation.id,
      title: conversation.title,
      created_at: conversation.created_at,
    });
  });

  patch('/api/chat/conversations/:conversation_id', async ({ req, res, params }) => {
    const conversation = getConversationOrThrow(store, params.conversation_id);
    const body = await readJson(req);
    if (typeof body.title === 'string' && body.title.trim()) {
      conversation.title = body.title.trim();
      conversation.updated_at = now();
    }
    sendJson(res, 200, { conversation_id: conversation.id, title: conversation.title });
  });

  del('/api/chat/conversations/:conversation_id', ({ res, params }) => {
    const conversation = getConversationOrThrow(store, params.conversation_id);
    for (const artifactId of conversation.artifacts) store.artifacts.delete(artifactId);
    for (const run of [...store.runs.values()]) {
      if (run.conversation_id !== conversation.id) continue;
      clearTimers(run);
      for (const approvalId of run.approvals) store.approvals.delete(approvalId);
      store.runs.delete(run.id);
    }
    store.conversations.delete(conversation.id);
    res.writeHead(204);
    res.end();
  });

  get('/api/chat/conversations/:conversation_id/messages', ({ res, params }) => {
    const conversation = getConversationOrThrow(store, params.conversation_id);
    sendJson(res, 200, {
      conversation_id: conversation.id,
      messages: conversation.messages,
      next_before_sequence: null,
    });
  });

  post('/api/chat/runs', async ({ req, res }) => {
    const body = await readJson(req);
    let conversation;
    if (body.conversation_id) {
      conversation = getConversationOrThrow(store, String(body.conversation_id));
    } else {
      conversation = store.createConversation('New conversation');
    }
    const run = startRun(store, conversation, body);
    sendJson(res, 202, {
      run_id: run.id,
      conversation_id: conversation.id,
      status: run.status,
    });
  });

  get('/api/chat/runs/:run_id/events', ({ req, res, params, query }) => {
    const run = store.runs.get(params.run_id);
    if (!run) throw new HttpError(404, 'run not found');
    const after = Number(query.get('after_sequence') ?? query.get('last_sequence') ?? 0) || 0;

    initSSE(res);
    let lastSent = after;
    let ready = false;
    const buffered = [];

    const listener = (event) => {
      if (!ready) {
        buffered.push(event);
        return;
      }
      if (event.sequence > lastSent) {
        writeSSE(res, event);
        lastSent = event.sequence;
      }
    };
    const unsubscribe = store.subscribeRun(run.id, listener);

    for (const event of run.events) {
      if (event.sequence <= lastSent) continue;
      writeSSE(res, event);
      lastSent = event.sequence;
    }
    ready = true;
    for (const event of buffered) {
      if (event.sequence <= lastSent) continue;
      writeSSE(res, event);
      lastSent = event.sequence;
    }

    const heartbeat = setInterval(() => writeHeartbeat(res), 15_000);
    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };
    req.on('close', cleanup);
    res.on('close', cleanup);
  });

  get('/api/chat/runs/:run_id', ({ res, params }) => {
    const run = store.runs.get(params.run_id);
    if (!run) throw new HttpError(404, 'run not found');
    const pending = run.pendingApproval
      ? store.approvals.get(run.pendingApproval.approval_id) ?? null
      : null;
    sendJson(res, 200, { run: runSummary(run), pending_approval: pending });
  });

  post('/api/chat/runs/:run_id/retry', ({ res, params }) => {
    const oldRun = store.runs.get(params.run_id);
    if (!oldRun) throw new HttpError(404, 'run not found');
    const conversation = getConversationOrThrow(store, oldRun.conversation_id);
    const run = startRun(store, conversation, {
      input: oldRun.input,
      model: oldRun.model,
      approval_mode: oldRun.approval_mode,
    });
    sendJson(res, 202, { run_id: run.id, conversation_id: conversation.id, status: run.status });
  });

  post('/api/chat/runs/:run_id/cancel', ({ res, params }) => {
    const run = store.runs.get(params.run_id);
    if (!run) throw new HttpError(404, 'run not found');
    cancelRun(store, run);
    sendJson(res, 200, { run_id: run.id, status: run.status });
  });

  post('/api/chat/messages/:message_id/resend', async ({ req, res, params }) => {
    const body = await readJson(req);
    const found = findMessage(store, params.message_id);
    if (!found) throw new HttpError(404, 'message not found');
    const text = body.input ?? textOf(found.message);
    const run = startRun(store, found.conversation, {
      input: text,
      model: body.model ?? 'mock-quant',
      approval_mode: body.approval_mode ?? 'auto',
    });
    sendJson(res, 202, { run_id: run.id, conversation_id: found.conversation.id, status: run.status });
  });

  put('/api/chat/messages/:message_id/feedback', async ({ req, res, params }) => {
    const body = await readJson(req);
    const found = findMessage(store, params.message_id);
    if (!found) throw new HttpError(404, 'message not found');
    sendJson(res, 200, {
      message_id: params.message_id,
      feedback: body.feedback ?? body.value ?? null,
    });
  });

  const resolveHandler = async ({ req, res, params }) => {
    const body = await readJson(req);
    const raw = String(body.decision ?? body.action ?? '').toLowerCase();
    const decision = ['approve', 'approved', 'accept', 'yes'].includes(raw)
      ? 'approve'
      : ['reject', 'rejected', 'deny', 'no'].includes(raw)
        ? 'reject'
        : null;
    if (!decision) throw new HttpError(400, 'decision must be approve or reject');
    const approval = store.approvals.get(params.approval_id);
    if (!approval) throw new HttpError(404, 'approval not found');
    if (params.run_id && approval.run_id !== params.run_id) {
      throw new HttpError(409, 'approval does not belong to this run');
    }
    sendJson(res, 200, resolveApproval(store, approval, decision));
  };

  post('/api/chat/approvals/:approval_id/resolve', resolveHandler);
  post('/api/chat/runs/:run_id/strategy-create-approvals/:approval_id/resolve', resolveHandler);
  post('/api/chat/runs/:run_id/strategy-run-approvals/:approval_id/resolve', resolveHandler);
  post('/api/chat/runs/:run_id/strategy-mutation-approvals/:approval_id/resolve', resolveHandler);
  post('/api/chat/runs/:run_id/strategy-version-approvals/:approval_id/resolve', resolveHandler);
  post('/api/chat/runs/:run_id/factor-create-approvals/:approval_id/resolve', resolveHandler);

  const draftHandler = ({ res, params }) => {
    const approval = store.approvals.get(params.approval_id);
    if (!approval) throw new HttpError(404, 'approval not found');
    sendJson(res, 200, { approval_id: approval.id, run_id: approval.run_id, draft: approval.payload });
  };
  get('/api/chat/runs/:run_id/strategy-create-approvals/:approval_id/draft', draftHandler);
  get('/api/chat/runs/:run_id/factor-create-approvals/:approval_id/draft', draftHandler);
  get('/api/chat/runs/:run_id/strategy-mutation-approvals/:approval_id/detail', draftHandler);
  get('/api/chat/runs/:run_id/strategy-version-approvals/:approval_id/detail', draftHandler);

  get('/api/chat/conversations/:conversation_id/artifacts', ({ res, params }) => {
    const conversation = getConversationOrThrow(store, params.conversation_id);
    const artifacts = conversation.artifacts
      .map((artifactId) => store.artifacts.get(artifactId))
      .filter(Boolean)
      .map(artifactSummary);
    sendJson(res, 200, { conversation_id: conversation.id, artifacts });
  });

  post('/api/chat/conversations/:conversation_id/artifacts', async ({ req, res, params }) => {
    const conversation = getConversationOrThrow(store, params.conversation_id);
    const body = await readJson(req);
    const artifact = store.createArtifact(conversation, {
      type: String(body.type ?? 'note'),
      title: String(body.title ?? 'Untitled artifact'),
      content: String(body.content ?? ''),
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    });
    sendJson(res, 201, { artifact: artifactSummary(artifact) });
  });

  del('/api/chat/conversations/:conversation_id/artifacts/:artifact_type/:artifact_id', ({ res, params }) => {
    const conversation = getConversationOrThrow(store, params.conversation_id);
    const artifact = store.artifacts.get(params.artifact_id);
    if (!artifact || artifact.conversation_id !== conversation.id || artifact.type !== params.artifact_type) {
      throw new HttpError(404, 'artifact not found');
    }
    store.artifacts.delete(artifact.id);
    conversation.artifacts = conversation.artifacts.filter((artifactId) => artifactId !== artifact.id);
    res.writeHead(204);
    res.end();
  });

  get('/api/chat/artifacts/:artifact_id', ({ res, params }) => {
    const artifact = store.artifacts.get(params.artifact_id);
    if (!artifact) throw new HttpError(404, 'artifact not found');
    sendJson(res, 200, { artifact });
  });

  get('/api/chat/artifacts/:artifact_id/versions', ({ res, params }) => {
    const artifact = store.artifacts.get(params.artifact_id);
    if (!artifact) throw new HttpError(404, 'artifact not found');
    sendJson(res, 200, { artifact_id: artifact.id, versions: artifact.versions });
  });

  post('/api/chat/artifacts/:artifact_id/versions', async ({ req, res, params }) => {
    const artifact = store.artifacts.get(params.artifact_id);
    if (!artifact) throw new HttpError(404, 'artifact not found');
    const body = await readJson(req);
    const version = store.addArtifactVersion(
      artifact,
      String(body.content ?? ''),
      String(body.note ?? 'update'),
    );
    sendJson(res, 201, { artifact_id: artifact.id, version });
  });

  get('/api/quant-skills', ({ res }) => sendJson(res, 200, { skills: [], total: 0 }));
  get('/api/chat/strategy-transcription/platforms', ({ res }) => {
    sendJson(res, 200, { platforms: [] });
  });
}

function startRun(store, conversation, body) {
  const input = String(body.input ?? body.message ?? body.content ?? '').trim();
  if (!input) throw new HttpError(400, 'input is required');
  const model = String(body.model ?? 'mock-quant');
  const approvalMode = body.approval_mode === 'manual' ? 'manual' : 'auto';
  if (!conversation.title || conversation.title === 'New conversation') {
    conversation.title = input.slice(0, 60);
  }

  const run = store.createRun({
    conversation_id: conversation.id,
    input,
    model,
    approval_mode: approvalMode,
  });
  const userMessage = store.createMessage(conversation, 'user', [
    { id: id('part'), type: 'text', text: input, created_at: now() },
  ]);
  const assistantMessage = store.createMessage(conversation, 'assistant', []);
  run.user_message_id = userMessage.id;
  run.assistant_message_id = assistantMessage.id;

  store.appendEvent(run, 'run.created', {
    conversation_id: conversation.id,
    status: 'running',
    user_message_id: userMessage.id,
    message_id: assistantMessage.id,
  });
  store.appendEvent(run, 'message.created', {
    conversation_id: conversation.id,
    message_id: assistantMessage.id,
    role: 'assistant',
  });

  schedule(store, run, 80, () => {
    store.appendEvent(run, 'run.started', { model, approval_mode: approvalMode });
    streamText(
      store,
      run,
      assistantMessage,
      '收到。我会把任务拆成可观测的步骤，并在需要执行代码或回测时请求审批。\n',
      120,
    );
    schedule(store, run, 650, () => routeIntent(store, run, assistantMessage, input));
  });

  return run;
}

function routeIntent(store, run, message, text) {
  if (/因子|factor/i.test(text)) {
    factorFlow(store, run, message);
  } else if (/策略|回测|均线|strategy|backtest/i.test(text)) {
    strategyFlow(store, run, message);
  } else {
    generalFlow(store, run, message);
  }
}

function generalFlow(store, run, message) {
  addActivity(store, run, message, 'agent.plan', '分析请求', 500);
  streamText(store, run, message, '这个请求不需要代码执行。我先给出一个可观测的执行计划。\n', 120);
  schedule(store, run, 700, () => {
    addCard(store, run, message, '执行计划', [
      { label: '步骤 1', value: '解析目标与约束' },
      { label: '步骤 2', value: '选择工具与数据' },
      { label: '步骤 3', value: '产出可复查的结果' },
    ]);
    streamText(
      store,
      run,
      message,
      '这是 clean-room mock：事件、审批和产物都是独立实现，用于验证协议，不是目标站源码。\n',
      120,
    );
    schedule(store, run, 750, () => completeRun(store, run, { status: 'completed', artifacts: [] }));
  });
}

function strategyFlow(store, run, message) {
  addActivity(store, run, message, 'strategy.generate', '生成策略草稿', 700);
  streamText(store, run, message, '我会先生成一个可回测的双均线策略草稿。\n', 120);

  schedule(store, run, 900, () => {
    const conversation = getConversationOrThrow(store, run.conversation_id);
    const artifact = store.createArtifact(conversation, {
      type: 'strategy',
      title: '双均线策略（Clean-room Mock）',
      content: STRATEGY_CODE,
      metadata: { language: 'python', entry: 'initialize', tags: ['ma', 'demo'] },
    });
    store.appendEvent(run, 'artifact.created', { artifact: artifactSummary(artifact) });
    addCard(store, run, message, '策略草稿已生成', [
      { label: '产物类型', value: 'strategy' },
      { label: '版本', value: `v${artifact.version}` },
      { label: '下一步', value: '请求回测审批' },
    ]);

    schedule(store, run, 400, () => {
      requestApproval(
        store,
        run,
        'strategy_run',
        {
          strategy_id: artifact.id,
          market: 'stock',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
        },
        (decision) => {
          if (decision === 'approve') {
            runBacktest(store, run, message, artifact);
          } else {
            streamText(store, run, message, '已取消回测。策略草稿仍然保留，可以稍后再次运行。\n', 120);
            schedule(store, run, 550, () => {
              completeRun(store, run, { status: 'completed', artifacts: [artifact.id] });
            });
          }
        },
      );
    });
  });
}

function runBacktest(store, run, message, strategyArtifact) {
  addActivity(store, run, message, 'backtest.run', '运行回测', 900);
  streamText(store, run, message, '审批通过，开始回测。\n', 120);

  schedule(store, run, 1100, () => {
    const conversation = getConversationOrThrow(store, run.conversation_id);
    const report = store.createArtifact(conversation, {
      type: 'backtest_report',
      title: '回测报告（Clean-room Mock）',
      content: JSON.stringify(
        {
          strategy_id: strategyArtifact.id,
          period: '2024-01-01/2024-12-31',
          metrics: BACKTEST_METRICS,
          note: 'Synthetic metrics produced by the clean-room mock.',
        },
        null,
        2,
      ),
      metadata: { strategy_id: strategyArtifact.id, metrics: BACKTEST_METRICS },
    });
    store.appendEvent(run, 'artifact.created', { artifact: artifactSummary(report) });
    addCard(store, run, message, '回测完成', [
      { label: '年化收益', value: `${(BACKTEST_METRICS.annual_return * 100).toFixed(1)}%` },
      { label: '最大回撤', value: `${(BACKTEST_METRICS.max_drawdown * 100).toFixed(1)}%` },
      { label: 'Sharpe', value: BACKTEST_METRICS.sharpe.toFixed(2) },
    ]);
    streamText(
      store,
      run,
      message,
      '回测完成：年化收益 18.4%，最大回撤 -9.2%，Sharpe 1.37。报告已保存为产物。\n',
      150,
    );
    schedule(store, run, 950, () => {
      completeRun(store, run, {
        status: 'completed',
        artifacts: [strategyArtifact.id, report.id],
        metrics: BACKTEST_METRICS,
      });
    });
  });
}

function factorFlow(store, run, message) {
  addActivity(store, run, message, 'factor.generate', '生成因子草稿', 700);
  streamText(store, run, message, '我会先生成一个动量/均线类因子草稿，然后请求创建审批。\n', 120);

  schedule(store, run, 900, () => {
    const conversation = getConversationOrThrow(store, run.conversation_id);
    const artifact = store.createArtifact(conversation, {
      type: 'factor',
      title: '均线动量因子（Clean-room Mock）',
      content: FACTOR_CODE,
      metadata: { language: 'python', tags: ['momentum', 'demo'] },
    });
    store.appendEvent(run, 'artifact.created', { artifact: artifactSummary(artifact) });
    addCard(store, run, message, '因子草稿已生成', [
      { label: '产物类型', value: 'factor' },
      { label: '版本', value: `v${artifact.version}` },
      { label: '下一步', value: '请求因子创建审批' },
    ]);

    schedule(store, run, 400, () => {
      requestApproval(
        store,
        run,
        'factor_create',
        { factor_id: artifact.id, universe: '000300.XSHG', frequency: '1d' },
        (decision) => {
          if (decision !== 'approve') {
            streamText(store, run, message, '已取消因子创建。草稿仍然保留。\n', 120);
            schedule(store, run, 550, () => {
              completeRun(store, run, { status: 'completed', artifacts: [artifact.id] });
            });
            return;
          }
          addActivity(store, run, message, 'factor.analyze', '运行因子分析', 800);
          schedule(store, run, 900, () => {
            const analysis = store.createArtifact(conversation, {
              type: 'factor_analysis',
              title: '因子分析（Clean-room Mock）',
              content: JSON.stringify(
                { factor_id: artifact.id, ic: 0.041, rank_ic: 0.036, turnover: 0.23 },
                null,
                2,
              ),
              metadata: { factor_id: artifact.id },
            });
            store.appendEvent(run, 'artifact.created', { artifact: artifactSummary(analysis) });
            addCard(store, run, message, '因子分析完成', [
              { label: 'IC', value: '0.041' },
              { label: 'Rank IC', value: '0.036' },
              { label: 'Turnover', value: '0.23' },
            ]);
            streamText(store, run, message, '因子创建审批通过，分析结果已保存为产物。\n', 120);
            schedule(store, run, 650, () => {
              completeRun(store, run, {
                status: 'completed',
                artifacts: [artifact.id, analysis.id],
              });
            });
          });
        },
      );
    });
  });
}

function addCard(store, run, message, title, fields) {
  const part = {
    id: id('part'),
    type: 'card',
    title,
    fields,
    created_at: now(),
  };
  message.parts.push(part);
  store.appendEvent(run, 'part.create', {
    message_id: message.id,
    part: { ...part },
  });
}

function addTextPart(store, run, message, text = '') {
  const part = {
    id: id('part'),
    type: 'text',
    text: '',
    created_at: now(),
  };
  message.parts.push(part);
  store.appendEvent(run, 'part.create', {
    message_id: message.id,
    part: { ...part },
  });
  if (text) appendText(store, run, message, part, text);
  return part;
}

function appendText(store, run, message, part, text) {
  part.text += text;
  store.appendEvent(run, 'part.append', {
    message_id: message.id,
    part_id: part.id,
    text,
  });
}

function streamText(store, run, message, text, step = 140) {
  const part = addTextPart(store, run, message);
  const pieces = text.match(/[^。！？\n]+[。！？\n]?/g) ?? [text];
  const chunks = pieces.length > 4
    ? [pieces.slice(0, Math.ceil(pieces.length / 2)).join(''), pieces.slice(Math.ceil(pieces.length / 2)).join('')]
    : pieces;
  chunks.forEach((chunk, index) => {
    schedule(store, run, step * (index + 1), () => {
      appendText(store, run, message, part, chunk);
    });
  });
  return part;
}

function addActivity(store, run, message, name, label, duration = 500) {
  const part = {
    id: id('part'),
    type: 'activity',
    name,
    label,
    status: 'running',
    started_at: now(),
  };
  message.parts.push(part);
  store.appendEvent(run, 'part.create', {
    message_id: message.id,
    part: { ...part },
  });
  schedule(store, run, duration, () => {
    part.status = 'completed';
    part.completed_at = now();
    store.appendEvent(run, 'part.patch', {
      message_id: message.id,
      part_id: part.id,
      patch: { status: 'completed', completed_at: part.completed_at },
    });
  });
  return part;
}

function requestApproval(store, run, type, payload, onDecision) {
  if (TERMINAL.has(run.status)) return null;
  const approval = store.createApproval(run, type, payload);
  run.pendingApproval = { approval_id: approval.id, onDecision };
  run.status = 'awaiting_approval';
  store.appendEvent(run, 'approval.requested', {
    approval_id: approval.id,
    approval_type: type,
    payload,
  });
  store.appendEvent(run, 'run.awaiting_approval', {
    approval_id: approval.id,
    approval_type: type,
  });
  if (run.approval_mode === 'auto') {
    schedule(store, run, 1400, () => {
      if (approval.status === 'pending') resolveApproval(store, approval, 'approve');
    });
  }
  return approval;
}

function resolveApproval(store, approval, decision) {
  if (approval.status !== 'pending') throw new HttpError(409, 'approval already resolved');
  const run = store.runs.get(approval.run_id);
  if (!run) throw new HttpError(404, 'run not found');
  if (TERMINAL.has(run.status)) throw new HttpError(409, 'run is not active');
  const pending = run.pendingApproval;
  approval.status = decision === 'approve' ? 'approved' : 'rejected';
  approval.decision = decision;
  approval.resolved_at = now();
  run.pendingApproval = null;
  run.status = 'running';
  store.appendEvent(run, 'approval.resolved', {
    approval_id: approval.id,
    approval_type: approval.type,
    decision,
    status: approval.status,
  });
  if (pending && pending.approval_id === approval.id && typeof pending.onDecision === 'function') {
    pending.onDecision(decision);
  }
  return {
    approval_id: approval.id,
    run_id: run.id,
    status: approval.status,
    decision,
  };
}

function cancelRun(store, run) {
  if (TERMINAL.has(run.status)) throw new HttpError(409, 'run already finished');
  run.status = 'cancelled';
  if (run.pendingApproval) {
    const approval = store.approvals.get(run.pendingApproval.approval_id);
    if (approval && approval.status === 'pending') {
      approval.status = 'cancelled';
      approval.decision = 'cancel';
      approval.resolved_at = now();
    }
    run.pendingApproval = null;
  }
  clearTimers(run);
  store.appendEvent(run, 'run.cancelled', { status: 'cancelled' });
}

function completeRun(store, run, result) {
  if (TERMINAL.has(run.status)) return;
  run.status = 'completed';
  run.result = result;
  store.appendEvent(run, 'run.completed', {
    status: 'completed',
    result,
  });
  clearTimers(run);
}

function failRun(store, run, error) {
  if (TERMINAL.has(run.status)) return;
  run.status = 'failed';
  run.result = { error: String(error?.message ?? error) };
  store.appendEvent(run, 'run.failed', {
    status: 'failed',
    error: { message: String(error?.message ?? error) },
  });
  clearTimers(run);
}

function schedule(store, run, ms, fn) {
  if (TERMINAL.has(run.status)) return null;
  const timer = setTimeout(() => {
    run.timers.delete(timer);
    if (TERMINAL.has(run.status)) return;
    try {
      fn();
    } catch (error) {
      failRun(store, run, error);
    }
  }, ms);
  run.timers.add(timer);
  return timer;
}

function clearTimers(run) {
  for (const timer of run.timers) clearTimeout(timer);
  run.timers.clear();
}

function getConversationOrThrow(store, conversationId) {
  const conversation = store.conversations.get(conversationId);
  if (!conversation) throw new HttpError(404, 'conversation not found');
  return conversation;
}

function findMessage(store, messageId) {
  for (const conversation of store.conversations.values()) {
    const message = conversation.messages.find((item) => item.id === messageId);
    if (message) return { conversation, message };
  }
  return null;
}

function textOf(message) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function artifactSummary(artifact) {
  return {
    id: artifact.id,
    conversation_id: artifact.conversation_id,
    type: artifact.type,
    title: artifact.title,
    version: artifact.version,
    created_at: artifact.created_at,
    updated_at: artifact.updated_at,
    content_hash: shortHash(artifact.content),
  };
}

function runSummary(run) {
  return {
    run_id: run.id,
    conversation_id: run.conversation_id,
    status: run.status,
    input: run.input,
    model: run.model,
    approval_mode: run.approval_mode,
    created_at: run.created_at,
    updated_at: run.updated_at,
    last_sequence: run.sequence,
    pending_approval_id: run.pendingApproval?.approval_id ?? null,
    result: run.result,
  };
}

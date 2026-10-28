import { id, now, shortHash } from './ids.js';

export class Store {
  constructor() {
    this.conversations = new Map();
    this.runs = new Map();
    this.approvals = new Map();
    this.artifacts = new Map();
    this.workflowSessions = new Map();
    this.workflows = new Map();
    this.workflowRuns = new Map();
  }

  createConversation(title = 'New conversation') {
    const conversation = {
      id: id('conv'),
      title,
      created_at: now(),
      updated_at: now(),
      messages: [],
      artifacts: [],
      next_message_sequence: 0,
      next_artifact_sequence: 0,
    };
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  createMessage(conversation, role, parts = []) {
    const message = {
      id: id('msg'),
      conversation_id: conversation.id,
      role,
      parts,
      sequence: ++conversation.next_message_sequence,
      created_at: now(),
    };
    conversation.messages.push(message);
    conversation.updated_at = now();
    return message;
  }

  createRun({ conversation_id, input, model = 'mock-quant', approval_mode = 'auto' }) {
    const run = {
      id: id('run'),
      conversation_id,
      input,
      model,
      approval_mode,
      status: 'running',
      created_at: now(),
      updated_at: now(),
      sequence: 0,
      events: [],
      subscribers: new Set(),
      timers: new Set(),
      pendingApproval: null,
      approvals: [],
      assistant_message_id: null,
      user_message_id: null,
      result: null,
    };
    this.runs.set(run.id, run);
    return run;
  }

  appendEvent(run, type, data = {}) {
    const event = {
      event_id: id('evt'),
      sequence: ++run.sequence,
      type,
      run_id: run.id,
      data,
      created_at: now(),
    };
    run.events.push(event);
    run.updated_at = now();
    for (const listener of run.subscribers) {
      try {
        listener(event);
      } catch {
        // A broken subscriber must not break the run.
      }
    }
    return event;
  }

  subscribeRun(runId, listener) {
    const run = this.runs.get(runId);
    if (!run) return () => {};
    run.subscribers.add(listener);
    return () => run.subscribers.delete(listener);
  }

  createApproval(run, type, payload) {
    const approval = {
      id: id('apr'),
      run_id: run.id,
      type,
      payload,
      status: 'pending',
      decision: null,
      created_at: now(),
      resolved_at: null,
    };
    this.approvals.set(approval.id, approval);
    run.approvals.push(approval.id);
    return approval;
  }

  createArtifact(conversation, { type, title, content = '', metadata = {} }) {
    const artifact = {
      id: id('art'),
      conversation_id: conversation.id,
      type,
      title,
      content,
      metadata,
      version: 1,
      created_at: now(),
      updated_at: now(),
      versions: [
        {
          version: 1,
          content,
          note: 'initial',
          created_at: now(),
        },
      ],
    };
    this.artifacts.set(artifact.id, artifact);
    conversation.artifacts.push(artifact.id);
    conversation.updated_at = now();
    conversation.next_artifact_sequence += 1;
    return artifact;
  }

  addArtifactVersion(artifact, content, note = 'update') {
    artifact.version += 1;
    artifact.content = content;
    artifact.updated_at = now();
    artifact.versions.push({
      version: artifact.version,
      content,
      note,
      created_at: now(),
    });
    return artifact.versions.at(-1);
  }

  createWorkflowSession(prompt) {
    const session = {
      id: id('wfs'),
      prompt,
      workflow_id: null,
      created_at: now(),
      updated_at: now(),
    };
    this.workflowSessions.set(session.id, session);
    return session;
  }

  createWorkflow({ session_id, name, nodes, edges }) {
    const workflow = {
      id: id('wf'),
      session_id,
      name,
      nodes,
      edges,
      revision_id: id('rev'),
      content_hash: shortHash(JSON.stringify({ nodes, edges })),
      created_at: now(),
      updated_at: now(),
      revisions: [],
    };
    this.workflows.set(workflow.id, workflow);
    if (session_id && this.workflowSessions.has(session_id)) {
      const session = this.workflowSessions.get(session_id);
      session.workflow_id = workflow.id;
      session.updated_at = now();
    }
    return workflow;
  }

  addWorkflowRevision(workflow, note = 'generated') {
    const revision = {
      revision_id: workflow.revision_id,
      content_hash: workflow.content_hash,
      note,
      created_at: now(),
      workflow_json: {
        nodes: workflow.nodes,
        edges: workflow.edges,
      },
    };
    workflow.revisions.push(revision);
    return revision;
  }

  createWorkflowRun(workflow) {
    const run = {
      id: id('wfr'),
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      status: 'running',
      created_at: now(),
      updated_at: now(),
      next_log_sequence: 0,
      logs: [],
      output: null,
      output_obj_id: null,
      timer: null,
    };
    this.workflowRuns.set(run.id, run);
    return run;
  }

  appendWorkflowLog(run, { level = 'info', node_id = null, message }) {
    const log = {
      sequence: ++run.next_log_sequence,
      level,
      node_id,
      message,
      timestamp: now(),
    };
    run.logs.push(log);
    run.updated_at = now();
    return log;
  }
}

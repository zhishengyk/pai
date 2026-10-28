# Clean-room Qube / QuantFlow Lab

An independent, runnable implementation of the protocols observed in the public
Qube and QuantFlow bundles. It is **not** a copy of the target source and does
not contain the target's bundles, prompts or backend.

The goal is to make the reverse-engineered contracts executable:

- Qube: conversation → run → resumable event stream → approval → artifact/version.
- QuantFlow: prompt → workflow JSON stage stream → nodes/code → run → logs → output.

## Run

Requires Node.js 18+ (tested with Node 24).

```bash
cd cleanroom
npm start
# or: node server.js
# custom port: PORT=9000 node server.js
```

Open <http://localhost:8787>.

No npm dependencies. State is in memory and resets on restart.

## Test

```bash
cd cleanroom
npm test
# or: node --test
```

The smoke tests cover:

1. Qube conversation → run → `approval.requested` → approve → `run.completed` →
   strategy + backtest artifacts.
2. Qube tool registry (101 tools / 47 capabilities).
3. QuantFlow stage stream → workflow graph → run → logs → output object.

## Qube flow

The UI defaults to `approval_mode: "manual"` so you can click the approval
buttons. The observed client default is `"auto"`; with `auto`, the mock
auto-approves after a short delay.

```text
POST /api/chat/conversations
POST /api/chat/runs
GET  /api/chat/runs/{run_id}/events?after_sequence=0     (SSE)
POST /api/chat/approvals/{approval_id}/resolve           {decision}
GET  /api/chat/conversations/{conversation_id}/artifacts
GET  /api/chat/artifacts/{artifact_id}
```

The same handlers are also mounted under the observed prefix:
`/pandaApi/agent_quant/api/chat/...`.

### Event envelope

This lab uses a simplified named-event envelope for readability:

```json
{
  "sequence": 7,
  "event_id": "evt_...",
  "run_id": "run_...",
  "type": "part.append",
  "data": { "message_id": "msg_...", "part_id": "part_...", "text": "..." }
}
```

The target's observed contract is `{sequence, event_type, mutations[]}` with
`create` / `append` / `patch` mutations over `part_id` / `category` parts. See
[`../code-map/qube.md`](../code-map/qube.md) for the authoritative shape. An
adapter between the two is straightforward; the reducer semantics are the same.

## QuantFlow flow

```text
POST /api/workflow-graph/stream
  {message, model, workflow_session_id?, base_workflow_id?, existing_workflow?}
  -> SSE: intent, architect, workflow_init, workflow_layout,
          workflow_generating, code_merged, workflow_structure_complete,
          result, workflow_complete_success, end

GET  /api/workflow-graph/{workflow_id}
GET  /api/workflow-graph/{workflow_id}/revisions
POST /api/workflow-graph/{workflow_id}/run
GET  /api/workflow-runs/{run_id}/logs?last_sequence=0
GET  /api/workflow-runs/{run_id}/output
POST /api/workflow-runs/{run_id}/terminate
```

The same handlers are mounted under `/pandaApi/quantflow/api/...`. The observed
target also has `/api/workflow/run_with_store`,
`/api/workflow/run/terminate_with_store`, `/api/workflow/run/log` and
`/api/workflow/run/output`; aliases for the core run/log/output calls are
provided.

The mock graph builder supports three deterministic templates: MA crossover,
factor, and generic. It emits original demo Python code, not target code.

## Layout

```text
cleanroom/
  server.js                 HTTP entrypoint
  src/app.js                router + static server
  src/router.js             tiny method/path router
  src/sse.js                SSE helpers
  src/store.js              in-memory conversations/runs/approvals/artifacts/workflows
  src/qube.js               Qube routes + mock agent/approval flow
  src/quantflow.js          QuantFlow stage stream + run/log/output
  src/tools.js              loads the 101/47 catalog
  data/                      machine-readable catalog + endpoint lists
  public/                    vanilla JS UI
  test/smoke.test.js         Node test runner
```

## Deliberate differences from the target

| Area | Target (observed) | This lab |
|---|---|---|
| Qube event envelope | `event_type` + `mutations[]` | named `type` events |
| Qube transport | logged-in SSE/WS route not public | SSE for all runs |
| API envelope | generated client / `{code,data}` in places | direct JSON objects |
| Agent | server-side planner/tools | deterministic mock flow |
| Tools | 101 names + 47 capabilities; schemas not public | names/capabilities + mock handlers |
| QuantFlow execution | real workflow/Notebook sandbox | synthetic logs/output |
| Persistence | server DB / object store | in-memory |

## Safety

- Do not expose this mock as a real code-execution service.
- Do not copy the target's bundles into this repo; use the downloader and code
  map for local analysis.
- The `/api/python/execute` endpoint in the target's public map is a high-risk
  surface; this lab intentionally does not implement arbitrary execution.

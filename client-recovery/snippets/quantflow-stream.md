# QuantFlow `workflow-graph/stream` excerpt

Source (original): `quantflow/assets/Quantflow-CFbBdo_1.js`
SHA-256: `16fac899070aec49e3d89a3d673a0ec5c43a354822d7fba4b28685cca1654187`

Local formatted file:
`/home/duansx/Desktop/pandaaiquant-client-recovered/quantflow/assets/Quantflow-CFbBdo_1.js`

## Request

```js
const c = "/pandaApi/quantflow/api/workflow-graph/stream",
  u = Ne();
let v = null;
try {
  const e = window.serializeWorkflowData;
  if (e && "function" == typeof e) {
    const t = e();
    t && t.nodes && t.nodes.length > 0 && (v = t);
  }
} catch (x) {}
const p = { model: he.value, message: d };
r && r.workflowSessionId && (p.workflow_session_id = r.workflowSessionId);
u && (p.base_workflow_id = u);
v && (p.existing_workflow = v);

const g = ze(o);
g.abortController = new AbortController();
const w = await U(c, {
  method: "POST",
  headers: { "Content-Type": "application/json", uid: s, Authorization: i },
  body: JSON.stringify(p),
  signal: g.abortController.signal,
});
```

`d` is the user message, optionally prefixed by a fenced Python block from the
active node code. `i` is the main-site token from `localStorage`.

## SSE event handling

```js
const O = e.data;
if (O && "[DONE]" !== O && "" !== O)
  try {
    const e = JSON.parse(O),
      t = e?.stage ?? e?.type,
      g = e?.message ?? e?.data?.message;

    if (e.error) throw new Error(e.message || n("agent.serverErrorShort"));

    const f = e.data?.workflow_session_id || e.workflow_session_id;
    if (f && r) r.workflowSessionId = f;

    const j = e.action || e.data?.action,
      q = e.workflow_run_id || e.data?.workflow_run_id,
      z = e.workflow_id || e.data?.workflow_id;

    switch (t) {
      case "architect":
      case "workflow_layout":
      case "workflow_generating":
      case "code_merged":
      case "workflow_structure_complete":
      case "result":
        if (g) o = g;
        break;
      case "workflow_init":
        if (e.data?.nodes) {
          r.messages[a].workflowData = {
            progress: 0,
            nodes: Object.entries(e.data.nodes).map(([uuid, name]) => ({
              uuid, name, status: "waiting", expanded: false,
            })),
          };
        }
        break;
      case "workflow_complete_success":
        r.messages[a].workflowData.progress = 1;
        break;
      case "END":
        // endMessage, total_time, revision_id, content_hash, progress = 1
        break;
    }

    if (e.data?.workflow_json) {
      await window.setWorkflowDataFromSSE(e.data.workflow_json, {
        isFinal: e.data.workflow_progress === 1,
        routeSignature: m,
      });
    }

    if (e.data?.workflow_progress !== undefined)
      workflowData.progress = e.data.workflow_progress;

    if (e.data?.node_desc_map) {
      for (const [uuid, value] of Object.entries(e.data.node_desc_map)) {
        // mark node completed; attach description and time
      }
    }
  } catch (x) {}
```

Important details:

- The server event type is read as **`stage` first, then `type`**.
- The parser accepts `text/event-stream`, NDJSON/`application/stream+json`, and
  stops on `[DONE]`.
- `workflow_session_id`, `workflow_id` and `workflow_run_id` may be top-level or
  nested under `data`.
- `action: "run_workflow"` can trigger external workflow execution.
- `revision_id` / `content_hash` are stored on the assistant message; `END`
  writes `total_time`, final progress and revision.
- `node_desc_map` is `uuid -> string | { description, time }`.

The full stage/contract tables are in
[`../../code-map/quantflow.md`](../../code-map/quantflow.md) and
[`../../code-map/contracts.md`](../../code-map/contracts.md).

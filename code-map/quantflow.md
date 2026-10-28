# QuantFlow Front-end Code Map

QuantFlow is the public `/quantflow/` application: Vue 3 + Vue Router + Element
Plus + Monaco + `marimo-iframe`. Its agent turns a prompt into a workflow JSON
graph, streams generation stages, syncs the graph to the canvas/Notebook, then
runs the workflow and polls logs.

## Assets

| File | Bytes | Role |
|---|---:|---|
| `assets/Quantflow-CFbBdo_1.js` | 328,749 | Chat/agent pane, workflow-graph stream, node descriptions, checkpoint, run/log |
| `assets/main-C0byxrRt.js` | 13,838,062 | Vendor/main bundle; streaming response detection (`text/event-stream`, NDJSON) |
| `assets/Workflow-CA6TBoMa.js` | 3,779 | Workflow shell; `/workflow/editor` route |
| `assets/SidebarLayout-DQ6ickQk.js` | 102,060 | Sidebar; `/api/workflow/run/list` |
| `assets/Header-ByqjsPNw.js` | 87,758 | `/workflow/editor?key=...` creation navigation |
| `assets/TqxHelpDocs-BdJkiJIa.js` | 23,376 | Public help docs: `SKILLS_OVERVIEW_tqx.md`, `SYSTEM_PROMPT_tqx.md` (EN/zh-TW) |

Offsets and hashes: [`inventory.json`](inventory.json). Bundles are not
committed; see [`README.md`](README.md).

## 1. Routes and entry points

Observed route wiring:

```text
/quantflow/workflow/editor?workflow_id=<id>
/quantflow/workflow/created
/quantflow/tqx-pay?redirectUrl=...
```

The editor is the main surface. The chat/agent pane is embedded in the workflow
editor; it is not a separate “chat product” in the way Qube is.

## 2. `workflow-graph/stream` request

Endpoint (character offset 146,958):

```text
POST /pandaApi/quantflow/api/workflow-graph/stream
```

Request body construction (offset 146,982):

```js
const p = { model: he.value, message: d };
if (r?.workflowSessionId) p.workflow_session_id = r.workflowSessionId;
if (baseWorkflowId)       p.base_workflow_id = baseWorkflowId;
if (existingWorkflow)     p.existing_workflow = existingWorkflow;
```

`existing_workflow` comes from `window.serializeWorkflowData()` when the canvas
already has nodes. The request uses an `AbortController`, so the client can cancel
a generation.

`message` may be prefixed with quoted Python code from the active node:
the client builds a fenced code block before calling the stream.

The request also sends the main-site `Authorization` token and `uid` headers,
and uses an `AbortController` so a generation can be cancelled.

## 3. Stage machine

The client reads the event type as **`event.stage ?? event.type`**. The payload
can also carry `event.message`, `event.action` (`run_workflow`), `event.workflow_id`,
`event.workflow_run_id`, and `event.data.workflow_session_id`. The SSE/NDJSON
reader stops on `[DONE]`.

Observed stages:

| Stage | Meaning | Client effect |
|---|---|---|
| `intent` | Classified user intent | Stores `intentData` |
| `architect` | Planning / graph decomposition | Progress message |
| `workflow_init` | Node skeleton | Creates `workflowData.nodes` from `data.nodes` (uuid → name) |
| `workflow_layout` | Initial layout / partial graph | Updates progress/graph |
| `workflow_generating` | Node code generation | Updates `workflow_progress`, node status |
| `code_merged` | Code merged into nodes | Updates progress/graph |
| `workflow_structure_complete` | Graph structure final | Writes `workflow_json`, `revision_id`, `content_hash` |
| `result` | Final result | Writes final `workflow_json`, progress |
| `workflow_complete_success` | Success terminal | Sets progress = 1 |
| `END` | Stream end | Sets `totalTime`, finalizes revision/content hash |

The same event can carry `workflow_session_id`, `workflow_id`,
`workflow_run_id`, `action`, and `message` at the top level or inside `data`.
The client stores `workflowSessionId` on the message/session and can trigger
`run_workflow` externally when `action` is present.

Fields observed in event payloads:

```ts
type WorkflowStageEvent = {
  type: string;
  data: {
    workflow_progress?: number;          // 0..1
    workflow_json?: WorkflowJson;
    node_desc_map?: Record<string,
      | string
      | { description?: string; time?: string }
    >;
    revision_id?: string;
    content_hash?: string;
    total_time?: string;
    nodes?: Record<string, string>;      // uuid -> display name
    intent?: string;
  };
};
```

Client state built from these events:

```ts
workflowData = {
  progress: number,
  nodes: Array<{
    uuid: string,
    name: string,
    status: "waiting" | "running" | "completed",
    expanded: boolean,
    description?: string,
    time?: string,
  }>,
  endMessage?: string,
  totalTime?: string,
};
revisionId?: string;
contentHash?: string;
```

Key handlers:

- `workflow_init` maps `data.nodes` entries to `{ uuid, name, status: "waiting" }`.
- `node_desc_map` marks matching nodes `completed`, attaches `description` and
  optional `time`.
- `workflow_progress >= 0.99` (or `=== 1`) is treated as final.
- `window.setWorkflowDataFromSSE(workflow_json, { isFinal, routeSignature })`
  applies the graph to the editor.
- `revision_id` and `content_hash` are stored on the assistant message for
  checkpoint/revision matching.

## 4. Sessions, revisions and checkpoint

Observed checkpoint call (offset 140,002):

```text
GET/POST /pandaApi/quantflow/api/workflow-graph/sessions/checkpoint
  ?session_id=<session>&revision_id=<revision>
```

Response shape:

```ts
{
  code: 0,
  data: {
    workflow_json: WorkflowJson,
    revision_id?: string,
    ...
  }
}
```

The client:

- calls it when the user selects a historical revision;
- applies `data.workflow_json` through `setWorkflowDataFromSSE`;
- sets `currentRevisionId`;
- matches messages by `revisionId` or `checkpoint_content_hash`;
- uses `content_hash` to find the assistant message that produced the current
  graph.

Related endpoints:

```text
/api/workflow-graph/sessions/list
/api/workflow-graph/sessions/bind-workflow
/api/workflow-graph/sessions/query
```

This is the revision/rollback layer: the graph is a versioned object, not just a
chat message.

## 5. Run, logs and output

Run creation (offset 241,225):

```text
POST /api/workflow/run_with_store
{ workflow_id, server_cpu, server_memory, server_gpu }
-> { workflow_run_id }
```

Termination (offset 242,843):

```text
POST /api/workflow/run/terminate_with_store
{ workflow_run_id }
```

Log polling (offset 278,484):

```text
GET /api/workflow/run/log
  ?workflow_id=<id>
  &workflow_run_id=<run>
  &last_sequence=<n>
  &log_level=<level>
  &work_node_id=<node>
-> { logs: [...] }
```

The client keeps `last_sequence`, appends new logs, and optionally filters by
node and level. Output is fetched separately by object id:

```text
GET /api/workflow/run/output?output_obj_id=<id>
```

Other observed run/list endpoints:

```text
GET  /api/workflow/run/list
GET  /api/workflow/query
GET  /api/workflow/all
POST /api/workflow/run
POST /api/workflow/run_with_store
```

The run output is an object-store reference (`output_obj_id`), not a blob inside
the run row. This is the same “large object separate from run metadata” design
seen in Qube.

## 6. Node system and Notebook sync

Observed globals/helpers:

- `window.serializeWorkflowData()` reads the canvas graph.
- `window.setWorkflowDataFromSSE(workflow_json, options)` writes a graph into the
  editor.
- `marimo-iframe` hosts the Notebook surface.
- `/api/notebook/workflow/{id}/url` opens the Notebook server.
- `/api/notebook/node-source/batch` fetches node source.
- `/api/notebook/cell/parse-and-validate` validates cell source.
- `/api/python/execute` exists in the public endpoint map; it is a high-risk
  execution surface and is not implemented in the clean-room.

The workflow JSON is the source of truth; the canvas and Notebook are two views
of the same node graph. The stream’s `workflow_json` is therefore the key object
to persist, version and hash.

## 7. Prompt and skill documentation in the public client

This is a correction to the earlier “prompts are unknown” assumption. The
QuantFlow public assets include a help-docs component that ships two Markdown
documents in English and Traditional Chinese:

- `SKILLS_OVERVIEW_tqx.md`
- `SYSTEM_PROMPT_tqx.md`

File: `assets/TqxHelpDocs-BdJkiJIa.js` (23,376 bytes, SHA-256
`3de4bfcf115b6947fc2490d438ea3bae3a0c5499835cbbc5d5f3c266b7b84422`).
The docs are rendered in the UI and can be downloaded.

What they reveal:

- The system prompt is assembled by a server-side `_build_prompt` function from
  layers, in order: date header, identity/standing instructions, the
  `<available_skills>` catalog, tool-usage rules, base role prompt, primary task
  and guidelines, injected context, and a language lock.
- The skill/tool catalog includes names such as `tqx_stock_market`,
  `tqx_stock_indicator`, `tqx_stock_analysis`, `tqx_stock_reference`,
  `analysis_technical`, `compute_python`, `data_merge`, `factor_*`, `model_*`,
  `workflow_*`, `plugin_*`, `backtest_*`, `rag_api`, `rag_factor`, `fx_rates`,
  `load_result`, and the `srs_xxx` result-chaining convention.
- The docs mention server-side files such as `agent_runtime/orchestrator.py` and
  describe the difference between supervisor and worker prompt layers.
- They are **specification/help docs**, not the complete server-side prompt
  string or the tool implementations. The actual prompt assembly, tool dispatch
  and execution remain server-side.

Qube’s public shell does not expose an equivalent prompt document. It does
expose 101 tool names and 47 capability names in i18n, plus user-facing card
prompt suggestions, but no system prompt or tool schemas in the public chunks.
The logged-in `/chat` chunks could contain more UI-related prompt strings; that
requires authorized access to verify.

## 8. What is still unknown

- Exact server-side node schema and validation rules.
- Whether `workflow_json` is stored as a whole document or normalized per node.
- Complete server-side prompt strings and model routing. The public help docs
  expose the prompt layers, skill catalog and usage rules, but not the full
  assembled prompt.
- Sandboxing and resource limits behind `/api/python/execute`.
- Full SSE envelope: the client parser accepts `text/event-stream`,
  NDJSON/`application/x-ndjson`, and stops on `[DONE]`; the exact server framing
  is not fully visible.

Short excerpts with exact offsets are in
[`snippets/quantflow-stream.md`](snippets/quantflow-stream.md) and
[`snippets/quantflow-prompt-docs.md`](snippets/quantflow-prompt-docs.md).

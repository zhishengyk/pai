# Consolidated Contracts

This file normalizes the endpoints and event shapes extracted from the public
bundles. Paths are shown relative to the app prefix unless marked otherwise.

- Qube prefix: `/pandaApi/agent_quant`
- QuantFlow prefix: `/pandaApi/quantflow`
- Main-site API prefix: `/pandaApi`

## 1. Qube chat / approval / artifact endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/chat/models` | Models |
| GET | `/api/chat/conversations` | List (`offset`, `limit`, `archived`) |
| POST | `/api/chat/conversations` | Create (`{title}`) |
| PATCH | `/api/chat/conversations/{conversation_id}` | Update |
| DELETE | `/api/chat/conversations/{conversation_id}` | Delete |
| GET | `/api/chat/conversations/{conversation_id}/messages` | History (`before_sequence`) |
| POST | `/api/chat/runs` | Create run |
| POST | `/api/chat/runs/{run_id}/retry` | Retry |
| POST | `/api/chat/runs/{run_id}/cancel` | Cancel |
| POST | `/api/chat/messages/{message_id}/resend` | Edit + resend |
| PUT | `/api/chat/messages/{message_id}/feedback` | Feedback |
| GET | `/api/chat/conversations/{conversation_id}/artifacts` | List artifacts |
| POST | `/api/chat/conversations/{conversation_id}/artifacts` | Create artifact |
| DELETE | `/api/chat/conversations/{conversation_id}/artifacts/{artifact_type}/{artifact_id}` | Delete artifact |
| GET | `/api/strategy-drafts/{draft_id}` | Strategy draft |
| GET | `/api/chat/strategy-transcription/platforms` | Transcription platforms |
| GET | `/api/quant-skills` | QuantSkill search |
| GET | `/api/quant-skill-runs/page` | QuantSkill run page |
| GET | `/api/quant-skill-runs/{run_id}` | QuantSkill run detail |
| POST | `/api/chat/conversations/{conversation_id}/completion/read` | Mark completion read |
| POST | `/api/chat/conversations/{conversation_id}/failure/read` | Mark failure read |
| POST | `/api/chat/runs/{run_id}/strategy-create-approvals/{approval_id}/resolve` | Strategy create decision |
| GET | `/api/chat/runs/{run_id}/strategy-create-approvals/{approval_id}/draft` | Strategy create draft |
| POST | `/api/chat/runs/{run_id}/strategy-run-approvals/{approval_id}/resolve` | Backtest decision |
| GET | `/api/chat/runs/{run_id}/strategy-mutation-approvals/{approval_id}/detail` | Mutation detail |
| POST | `/api/chat/runs/{run_id}/strategy-mutation-approvals/{approval_id}/resolve` | Mutation decision |
| GET | `/api/chat/runs/{run_id}/strategy-version-approvals/{approval_id}/detail` | Version detail |
| POST | `/api/chat/runs/{run_id}/strategy-version-approvals/{approval_id}/resolve` | Version decision |
| POST | `/api/chat/runs/{run_id}/factor-create-approvals/{approval_id}/resolve` | Factor create decision |
| GET | `/api/chat/runs/{run_id}/factor-create-approvals/{approval_id}/draft` | Factor create draft |

Source: [`../pandaaiquant-agent-reverse/research/qube_chat_endpoints.json`](../pandaaiquant-agent-reverse/research/qube_chat_endpoints.json).

### Qube run request

```json
{
  "input": "string",
  "model": "string",
  "reasoning_effort": "string?",
  "approval_mode": "auto",
  "active_strategy_id": "string?",
  "active_strategy_dirty": false,
  "active_factor_id": "string?",
  "active_factor_dirty": false,
  "active_simulation_account_id": "string?",
  "quant_skill_id": "string?"
}
```

### Qube event envelope

```ts
{
  sequence: number,
  event_type: string,
  mutations: Array<
    | { op: "create", part: Part }
    | { op: "append", part_id: string, field: "content", delta: string }
    | { op: "patch", part_id: string, patch: Partial<Part> }
  >,
  redis_stream_id?: string,
  created_at?: string
}
```

`Part`:

```ts
{
  part_id: string,
  category: "text" | "activity" | "card",
  content?: string,
  message_params?: object,
  data?: object,
  status?: "running" | "completed" | "failed" | "cancelled",
  end_sequence?: number,
  finished_at?: string
}
```

Snapshot:

```ts
{
  parts: Part[],
  last_projected_sequence: number,
  last_projected_redis_id: string | null
}
```

## 2. QuantFlow workflow graph / session endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/workflow-graph/stream` | Prompt → graph stage stream |
| GET | `/api/workflow-graph/sessions/list` | Session list |
| POST | `/api/workflow-graph/sessions/checkpoint` | Load a revision (`session_id`, `revision_id`) |
| POST | `/api/workflow-graph/sessions/bind-workflow` | Bind session to workflow |
| GET | `/api/workflow-graph/sessions/query` | Query sessions |
| GET | `/api/workflow/all` | All workflows |
| POST | `/api/workflow/query` | Query workflow |
| POST | `/api/workflow/save` | Save workflow |
| POST | `/api/workflow/delete` | Delete workflow |

### `workflow-graph/stream` request

```json
{
  "model": "string",
  "message": "string",
  "workflow_session_id": "string?",
  "base_workflow_id": "string?",
  "existing_workflow": {
    "nodes": [],
    "edges": []
  }
}
```

### QuantFlow stage event

The client reads the event type as `stage ?? type`. The top level may also carry
`message`, `action` (`run_workflow`), `workflow_id`, `workflow_run_id` and
`workflow_session_id`; the reader stops on `[DONE]`.

```ts
{
  stage?: string;
  type:
    | "intent"
    | "architect"
    | "workflow_init"
    | "workflow_layout"
    | "workflow_generating"
    | "code_merged"
    | "workflow_structure_complete"
    | "result"
    | "workflow_complete_success"
    | "END",
  data: {
    workflow_progress?: number,
    workflow_json?: {
      nodes: Array<{
        uuid: string,
        name: string,
        type?: string,
        position?: { x: number, y: number },
        code?: string,
        description?: string
      }>,
      edges: Array<{ source: string, target: string }>,
      revision_id?: string,
      content_hash?: string
    },
    node_desc_map?: Record<string, string | { description?: string, time?: string }>,
    revision_id?: string,
    content_hash?: string,
    total_time?: string,
    nodes?: Record<string, string>,
    intent?: string
  },
  message?: string,
  action?: "run_workflow" | string,
  workflow_id?: string,
  workflow_run_id?: string,
  workflow_session_id?: string
}
```

## 3. QuantFlow run / log / output endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/workflow/run_with_store` | Start run (`workflow_id`, server spec) |
| POST | `/api/workflow/run/terminate_with_store` | Terminate (`workflow_run_id`) |
| GET | `/api/workflow/run/log` | Logs (`workflow_id`, `workflow_run_id`, `last_sequence`, `log_level`, `work_node_id`) |
| GET | `/api/workflow/run/output` | Output by `output_obj_id` |
| GET | `/api/workflow/run/list` | Run list |
| GET | `/api/workflow/run/snapshot` | Run snapshot |
| POST | `/api/workflow/run` | Run workflow |
| GET | `/api/workflow/all` | Workflow list |
| GET | `/api/workflow/query` | Workflow query |

## 4. QuantFlow chat/assistant streams

All are `POST` streaming endpoints under `/pandaApi/quantflow`:

```text
/api/chat/backtest-assistant-stream
/api/chat/backtest-hk-assistant-stream
/api/chat/backtest-us-assistant-stream
/api/chat/code-assistant-stream
/api/chat/custom-stock-assistant-stream
/api/chat/factor-assistant-stream
/api/chat/factor-explorer-assistant-stream
/api/chat/market-data-assistant-stream
/api/chat/skill-assistant-stream
/api/chat/workflow-assistant-stream
/api/workflow-live-trading/chat-stream
```

## 5. QuantFlow Notebook / execution / assets

| Group | Paths |
|---|---|
| Notebook | `/api/notebook/workflow/{id}/url`, `/api/notebook/node-source/batch`, `/api/notebook/cell/parse-and-validate` |
| Execution | `/api/python/execute` (high risk; not implemented in clean-room) |
| Asset library | `/api/asset-library/list`, `/folders`, `/folder`, `/object`, `/delete`, `/download`, `/download-zip`, `/pool/categories`, `/pool/tiers`, `/upload` |
| Backtest | `/api/backtest/userstrategylog`, `/api/backtest/userstrategylog/export` |
| Factor | `/api/factor`, `/api/factor/` |
| Plugins/workspace | `/api/plugins/save`, `/api/plugins/upload`, `/api/workspace-files/upload` |
| Scheduling | `/api/workflow_schedule/create`, `/delete`, `/get_detail`, `/update` |

Full list: [`../pandaaiquant-agent-reverse/research/quantflow_endpoints.json`](../pandaaiquant-agent-reverse/research/quantflow_endpoints.json).

## 6. Prompt / skill documentation (QuantFlow public client)

`assets/TqxHelpDocs-BdJkiJIa.js` exposes `SYSTEM_PROMPT_tqx.md` and
`SKILLS_OVERVIEW_tqx.md` (EN/zh-TW). The system prompt layers are documented as:

```text
date header
identity / standing instructions
<available_skills> catalog
tool-usage rules + patterns
base role prompt
primary task & guidelines
injected context (memory / history / prior results)
language lock
```

The skill catalog names `tqx_stock_market`, `tqx_stock_indicator`,
`tqx_stock_analysis`, `tqx_stock_reference`, `analysis_technical`,
`compute_python`, `data_merge`, `factor_*`, `model_*`, `workflow_*`, `plugin_*`,
`backtest_*`, `rag_api`, `rag_factor`, `fx_rates`, `load_result` and the
`srs_xxx` result-chaining convention.

This is documentation, not the complete server-side prompt string or tool
implementation. Qube's public shell exposes tool/capability names in i18n but no
equivalent system-prompt document.

## 7. Clean-room mapping

The clean-room mock implements the core flows under both the plain `/api/...`
prefix and the observed app prefix.

| Observed | Clean-room |
|---|---|
| `POST /pandaApi/agent_quant/api/chat/runs` | `POST /api/chat/runs` (same handler) |
| `GET /pandaApi/agent_quant/api/chat/runs/{id}/events` | `GET /api/chat/runs/{id}/events` (SSE) |
| `POST .../strategy-run-approvals/{id}/resolve` | same path, plus generic `/api/chat/approvals/{id}/resolve` |
| `POST /pandaApi/quantflow/api/workflow-graph/stream` | `POST /api/workflow-graph/stream` (SSE) |
| `POST /pandaApi/quantflow/api/workflow/run_with_store` | `POST /api/workflow-graph/{id}/run` and `/api/workflow/run` |
| `GET /pandaApi/quantflow/api/workflow/run/log` | `GET /api/workflow-runs/{id}/logs` and `/api/workflow/run/log` |
| `GET /pandaApi/quantflow/api/workflow/run/output` | `GET /api/workflow-runs/{id}/output` and `/api/workflow/run/output` |

The mock returns direct JSON objects (not the target's
`{code, data, message}` envelope) and uses a simplified named-event envelope for
Qube. The target's observed shapes are documented above; adapters are trivial.

## 8. Security notes

- Never execute untrusted node code through `/api/python/execute` without a
  sandbox, resource quotas, dependency allowlists and audit logging.
- Approval resolution must verify that `approval_id` belongs to `run_id` and to
  the caller's tenant.
- `output_obj_id` and `revision_id` must be authorized on read; they are object
  references, not capabilities.
- Treat `content_hash` as an integrity check, not as authentication.

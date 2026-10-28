# Qube Front-end Code Map

Qube is the `/agent_quant/` application. The public shell is a React Router 7
app; the `/chat` route is only delivered after main-site authentication. This map
covers the public shell, the extracted chat API module, and the client-side event
projector.

## Assets

| File | Bytes | Role |
|---|---:|---|
| `assets/chat-api-BkRzIk_k.js` | 8,645 | REST client, event projector, approval calls |
| `assets/query-keys-hu8Y4jsT.js` | 90,101 | API client, base URL, token header, 401 interceptor |
| `assets/auth-provider-C7ie0Npj.js` | 3,278 | Main-site user bootstrap / auth state |
| `assets/input-BSBalGud.js` | 503,144 | i18n strings, including 101 tool names and 47 capabilities |
| `assets/index-redirect-C-0hC5Fc.js` | 151 | Public `/agent_quant/` redirect to `/chat` |

The exact hashes and symbol offsets are in [`inventory.json`](inventory.json).
The bundles are not committed; see [`README.md`](README.md).

## 1. Base URL and authentication

The API client is constructed with:

```js
ue = "/pandaApi/agent_quant";
fe = "/login";
pe = "/pandaApi";
```

`query-keys-hu8Y4jsT.js` stores three main-site values in `localStorage`:

```js
{ token: "token", refreshToken: "refreshToken", uid: "userid" }
```

- `Ae()` reads `localStorage.getItem("token")`.
- `Be(locale)` returns `Authorization: <token>` plus locale headers.
- The client handles `401` globally, but skips `/api/auth/me` to avoid a refresh
  loop, then clears auth state and redirects through `/login?redirect=...`.
- `auth-provider-C7ie0Npj.js` validates a main-site user object
  (`id`, `username`, optional avatar) and subscribes to `localStorage` changes.
- The public i18n text confirms the intended design:
  “Open Qube from the main site so the Java gateway can inject your token and
  user identity.”

So Qube itself is not a password-login app: it is a downstream app behind the
main-site SSO / Java gateway.

Relevant points: `query-keys` character offsets 1,340–2,340 (base/auth constants),
4,327 (`Authorization`), 86,287 (`/api/auth/me` 401 interceptor).

## 2. Chat REST API

All paths below are relative to `/pandaApi/agent_quant`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/chat/models` | Available models |
| GET | `/api/chat/conversations` | Conversation list (`offset`, `limit`, `archived`) |
| POST | `/api/chat/conversations` | Create conversation (`{title}`) |
| PATCH | `/api/chat/conversations/{conversation_id}` | Rename / update |
| DELETE | `/api/chat/conversations/{conversation_id}` | Delete |
| GET | `/api/chat/conversations/{conversation_id}/messages` | Message history (`before_sequence`) |
| POST | `/api/chat/runs` | Create a run |
| POST | `/api/chat/runs/{run_id}/retry` | Retry a run |
| POST | `/api/chat/runs/{run_id}/cancel` | Cancel a run |
| POST | `/api/chat/messages/{message_id}/resend` | Edit and resend |
| PUT | `/api/chat/messages/{message_id}/feedback` | Up/down feedback |
| GET | `/api/chat/conversations/{conversation_id}/artifacts` | List artifacts |
| POST | `/api/chat/conversations/{conversation_id}/artifacts` | Create artifact |
| DELETE | `/api/chat/conversations/{conversation_id}/artifacts/{artifact_type}/{artifact_id}` | Delete artifact |
| GET | `/api/strategy-drafts/{draft_id}` | Read strategy draft |
| GET | `/api/chat/strategy-transcription/platforms` | Platform status |
| GET | `/api/quant-skills` | QuantSkill search |
| GET | `/api/quant-skill-runs/page` | QuantSkill run page |
| GET | `/api/quant-skill-runs/{run_id}` | QuantSkill run detail |

The complete 30-endpoint list, including the five approval families, is in
[`../pandaaiquant-agent-reverse/research/qube_chat_endpoints.json`](../pandaaiquant-agent-reverse/research/qube_chat_endpoints.json).

### Run creation body

`chat-api-BkRzIk_k.js` (offset 4,645):

```js
POST /api/chat/runs
{
  input,
  model,
  reasoning_effort,
  approval_mode: "auto",            // default
  active_strategy_id,
  active_strategy_dirty: false,
  active_factor_id,
  active_factor_dirty: false,
  active_simulation_account_id?,    // omitted when absent
  quant_skill_id?
}
```

The run is the unit of execution. The conversation is the container; the run is
the thing with sequence numbers, approvals, cancellation, retry and terminal
states.

### Resend body

Resend is a new run with the edited input and the active context:

```js
POST /api/chat/messages/{message_id}/resend
{
  input, model, reasoning_effort,
  approval_mode: "auto",
  active_strategy_id, active_strategy_dirty,
  active_factor_id, active_factor_dirty,
  active_simulation_account_id?, quant_skill_id?
}
```

## 3. Event projector: the most important part

`chat-api-BkRzIk_k.js` contains a pure reducer, not just REST calls. This is the
core of Qube's resumable streaming model.

Observed event shape:

```ts
type QubeEvent = {
  sequence: number;
  event_type: string;              // run.completed / run.failed / run.cancelled / ...
  mutations: Mutation[];
  redis_stream_id?: string;
  created_at?: string;
};

type Part = {
  part_id: string;
  category: "text" | "activity" | "card";
  content?: string;
  message_params?: object;
  data?: object;
  status?: string;
  end_sequence?: number;
  finished_at?: string;
};

type Mutation =
  | { op: "create"; part: Part }
  | { op: "append"; part_id: string; field: "content"; delta: string }
  | { op: "patch"; part_id: string; patch: Partial<Part> };
```

Reducer behavior (character offset 1,394 for `event_type`):

1. Parse `sequence`; ignore non-finite values and events with
   `sequence <= lastSequence` (dedupe / resume).
2. Apply each validated mutation in order:
   - `create`: ignore if `part_id` already exists; otherwise append the part.
   - `append`: only `field === "content"` and only for non-card parts; concatenate
     `delta`.
   - `patch`: merge `patch` into the existing part.
3. On `run.completed` / `run.failed` / `run.cancelled`, convert every running
   part to `completed` / `failed` / `cancelled`, set `end_sequence` and
   `finished_at`.
4. Store `lastSequence` and `lastRedisId` for the next resume.
5. Snapshot hydration uses `parts`, `last_projected_sequence` and
   `last_projected_redis_id`.
6. Text rendering concatenates only `category === "text"` parts.

This means the client can:

- replay from a sequence number after reconnect;
- deduplicate overlapping events;
- fold text/activity/card parts without a full message re-fetch;
- terminate running parts deterministically when a run ends.

The clean-room implementation in [`../cleanroom`](../cleanroom) uses a simplified
named-event envelope (`part.create`, `part.append`, `part.patch`) for
readability. The observed `event_type` + `mutations` shape is the authoritative
contract; an adapter is straightforward.

## 4. Approval model

Qube has five approval families. Each has a resolve endpoint, and most have a
draft/detail endpoint:

| Approval | Resolve | Draft/detail |
|---|---|---|
| Strategy create | `POST /api/chat/runs/{run_id}/strategy-create-approvals/{approval_id}/resolve` | `GET .../draft` |
| Strategy run (backtest) | `POST /api/chat/runs/{run_id}/strategy-run-approvals/{approval_id}/resolve` | — |
| Strategy mutation | `POST /api/chat/runs/{run_id}/strategy-mutation-approvals/{approval_id}/resolve` | `GET .../detail` |
| Strategy version | `POST /api/chat/runs/{run_id}/strategy-version-approvals/{approval_id}/resolve` | `GET .../detail` |
| Factor create | `POST /api/chat/runs/{run_id}/factor-create-approvals/{approval_id}/resolve` | `GET .../draft` |

The resolve body is `{ decision }`; strategy-create may also carry a `backtest`
object. The client calls these through typed wrappers in `chat-api`.

The important invariant is domain-level: an approval belongs to a run, and
resolving it is what unlocks the next execution step. The UI does not poll a
generic “task”; it projects approval parts/events and then continues the run.

## 5. Tool and capability registry

`research/qube_agent_tools.json` records:

- **101 tool names** (e.g. `listSimulationAccounts`,
  `requestSimulationAccountSelection`, `createSimulationAccount`);
- **47 capability names** (e.g. `simulationAccount`, `strategyLibrary`,
  `strategyRun`, `strategyManage`, `strategyOptimize`).

Source: `assets/input-BSBalGud.js` (i18n block). The public bundle exposes the
display names and grouping, not the server-side JSON schemas or implementations.
Any parameter schema in the clean-room is an explicitly labelled mock.

The same i18n file also contains user-facing card `prompt` suggestions (for
example a Hong Kong MA-trend card). These are starter prompts shown in the UI,
not the system prompt. No Qube system-prompt document or tool schema was found in
the 40 public chunks.

## 6. Artifacts and versions

Observed artifact operations:

- list/create/delete per conversation;
- read strategy draft by `draft_id`;
- artifact types include strategy, factor, backtest report, factor analysis;
- artifacts carry a version counter and content; the UI can open a version.

The report's appendices and the clean-room artifact model show one concrete
shape. The real server schema is not visible in the public bundle.

## 7. What is still unknown

- The exact SSE/WebSocket URL and transport for logged-in `/chat` runs. The
  reducer is public, but the transport wiring is in the login-gated route.
- Server-side tool schemas, prompts, model routing and execution sandbox.
- Database schema and how `redis_stream_id` maps to Redis streams.
- Whether approval decisions are idempotent on the server (the client treats
  them as typed commands).

Short excerpts with exact offsets are in
[`snippets/qube-chat-api.md`](snippets/qube-chat-api.md).

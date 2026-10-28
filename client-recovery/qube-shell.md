# Qube Public Shell

The public `agent_quant` shell is bigger than the route manifest suggests. The
`root` chunk contains the layout/sidebar and conversation chrome; the `/chat`
route component and run transport are still login-gated.

## What the public root actually contains

Source: `assets/root-DnwXMQLu.js` (58,043 bytes; formatted locally).

- App sidebar with collapse state (`qube.sidebar_collapsed`) and conversation
  list height (`qube.sidebar_conversation_list_height`).
- Navigation actions:
  - `/chat` (new chat and conversation links `/chat/{id}`),
  - `/strategies`,
  - `/factors`,
  - `/backtests`,
  - `/optimizations`,
  - `/trading`,
  - `/market`,
  - `/skills`,
  - `/settings`.
- Conversation list backed by `chat-api`: create, rename, pin, delete,
  approval-required badge, loading/empty states.
- Notifications dialog with unread count, paging, “mark all read”.
- Wallet polling (5s interval) and user/auth chrome.
- Links back to the main site / personal center.
- `index-redirect` sends `/agent_quant/` to `/chat`.

The `root` chunk imports `chat-api-BkRzIk_k.js` for conversation operations; it
does not contain the actual message/run UI. The `/chat` route component and its
SSE/WS transport are delivered after main-site authentication.

## Auth and API shell

| Piece | File | Observation |
|---|---|---|
| Base URL | `query-keys-hu8Y4jsT.js` | `/pandaApi/agent_quant` |
| Token | `query-keys-hu8Y4jsT.js` | `localStorage.token` → `Authorization` |
| Login | `query-keys-hu8Y4jsT.js` | `/login?redirect=...` |
| 401 | `query-keys-hu8Y4jsT.js` | interceptor skips `/api/auth/me` |
| User bootstrap | `auth-provider-C7ie0Npj.js` | main-site user shape + storage events |
| Chat REST | `chat-api-BkRzIk_k.js` | conversations, runs, approvals, artifacts |
| Event projector | `chat-api-BkRzIk_k.js` | `event_type` + `mutations[]` |
| Tool registry | `input-BSBalGud.js` | 101 tools / 47 capabilities (i18n) |

## What is still gated

- `/chat` route component and message composer.
- The run event transport URL and framing.
- Real SSE/WS event samples.
- System prompt and tool schemas.
- Approval card rendering for the gated route.

This is why the public shell can be fully recovered while Qube’s chat runtime
cannot be completed from unauthenticated assets alone.

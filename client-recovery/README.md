# Client De-shelling & Recovery

Static recovery of the **public client surface** of Qube and QuantFlow. This is
the “remove the shell and look inside” deliverable: every public chunk was
inventoried, parsed, linked, and (locally) formatted. It is not the original
engineering source, and it does not include server-side code.

## Method

1. **REA 6.8.0** `analyze-javascript-application` for static application /
   semantic analysis. QuantFlow has a complete evidence bundle (143 parsed JS
   files, 90,899 semantic nodes, 162,339 relations). Qube has an app-level evidence
   bundle for 25 application files (37,021 semantic nodes / 44,481 relations);
   i18n and vendor chunks are covered by the AST inventory.
2. **Babel AST inventory** (`tools/scan_client.mjs`) over every public `.js`
   file: imports, exports, top-level declarations, functions/classes,
   components, API paths, route strings, prompt-like strings.
3. **Prettier local recovery** (`tools/recover_local.py`): 212 public chunks
   formatted into a readable tree, 1 large vendor bundle copied raw. The tree is
   **local-only** and is not committed.

## Results

| App | Files | Parsed | Unique API paths | Route candidates | Components | Notes |
|---|---:|---:|---:|---:|---:|---|
| Qube `agent_quant` | 42 | 39 | 30 | 19 | 0 | Public layout/sidebar/chat API; `/chat` route + transport are login-gated |
| QuantFlow | 175 | 143 | 178 | 42 | 159 | Full public editor/agent app |

QuantFlow semantic graph: **90,899 nodes / 162,339 relations** from REA.
Qube app evidence: **25 app files parsed, 37,021 semantic nodes / 44,481
relations**; the i18n and vendor chunks are covered by the AST inventory.

## What is inside

### Qube

- `assets/chat-api-BkRzIk_k.js`: REST client + event projector. The projector
  folds `event_type` + `mutations[]` (`create` / `append` / `patch`) over
  `part_id` / `category` (`text` / `activity` / `card`) and handles
  `run.completed` / `run.failed` / `run.cancelled`.
- `assets/query-keys-hu8Y4jsT.js`: `/pandaApi/agent_quant` client, token header,
  `/api/auth/me` 401 interceptor, `/login?redirect=...`.
- `assets/auth-provider-C7ie0Npj.js`: main-site user bootstrap / storage sync.
- `assets/input-BSBalGud.js`: i18n, 101 tool names, 47 capabilities, card prompt
  suggestions.
- `assets/index-redirect-C-0hC5Fc.js`: public `/agent_quant/` → `/chat`.
- `assets/root-*.js`: public app layout/sidebar, conversation list, wallet/auth
  chrome and links to `/chat`.
- The `/chat` route component and run transport are not in the public chunks;
  they are delivered after authentication. Component discovery is incomplete
  because the bundle uses `jsx` runtime calls and minified identifiers.

### QuantFlow

- `assets/Quantflow-CFbBdo_1.js`: agent pane, `workflow-graph/stream` request +
  SSE parser, stage machine, node descriptions, checkpoint, run/log.
- `assets/Workflow-*.js`, `assets/WorkflowCreated-*.js`,
  `assets/WorkflowSubscribed-*.js`: editor shell and workflow views.
- `assets/SidebarLayout-*.js`, `assets/Header-*.js`, `assets/Creator*.js`:
  navigation, creator, payments and account surfaces.
- `assets/ChatPro-*.js`, `assets/agent-trade-*.js`: chat/agent UI and
  live-trading stream.
- `assets/TqxHelpDocs-BdJkiJIa.js`: public `SYSTEM_PROMPT_tqx.md` and
  `SKILLS_OVERVIEW_tqx.md` docs (EN/zh-TW), including `_build_prompt` layers and
  skill names.
- `assets/ChartsView-*.js`: charting/account UI; 69 components, 35 API paths.
- `assets/main-C0byxrRt.js`: 13.8 MB vendor/main bundle; raw local copy, string
  scan only (not AST-parsed).

## Where to look

| File | Contents |
|---|---|
| [`manifest.json`](manifest.json) | Per-file AST facts: imports, exports, top-level symbols, functions, components, API calls, routes, prompt samples |
| [`rea-summary.json`](rea-summary.json) | Compact REA evidence projection: stats, semantic node/relation counts, per-file named callables, limitations |
| [`features.md`](features.md) | Feature grouping: Qube shell/API/auth, QuantFlow editor/agent/creator/charts/payments |
| [`qube-shell.md`](qube-shell.md) | What the public Qube layout/sidebar actually contains |
| [`modules.md`](modules.md) | Full module inventory with app/vendor heuristic |
| [`api-map.md`](api-map.md) | Unique API paths with methods and source files |
| [`route-map.md`](route-map.md) | Static route candidates |
| [`components.md`](components.md) | QuantFlow component inventory |
| [`symbols.md`](symbols.md) | Key files + top-level/named symbols + REA source locations |
| [`graph.json`](graph.json), [`graph.md`](graph.md) | Import graph and hub modules |
| [`evidence.md`](evidence.md) | REA evidence IDs, statistics, coverage limits |
| [`prompts-tools.md`](prompts-tools.md) | What is prompt/tool metadata vs server execution |
| [`qube-tools.md`](qube-tools.md) | Full 101 tools + 47 capabilities table |
| [`quantflow-skills.md`](quantflow-skills.md) | Public QuantFlow skill catalog |
| [`gaps.md`](gaps.md) | What is gated, server-side, or still unknown |
| [`snippets/`](snippets/) | Short de-shelled excerpts |

## Local recovered tree

```text
/home/duansx/Desktop/pandaaiquant-client-recovered/
  agent_quant/...   (40 formatted files)
  quantflow/...     (172 formatted files + raw main)
  RECOVERY_INDEX.json
```

The local tree contains third-party code; it is intentionally outside this
public repo. `RECOVERY_INDEX.json` records the original SHA-256 and format
status for every file.

## Reproduce

```bash
# 1) Download the public app shells (see code-map/README.md)
python3 pandaaiquant-agent-reverse/tools/download_app_assets.py \
  https://www.pandaaiquant.com/agent_quant/ /tmp/pandaaiquant-apps/agent_quant
python3 pandaaiquant-agent-reverse/tools/download_app_assets.py \
  https://www.pandaaiquant.com/quantflow/ /tmp/pandaaiquant-apps/quantflow

# 2) AST inventory
node client-recovery/tools/scan_client.mjs \
  --agent-quant /tmp/pandaaiquant-apps/agent_quant \
  --quantflow /tmp/pandaaiquant-apps/quantflow \
  --out client-recovery/manifest.json

# 3) REA summary (requires the evidence bundles)
python3 client-recovery/tools/extract_rea.py \
  --quantflow-evidence /path/to/quantflow-app-evidence.json \
  --qube-evidence /path/to/agent-quant-api-evidence.json \
  --out client-recovery/rea-summary.json

# 4) Reports
python3 client-recovery/tools/build_report.py

# 5) Local formatted tree (optional; keep outside the public repo)
python3 client-recovery/tools/recover_local.py \
  --agent-quant /tmp/pandaaiquant-apps/agent_quant \
  --quantflow /tmp/pandaaiquant-apps/quantflow \
  --out /home/duansx/Desktop/pandaaiquant-client-recovered \
  --prettier /tmp/opencode/prettier/node_modules/.bin/prettier
```

## Limits

- Minified production bundles, no source maps: identifiers, comments, types and
  original file layout are lost.
- Static analysis only: no JavaScript was executed; route/API candidates are not
  proof of reachability or permissions.
- Qube `/chat` and its transport are login-gated; only the public shell is here.
- Server-side orchestration, prompt assembly, tool execution, model routing and
  paid data are out of scope.
- Raw recovered code is local-only; the public repo contains the analysis and
  short excerpts, not the full third-party bundles.

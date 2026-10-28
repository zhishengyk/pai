# PandaAI Agent Workflow Reverse Engineering

Independent analysis of the publicly accessible `https://www.pandaaiquant.com/`
front end and docs, focused on:

- **Qube** (`/agent_quant/`): conversational quant agent with runs, approvals,
  artifacts and versions.
- **QuantFlow** (`/quantflow/`): visual code workflow with a workflow JSON graph,
  node code, Notebook sync, run logs and output objects.
- **EVO / A2A**: public documentation-level analysis.

This repo contains four deliverables:

| Deliverable | Location | What it is |
|---|---|---|
| Reverse-engineering report | [`pandaaiquant-agent-reverse/REPORT.zh-CN.md`](pandaaiquant-agent-reverse/REPORT.zh-CN.md) | 1,158-line Chinese report: architecture, auth, run/approval lifecycle, tool catalog, QuantFlow stage machine, reconstruction notes, limitations |
| Interoperability code map | [`code-map/`](code-map/README.md) | File/hash/symbol index, API + event contracts, short annotated excerpts from the public bundles |
| Clean-room implementation | [`cleanroom/`](cleanroom/README.md) | Runnable Qube + QuantFlow mock: conversation/run/SSE/approval/artifact, workflow-graph stream/run/logs/output |
| Client de-shelling / recovery | [`client-recovery/`](client-recovery/README.md) | REA + AST inventory of every public Qube/QuantFlow chunk: modules, API/route maps, components, import graph, prompt/tool docs, local formatted tree |

## Quick start (clean-room)

```bash
cd cleanroom
npm start
# http://localhost:8787
```

No dependencies; Node 18+ (tested on Node 24). Run `npm test` for the smoke
tests.

The client-recovery analysis is static: it uses REA 6.8.0 and a Babel AST scan,
and keeps the formatted third-party tree local-only. See
[`client-recovery/README.md`](client-recovery/README.md) for the method and the
[`manifest.json`](client-recovery/manifest.json) / [`api-map.md`](client-recovery/api-map.md)
for the extracted inventory.

## Machine-readable research

- [`research/qube_agent_tools.json`](pandaaiquant-agent-reverse/research/qube_agent_tools.json) — 101 tools + 47 capabilities
- [`research/qube_chat_endpoints.json`](pandaaiquant-agent-reverse/research/qube_chat_endpoints.json) — 30 Qube endpoints
- [`research/quantflow_endpoints.json`](pandaaiquant-agent-reverse/research/quantflow_endpoints.json) — 54 QuantFlow endpoints
- [`research/evidence-index.json`](pandaaiquant-agent-reverse/research/evidence-index.json) — local REA evidence IDs / SHA-256 / sizes

## What is not included

- Target JS/CSS bundles, page text, captures and screenshots. They are large and
  contain third-party code/content; fetch them locally with
  `pandaaiquant-agent-reverse/tools/download_app_assets.py`.
- Logged-in state, paid data, secrets or business API calls.
- Target backend implementation, database schema, prompts and model routing.

## Scope and notice

Only unauthenticated public pages, public static assets and public docs were
used. No login/paywall bypass, no `/pandaApi` business API calls, no paid data.
The clean-room code is an independent implementation of observed contracts, not
a copy of the target source. Third-party trademarks, code and content remain with
their owners; see [`NOTICE.md`](NOTICE.md).

# Interoperability Code Map

This directory is the **code map** deliverable: a reproducible index of the
publicly served Qube and QuantFlow bundles, the API/event contracts they expose,
and the exact places where those contracts are implemented.

It is **not** a copy of the target source. The target ships minified production
bundles without source maps; the code map records file hashes, symbol locations,
contracts and short interoperability excerpts. The runnable independent
implementation lives in [`../cleanroom`](../cleanroom). For the full public-chunk
inventory (modules, imports, components, API/route maps and the local formatted
tree), see [`../client-recovery`](../client-recovery/README.md).

## What to read

| Document | Contents |
|---|---|
| [`qube.md`](qube.md) | Qube auth, chat API, run/event reducer, approvals, artifacts, tool registry |
| [`quantflow.md`](quantflow.md) | QuantFlow workflow-graph stream, stage machine, revisions/checkpoint, run/log/output, notebook sync |
| [`contracts.md`](contracts.md) | Consolidated endpoint and event schema tables |
| [`snippets/qube-chat-api.md`](snippets/qube-chat-api.md) | Short Qube excerpts with file/offset references |
| [`snippets/quantflow-stream.md`](snippets/quantflow-stream.md) | Short QuantFlow excerpts with file/offset references |
| [`snippets/quantflow-prompt-docs.md`](snippets/quantflow-prompt-docs.md) | Public `SYSTEM_PROMPT_tqx.md` / skill catalog summary and excerpts |
| [`inventory.json`](inventory.json) | Machine-readable file sizes, SHA-256 and symbol offsets |
| [`tools/scan_assets.py`](tools/scan_assets.py) | Regenerates `inventory.json` from the downloaded bundles |

## Get the bundles

The bundles are intentionally not committed to this repo (size + third-party
code). Download the public app shells first:

```bash
python3 pandaaiquant-agent-reverse/tools/download_app_assets.py \
  https://www.pandaaiquant.com/agent_quant/ /tmp/pandaaiquant-apps/agent_quant

python3 pandaaiquant-agent-reverse/tools/download_app_assets.py \
  https://www.pandaaiquant.com/quantflow/ /tmp/pandaaiquant-apps/quantflow
```

Then regenerate the inventory:

```bash
python3 code-map/tools/scan_assets.py \
  --agent-quant /tmp/pandaaiquant-apps/agent_quant \
  --quantflow /tmp/pandaaiquant-apps/quantflow \
  --out code-map/inventory.json
```

The offsets in `inventory.json` are **character offsets** in the UTF-8 decoded
file. They are stable only for the exact SHA-256 recorded next to them.

## Key files

| App | File | Bytes | SHA-256 |
|---|---|---:|---|
| Qube | `assets/chat-api-BkRzIk_k.js` | 8,645 | `ce45f45d11c12c5868c4f2c1cb5a5267d5f6afb55ba2119eaa57aea152329a39` |
| Qube | `assets/query-keys-hu8Y4jsT.js` | 90,101 | `ba979e03f8b6b01e842116500e08358b8a1123463916fe6acd048c9cbe53567d` |
| Qube | `assets/auth-provider-C7ie0Npj.js` | 3,278 | `dd71457e22a346ccfbee7ac5fabb82761cdf930c84d4dc295ed3a8f379bcc20f` |
| QuantFlow | `assets/Quantflow-CFbBdo_1.js` | 328,749 | `16fac899070aec49e3d89a3d673a0ec5c43a354822d7fba4b28685cca1654187` |
| QuantFlow | `assets/main-C0byxrRt.js` | 13,838,062 | `0f6cdc8aa5a255efd2e244c37c15ab7bdbd7662c5094d7adb2fc2d447bb95001` |
| QuantFlow | `assets/TqxHelpDocs-BdJkiJIa.js` | 23,376 | `3de4bfcf115b6947fc2490d438ea3bae3a0c5499835cbbc5d5f3c266b7b84422` |

## Method and limits

- Only unauthenticated public pages, public JS bundles and public docs were used.
- No login, no business API calls, no paid data, no source-map reconstruction.
- The Qube `/chat` route is delivered after login; the public shell exposes the
  chat API module and the event reducer, but not the logged-in UI transport.
- QuantFlow is public, so its graph editor and stream handler are observable.
- Short excerpts are included for interoperability/analysis; the full bundles
  remain third-party code and are not redistributed here.

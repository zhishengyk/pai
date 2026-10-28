# Prompts and Tools: What Is Actually Client-Side

Short answer: **some prompt/skill documentation is public for QuantFlow; tool
implementations are not client-side.** Qube’s public shell exposes tool names but
not prompts or schemas.

## Qube

| Item | In public client? | Where |
|---|---|---|
| 101 tool names | yes | `assets/input-BSBalGud.js` i18n |
| 47 capability names | yes | same |
| User card prompt suggestions | yes | same, e.g. a HK MA-trend card |
| System prompt | not found | `/chat` is login-gated |
| Tool parameter schemas | not found | server-side |
| Tool implementations | no | server-side |
| Run event reducer | yes | `assets/chat-api-BkRzIk_k.js` |

Full table: [`qube-tools.md`](qube-tools.md).

The tool names are display/i18n strings; the public bundle does not show how a
tool is executed. The five approval families are client-visible because they are
part of the run interaction.

## QuantFlow

### Public prompt docs

`assets/TqxHelpDocs-BdJkiJIa.js` ships four public Markdown documents:

```text
SKILLS_OVERVIEW_tqx.md
SKILLS_OVERVIEW_tqx_zh_TW.md
SYSTEM_PROMPT_tqx.md
SYSTEM_PROMPT_tqx_zh_TW.md
```

They describe the server-side `_build_prompt` layers:

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

They also mention `agent_runtime/orchestrator.py` and supervisor/worker prompt
layers. These are **help/specification docs**, not the full assembled prompt
string.

### Public skill catalog

See [`quantflow-skills.md`](quantflow-skills.md) for the extracted skill names
and behavior notes, including:

```text
tqx_stock_market, tqx_stock_indicator, tqx_stock_analysis,
tqx_stock_reference, analysis_technical, compute_python, data_merge,
factor_*, model_*, workflow_*, plugin_*, backtest_*, rag_api, rag_factor,
fx_rates, load_result, srs_xxx
```

The docs describe runtime behavior: skills are narrowed to roughly the 15 most
relevant per request, core tools remain available, results chain via `srs_xxx`
ids, and HK/US routing is automatic by symbol suffix.

### Tool schemas in the client

QuantFlow’s workflow plugin nodes carry `input_schema` / `output_schema` in the
public bundle (`Quantflow-CFbBdo_1.js`, `main-C0byxrRt.js`). These are **workflow
plugin node schemas**, not the LLM skill implementations.

## Boundary

| Layer | Public client | Server |
|---|---|---|
| Tool/skill names | yes | — |
| Tool usage rules | partly (QuantFlow docs) | yes |
| Prompt layer description | QuantFlow docs | yes |
| Full system prompt | no | yes |
| Tool schemas | workflow plugin schemas | LLM tool schemas |
| Tool execution | no | yes |
| Data / backtest / sandbox | no | yes |

See the report §4.9 and [`../code-map/quantflow.md`](../code-map/quantflow.md)
for the source offsets and the original REA evidence.

# QuantFlow prompt / skill docs snippet

`assets/TqxHelpDocs-BdJkiJIa.js` is a public help-docs component. It ships four
Markdown documents:

- `SKILLS_OVERVIEW_tqx.md`
- `SKILLS_OVERVIEW_tqx_zh_TW.md`
- `SYSTEM_PROMPT_tqx.md`
- `SYSTEM_PROMPT_tqx_zh_TW.md`

Metadata:

```text
bytes: 23,376
sha256: 3de4bfcf115b6947fc2490d438ea3bae3a0c5499835cbbc5d5f3c266b7b84422
SYSTEM_PROMPT_tqx.md offset: 15,431
_build_prompt offset: 7,546
<available_skills> offset: 7,755
agent_runtime/orchestrator.py offset: 12,530
```

## System prompt layers

The document describes the server-side `_build_prompt` order:

```text
1. Date header
2. Identity & standing instructions
3. <available_skills> catalog
4. Tool-usage rules + patterns
5. Base role prompt
6. Primary task & guidelines
7. Injected context (memory / history / prior results)
8. Language lock
```

## Skill catalog excerpt

The docs name skills such as:

```text
tqx_stock_market
tqx_stock_indicator
tqx_stock_analysis
tqx_stock_reference
analysis_technical
compute_python
data_merge
factor_*
model_*
workflow_*
plugin_*
backtest_*
rag_api
rag_factor
fx_rates
load_result
srs_xxx
```

The docs also describe runtime behavior: the agent narrows visible skills to the
most relevant ~15 per request, core tools remain available, results chain via
`srs_xxx` ids, and market routing is automatic by `.HK` / `.US` suffix.

## What this is / is not

This is a **public help/specification document**, not the complete server-side
system prompt string. The actual prompt assembly, model routing, skill dispatch
and tool execution are server-side. It is still highly useful because it exposes
the intended prompt layering, tool naming, and agent behavior rules.

Qube’s public shell has no equivalent document in the analyzed 40 chunks.

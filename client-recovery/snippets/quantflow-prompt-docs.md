# QuantFlow public prompt docs excerpt

Source (original): `quantflow/assets/TqxHelpDocs-BdJkiJIa.js`
SHA-256: `3de4bfcf115b6947fc2490d438ea3bae3a0c5499835cbbc5d5f3c266b7b84422`

Local formatted file:
`/home/duansx/Desktop/pandaaiquant-client-recovered/quantflow/assets/TqxHelpDocs-BdJkiJIa.js`

The file ships `SYSTEM_PROMPT_tqx.md`, `SYSTEM_PROMPT_tqx_zh_TW.md`,
`SKILLS_OVERVIEW_tqx.md` and `SKILLS_OVERVIEW_tqx_zh_TW.md`.

## Prompt layers

```text
For every agent invocation, `_build_prompt` concatenates these blocks
(in order, most added conditionally):

1. Date header
2. Identity & standing instructions
3. `<available_skills>` catalog
4. Tool-usage rules + patterns
5. Base role prompt
6. Primary task & guidelines
7. Injected context (memory, conversation history, prior results)
8. Language lock
```

## Skill catalog excerpt

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

The docs also mention server-side `agent_runtime/orchestrator.py` and the
supervisor/worker prompt layers. This is documentation, not the complete
assembled prompt string or tool implementation.

See [`../../code-map/snippets/quantflow-prompt-docs.md`](../../code-map/snippets/quantflow-prompt-docs.md)
for the source offsets and a longer summary.

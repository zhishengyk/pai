# QuantFlow Public Skill Catalog

Extracted from the public `TqxHelpDocs-BdJkiJIa.js` help docs
(`SKILLS_OVERVIEW_tqx.md`, EN/zh-TW). This is a client-visible catalog, not the
server-side implementation.

## Market / data

| Skill | Role |
|---|---|
| `tqx_stock_market` | HK/US live ticks, daily/minute bars |
| `tqx_stock_indicator` | RSI, MACD, ATR, EMA, BOLL; fetches bars and computes in one call |
| `tqx_stock_analysis` | HK/US per-symbol technical analysis |
| `tqx_stock_reference` | HK/US symbol reference/detail |
| `analysis_technical` | Cross-market technical snapshot; routes by `.HK` / `.US` suffix |

## Compute / data plumbing

| Skill | Role |
|---|---|
| `compute_python` | Sandboxed pandas/numpy compute |
| `data_merge` | Merge multiple results |
| `load_result` | Load a prior result by id |
| `srs_xxx` | Result id convention for chaining steps |

## Research

| Skill family | Role |
|---|---|
| `factor_*` | Factor research |
| `model_*` | ML / modelling |
| `backtest_*` | Backtesting |
| `workflow_*` | Workflow operations |
| `plugin_*` | Plugin operations |
| `rag_api` | API documentation RAG |
| `rag_factor` | Factor documentation RAG |
| `fx_rates` | FX conversion |

## Runtime behavior

From the same docs:

- The agent narrows visible skills to about the **15 most relevant** per request
  (semantic pre-filter + LLM ranking).
- Core tools remain available: sandboxed compute, prior-result loading, memory
  save/search, skill-docs lookup, and `tqx_stock_indicator`.
- Skills ship their own when/how/why guidance; users describe outcomes, not tool
  names.
- HK/US routing is automatic by `.HK` / `.US` suffix.
- Results chain across steps via `srs_xxx` ids; later steps reuse them with
  `load_result` / `compute_python` / `data_merge`.
- Dispatch is forgiving: invalid `api` / `action` selectors are auto-corrected or
  return a retryable hint; a bad call does not quarantine the skill.
- TQX does not expose CN-only A-share/futures data, fundamentals, `pd_*`,
  `pd_order_*`, `rag_gtht`, or the CN order pipeline. Trade decisions become a
  `decisions` list passed to the downstream trading node.

## What is not here

The actual skill functions, dispatch table, prompts and data credentials are
server-side. The public client only carries the catalog, help docs and
workflow/plugin schemas.

# Gaps and Boundaries

## Qube: the public shell is thin

The public `/agent_quant/` app contains the layout/sidebar and the modules needed
to bootstrap the app, but not the `/chat` route component:

- `root` layout/sidebar/conversation list + `index-redirect` route manifest;
- `chat-api` REST client and event projector;
- auth provider / main-site token plumbing;
- i18n, including tool names/capabilities;
- backtest parameter types and error translation.

The `/chat` route is not in the public route manifest. It is delivered after
main-site authentication, and the logged-in chunks are not part of the public
download. Therefore:

- no `/chat` UI component tree;
- no client-side run transport (SSE/WebSocket URL);
- no real event samples;
- no Qube system prompt;
- no Qube tool schemas or implementations.

If you own the account/system, use authorized access to capture the logged-in
chunks. Do not bypass login for this.

## QuantFlow: the app is public, the execution is not

QuantFlow’s editor/agent app is public, but the important execution pieces remain
server-side:

- actual prompt assembly (`_build_prompt`, `agent_runtime/orchestrator.py`);
- model routing and LLM calls;
- skill/tool implementations (`tqx_stock_market`, `compute_python`, backtests,
  workflow node execution, Notebook/Python execution);
- data access and paid entitlements;
- database/object-store schemas.

The public client exposes:

- the workflow-graph stage stream and request shape;
- the node graph / code / revision / checkpoint model;
- run/log/output calls;
- the skill catalog and prompt-layer documentation;
- plugin node `input_schema` / `output_schema` metadata.

## Static-analysis limits

- **No source maps.** The bundles are minified; names, comments, types and
  original module boundaries are lost.
- **Vendor/main bundle not AST-parsed.** `assets/main-C0byxrRt.js` is 13.8 MB; it
  is copied raw to the local tree and scanned as strings. The app chunks are
  parsed.
- **REA coverage is partial.** The QuantFlow graph has explicit coverage limits
  and unknowns; the route inventory only retained 2 routes, while the AST scan
  found 42 static route candidates.
- **Static candidates are not runtime proof.** A path string may be an API
  endpoint, a navigation target, a chart period, or dead code.
- **Qube evidence is app-level, not every vendor chunk.** REA parsed 25 Qube
  application files (37,021 semantic nodes / 44,481 relations); the i18n and
  vendor chunks are covered by the AST inventory. A full run including the large
  `entry.client` chunk stalled, so it is not used for the compact evidence.

## Distribution boundary

The local formatted tree is third-party code. It is outside the public repo and
should not be published or redistributed as your own source. The public repo
contains hashes, locations, contracts, short excerpts and an independent
clean-room implementation instead.

If you own `pandaaiquant.com` or have written authorization, provide the source
or access and the analysis can be done against the actual engineering source.

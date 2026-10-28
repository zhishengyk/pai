#!/usr/bin/env python3
"""Build a reproducible inventory of the public JS files referenced by the code map.

The target bundles are not committed to this repository. Download them first with
`pandaaiquant-agent-reverse/tools/download_app_assets.py`, then run:

    python3 code-map/tools/scan_assets.py \
      --agent-quant /path/to/apps/agent_quant \
      --quantflow /path/to/apps/quantflow \
      --out code-map/inventory.json

The output records file size, SHA-256 and character offsets of selected symbols. It
does not copy the bundles.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

TERMS = {
    "agent_quant": {
        "assets/chat-api-BkRzIk_k.js": [
            "/api/chat/runs",
            "/api/chat/runs/{run_id}/retry",
            "/api/chat/runs/{run_id}/cancel",
            "/api/chat/conversations",
            "strategy-create-approvals",
            "strategy-run-approvals",
            "strategy-mutation-approvals",
            "strategy-version-approvals",
            "factor-create-approvals",
            "event_type",
            "mutations",
            "lastSequence",
            "redis_stream_id",
        ],
        "assets/query-keys-hu8Y4jsT.js": [
            "/pandaApi/agent_quant",
            "/api/auth/me",
            "Authorization",
            "/login",
            "localStorage",
            "token",
        ],
        "assets/auth-provider-C7ie0Npj.js": [
            "localStorage",
            "storage",
            "authenticated",
        ],
        "assets/input-BSBalGud.js": [
            "Java gateway",
            "auth.requiredDescription",
            "chat",
        ],
    },
    "quantflow": {
        "assets/Quantflow-CFbBdo_1.js": [
            "/pandaApi/quantflow/api/workflow-graph/stream",
            "workflow_init",
            "workflow_layout",
            "workflow_generating",
            "code_merged",
            "workflow_structure_complete",
            "workflow_complete_success",
            "case\"END\"",
            "node_desc_map",
            "workflow_progress",
            "revision_id",
            "content_hash",
            "sessions/checkpoint",
            "serializeWorkflowData",
            "setWorkflowDataFromSSE",
            "/api/workflow/run/log",
            "/api/workflow/run_with_store",
            "/api/workflow/run/terminate_with_store",
        ],
        "assets/main-C0byxrRt.js": [
            "responseBodyLooksLikeStreaming",
            "text/event-stream",
            "application/x-ndjson",
        ],
        "assets/Workflow-CA6TBoMa.js": [
            "/workflow/editor",
        ],
        "assets/SidebarLayout-DQ6ickQk.js": [
            "/pandaApi/quantflow/api/workflow/run/list",
        ],
        "assets/Header-ByqjsPNw.js": [
            "/workflow/editor?key=",
            "createquantflow",
        ],
        "assets/TqxHelpDocs-BdJkiJIa.js": [
            "SYSTEM_PROMPT_tqx.md",
            "SKILLS_OVERVIEW_tqx.md",
            "_build_prompt",
            "<available_skills>",
            "tqx_stock_market",
            "compute_python",
            "agent_runtime/orchestrator.py",
        ],
    },
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def scan_file(path: Path, terms: list[str]) -> dict:
    text = path.read_text(errors="ignore")
    return {
        "path": path.name,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "char_offsets": {term: text.find(term) for term in terms},
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent-quant", required=True, help="path to downloaded agent_quant app")
    parser.add_argument("--quantflow", required=True, help="path to downloaded quantflow app")
    parser.add_argument("--out", default="code-map/inventory.json")
    args = parser.parse_args()

    roots = {
        "agent_quant": Path(args.agent_quant),
        "quantflow": Path(args.quantflow),
    }
    inventory = {
        "note": "Public minified bundles are not included; char_offsets are character offsets in the UTF-8 decoded files.",
        "apps": {},
    }
    for app, files in TERMS.items():
        root = roots[app]
        entries = []
        for relative, terms in files.items():
            path = root / relative
            if not path.exists():
                entries.append({"path": relative, "missing": True})
                continue
            entries.append(scan_file(path, terms))
        inventory["apps"][app] = entries

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(inventory, indent=2) + "\n")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()

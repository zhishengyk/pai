#!/usr/bin/env python3
"""Extract a compact, human-usable summary from REA evidence bundles."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path


def summarize(path: Path, label: str) -> dict:
    data = json.loads(path.read_text())
    record = (data.get("records") or [None])[0]
    if not record:
        return {"label": label, "error": "no records"}
    normalized = record.get("normalized_result") or {}
    graph = normalized.get("graph") or {}
    semantic = normalized.get("semantic_graph") or {}
    routes = normalized.get("route_inventory") or {}

    node_kinds = Counter()
    file_stats = defaultdict(lambda: {
        "nodes": 0,
        "functions": 0,
        "classes": 0,
        "named": [],
    })
    for node in semantic.get("nodes", []):
        kind = node.get("kind") or "unknown"
        node_kinds[kind] += 1
        module_path = (node.get("identity") or {}).get("module_path")
        if not module_path:
            continue
        stats = file_stats[module_path]
        stats["nodes"] += 1
        if kind in {"function", "method", "arrow-function"}:
            stats["functions"] += 1
        if kind in {"class", "class-expression"}:
            stats["classes"] += 1
        name = (node.get("properties") or {}).get("name")
        if name and kind in {"function", "class", "method", "arrow-function", "class-expression"} and len(stats["named"]) < 120:
            start = (((node.get("evidence") or {}).get("location") or {}).get("value") or {}).get("start") or {}
            stats["named"].append({
                "name": name,
                "kind": kind,
                "line": start.get("line"),
                "column": start.get("column"),
            })

    relation_counts = Counter()
    for relation in semantic.get("relations", []):
        relation_counts[relation.get("relation") or "unknown"] += 1

    graph_node_kinds = Counter(node.get("kind") or "unknown" for node in graph.get("nodes", []))
    graph_edge_relations = Counter(edge.get("relation") or "unknown" for edge in graph.get("edges", []))

    route_items = []
    for route in routes.get("routes", [])[:200]:
        route_items.append({
            "path": route.get("path"),
            "classification": route.get("classification"),
            "confidence": route.get("confidence"),
            "mechanisms": route.get("mechanisms"),
            "occurrence_count": route.get("occurrence_count"),
        })

    return {
        "label": label,
        "evidence_file": str(path),
        "evidence_id": record.get("evidence_id"),
        "subject": (record.get("subject") or {}).get("name"),
        "statistics": normalized.get("statistics"),
        "graph": {
            "nodes": len(graph.get("nodes", [])),
            "edges": len(graph.get("edges", [])),
            "node_kinds": dict(graph_node_kinds),
            "edge_relations": dict(graph_edge_relations),
        },
        "semantic_graph": {
            "nodes": len(semantic.get("nodes", [])),
            "relations": len(semantic.get("relations", [])),
            "node_kinds": dict(node_kinds),
            "relation_counts": dict(relation_counts),
        },
        "routes": route_items,
        "route_statistics": routes.get("statistics"),
        "files": dict(sorted(file_stats.items())),
        "limitations": (normalized.get("limitations") or record.get("limitations") or [])[:20],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--quantflow-evidence", required=True)
    parser.add_argument("--qube-evidence", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    output = {
        "quantflow": summarize(Path(args.quantflow_evidence), "quantflow"),
        "agent_quant": summarize(Path(args.qube_evidence), "agent_quant"),
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(output, indent=2) + "\n")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()

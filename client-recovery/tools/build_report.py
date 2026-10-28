#!/usr/bin/env python3
"""Generate the public client-recovery reports from the AST manifest + REA summary."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "client-recovery"
MANIFEST = json.loads((OUT / "manifest.json").read_text())
REA = json.loads((OUT / "rea-summary.json").read_text())
TOOLS = json.loads((ROOT / "pandaaiquant-agent-reverse/research/qube_agent_tools.json").read_text())

LANG = {
    "abap", "apex", "azcli", "bat", "bicep", "cameligo", "clojure", "coffee", "cpp",
    "csharp", "csp", "css", "cypher", "dart", "dockerfile", "ecl", "elixir", "flow9",
    "freemarker2", "fsharp", "go", "graphql", "handlebars", "hcl", "html", "ini",
    "java", "javascript", "julia", "kotlin", "less", "lexon", "liquid", "lua", "m3",
    "markdown", "mdx", "mips", "msdax", "mysql", "objective-c", "pascal", "pascaligo",
    "perl", "pgsql", "php", "pla", "postiats", "powerquery", "powershell", "protobuf",
    "pug", "python", "qsharp", "r", "razor", "redis", "redshift", "restructuredtext",
    "ruby", "rust", "sb", "scala", "scheme", "scss", "shell", "solidity", "sophia",
    "sparql", "sql", "st", "swift", "systemverilog", "tcl", "twig", "typescript",
    "vb", "wgsl", "xml", "yaml", "tsMode", "jsonMode", "cssMode", "htmlMode",
    "markdownMode", "yamlMode", "pythonMode", "javaMode", "cppMode", "csharpMode",
    "typescriptMode", "javascriptMode",
}

QUBE_VENDOR = {
    "entry.client", "jsx-runtime", "react-dom", "dropdown-menu", "scroll-area",
    "usePositioner", "useTriggerFocusGuards", "getPseudoElementBounds",
    "overlay-scrollbar", "atom", "check", "chevrons-right", "circle-alert",
    "flask-conical", "loader-circle", "refresh-cw", "settings", "sparkles",
    "spinner", "trash-2", "chart-line", "badge", "chunk", "hover-scroll-reveal",
    "DialogTitle", "dateInput", "theme-provider", "locale-provider",
}

KEY_FILES = {
    "agent_quant": [
        "assets/chat-api-BkRzIk_k.js",
        "assets/query-keys-hu8Y4jsT.js",
        "assets/auth-provider-C7ie0Npj.js",
        "assets/backtest-params-VEgzLRnx.js",
        "assets/translate-api-error-6HzPqpg-.js",
        "assets/index-redirect-C-0hC5Fc.js",
    ],
    "quantflow": [
        "assets/Quantflow-CFbBdo_1.js",
        "assets/ChatPro-DS7erhn_.js",
        "assets/agent-trade-BDA-Vfe3.js",
        "assets/Workflow-CA6TBoMa.js",
        "assets/SidebarLayout-DQ6ickQk.js",
        "assets/Header-ByqjsPNw.js",
        "assets/CreatorList-BBK5BuDr.js",
        "assets/TqxHelpDocs-BdJkiJIa.js",
    ],
}


def main() -> None:
    (OUT / "features.md").write_text(features_md())
    (OUT / "modules.md").write_text(modules_md())
    (OUT / "api-map.md").write_text(api_md())
    (OUT / "route-map.md").write_text(routes_md())
    (OUT / "components.md").write_text(components_md())
    (OUT / "symbols.md").write_text(symbols_md())
    (OUT / "evidence.md").write_text(evidence_md())
    graph = build_graph()
    (OUT / "graph.json").write_text(json.dumps(graph, indent=2) + "\n")
    (OUT / "graph.md").write_text(graph_md(graph))
    print("wrote client-recovery reports")



def features_md() -> str:
    lines = ["# Feature Map", "", "A heuristic grouping of the recovered app chunks. Vendor/main/language chunks are grouped separately.", ""]
    groups = {
        "agent_quant": [
            ("Qube shell", ["root", "index-redirect", "entry.client", "root-D95"]),
            ("Chat API / auth / errors", ["chat-api", "auth-provider", "query-keys", "backtest-params", "translate-api-error"]),
            ("i18n / product copy", ["input-BSBalGud"]),
            ("UI primitives", ["dropdown-menu", "scroll-area", "DialogTitle", "dateInput", "theme-provider", "locale-provider", "usePositioner", "useTriggerFocusGuards", "overlay-scrollbar", "getPseudoElementBounds", "hover-scroll-reveal"]),
            ("Hooks / notices", ["useInfiniteQuery", "notice", "badge", "sparkles", "settings", "chunk"]),
        ],
        "quantflow": [
            ("Workflow editor / canvas", ["Workflow", "Quantflow-CFb", "SidebarLayout", "Header", "CurrentNode", "NodeEditor", "NodeLibrary", "PlanWarning", "PandaAISidebar", "WorkflowTable"]),
            ("Agent / chat / trading", ["ChatPro", "Chat-", "agent-trade", "AIPowerStatus", "AIComputingResult", "CommonTaskProgress", "TradingAgentsResultPanel", "SimpleChatDisplay"]),
            ("Creator", ["Creator"]),
            ("Charts / market / factor", ["ChartsView", "Factor", "CommonPerformanceIndicator", "CurveChart", "AiPrediction", "StockPoolPanel", "AssetLibrary"]),
            ("Payments / account / membership", ["TqxPay", "wallet", "memberLevel", "BillRecord", "ComputingPower", "Vip", "Exchange", "Firmoffer", "TqxBacktestLimit"]),
            ("Notebook / code / assets", ["Notebook", "Code", "quill", "marimo", "ApiErrorLogs"]),
            ("Entry / auth", ["authService", "index-DJLj", "index-GqNe", "index-", "main-C0"]),
        ],
    }
    for app, data in MANIFEST["apps"].items():
        lines += [f"## {app}", ""]
        assigned = set()
        for title, needles in groups[app]:
            rows = []
            for f in data["files"]:
                path = f["path"]
                if path in assigned:
                    continue
                name = path.split("/")[-1]
                if any(needle in path or needle in name for needle in needles) and file_kind(app, path) != "style":
                    assigned.add(path)
                    rows.append([path, f"{f['bytes']:,}", str(f["counts"].get("api_calls", 0)), ", ".join(f["components"][:5])])
            if rows:
                lines += [f"### {title}", "", table(["file", "bytes", "API", "components"], rows), ""]
        others = []
        for f in data["files"]:
            if f["path"] in assigned or file_kind(app, f["path"]) in {"style", "html", "data"}:
                continue
            others.append([f["path"], f"{f['bytes']:,}", str(f["counts"].get("api_calls", 0)), ", ".join(f["components"][:5])])
        if others:
            lines += ["### Other / vendor", "", table(["file", "bytes", "API", "components"], others), ""]
    return "\n".join(lines)

def modules_md() -> str:
    lines = ["# Client Module Inventory", "", "Generated from the AST manifest. `kind=vendor` is a filename heuristic; `kind=app` means the chunk contains feature/API/UI logic.", ""]
    for app, data in MANIFEST["apps"].items():
        stats = data["stats"]
        lines += [f"## {app}", "", f"- files: {stats['files']}", f"- parsed: {stats['parsed']}", f"- parse errors: {stats['parse_errors']}", f"- AST skipped (large): {stats['ast_skipped_large']}", f"- API path candidates: {len(stats['api_paths'])}", f"- route candidates: {len(stats['routes'])}", f"- components: {len(stats['components'])}", ""]
        rows = []
        for f in sorted(data["files"], key=lambda item: item["bytes"], reverse=True):
            kind = file_kind(app, f["path"])
            rows.append([
                f["path"], f"{f['bytes']:,}", kind,
                str(f["counts"].get("imports", 0)),
                str(f["counts"].get("functions", 0)),
                str(f["counts"].get("api_calls", 0)),
                str(f["counts"].get("routes", 0)),
                str(f["counts"].get("components", 0)),
                ", ".join(f["components"][:4]),
            ])
        lines += [table(["file", "bytes", "kind", "imports", "functions", "API", "routes", "components", "component names"], rows), ""]
    return "\n".join(lines)


def api_md() -> str:
    lines = ["# API Path Map", "", "Paths are static candidates from the public bundles. `call` means the scanner saw an API-client/fetch call; `string` means only a path string. The real server may prefix paths differently.", ""]
    for app, data in MANIFEST["apps"].items():
        api = defaultdict(lambda: {"methods": set(), "files": set(), "base": set()})
        for f in data["files"]:
            for call in f["api_calls"]:
                path = call["path"]
                api[path]["methods"].add(call.get("method") or "call")
                api[path]["files"].add(f["path"])
                if call.get("basePath"):
                    api[path]["base"].add(call["basePath"])
        groups = defaultdict(list)
        for path in sorted(api):
            group = "/".join(path.split("/")[:3]) or path
            groups[group].append(path)
        lines += [f"## {app} ({len(api)} unique paths)", ""]
        for group in sorted(groups):
            lines += [f"### `{group}`", "", table(["path", "methods", "files"], [
                [path, display_methods(api[path]["methods"]), ", ".join(sorted(api[path]["files"])[:3]) + (" …" if len(api[path]["files"]) > 3 else "")]
                for path in groups[group]
            ]), ""]
    return "\n".join(lines)


def routes_md() -> str:
    lines = ["# Route Map", "", "Static route strings found in the public bundles. These are candidates, not proof of reachability or permissions.", ""]
    for app, data in MANIFEST["apps"].items():
        routes = defaultdict(set)
        for f in data["files"]:
            for route in f["routes"]:
                routes[route["path"]].add(f["path"])
        lines += [f"## {app} ({len(routes)} candidates)", "", table(["route", "likely", "files"], [
            [path, "yes" if likely_route(path) else "candidate", ", ".join(sorted(files)[:3]) + (" …" if len(files) > 3 else "")]
            for path, files in sorted(routes.items())
        ]), ""]
    return "\n".join(lines)


def components_md() -> str:
    lines = ["# Component Inventory", ""]
    for app, data in MANIFEST["apps"].items():
        comps = data["stats"]["components"]
        lines += [f"## {app} ({len(comps)})", ""]
        if not comps:
            lines += ["No components were discovered in the public shell. Qube's `/chat` UI is delivered after login and is not in the public chunks.", ""]
            continue
        lines += ["```text", *comps, "```", ""]
    return "\n".join(lines)


def symbols_md() -> str:
    lines = ["# Key Symbols", "", "Minified chunks keep short names; these are the top-level declarations and named functions recovered from the AST. Use the local formatted tree for the actual bodies.", ""]
    for app, paths in KEY_FILES.items():
        lines += [f"## {app}", ""]
        files = {f["path"]: f for f in MANIFEST["apps"][app]["files"]}
        rea_files = REA[app]["files"]
        for path in paths:
            f = files.get(path)
            if not f:
                continue
            lines += [f"### `{path}`", "", f"- bytes: {f['bytes']:,}", f"- imports: {len(f['imports'])}", f"- exports: {len(f['exports'])}", f"- API calls: {len(f['api_calls'])}", f"- components: {', '.join(f['components'][:20]) or '—'}", ""]
            top = f["top_level"][:60]
            named = [name for name in f["named_functions"] if len(name) > 1 or name.isupper()][:60]
            if top:
                lines += ["Top-level:", "", "```text", *top, "```", ""]
            if named:
                lines += ["Named functions (including nested):", "", "```text", *named, "```", ""]
            rea_named = (rea_files.get(path) or {}).get("named", [])[:30]
            if rea_named:
                lines += ["REA semantic callables/classes:", "", table(["name", "kind", "line", "column"], [
                    [item.get("name"), item.get("kind"), item.get("line"), item.get("column")] for item in rea_named
                ]), ""]
    return "\n".join(lines)


def evidence_md() -> str:
    lines = ["# REA Evidence", "", "REA 6.8.0 was used for static JavaScript application analysis. Evidence bundles remain in the original analysis workspace; this table is the compact projection.", ""]
    for app, summary in REA.items():
        lines += [f"## {app}", "", f"- evidence id: `{summary.get('evidence_id')}`", f"- subject: `{summary.get('subject')}`", ""]
        stats = summary.get("statistics") or {}
        lines += ["Statistics:", "", "```json", json.dumps(stats, indent=2), "```", ""]
        sg = summary.get("semantic_graph") or {}
        lines += [f"- semantic nodes: {sg.get('nodes')}", f"- semantic relations: {sg.get('relations')}", ""]
        kinds = sg.get("node_kinds") or {}
        if kinds:
            lines += ["Node kinds:", "", "```json", json.dumps(kinds, indent=2), "```", ""]
        rels = sg.get("relation_counts") or {}
        if rels:
            lines += ["Relation types:", "", "```json", json.dumps(rels, indent=2), "```", ""]
        routes = summary.get("routes") or []
        lines += [f"- REA route inventory: {len(routes)} items", ""]
        if routes:
            lines += [table(["path", "classification", "confidence"], [[r.get("path"), r.get("classification"), r.get("confidence")] for r in routes]), ""]
        limits = summary.get("limitations") or []
        if limits:
            lines += ["Limitations:", ""]
            lines += [f"- {item}" for item in limits[:8]]
            lines.append("")
    return "\n".join(lines)


def build_graph() -> dict:
    nodes = set()
    edges = set()
    for app, data in MANIFEST["apps"].items():
        for f in data["files"]:
            nodes.add(f"{app}/{f['path']}")
            for imp in f["imports"]:
                resolved = imp.get("resolved")
                if resolved:
                    nodes.add(f"{app}/{resolved}")
                    edges.add((f"{app}/{f['path']}", f"{app}/{resolved}"))
    return {
        "nodes": sorted(nodes),
        "edges": [{"source": a, "target": b} for a, b in sorted(edges)],
    }


def graph_md(graph: dict) -> str:
    out_degree = defaultdict(int)
    in_degree = defaultdict(int)
    for edge in graph["edges"]:
        out_degree[edge["source"]] += 1
        in_degree[edge["target"]] += 1
    lines = ["# Import Graph", "", f"- nodes: {len(graph['nodes'])}", f"- edges: {len(graph['edges'])}", "", "## Most imported modules", "", table(["module", "imported by"], [[node, str(in_degree[node])] for node in sorted(in_degree, key=lambda n: in_degree[n], reverse=True)[:30]]), "", "## Modules with most imports", "", table(["module", "imports"], [[node, str(out_degree[node])] for node in sorted(out_degree, key=lambda n: out_degree[n], reverse=True)[:30]]), ""]
    return "\n".join(lines)


def file_kind(app: str, path: str) -> str:
    suffix = Path(path).suffix.lower()
    if suffix in {".css"}:
        return "style"
    if suffix in {".html"}:
        return "html"
    if suffix in {".json"}:
        return "data"
    if suffix not in {".js", ".mjs"}:
        return "asset"
    return "app" if is_app(app, path) else "vendor"


def display_methods(methods: set[str]) -> str:
    http = sorted(m for m in methods if m in {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"})
    if http:
        return ", ".join(http)
    if "STRING" in methods:
        return "string"
    return "call"


def is_app(app: str, path: str) -> bool:
    name = re.sub(r"-[A-Za-z0-9_-]{8}\.(?:js|mjs|css|html)$", "", path.split("/")[-1])
    if app == "agent_quant":
        return name not in QUBE_VENDOR
    if name in LANG or name == "main":
        return False
    return True


def likely_route(path: str) -> bool:
    return bool(re.match(r"^/(?:workflow|quantflow|agent_quant|creator|login|docs|evo|contest|factorhub|personal|tqx|chat|strategy|factor|backtest|home|user|settings|market|trading|skills|optimizations)(?:/|$)", path))


def table(headers: list[str], rows: list[list]) -> str:
    out = ["| " + " | ".join(headers) + " |", "|" + "|".join(["---"] * len(headers)) + "|"]
    for row in rows:
        out.append("| " + " | ".join(clean(str(cell)) for cell in row) + " |")
    return "\n".join(out)


def clean(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


if __name__ == "__main__":
    main()

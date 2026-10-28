#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import re
import time
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36"
ASSET_RE = re.compile(r"(?:assets/|\./)([A-Za-z0-9._-]+\.(?:js|css|map))")
MAP_RE = re.compile(r"sourceMappingURL=([^\s*]+)")
IMPORT_RE = re.compile(r"(?:from|import)\s*\(?\s*[\"'](\.{0,2}/[^\"']+\.(?:js|css|map))[\"']")


def fetch(url, out_path):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
        status = resp.status
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(data)
    return status, len(data), hashlib.sha256(data).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("base", help="app base URL, e.g. https://www.pandaaiquant.com/agent_quant/")
    ap.add_argument("out", help="output directory")
    ap.add_argument("--max-files", type=int, default=800)
    ap.add_argument("--max-bytes", type=int, default=250 * 1024 * 1024)
    ap.add_argument("--delay", type=float, default=0.12)
    args = ap.parse_args()

    base = args.base if args.base.endswith("/") else args.base + "/"
    parsed = urllib.parse.urlparse(base)
    app_prefix = parsed.path
    os.makedirs(args.out, exist_ok=True)

    html_path = os.path.join(args.out, "index.html")
    req = urllib.request.Request(base, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read()
    with open(html_path, "wb") as f:
        f.write(html)
    html_text = html.decode("utf-8", "replace")

    queue = []
    for m in re.finditer(r"(?:src|href)=[\"']([^\"']+)[\"']", html_text):
        u = urllib.parse.urljoin(base, m.group(1))
        if u.startswith(base) and re.search(r"\.(?:js|css|map)$", u):
            queue.append(u)
    for m in re.finditer(r"https?://[^\"'<> ]+?\.(?:js|css|map)", html_text):
        u = m.group(0)
        if u.startswith(base):
            queue.append(u)

    seen = set()
    records = []
    total = 0
    while queue and len(seen) < args.max_files and total < args.max_bytes:
        url = queue.pop(0)
        url = url.split("#", 1)[0].split("?", 1)[0]
        if url in seen:
            continue
        if not url.startswith(base):
            continue
        seen.add(url)
        rel = url[len(base):]
        if not rel or ".." in rel.split("/"):
            continue
        out_path = os.path.join(args.out, rel)
        try:
            status, size, sha = fetch(url, out_path)
        except Exception as exc:
            records.append({"url": url, "status": "error", "error": str(exc)})
            print("ERR", url, exc)
            continue
        total += size
        records.append({"url": url, "path": rel, "status": status, "bytes": size, "sha256": sha})
        print("OK", size, rel)
        time.sleep(args.delay)
        if url.endswith(".js"):
            text = open(out_path, "r", encoding="utf-8", errors="replace").read()
            for m in IMPORT_RE.finditer(text):
                nxt = urllib.parse.urljoin(url, m.group(1))
                if nxt.startswith(base) and nxt not in seen:
                    queue.append(nxt)
            for m in ASSET_RE.finditer(text):
                nxt = urllib.parse.urljoin(base, "assets/" + m.group(1))
                if nxt.startswith(base) and nxt not in seen:
                    queue.append(nxt)
            for m in MAP_RE.finditer(text):
                nxt = urllib.parse.urljoin(url, m.group(1))
                if nxt.startswith(base) and nxt not in seen:
                    queue.append(nxt)

    manifest = {
        "base": base,
        "files": records,
        "file_count": len(records),
        "total_bytes": total,
        "remaining_queue": len(queue),
    }
    with open(os.path.join(args.out, "download-manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: manifest[k] for k in ("base", "file_count", "total_bytes", "remaining_queue")}, ensure_ascii=False))


if __name__ == "__main__":
    main()

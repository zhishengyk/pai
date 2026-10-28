#!/usr/bin/env python3
"""Create a local-only readable tree from the public Qube/QuantFlow bundles.

This is intentionally kept outside the public repository. It formats the
application chunks with Prettier; identifiers remain minified. Files above the
format budget are copied raw and marked in RECOVERY_INDEX.json.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

HEADER = (
    "// Recovered from a public client bundle: {app}/{rel}\n"
    "// Original SHA-256: {sha}\n"
    "// Readable formatting only; identifiers, comments, types and file layout are not original.\n"
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent-quant", required=True)
    parser.add_argument("--quantflow", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--prettier", required=True)
    parser.add_argument("--max-format-bytes", type=int, default=2_000_000)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    out = Path(args.out)
    if out.exists():
        if not args.force:
            raise SystemExit(f"{out} exists; pass --force to replace")
        shutil.rmtree(out)
    out.mkdir(parents=True)

    apps = {
        "agent_quant": Path(args.agent_quant),
        "quantflow": Path(args.quantflow),
    }
    jobs = []
    for app, root in apps.items():
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(root)
            jobs.append((app, root, path, rel))
    index = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(recover_one, app, root, path, rel, out, args) for app, root, path, rel in jobs]
        for future in concurrent.futures.as_completed(futures):
            index.append(future.result())

    index.sort(key=lambda item: (item["app"], item["path"]))
    (out / "RECOVERY_INDEX.json").write_text(json.dumps(index, indent=2) + "\n")
    (out / "README.md").write_text(
        "# Local Client Recovery\n\n"
        "This directory is generated from the public Qube/QuantFlow bundles and is\n"
        "not part of the public repository. Formatted files are readable but still use\n"
        "minified identifiers; they are not the original engineering source.\n\n"
        "See `RECOVERY_INDEX.json` for per-file source paths, hashes, format status\n"
        "and sizes. Large/vendor files are copied raw.\n",
    )
    print(f"recovered {len(index)} files into {out}")


def recover_one(app: str, root: Path, path: Path, rel: Path, out: Path, args) -> dict:
    data = path.read_bytes()
    digest = sha256(data)
    target = out / app / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    status = "copied"
    note = ""

    if path.suffix in (".js", ".mjs") and len(data) <= args.max_format_bytes:
        try:
            proc = subprocess.run(
                [
                    args.prettier,
                    "--parser",
                    "babel",
                    "--print-width",
                    "120",
                ],
                input=data,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=120,
            )
            if proc.returncode == 0 and proc.stdout.strip():
                header = HEADER.format(app=app, rel=rel, sha=digest).encode()
                target.write_bytes(header + proc.stdout)
                status = "formatted"
            else:
                note = proc.stderr.decode(errors="replace")[:300]
                target.write_bytes(data)
        except Exception as error:  # pragma: no cover - best effort recovery
            note = str(error)[:300]
            target.write_bytes(data)
    elif path.suffix in (".css",):
        try:
            proc = subprocess.run(
                [args.prettier, "--parser", "css", "--print-width", "120"],
                input=data,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=120,
            )
            if proc.returncode == 0 and proc.stdout.strip():
                target.write_bytes(proc.stdout)
                status = "formatted"
            else:
                note = proc.stderr.decode(errors="replace")[:300]
                target.write_bytes(data)
        except Exception as error:
            note = str(error)[:300]
            target.write_bytes(data)
    else:
        target.write_bytes(data)

    return {
        "app": app,
        "path": str(rel),
        "bytes": len(data),
        "sha256": digest,
        "status": status,
        "note": note,
        "output": str(target),
    }


if __name__ == "__main__":
    main()

#!/usr/bin/env python
"""Install frontend dependencies and build the Vite bundle.

The production bundle is emitted into ``app/resources/web`` so the Qt host can
serve it over the ``app://`` scheme.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "frontend"
OUTPUT_DIR = ROOT / "app" / "resources" / "web"


def run(command: list[str], cwd: Path) -> None:
    print(f"$ {' '.join(command)}  (in {cwd})")
    subprocess.run(command, cwd=cwd, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--npm", default="npm", help="npm executable to use")
    parser.add_argument("--skip-install", action="store_true", help="Skip `npm install`")
    args = parser.parse_args()

    npm = shutil.which(args.npm)
    if npm is None:
        print(f"error: '{args.npm}' was not found on PATH", file=sys.stderr)
        return 1

    if not (FRONTEND_DIR / "package.json").is_file():
        print(f"error: {FRONTEND_DIR}/package.json is missing", file=sys.stderr)
        return 1

    if not args.skip_install:
        run([npm, "install"], FRONTEND_DIR)

    run([npm, "run", "build"], FRONTEND_DIR)

    if not (OUTPUT_DIR / "index.html").is_file():
        print(f"error: build did not produce {OUTPUT_DIR}/index.html", file=sys.stderr)
        return 1

    print(f"frontend built into {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

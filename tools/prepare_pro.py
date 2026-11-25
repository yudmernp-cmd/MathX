"""Prepare the class collection and its Spanish edition with an isolated Python runtime."""

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys

from pro_papers import prepare


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true")
    prepare(parser.parse_args().refresh)
    uv = shutil.which("uv")
    if not uv:
        target = Path(".private/pro-build/bootstrap")
        uv = target / "bin/uv"
        if not uv.exists():
            subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "pip",
                    "install",
                    "--target",
                    str(target),
                    "uv==0.10.12",
                ],
                check=True,
            )
    subprocess.run(
        [
            str(uv),
            "run",
            "--no-project",
            "--python",
            "3.12",
            "--with-requirements",
            "tools/pro_requirements.txt",
            "python",
            "tools/pro_spanish.py",
        ],
        check=True,
        env={**os.environ, "UV_CACHE_DIR": ".private/pro-build/uv-cache"},
    )


if __name__ == "__main__":
    main()

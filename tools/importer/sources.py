"""Public Drive listings, or a local recursive directory. No OAuth or paid API."""

import hashlib
import json
import re
import urllib.request
from pathlib import Path
from dataclasses import dataclass
from urllib.parse import quote
from itertools import zip_longest

DEFAULT_FOLDER = "1_aB_V4X2u9potB2eGUV8RsFAob8ecuhm"


@dataclass
class Source:
    id: str
    name: str
    location: str
    version: str
    folder: str


def drive_sources(folder):
    folder = folder.split("/folders/")[-1].split("?")[0]
    pending, visited, result = [(folder, "")], set(), []
    while pending:
        key, parent = pending.pop()
        if key in visited:
            continue
        visited.add(key)
        with urllib.request.urlopen(
            "https://drive.google.com/drive/folders/" + quote(key), timeout=45
        ) as response:
            page = response.read().decode()
        match = re.search(r"window\['_DRIVE_ivd'\]\s*=\s*'(.*?)';", page)
        if not match:
            raise ValueError(
                "No se pudo enumerar la carpeta de Drive. Usa --local con una copia de la carpeta."
            )
        decoded = re.sub(
            r"\\x([0-9a-fA-F]{2})", lambda m: chr(int(m[1], 16)), match[1]
        ).replace(r"\/", "/")
        payload = json.loads(decoded)
        rows = payload[0] or []
        # Drive's anonymous HTML view can cap listings. Never report a capped view as complete.
        if len(rows) >= 50:
            raise ValueError(
                "Listado público posiblemente paginado. Importa la carpeta completa con --local."
            )
        for row in rows:
            ident, name, mime = row[0], row[2], row[3]
            if mime == "application/vnd.google-apps.folder":
                pending.append((ident, parent + "/" + name))
            elif mime == "application/pdf" or name.lower().endswith(".pdf"):
                version = "|".join(
                    str(x) for x in row[9:11] if isinstance(x, (float, int)) and x > 0
                )
                result.append(
                    Source(
                        ident,
                        name,
                        "https://drive.usercontent.google.com/download?export=download&confirm=t&id="
                        + quote(ident),
                        version,
                        parent,
                    )
                )
    return sorted(result, key=lambda s: (s.folder, s.name))


def local_sources(root):
    root = Path(root).resolve()
    return [
        Source(
            str(p.relative_to(root)),
            p.name,
            str(p),
            "",
            str(p.parent.relative_to(root)),
        )
        for p in sorted(root.rglob("*"))
        if p.is_file() and p.suffix.lower() == ".pdf"
    ]


def pilot(sources, n):
    if not n:
        return sources
    # Alternate papers. Sample across the list to include different years and layouts.
    buckets = {}
    for s in sources:
        paper = re.search(
            r"(?:paper|prueba)[ _-]*([12])", (s.folder + " " + s.name).lower()
        )
        buckets.setdefault(paper[1] if paper else "?", []).append(s)
    ordered = []
    for group in buckets.values():
        group.sort(key=lambda s: s.name)
        count = min(len(group), max(1, (n + len(buckets) - 1) // len(buckets)))
        selected = [
            group[round(i * (len(group) - 1) / max(1, count - 1))] for i in range(count)
        ]
        ordered.append(selected + [s for s in group if s not in selected])
    return [s for row in zip_longest(*ordered) for s in row if s][:n]


def acquire(source, target):
    import tempfile, os

    target.mkdir(parents=True, exist_ok=True)
    h = hashlib.sha256()
    with tempfile.NamedTemporaryFile(dir=target, delete=False) as temp:
        path = Path(temp.name)
        try:
            handle = (
                urllib.request.urlopen(source.location, timeout=60)
                if source.location.startswith("https://")
                else open(source.location, "rb")
            )
            with handle:
                while chunk := handle.read(1024 * 1024):
                    h.update(chunk)
                    temp.write(chunk)
            temp.flush()
            digest = h.hexdigest()
            dest = target / (digest + ".pdf")
            if not dest.exists():
                os.replace(path, dest)
            return digest, dest
        finally:
            path.unlink(missing_ok=True)

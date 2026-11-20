#!/usr/bin/env python3
"""Local import, review, and publication of explicitly authorized Spanish records."""

import argparse, hashlib, html, json, os, re, shutil, sqlite3, tempfile, time
import subprocess
from collections import Counter
from pathlib import Path
from importer.sources import (
    drive_sources,
    local_sources,
    pilot,
    acquire,
    DEFAULT_FOLDER,
)
from importer.extract import extract, TAGS
from importer.translate import Translator
from importer.structure import check_against_source, proposals, structure
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def dump(path, obj):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2))
    tmp.replace(path)


def index(base):
    db = sqlite3.connect(base / "inventory.sqlite")
    db.executescript(
        "CREATE TABLE IF NOT EXISTS files (source TEXT PRIMARY KEY, name TEXT, folder TEXT, version TEXT, sha TEXT, status TEXT); CREATE TABLE IF NOT EXISTS docs (sha TEXT PRIMARY KEY, meta TEXT, n INTEGER);"
    )
    return db


def report(base, db):
    files = db.execute(
        "select name,folder,sha,status from files order by folder,name"
    ).fetchall()
    docs = db.execute("select sha,meta,n from docs").fetchall()
    records = [json.loads(p.read_text()) for p in base.glob("questions/*/*/draft.json")]
    hashes = [r[2] for r in files if r[2]]
    bypaper = Counter()
    patterns = Counter()
    for sha, meta, n in docs:
        m = json.loads(meta)
        bypaper[str(m["paper"])] += n
        for p in (base / "questions" / sha).glob("*/draft.json"):
            q = json.loads(p.read_text())
            patterns[(m["paper"], len(q["parts"]), q["marks"])] += 1
    result = {
        "detected": len(files),
        "processed": len(docs),
        "extracted": len(records),
        "translatedDrafts": sum(q["translatedDraft"] for q in records),
        "validated": sum(
            q["status"] in ("validada", "autorizada para uso") for q in records
        ),
        "authorized": sum(q["status"] == "autorizada para uso" for q in records),
        "pending": sum(
            q["status"] not in ("autorizada para uso", "rechazada") for q in records
        ),
        "duplicates": len(hashes) - len(set(hashes)),
        "failures": sum(r[3].startswith("error") for r in files),
        "questionsByPaper": bypaper,
        "files": [
            {"name": name, "folder": folder, "sha256": sha, "status": status}
            for name, folder, sha, status in files
        ],
        "observedPatterns": [
            {"paper": k[0], "detectedParts": k[1], "printedMarks": k[2], "count": v}
            for k, v in patterns.items()
        ],
    }
    reserve = ROOT / "server-data/bank.sqlite"
    if reserve.is_file():
        with sqlite3.connect(f"file:{reserve}?mode=ro", uri=True) as bank:
            entries = bank.execute(
                "SELECT origin,paper,theme,topic,level,count(*) FROM items GROUP BY origin,paper,theme,topic,level"
            ).fetchall()
        result["originalsPrepared"] = sum(r[-1] for r in entries if r[0] == "original")
        result["studentAvailability"] = [
            dict(zip(["origin", "paper", "theme", "topic", "level", "count"], r))
            for r in entries
        ]
    dump(base / "report.json", result)
    print(
        json.dumps(
            {
                k: v
                for k, v in result.items()
                if k not in ("files", "observedPatterns", "studentAvailability")
            },
            ensure_ascii=False,
        )
    )


def ingest(args, base, db):
    sources = local_sources(args.local) if args.local else drive_sources(args.drive)
    dump(base / "listing.json", [vars(s) for s in sources])
    for s in sources:
        db.execute(
            "insert or ignore into files values(?,?,?,'','','detectado')",
            (s.id, s.name, s.folder),
        )
    db.commit()
    translator = Translator(args.model) if args.model else None
    for s in pilot(sources, args.pilot):
        prev = db.execute(
            "select version,sha,status from files where source=?", (s.id,)
        ).fetchone()
        sha = ""
        try:
            if (
                s.version
                and prev[0] == s.version
                and prev[1]
                and prev[2] == "procesado"
                and (base / "questions" / prev[1]).is_dir()
            ):
                continue
            sha, file = acquire(s, base / "pdf")
            if not db.execute("select 1 from docs where sha=?", (sha,)).fetchone():
                with tempfile.TemporaryDirectory(dir=base) as temp:
                    temp = Path(temp)
                    meta, questions = extract(file, temp, translator)
                    meta.update(file=s.name, sourceId=s.id)
                    dump(temp / "document.json", meta)
                    dest = base / "questions" / sha
                    if not dest.exists():
                        temp.rename(dest)
                    db.execute(
                        "insert into docs values(?,?,?)",
                        (sha, json.dumps(meta), len(questions)),
                    )
            status = "procesado"
        except Exception as exc:
            status = "error: " + type(exc).__name__ + " " + str(exc)[:160]
        with db:
            db.execute(
                "update files set version=?,sha=?,status=? where source=?",
                (s.version, sha, status, s.id),
            )
        print(s.name, status, flush=True)
    report(base, db)


def translate_drafts(base, translator, refresh=False):
    for p in sorted(base.glob("questions/*/*/draft.json")):
        q = json.loads(p.read_text())
        if q["reviewer"] or q["status"] not in (
            "revisión matemática pendiente",
            "traducción pendiente",
        ):
            continue
        source = structure((p.parent / "original.txt").read_text())
        if q["translatedDraft"] and not (
            refresh
            and [a["label"] for a in source["parts"]]
            != [x["label"] for x in q["parts"]]
        ):
            continue
        if not q["translatedDraft"] and (
            q["stem"] or any(b["ask"] for b in q["parts"])
        ):
            continue
        flags = set()

        def tr(x):
            val, ok = translator.translate(x.strip())
            if not ok:
                flags.add("notación pendiente")
            return val

        q["stem"] = tr(source["stem"])
        q["parts"] = []
        for a in source["parts"]:
            marks = a["printed"][0] if len(a["printed"]) == 1 else None
            q["parts"].append(
                {
                    "label": a["label"],
                    "ask": tr(a["en"]),
                    "marks": marks,
                    "value": None,
                    "rubric": [],
                    "steps": [],
                }
            )
        if (
            any(b["marks"] is None for b in q["parts"])
            or sum(b["marks"] or 0 for b in q["parts"]) != q["marks"]
        ):
            flags.add("puntos pendientes")
        q.update(
            translatedDraft=True,
            status="revisión matemática pendiente",
            sourceChecks=sorted(
                flags | {"comparar fórmulas, figuras y límites con los recortes"}
            ),
        )
        dump(p, q)


def validate(q, meta):
    if (
        meta["course"] != "MAI NM"
        or meta["paper"] not in (1, 2)
        or meta["kind"] != "cuadernillo"
    ):
        raise ValueError("Revisar metadatos del documento.")
    if (
        q["theme"] not in TAGS
        or not q["topic"]
        or q["level"] not in ("Fácil", "Medio", "Difícil")
    ):
        raise ValueError("Completar clasificación y dificultad.")
    if (
        not all(
            q.get(k) is True
            for k in ("translationReviewed", "mathReviewed", "graphicsReviewed")
        )
        or not q["reviewer"].strip()
    ):
        raise ValueError("Falta revisión de idioma, matemática o figuras.")
    if q["sourceChecks"]:
        raise ValueError("Resolver las observaciones de extracción en el borrador.")
    if not q["parts"] or not all(
        isinstance(p["ask"], str)
        and (p["ask"].strip() or p.get("label"))
        and type(p["marks"]) is int
        and p["marks"] >= 0
        for p in q["parts"]
    ):
        raise ValueError("Revisar incisos y puntuación.")
    if not q["marks"] or sum(p["marks"] for p in q["parts"]) != q["marks"]:
        raise ValueError("Los puntos no coinciden.")
    if q["scheme"] not in ("sin esquema", "revisado"):
        raise ValueError("Estado del esquema desconocido.")
    if q["scheme"] == "revisado" and not q.get("schemeReference"):
        raise ValueError("Falta la referencia al esquema.")
    import math

    for p in q["parts"]:
        if p["value"] is not None and (
            q["scheme"] != "revisado"
            or not p["steps"]
            or not p["rubric"]
            or not isinstance(p["value"], (int, float))
            or not math.isfinite(p["value"])
            or p["marks"] < 1
        ):
            raise ValueError(
                "La corrección numérica requiere respuesta finita y esquema revisado."
            )
    if not all(isinstance(t, str) for t in q["tags"]):
        raise ValueError("Etiquetas inválidas.")

    strings = [q["stem"]]
    for part in q["parts"]:
        strings.extend([part["ask"], *part["rubric"], *part["steps"]])
    if any(
        re.search(
            r"^\s*(?:find|calculate|show that|sketch|state|justify|solve)\b",
            phrase,
            re.I,
        )
        for phrase in strings
    ):
        raise ValueError("Quedan instrucciones en inglés.")
    check = subprocess.run(
        ["node", str(ROOT / "tools/verify-math.mjs")],
        input=json.dumps(strings),
        text=True,
        capture_output=True,
    )
    if check.returncode:
        raise ValueError("Revisar delimitadores o notación KaTeX antes de autorizar.")


def identifier(base, ident):
    if not re.fullmatch(r"[a-f0-9]{64}/[1-9]\d*", ident):
        raise ValueError("Usa SHA256/número.")
    return base / "questions" / ident


def review(args, base):
    folder = identifier(base, args.id)
    p = folder / "draft.json"
    q = json.loads(p.read_text())
    if args.action == "show":
        esc = html.escape
        original = esc((folder / "original.txt").read_text())
        document = esc(json.dumps(q, ensure_ascii=False, indent=2))
        figs = "".join(
            "<p>Página "
            + str(ref["page"])
            + '</p><img width="600" src="'
            + esc(ref["image"], quote=True)
            + '">'
            for ref in q["refs"]
        )
        rendered = subprocess.run(
            ["node", str(ROOT / "tools/preview-math.mjs")],
            input=json.dumps(q),
            text=True,
            capture_output=True,
            check=True,
        ).stdout
        stylesheet = (ROOT / "node_modules/katex/dist/katex.min.css").as_uri()
        (folder / "review.html").write_text(
            '<link rel="stylesheet" href="'
            + esc(stylesheet, quote=True)
            + '"><meta charset="utf-8"><title>Revisión privada</title><style>main{display:grid;grid-template-columns:1fr 1fr;gap:2em}pre{white-space:pre-wrap}img{max-width:100%}</style><main><section><h1>Fuente</h1>'
            + figs
            + "<pre>"
            + original
            + "</pre></section><section><h1>Borrador español</h1>"
            + rendered
            + "<h2>Ficha editable</h2><pre>"
            + document
            + "</pre></section></main>"
        )
        print(folder / "review.html")
        print(p)
        return
    if args.action == "reject":
        q["status"] = "rechazada"
    else:
        validate(q, json.loads((folder.parent / "document.json").read_text()))
        check_against_source(q, folder)
        if args.action == "authorize" and not q["rightsReference"].strip():
            raise ValueError(
                "Falta la referencia escrita del permiso para traducir y mostrar la pregunta al aula."
            )
        q["status"] = (
            "autorizada para uso" if args.action == "authorize" else "validada"
        )
    dump(p, q)
    # Bind approval to the exact draft and approved artwork. Edits require another review.
    if args.action == "authorize":
        dump(
            folder / "approval.json",
            {"hash": content_hash(folder, q), "reviewer": q["reviewer"]},
        )


def images(folder, q):
    for a in q["assets"]:
        path = (folder / a["file"]).resolve()
        if (
            path.parent != folder.resolve()
            or path.suffix != ".webp"
            or not a["alt"].strip()
            or type(a["part"]) is not int
            or not -1 <= a["part"] < len(q["parts"])
        ):
            raise ValueError("Revisar gráfico español y ubicación.")
        with Image.open(path) as im:
            if im.format != "WEBP":
                raise ValueError("Formato de imagen inválido.")
            im.verify()
        yield a, path.read_bytes()


def content_hash(folder, q):
    h = hashlib.sha256((folder / "draft.json").read_bytes())
    h.update((folder.parent / "document.json").read_bytes())
    h.update((folder / "original.txt").read_bytes())
    for _, data in images(folder, q):
        h.update(data)
    return h.hexdigest()


def export(args, base, db):
    dest = Path(args.output).resolve()
    if dest.is_relative_to(ROOT / "public") or dest.is_relative_to(ROOT / "dist"):
        raise ValueError("El banco es privado.")
    dest.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=dest.parent)
    os.close(fd)
    temp = Path(name)
    output = sqlite3.connect(temp)
    output.executescript((ROOT / "server/schema.sql").read_text())
    try:
        for (sha,) in db.execute(
            "select distinct sha from files where status='procesado'"
        ):
            for path in (base / "questions" / sha).glob("*/draft.json"):
                q = json.loads(path.read_text())
                folder = path.parent
                if q["status"] != "autorizada para uso":
                    continue
                if json.loads((folder / "approval.json").read_text())[
                    "hash"
                ] != content_hash(folder, q):
                    raise ValueError("El contenido cambió después de la autorización.")
                meta = json.loads((folder.parent / "document.json").read_text())
                validate(q, meta)
                check_against_source(q, folder)
                if not q["rightsReference"].strip():
                    raise ValueError("Falta permiso.")
                ident = sha + "-" + folder.name
                assets = []
                for a, data in images(folder, q):
                    key = hashlib.sha256(data).hexdigest()
                    output.execute(
                        "insert or ignore into assets values(?,?)", (key, data)
                    )
                    assets.append({"id": key, "alt": a["alt"], "part": a["part"]})
                item = {
                    k: q[k]
                    for k in (
                        "stem",
                        "topic",
                        "theme",
                        "level",
                        "tags",
                        "marks",
                        "scheme",
                    )
                }
                item.update(
                    id=ident,
                    course="MAI NM",
                    language="es",
                    validated=True,
                    permission="autorizada para uso",
                    origin="real",
                    family="ib-" + ident,
                    variant=0,
                    assets=assets,
                    parts=[
                        {
                            k: p[k]
                            for k in (
                                "label",
                                "ask",
                                "marks",
                                "value",
                                "rubric",
                                "steps",
                            )
                        }
                        for p in q["parts"]
                    ],
                    provenance={
                        k: meta.get(k)
                        for k in ("paper", "course", "year", "session", "zone")
                    },
                )
                item["provenance"].update(
                    number=q["number"],
                    pages=[x["page"] for x in q["refs"]],
                    document=sha,
                )
                norm = lambda s: " ".join(s.lower().split())
                wording = norm(q["stem"] + " " + " ".join(p["ask"] for p in q["parts"]))
                digest = lambda s: hashlib.sha256(s.encode()).hexdigest()
                output.execute(
                    "insert or ignore into items values(?,?,?,?,?,?,?,?,?,?)",
                    (
                        ident,
                        "real",
                        meta["paper"],
                        q["theme"],
                        q["topic"],
                        q["level"],
                        q["marks"],
                        digest(re.sub(r"\d+", "N", wording)),
                        digest(
                            json.dumps(
                                [
                                    wording,
                                    [(b["label"], b["marks"]) for b in q["parts"]],
                                    assets,
                                ],
                                sort_keys=True,
                                ensure_ascii=False,
                            )
                        ),
                        json.dumps(item, ensure_ascii=False),
                    ),
                )
        print(
            "Preguntas reales exportadas:",
            output.execute("select count(*) from items").fetchone()[0],
        )
        output.commit()
        output.close()
        temp.replace(dest)
    finally:
        temp.unlink(missing_ok=True)


if __name__ == "__main__":
    cli = argparse.ArgumentParser()
    cli.add_argument("--private", default=str(ROOT / ".private"))
    subs = cli.add_subparsers(dest="command", required=True)
    imp = subs.add_parser("import")
    imp.add_argument("--local")
    imp.add_argument("--drive", default=DEFAULT_FOLDER)
    imp.add_argument("--pilot", type=int)
    imp.add_argument("--model")
    rev = subs.add_parser("review")
    rev.add_argument("id")
    rev.add_argument("action", choices=["show", "validate", "authorize", "reject"])
    exp = subs.add_parser("export")
    exp.add_argument("--output", default=str(ROOT / "server-data/approved.sqlite"))
    tr = subs.add_parser("translate")
    tr.add_argument("--model", required=True)
    tr.add_argument("--refresh-labels", action="store_true")
    subs.add_parser("report")
    args = cli.parse_args()
    base = Path(args.private).resolve()
    base.mkdir(parents=True, exist_ok=True, mode=0o700)
    (base / "questions").mkdir(exist_ok=True)
    db = index(base)
    if args.command == "import":
        ingest(args, base, db)
    elif args.command == "translate":
        translate_drafts(base, Translator(args.model), args.refresh_labels)
        report(base, db)
    elif args.command == "report":
        report(base, db)
    elif args.command == "review":
        review(args, base)
    else:
        export(args, base, db)

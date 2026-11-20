"""Extract candidate question boundaries with original page geometry as the source of truth."""

import re, json
from pathlib import Path
import pymupdf as pdf
from PIL import Image
from .structure import proposals, structure

TAGS = {
    "Números y álgebra": (
        "interest",
        "annuity",
        "geometric sequence",
        "investment",
        "loan",
    ),
    "Funciones": (
        "function",
        "regression model",
        "exponential model",
        "quadratic model",
    ),
    "Geometría y trigonometría": (
        "triangle",
        "voronoi",
        "bearing",
        "radius",
        "angle",
        "volume of",
    ),
    "Estadística y probabilidad": (
        "probability",
        "frequency",
        "sample",
        "distribution",
        "hypothesis",
        "correlation",
    ),
    "Análisis matemático": (
        "derivative",
        "gradient of the tangent",
        "rate of change",
        "integral",
        "trapezoidal rule",
    ),
}


def metadata(doc, name, text=None):
    text = text or " ".join(doc[i].get_text() for i in range(min(3, len(doc))))
    compact = " ".join(text.lower().split())

    def find(pattern):
        m = re.search(pattern, compact, re.I)
        return m[1] if m else None

    paper = find(r"\bpaper\s+([12])\b")
    date = re.search(r"\b(may|november)\s+(20\d{2})\b", compact)
    return {
        "paper": int(paper) if paper else None,
        "session": (
            {"may": "mayo", "november": "noviembre"}[date[1]] if date else None
        ),
        "year": int(date[2]) if date else None,
        "zone": find(r"\b(tz[123abc])\b"),
        "course": "MAI NM"
        if "applications and interpretation" in compact and "standard level" in compact
        else None,
        "pages": len(doc),
        "file": name,
        "filenameHints": re.findall(
            r"20\d{2}|tz[123abc]|may|november|paper[-_ ][12]", name.lower()
        ),
        "kind": "esquema" if re.search(r"\bmarkscheme\b", compact) else "cuadernillo",
    }


def read_pages(doc):
    pages = []
    for page in doc:
        words = page.get_text("words")
        scanned = False
        tp = None
        if len(words) < 12 and page.get_images():
            scanned = True
            tp = page.get_textpage_ocr(language="eng", dpi=200, full=True)
            words = page.get_text("words", textpage=tp)
        pages.append((words, tp, scanned, page))
    return pages


def extract(file, folder, translator=None):
    with pdf.open(file) as doc:
        if doc.needs_pass or len(doc) == 0:
            raise ValueError("PDF cifrado o vacío")
        meta = metadata(doc, Path(file).name)
        if meta["kind"] == "esquema":
            return meta, []
        pages = read_pages(doc)
        if any(scanned for _, _, scanned, _ in pages[:3]):
            cover = " ".join(page.get_text(textpage=tp) for _, tp, _, page in pages[:3])
            meta = metadata(doc, Path(file).name, cover)
            if meta["kind"] == "esquema":
                return meta, []
        starts = []
        for i, (words, _, _, _) in enumerate(pages):
            for x, y, _, _, w, *_ in sorted(words, key=lambda k: (k[1], k[0])):
                match = re.fullmatch(r"(\d{1,2})\.", w)
                if (
                    match
                    and x < doc[i].rect.width * 0.14
                    and 32 < y < doc[i].rect.height - 40
                    and int(match[1]) == len(starts) + 1
                ):
                    starts.append((i, y, int(match[1])))
        if not starts:
            raise ValueError("Sin límites de preguntas verificables")
        output = []
        for index, (page0, y0, number) in enumerate(starts):
            end, y1, _ = (
                starts[index + 1]
                if index + 1 < len(starts)
                else (len(doc) - 1, doc[-1].rect.height, 0)
            )
            dest = folder / str(number)
            dest.mkdir(parents=True, exist_ok=True)
            chunks = []
            refs = []
            layout = []
            for i in range(page0, end + 1):
                words, tp, scanned, page = pages[i]
                top = max(0, y0 - 3) if i == page0 else 0
                bottom = (
                    y1 - 3 if i == end and index + 1 < len(starts) else page.rect.height
                )
                if bottom - top < 5:
                    continue
                rect = pdf.Rect(0, top, page.rect.width, bottom)
                text = (
                    page.get_text(sort=True, clip=rect)
                    if tp is None
                    else page.get_textbox(rect, textpage=tp)
                )
                # Page references/crops preserve tables, diagrams, superscripts and even empty answer areas.
                pix = page.get_pixmap(
                    matrix=pdf.Matrix(1.35, 1.35), clip=rect, alpha=False
                )
                path = dest / f"p{i + 1}.webp"
                Image.frombytes("RGB", (pix.width, pix.height), pix.samples).save(
                    path, lossless=True
                )
                refs.append(
                    {
                        "page": i + 1,
                        "clip": list(rect),
                        "image": path.name,
                        "ocr": scanned,
                    }
                )
                layout.append(
                    {
                        "page": i + 1,
                        "words": [
                            w[:5] for w in words if rect.contains(pdf.Rect(w[:4]))
                        ],
                    }
                )
                chunks.append(text)
            raw = "\n".join(chunks)
            (dest / "layout.json").write_text(json.dumps(layout, ensure_ascii=False))
            (dest / "original.txt").write_text(raw)
            source = structure(raw)
            text = raw
            total = source["total"]
            stem = source["stem"]
            parts = [(p["label"], p["en"]) for p in source["parts"]]
            flags = []

            def tr(s):
                if not translator:
                    return ""
                result, ok = translator.translate(s.strip())
                if not ok:
                    flags.append("notación pendiente")
                return result

            blocks = []
            for label, part in parts:
                marks = re.findall(r"\[\s*(\d+)\s*\]", part)
                blocks.append(
                    {
                        "label": label,
                        "ask": tr(part),
                        "marks": int(marks[0]) if len(marks) == 1 else None,
                        "value": None,
                        "steps": [],
                        "rubric": [],
                    }
                )
            if (
                total is None
                or any(p["marks"] is None for p in blocks)
                or sum(p["marks"] or 0 for p in blocks) != total
            ):
                flags.append("puntos pendientes")
            tags = sorted(
                TAGS, key=lambda t: -sum(text.lower().count(w) for w in TAGS[t])
            )
            suggestions = [t for t in tags if any(w in text.lower() for w in TAGS[t])]
            document = {
                "number": number,
                "refs": refs,
                "stem": tr(stem),
                "parts": blocks,
                "marks": total,
                "assets": [],
                "theme": None,
                "topic": None,
                "level": None,
                "tags": [],
                "suggestions": suggestions,
                "scheme": "sin esquema",
                "sourceChecks": sorted(
                    set(
                        flags
                        + ["comparar fórmulas, figuras y límites con los recortes"]
                    )
                ),
                "status": "revisión matemática pendiente"
                if translator
                else "traducción pendiente",
                "translatedDraft": bool(translator),
                "translationReviewed": False,
                "mathReviewed": False,
                "graphicsReviewed": False,
                "rightsReference": "",
                "reviewer": "",
            }
            document["classificationProposal"] = proposals(raw, document)
            (dest / "draft.json").write_text(
                json.dumps(document, ensure_ascii=False, indent=2)
            )
            output.append(document)
        return meta, output

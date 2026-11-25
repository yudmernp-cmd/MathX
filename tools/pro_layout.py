"""Lay out one private exam as Spanish paragraphs interleaved with original visual material."""

import hashlib
import re
from io import BytesIO

import pymupdf as pdf
from PIL import Image, ImageChops

MAX_MARKS = re.compile(r"\[\s*maximum\s+marks?\s*:\s*(\d+)\s*\]", re.I)
SKIP = re.compile(
    r"question \d+ continued|this question continues|turn over|please do not write|answers written on this page",
    re.I,
)


def clean(value):
    return " ".join(
        re.sub(r"[\x00-\x1f]", " ", value)
        .replace("\u200b", "")
        .replace("\xad", "")
        .split()
    )


def picture(page, rect, directory):
    rect = (pdf.Rect(rect) + (-1, -1, 1, 1)) & page.rect
    if rect.is_empty:
        return None
    scale = 2
    pix = page.get_pixmap(matrix=pdf.Matrix(scale, scale), clip=rect, alpha=False)
    im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    ink = (
        ImageChops.invert(im.convert("L"))
        .point(lambda p: 255 if p > 42 else 0)
        .getbbox()
    )
    if not ink:
        return None
    im = im.crop(
        (
            max(0, ink[0] - 3),
            max(0, ink[1] - 3),
            min(im.width, ink[2] + 3),
            min(im.height, ink[3] + 3),
        )
    )
    out = BytesIO()
    im.save(out, "WEBP", lossless=True, method=2)
    data = out.getvalue()
    name = hashlib.sha256(data).hexdigest()
    (directory / (name + ".webp")).write_bytes(data)
    return {"image": name, "width": im.width / scale, "height": im.height / scale}


def is_prose(span):
    return "Arial" in span["font"] or "Wingding" in span["font"]


def formula_part(page, spans, directory):
    box = pdf.Rect(spans[0]["bbox"])
    for s in spans[1:]:
        box |= pdf.Rect(s["bbox"])
    # Only single, baseline-aligned quantities can safely become plain text.
    if len(spans) == 1:
        s = spans[0]
        if (
            "Times" in s["font"]
            and s["size"] >= 10
            and re.fullmatch(r"[\w\s.,()$%+−=°×–:;!?/]+", s["text"])
        ):
            return {"literal": clean(s["text"])}
    return picture(page, box, directory)


def prose_parts(page, block, directory):
    # PDF math fonts can store a numerator, its bar and its denominator in
    # separate lines in arbitrary order. Keep each formula's printed geometry.
    lines = block["lines"]
    rows = sorted(
        {
            round(s["origin"][1])
            for line in lines
            for s in line["spans"]
            if is_prose(s) and clean(s["text"])
        }
    )
    positioned = {y: [] for y in rows}
    for line in lines:
        baseline = next(
            (s["origin"][1] for s in line["spans"] if is_prose(s) and clean(s["text"])),
            None,
        )
        for s in line["spans"]:
            if not s["text"].strip() and not clean(s["text"]):
                continue
            y = baseline if baseline is not None else s["origin"][1]
            row = min(rows, key=lambda r: abs(r - y))
            positioned[row].append(s)
    parts = []
    for spans in positioned.values():
        formula = []
        for s in sorted(spans, key=lambda v: v["bbox"][0]):
            if not is_prose(s):
                formula.append(s)
                continue
            if formula:
                part = formula_part(page, formula, directory)
                if part:
                    parts.append(part)
                formula = []
            parts.append(" • " if "Wingding" in s["font"] else s["text"] + " ")
        if formula:
            part = formula_part(page, formula, directory)
            if part:
                parts.append(part)
        parts.append(" ")
    return parts


def question_starts(doc):
    starts = []
    for page in doc:
        words = sorted(page.get_text("words"), key=lambda w: (w[1], w[0]))
        for x, y, _, _, word, *_ in words:
            if (
                word == str(len(starts) + 1) + "."
                and x < page.rect.width * 0.14
                and 32 < y < page.rect.height - 40
            ):
                starts.append((page.number, y))
    return starts


def extract_paper(path, directory):
    questions = []
    with pdf.open(path) as doc:
        starts = question_starts(doc)
        for index, (first, top) in enumerate(starts):
            last, bottom = (
                starts[index + 1]
                if index + 1 < len(starts)
                else (len(doc) - 1, doc[-1].rect.height)
            )
            blocks, marks = [], None
            for i in range(first, last + 1):
                page = doc[i]
                lo = max(58, top - 3) if i == first else 58
                hi = (
                    min(page.rect.height - 62, bottom - 3)
                    if i == last
                    else page.rect.height - 62
                )
                if hi <= lo:
                    continue
                items = []
                for b in page.get_text(
                    "dict", flags=pdf.TEXTFLAGS_DICT & ~pdf.TEXT_PRESERVE_IMAGES
                )["blocks"]:
                    if "lines" not in b:
                        continue
                    rect = pdf.Rect(b["bbox"])
                    if rect.y1 <= lo or rect.y0 >= hi or rect.y0 < lo - 3:
                        continue
                    txt = clean(
                        " ".join(s["text"] for l in b["lines"] for s in l["spans"])
                    )
                    if txt.lower().startswith(
                        ("disclaimer:", "references:", "all other texts, graphics")
                    ):
                        hi = min(hi, rect.y0)
                    items.append((rect, txt, b))
                items.sort(key=lambda row: row[0].y0)
                if not items or any(
                    "please do not write on this page" in t.lower() for _, t, _ in items
                ):
                    continue
                area = pdf.Rect(35, lo, page.rect.width - 35, hi)
                visuals = [
                    r
                    for r in page.cluster_drawings()
                    if r.width > 12
                    and r.height > 8
                    and r.y0 < page.rect.height - 68
                    and not (r.width > 490 and r.x0 < 48)
                ]
                visuals.extend(pdf.Rect(img["bbox"]) for img in page.get_image_info())

                def gap(y0, y1):
                    if y1 <= y0 + 1:
                        return
                    region = pdf.Rect(area.x0, y0, area.x1, y1)
                    pieces = [r & region for r in visuals if r.intersects(region)]
                    for r, txt, _ in items:
                        if (
                            y0 <= (r.y0 + r.y1) / 2 < y1
                            and re.search(r"[\w+−∫√≤≥=]", txt)
                            and not SKIP.search(txt)
                        ):
                            pieces.append(r & region)
                    if not pieces:
                        return
                    clip = pdf.Rect(pieces[0])
                    for piece in pieces[1:]:
                        clip |= piece
                    # Include strokes and tick labels beyond their extracted text boxes.
                    img = picture(page, (clip + (-5, -3, 5, 3)) & region, directory)
                    if img:
                        blocks.append(img)

                cursor = lo
                for rect, txt, block in items:
                    if rect.y0 >= hi:
                        break
                    maximum = MAX_MARKS.search(txt)
                    if maximum:
                        marks = int(maximum[1])
                        cursor = max(cursor, rect.y1)
                        continue
                    if SKIP.search(txt):
                        gap(cursor, rect.y0)
                        cursor = max(cursor, rect.y1)
                        continue
                    subpart = re.match(r"^\([a-zivx]+\)", txt)
                    if (
                        (rect.y0 < cursor - 3 and not subpart)
                        or rect.x0 > 146
                        or not re.search("[A-Za-z]{2,}", txt)
                    ):
                        continue
                    if not subpart and any(
                        (rect & v).get_area() > rect.get_area() * 0.45
                        or (
                            v.y0 < rect.y0 + rect.height / 2 < v.y1
                            and rect.x1 <= v.x0 + 3
                            and rect.x1 > v.x0 - 80
                        )
                        for v in visuals
                    ):
                        continue
                    if not any(
                        "Arial" in s["font"] and re.search("[A-Za-z]{2,}", s["text"])
                        for l in block["lines"]
                        for s in l["spans"]
                    ):
                        continue
                    gap(cursor, rect.y0)
                    # Some pages store the part's mark in a separate right-hand text block.
                    extra = [
                        b
                        for r, t, b in items
                        if b is not block
                        and r.x0 >= rect.x1
                        and r.y0 < rect.y1
                        and r.y1 > rect.y0
                        and re.fullmatch(r"[.;,]?\s*\[\d+\]", t)
                    ]
                    if extra:
                        block = {
                            "lines": block["lines"]
                            + [line for b in extra for line in b["lines"]]
                        }
                    blocks.append({"source": prose_parts(page, block, directory)})
                    cursor = max(cursor, rect.y1)
                gap(cursor, hi)
            if not marks or not any("source" in b for b in blocks):
                raise ValueError(f"{path.name}: pregunta {index + 1} incompleta")
            questions.append({"number": index + 1, "marks": marks, "blocks": blocks})
    if sum(q["marks"] for q in questions) != 80:
        raise ValueError("Puntuación incompleta: " + path.name)
    return questions

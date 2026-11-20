"""Check the release transcript against the reviewed source. No model declares equivalence."""

import re
from collections import Counter


def structure(raw):
    text = re.sub(r"^\s*\d+\.\s*", "", raw, count=1)
    total = re.search(r"\[\s*maximum\s+mark[s]?\s*:\s*(\d+)\s*\]", text, re.I)
    boundaries = []
    for m in re.finditer(r"(?m)^[ \t]*(\((?:[a-z]|[ivx]{1,4})\))[ \t]*", text):
        end = m.end()
        sub = re.match(r"(\([ivx]{1,4}\))[ \t]*", text[end:])
        label = m[1] + (sub[1] if sub else "")
        boundaries.append((m.start(), end + (sub.end() if sub else 0), label))
    stem = text[: boundaries[0][0]] if boundaries else ""
    parts = [
        (label, text[end : boundaries[i + 1][0] if i + 1 < len(boundaries) else None])
        for i, (_, end, label) in enumerate(boundaries)
    ] or [("", text)]
    return {
        "stem": stem,
        "total": int(total[1]) if total else None,
        "parts": [
            {
                "label": label,
                "en": body,
                "printed": list(map(int, re.findall(r"\[\s*(\d+)\s*\]", body))),
            }
            for label, body in parts
        ],
    }


def invariants(text):
    normalized = text.translate(
        str.maketrans({"−": "-", "×": "*", "÷": "/", "²": "2", "³": "3"})
    )
    return Counter(
        re.findall(
            r"\d+(?:[.,]\d+)*|[+*/^<>≤≥=±%π°√α-ω]|(?<!\w)[b-df-hj-np-xz](?!\w)|\b(?:kg|cm|mm|km|mg|kWh|USD|EUR|sin|cos|tan)\b",
            normalized.replace(",", "."),
        )
    )


def check_against_source(q, folder):
    source = structure((folder / "original.txt").read_text())
    if source["total"] is not None and source["total"] != q["marks"]:
        raise ValueError("El total difiere del máximo impreso.")
    # A reviewer may repair defective OCR or misidentified boundaries, recording page and reason.
    amendment = q.get("sourceCorrection")
    if amendment:
        if (
            not (set(amendment["pages"]) <= set(r["page"] for r in q["refs"]))
            or not amendment["pages"]
            or not amendment["reason"].strip()
        ):
            raise ValueError("Documenta las páginas y la corrección de lectura.")
        source = amendment["transcript"]
        if source["total"] != q["marks"]:
            raise ValueError("El total difiere de la transcripción revisada.")
    if len(source["parts"]) != len(q["parts"]):
        raise ValueError("Número de apartados distinto del original revisado.")
    if invariants(source["stem"]) != invariants(q["stem"]):
        raise ValueError("Discrepancia de magnitudes o signos en el enunciado.")
    for a, b in zip(source["parts"], q["parts"]):
        if a["label"] != b["label"]:
            raise ValueError("Orden o identificador de incisos diferente.")
        if len(a["printed"]) == 1 and a["printed"][0] != b["marks"]:
            raise ValueError("Puntuación de inciso distinta.")
        if invariants(a["en"]) != invariants(b["ask"]):
            raise ValueError("Revisar números, unidades y signos de cada inciso.")


def proposals(raw, q):
    s = raw.lower()
    cues = [
        name
        for name, pattern in {
            "justificación": r"justify|explain|comment",
            "comparación": r"compare|difference between",
            "inversión": r"determine the value of|solve|hence",
            "interpretación": r"interpret|in context|validity",
            "modelización": r"model|assumption",
            "decisión": r"decide|conclude|test whether",
        }.items()
        if re.search(pattern, s)
    ]
    sequential = len(q["parts"]) >= 4
    level = (
        "Difícil"
        if (len(cues) >= 3 or sequential and len(cues) >= 2)
        else "Medio"
        if cues or sequential
        else "Fácil"
    )
    keywords = {
        "Matemática financiera": r"loan|interest rate|compound interest",
        "Funciones exponenciales": r"exponential",
        "Contraste de independencia": r"chi.squared|independence test",
        "Distribución binomial": r"binomial",
        "Distribución normal": r"normally distributed|normal distribution",
        "Diagramas de Voronoi": r"voronoi",
        "Optimización y tasas de cambio": r"maximum volume|rate of change",
        "Modelos lineales": r"linear model",
        "Triángulos rectángulos y semejanza": r"right.angled",
        "Probabilidad condicionada": r"given that|conditional probability",
    }
    return {
        "level": level,
        "reasons": cues,
        "relatedParts": sequential,
        "subtopics": [k for k, v in keywords.items() if re.search(v, s)],
    }

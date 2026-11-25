"""Translate locally with a pinned Argos English-Spanish model, retaining original math and graphics."""

import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import urllib.request
import zipfile

import ctranslate2
import sentencepiece

from pro_layout import clean, extract_paper

MODEL_SHA = "d698d0ef87ad70d5d184b7fa6965905bf4368f09a2bb9ffb165a79bac96af0c4"
DIRECTORY = Path("server-data/pro")
OUTPUT = Path("server-data/pro-es")
CACHE = Path(os.environ.get("MATHX_PRO_CACHE", ".private/pro-build"))
# Names of quantities, units, mathematical symbols, part labels and every printed number.
PROTECT = re.compile(
    r"(\[\s*\d+\s*\]|\((?:[a-z]|[ivx]+)\)|\d+(?:[.,]\d+)*|\b(?:[A-Z]{2,}|kg|km|cm|mm|mL|ml|kWh|ln|log|sin|cos|tan)\b|[=×÷−+≠≤≥≈°%£€$πα-ω√∫∞²³])"
)
MARKER = re.compile(r"\[\s*(1\d{2,})\s*\]")

# Preserve distinctions that change an answer, such as mean versus median.
TERMS = {
    r"box[ -]and[ -]whisker (?:plots|diagrams)": "diagramas de caja y bigotes",
    r"box[ -]and[ -]whisker (?:plot|diagram)": "diagrama de caja y bigotes",
    r"(?:Pearson['’]s? )?product[ -]moment correlation coefficient": "coeficiente de correlación de Pearson",
    r"significant (?:figures|digits)": "cifras significativas",
    r"decimal places": "decimales",
    r"interquartile range": "rango intercuartílico",
    r"standard deviation": "desviación estándar",
    r"cumulative frequency": "frecuencia acumulada",
    r"median": "mediana",
    r"outliers": "valores atípicos",
    r"outlier": "valor atípico",
}
TOKEN = re.compile(
    r"\ufffc|"
    + "|".join(
        rf"(?P<term{i}>(?i:\b(?:{pattern})\b))" for i, pattern in enumerate(TERMS)
    )
    + "|"
    + PROTECT.pattern
)
SPANISH_TERMS = {f"term{i}": value for i, value in enumerate(TERMS.values())}


class Spanish:
    def __init__(self):
        CACHE.mkdir(parents=True, exist_ok=True)
        archive = CACHE / "en-es.argosmodel"
        if (
            not archive.exists()
            or hashlib.sha256(archive.read_bytes()).hexdigest() != MODEL_SHA
        ):
            urllib.request.urlretrieve(
                "https://argos-net.com/v1/translate-en_es-1_0.argosmodel", archive
            )
        if hashlib.sha256(archive.read_bytes()).hexdigest() != MODEL_SHA:
            raise ValueError("Modelo de traducción dañado")
        with zipfile.ZipFile(archive) as z:
            for name in (
                "en_es/model/model.bin",
                "en_es/model/shared_vocabulary.txt",
                "en_es/sentencepiece.model",
            ):
                z.extract(name, CACHE)
        self.encoder = sentencepiece.SentencePieceProcessor(
            model_file=str(CACHE / "en_es/sentencepiece.model")
        )
        self.model = ctranslate2.Translator(
            str(CACHE / "en_es/model"),
            device="cpu",
            compute_type="int8",
            intra_threads=2,
        )
        self.cache = {}

    def translate_many(self, texts):
        todo = list(dict.fromkeys(t for t in texts if t not in self.cache))
        for i in range(0, len(todo), 48):
            batch = todo[i : i + 48]
            inputs = self.encoder.encode(batch, out_type=str)
            out = self.model.translate_batch(
                inputs, beam_size=2, max_decoding_length=512, max_input_length=0
            )
            for source, result in zip(batch, out):
                self.cache[source] = self.encoder.decode(result.hypotheses[0])


def template(parts):
    protected = []
    native = iter(p for p in parts if isinstance(p, dict))
    text = clean("".join(" \ufffc " if isinstance(p, dict) else p for p in parts))
    text = re.sub(
        r"\bState(?= (?:the|a|an|which|whether|one|two|how|why|if)\b|,)",
        "Specify",
        text,
    )
    text = re.sub(r"\bSketch the graph", "Draw the graph", text, flags=re.I)

    def mask(match):
        if match[0] == "\ufffc":
            item = next(native)
            value = item.get("literal", item)
        else:
            value = SPANISH_TERMS.get(match.lastgroup, match[0])
        protected.append(value)
        return "[" + str(100 + len(protected)) + "]"

    return TOKEN.sub(mask, text), protected


def spanish_parts(parts):
    # Rejoin literal numbers with their sentences without changing figure order.
    result = []
    for part in parts:
        if isinstance(part, str) and result and isinstance(result[-1], str):
            result[-1] += part
        elif part:
            result.append(part)
    for i, part in enumerate(result):
        if isinstance(part, str):
            part = re.sub(r"\b(\d+)(?:st|nd|rd|th)\b", r"\1.º", part)
            part = re.sub(r"\s+([,.;?!])", r"\1", part)
            part = re.sub(r"\brelación común\b", "razón común", part)
            part = part.replace("ocho machos en", "ocho corredores varones en")
            result[i] = part
    return result


def translate(questions, engine):
    blocks = [b for q in questions for b in q["blocks"] if "source" in b]
    prepared = [template(b.pop("source")) for b in blocks]
    engine.translate_many([s for s, _ in prepared])
    for block, (source, tokens) in zip(blocks, prepared):
        text = engine.cache[source]
        if (
            MARKER.findall(text) != MARKER.findall(source)
            or re.search(r"\d", MARKER.sub("", text))
            or re.search(r"\b(?:the|students are|find the|which of)\b", text, re.I)
        ):
            # Some models drop placeholders. Translate the intervening prose individually.
            segments = re.split(r"(\[1\d{2,}\])", source)
            phrases = [s.strip() for s in segments[::2] if re.search("[A-Za-z]{2}", s)]
            engine.translate_many(phrases)
            text = " ".join(
                engine.cache.get(s.strip(), s) if i % 2 == 0 else s
                for i, s in enumerate(segments)
            )
        parts = []
        cursor = 0
        for m in MARKER.finditer(text):
            parts.extend([text[cursor : m.start()], tokens[int(m[1]) - 101]])
            cursor = m.end()
        parts.append(text[cursor:])
        block["parts"] = spanish_parts(parts)


def main():
    sources = [
        "tools/pro_layout.py",
        "tools/pro_spanish.py",
        "tools/pro_requirements.txt",
    ]
    version = hashlib.sha256(
        b"".join(Path(p).read_bytes() for p in sources)
    ).hexdigest()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    engine = None
    for row in json.loads((DIRECTORY / "catalog.json").read_text()):
        dest = OUTPUT / row["id"]
        marker = CACHE / "editions" / row["id"]
        if (
            marker.exists()
            and marker.read_text() == version
            and (dest / "questions.json").is_file()
        ):
            continue
        if engine is None:
            engine = Spanish()
        with tempfile.TemporaryDirectory(dir=OUTPUT) as staging:
            work = Path(staging)
            questions = extract_paper(DIRECTORY / (row["id"] + ".pdf"), work)
            translate(questions, engine)
            dest.mkdir(parents=True, exist_ok=True)
            for img in work.glob("*.webp"):
                img.replace(dest / img.name)
            manifest = work / "questions.json"
            manifest.write_text(
                json.dumps(questions, ensure_ascii=False, separators=(",", ":"))
            )
            manifest.replace(dest / manifest.name)
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text(version)
        print(row["paper"], row["title"], len(questions), flush=True)


if __name__ == "__main__":
    main()

"""Local CPU translation. Immutable mathematical fragments bypass the model."""

import re
from functools import lru_cache
from pathlib import Path

TOKEN = re.compile(
    r"(\$[^$\n]+\$|\\\([^\n]+?\\\)|\[\s*\d+\s*\]|\((?:[a-z]|[ivx]+)\)|\b(?:kg|km|cm|mm|ms|mg|kWh|USD|GBP|EUR|sin|cos|tan|log|ln|[A-HJ-Zb-hj-z])\b|(?<!\w)[-+−]?\d+(?:[.,]\d+)*|[=+−×÷≠≈≥≤√π∞°²³%∑∫^_/<>]|[α-ωΑ-Ω])"
)
GLOSSARY = {
    "show that": "Demuestra que",
    "hence": "A partir de lo anterior",
    "sketch": "Esboza",
    "state": "Indica",
    "find": "Halla",
    "calculate": "Calcula",
    "justify": "Justifica",
    "solve": "Resuelve",
    "expected value": "valor esperado",
    "standard deviation": "desviación estándar",
    "cumulative frequency": "frecuencia acumulada",
}


def signature(s):
    return [m.group() for m in TOKEN.finditer(s)]


class Translator:
    def __init__(self, directory):
        import ctranslate2, sentencepiece

        directory = Path(directory)
        self.encoder = sentencepiece.SentencePieceProcessor(
            model_file=str(directory / "sentencepiece.model")
        )
        self.model = ctranslate2.Translator(
            str(directory / "model"), device="cpu", compute_type="int8", intra_threads=2
        )

    @lru_cache(maxsize=8192)
    def phrase(self, text):
        if text.lower() in GLOSSARY:
            return GLOSSARY[text.lower()]
        pieces = self.encoder.encode(text, out_type=str)
        out = self.model.translate_batch(
            [pieces], beam_size=2, max_decoding_length=256
        )[0].hypotheses[0]
        return self.encoder.decode(out)

    def translate(self, text):
        # Preserve symbols, notation, units, labels and numeric tokens in their original order.
        out = []
        for segment in re.split(r"(\n)", text):
            for index, part in enumerate(TOKEN.split(segment)):
                if index % 2 or not re.search("[A-Za-z]{2}", part):
                    out.append(part)
                else:
                    core = part.strip()
                    out.append(
                        part[: len(part) - len(part.lstrip())]
                        + self.phrase(core)
                        + part[len(part.rstrip()) :]
                    )
        result = "".join(out)
        return result, signature(text) == signature(result)

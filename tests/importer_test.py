"""Own, synthetic PDF fixtures; no IB text or credentials are used."""

import hashlib, json, os, shutil, sqlite3, subprocess, sys, tempfile, unittest
from pathlib import Path
import pymupdf as pdf

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from importer.extract import extract
from importer.translate import Translator, signature
from importer.structure import check_against_source
from bank import validate


class PipelineTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.files = self.root / "input"
        self.files.mkdir()
        self.private = self.root / "private"
        self.pdf = self.files / "test.pdf"
        doc = pdf.open()
        page = doc.new_page()
        page.insert_text((44, 75), "Mathematics: applications and interpretation")
        page.insert_text((44, 100), "Standard level - Paper 2 - May 2024")
        page = doc.new_page()
        for y, text in [
            (82, "1.   [Maximum mark: 4]"),
            (120, "Water volume in a tank."),
            (150, "(a) Find 2 + 3. [2]"),
        ]:
            page.insert_text((44, y), text)
        page.draw_rect(pdf.Rect(60, 180, 140, 220))
        page = doc.new_page()
        page.insert_text((55, 90), "(b) Calculate 3 + 4. [2]")
        doc.save(self.pdf)
        doc.close()

    def tearDown(self):
        self.temp.cleanup()

    def cmd(self, *args, ok=True):
        p = subprocess.run(
            [
                sys.executable,
                str(ROOT / "tools/bank.py"),
                "--private",
                str(self.private),
                *args,
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(p.returncode == 0, ok, p.stderr[-600:])
        return p

    def test_resume_duplicate_corruption_and_signed_release(self):
        (self.files / "nested").mkdir()
        shutil.copyfile(self.pdf, self.files / "nested/copy.pdf")
        (self.files / "bad.pdf").write_bytes(b"corrupt file")
        self.cmd("import", "--local", str(self.files))
        rep = json.loads((self.private / "report.json").read_text())
        self.assertEqual(
            (
                rep["detected"],
                rep["processed"],
                rep["failures"],
                rep["duplicates"],
                rep["extracted"],
            ),
            (3, 1, 1, 1, 1),
        )
        draft = next(self.private.glob("questions/*/*/draft.json"))
        stamp = draft.stat().st_mtime_ns
        self.cmd("import", "--local", str(self.files))
        self.assertEqual(stamp, draft.stat().st_mtime_ns)
        q = json.loads(draft.read_text())
        self.assertEqual([p["label"] for p in q["parts"]], ["(a)", "(b)"])
        self.assertTrue(all((draft.parent / r["image"]).is_file() for r in q["refs"]))
        self.assertEqual(q["marks"], 4)
        self.assertEqual(len(q["refs"]), 2)
        ident = str(draft.parent.relative_to(self.private / "questions"))
        dest = self.root / "approved.sqlite"
        self.cmd("export", "--output", str(dest))
        with sqlite3.connect(dest) as db:
            self.assertEqual(db.execute("select count(*) from items").fetchone()[0], 0)
        q.update(
            stem="[Máximo: 4] Volumen de agua en un depósito.",
            theme="Funciones",
            topic="Modelos lineales",
            level="Medio",
            translationReviewed=True,
            mathReviewed=True,
            graphicsReviewed=True,
            sourceChecks=[],
            reviewer="Autor del material sintético",
        )
        q["parts"][0]["ask"] = "Halla 2 + 3. [2]"
        q["parts"][1]["ask"] = "Calcula 3 + 4. [2]"
        q["assets"] = [
            {"part": -1, "alt": "Rectángulo del documento sintético", "file": "es.webp"}
        ]
        from PIL import Image

        Image.new("RGB", (20, 10), "white").save(draft.parent / "es.webp")
        draft.write_text(json.dumps(q))
        self.cmd("review", ident, "validate")
        self.cmd("review", ident, "authorize", ok=False)
        q = json.loads(draft.read_text())
        q["rightsReference"] = "Permiso del autor para el documento sintético"
        draft.write_text(json.dumps(q))
        self.cmd("review", ident, "authorize")
        self.cmd("export", "--output", str(dest))
        with sqlite3.connect(dest) as db:
            row = json.loads(db.execute("select payload from items").fetchone()[0])
            self.assertEqual(row["scheme"], "sin esquema")
            self.assertEqual(len(row["parts"]), 2)
            self.assertEqual(len(row["assets"]), 1)
            self.assertNotIn("reviewer", row)
        q = json.loads(draft.read_text())
        q["parts"][0]["ask"] = "Halla 8 + 3. [2]"
        draft.write_text(json.dumps(q))
        self.cmd("export", "--output", str(dest), ok=False)
        self.cmd("review", ident, "authorize", ok=False)

    def test_review_renders_math_locally(self):
        self.cmd("import", "--local", str(self.files))
        draft = next(self.private.glob("questions/*/*/draft.json"))
        q = json.loads(draft.read_text())
        q["stem"] = "Considera $x^2+1$."
        draft.write_text(json.dumps(q))
        self.cmd(
            "review", str(draft.parent.relative_to(self.private / "questions")), "show"
        )
        rendering = (draft.parent / "review.html").read_text()
        self.assertIn('class="katex"', rendering)
        self.assertNotIn(" + rendered + ", rendering)

    def test_ocr(self):
        doc = pdf.open(self.pdf)
        scanned = pdf.open()
        for p in doc:
            page = scanned.new_page(width=p.rect.width, height=p.rect.height)
            page.insert_image(
                page.rect, stream=p.get_pixmap(matrix=pdf.Matrix(2, 2)).tobytes("png")
            )
        f = self.root / "scan.pdf"
        scanned.save(f)
        scanned.close()
        doc.close()
        _, qs = extract(f, self.root / "ocr")
        self.assertEqual(len(qs), 1)
        self.assertTrue(any(i["ocr"] for i in qs[0]["refs"]))

    @unittest.skipUnless(
        os.environ.get("MATHX_TRANSLATOR_MODEL"),
        "Se prueba con el modelo local instalado.",
    )
    def test_local_translation(self):
        model = Translator(os.environ["MATHX_TRANSLATOR_MODEL"])
        en = "Calculate $x^2+7$ [3]"
        es, ok = model.translate(en)
        self.assertTrue(ok)
        self.assertEqual(signature(en), signature(es))
        self.assertIn("Calcula", es)


if __name__ == "__main__":
    unittest.main()

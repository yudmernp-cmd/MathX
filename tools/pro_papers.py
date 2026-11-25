"""Prepare complete past papers for the private Pro viewer."""
import argparse
import hashlib
import json
import re
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from importer.sources import DEFAULT_FOLDER, acquire, drive_sources


directory = Path('server-data/pro')
catalog = directory / 'catalog.json'
filename = re.compile(
    r'ib-math-ai-sl-(\d{4})-(may|november)-paper-([12])(?:-tz(\d))?_qp(?: \(\d+\))?\.pdf', re.I
)


def load_paper(source):
    match = filename.fullmatch(source.name)
    if not match or source.folder.lower() != '/prueba ' + match[3]:
        raise ValueError('Revisa la clasificación del cuadernillo ' + source.name)
    year, month, paper, zone = match.groups()
    digest, path = acquire(source, directory)
    content = path.read_bytes()
    if not content.startswith(b'%PDF-') or b'%%EOF' not in content[-1024:]:
        raise ValueError('PDF incompleto: ' + source.name)
    title = ('Mayo' if month.lower() == 'may' else 'Noviembre') + ' de ' + year
    if zone:
        title += ' · Zona ' + zone
    return dict(id=digest, paper=int(paper), title=title)


def complete(rows):
    return all(any(r['paper'] == paper for r in rows) for paper in (1, 2)) and all(
        re.fullmatch('[0-9a-f]{64}', r['id'])
        and (path := directory / (r['id'] + '.pdf')).is_file()
        and hashlib.sha256(path.read_bytes()).hexdigest() == r['id'] for r in rows
    )


def prepare(refresh):
    directory.mkdir(parents=True, exist_ok=True)
    if not refresh and catalog.exists() and complete(json.loads(catalog.read_text())):
        return
    with ThreadPoolExecutor(max_workers=4) as pool:
        papers = list(pool.map(load_paper, drive_sources(DEFAULT_FOLDER)))
    rows = list({p['id']: p for p in papers}.values())
    if not complete(rows):
        raise ValueError('La colección debe contener cuadernillos completos de ambas pruebas.')
    with tempfile.NamedTemporaryFile(mode='w', dir=directory, delete=False) as tmp:
        json.dump(rows, tmp, ensure_ascii=False)
    Path(tmp.name).replace(catalog)
    print(f'Simulacro Pro: {len(papers)} archivos, {len(rows)} cuadernillos distintos.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--refresh', action='store_true')
    prepare(parser.parse_args().refresh)

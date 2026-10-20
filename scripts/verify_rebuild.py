"""Compare two isolated builds and the frozen app export without publishing."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'pipeline'))
from provenance import sha256


def main():
    a, b = [ROOT / '.stage-two' / f'rebuild-{name}' / 'public/data' for name in ('a', 'b')]
    paths = sorted(p.relative_to(a) for p in a.rglob('*.json'))
    if len(paths) != 9 or set(paths) != {p.relative_to(b) for p in b.rglob('*.json')}:
        raise ValueError('Expected the complete nine-file export in both builds')
    rows = []
    for name in paths:
        existing = ROOT / 'public/data' / name
        rows.append({'file': name.as_posix(), 'buildA': sha256(a / name), 'buildB': sha256(b / name),
                     'currentExport': sha256(existing),
                     'repeatedBuildExact': (a / name).read_bytes() == (b / name).read_bytes(),
                     'currentExportSemanticExact': json.loads((a / name).read_text(encoding='utf-8')) == json.loads(existing.read_text(encoding='utf-8'))})
    cfg = json.loads((ROOT / 'pipeline/rigs.json').read_text(encoding='utf-8'))
    result = {'sourceCommit': cfg['autoeq_commit'], 'comparison': 'exact; no numeric tolerance used',
              'repeatedBuildExact': all(r['repeatedBuildExact'] for r in rows),
              'existingExportSemanticExact': all(r['currentExportSemanticExact'] for r in rows), 'files': rows}
    old = json.loads((ROOT / 'public/data/neighbors.json').read_text(encoding='utf-8'))
    new = json.loads((a / 'neighbors.json').read_text(encoding='utf-8'))
    products = json.loads((ROOT / 'public/data/products.json').read_text(encoding='utf-8'))
    curve_by_id = {}
    for path in (ROOT / 'public/data/curves').glob('*.json'):
        c = json.loads(path.read_text(encoding='utf-8'))
        curve_by_id.update(zip(c['ids'], c['raw']))
    drift = []
    for i, (before, after) in enumerate(zip(old, new)):
        if before == after:
            continue
        equivalent = all(x[1:] == y[1:] and products[x[0]]['rig'] == products[y[0]]['rig'] and
                         curve_by_id[products[x[0]]['id']] == curve_by_id[products[y[0]]['id']]
                         for x, y in zip(before, after))
        drift.append({'queryId': products[i]['id'], 'before': before, 'after': after,
                      'equivalentExportedCurvesAtEveryRank': equivalent})
    result['neighborDrift'] = drift
    result['driftConfinedToIdenticalExportedCurves'] = all(d['equivalentExportedCurvesAtEveryRank'] for d in drift)
    destination = ROOT / 'docs/evaluation'
    destination.mkdir(parents=True, exist_ok=True)
    (destination / 'rebuild.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))
    if not result['repeatedBuildExact']:
        raise SystemExit('Nondeterministic rebuild: inspect report')


if __name__ == '__main__':
    main()

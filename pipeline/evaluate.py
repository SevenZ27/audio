"""Reproducible offline diagnostics of the frozen app export; no human labels."""
from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from sklearn.manifold import trustworthiness

import core
from catalog import catalog_totals
from provenance import environment, sha256

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'public/data'
OUT = ROOT / 'docs/evaluation'
K = 5


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def overlap(a, b):
    if not a or len(a) != len(b):
        raise ValueError('Rankings must be nonempty and equal length')
    return len(set(a) & set(b)) / len(a)


def summary(values):
    x = np.asarray(values, dtype=float)
    return None if not len(x) else {'mean': float(x.mean()), 'p10': float(np.percentile(x, 10)),
                                  'median': float(np.median(x)), 'n': len(x)}


def matrix(x):
    return core.distance_matrix(x, np.ones(x.shape[1], dtype=bool))


def validate_export(meta, products, neighbors, maps, curves):
    """Hard structural failures stop evaluation; absent optional scores are reported."""
    rigs = {r['id'] for r in meta['rigs']}
    if catalog_totals(products, rigs) != meta['totals']:
        raise ValueError('Catalog counts mismatch')
    if len(neighbors) != len(products):
        raise ValueError('Neighbor row count mismatch')
    grid = np.asarray(meta['grid'])
    if not np.isfinite(grid).all() or (np.diff(grid) <= 0).any():
        raise ValueError('Invalid frequency grid')
    for r in rigs:
        c = curves[r]
        ids = [p['id'] for p in products if p['rig'] == r]
        raw, target = np.asarray(c['raw']), np.asarray(c['target'])
        if c['rig'] != r or c['ids'] != ids or raw.shape != (len(ids), len(grid)) or target.shape != grid.shape:
            raise ValueError('Curve identities/shape mismatch')
        if not np.isfinite(raw).all() or not np.isfinite(target).all():
            raise ValueError('Non-finite curves')
        points = maps[r]
        wanted = {p['id'] for p in products if p['rig'] == r and p['isDefault']}
        if {p[0] for p in points} != wanted or len(points) != len(wanted):
            raise ValueError('Map default membership mismatch')
        if not np.isfinite(np.asarray([p[1:3] for p in points])).all():
            raise ValueError('Non-finite map coordinates')
    for i, row in enumerate(neighbors):
        if len(row) != 10:
            raise ValueError('Expected ten neighbors')
        seen = {products[i]['base']}
        for j, score, distance in row:
            if not isinstance(j, int) or not 0 <= j < len(products):
                raise ValueError('Orphan neighbor')
            p = products[j]
            if p['rig'] != products[i]['rig'] or p['base'] in seen:
                raise ValueError('Cross-rig or repeated-base neighbor')
            if not np.isfinite([score, distance]).all() or not 0 <= score <= 100 or distance < 0:
                raise ValueError('Invalid neighbor score/distance')
            seen.add(p['base'])


def evaluate_rig(rig, products, neighbors, curves, points, grid):
    indices = [i for i, p in enumerate(products) if p['rig'] == rig]
    local = [products[i] for i in indices]
    names, bases = [p['name'] for p in local], [p['base'] for p in local]
    raw, target = np.asarray(curves['raw'], dtype=float) / 10, np.asarray(curves['target'], dtype=float) / 10
    full = raw - target
    mask = grid <= 10000
    clipped = np.clip(full, -12, 12)
    production = [[products[j]['base'] for j, _, _ in neighbors[i][:K]] for i in indices]
    current_dist = matrix(clipped[:, mask])
    full_dist = matrix(full[:, mask])
    band_features = np.column_stack([full[:, core.band_mask(grid, lo, hi)].mean(axis=1)
                                    for _, _, lo, hi, used in core.BANDS if used])
    align = (grid >= 500) & (grid <= 2000)
    aligned = full - full[:, align].mean(axis=1, keepdims=True)
    weights = np.where(grid[mask] <= 250, 2., 1.)
    weights /= weights.mean()
    unique_bases = list(dict.fromkeys(bases))
    random_groups = np.random.default_rng(42).random((len(bases), len(unique_bases)))
    random_dist = random_groups[:, [unique_bases.index(b) for b in bases]]
    methods = {
        'recomputed_export': current_dist,
        'random_seed42': random_dist,
        'six_band_means': matrix(band_features),
        'no_clipping': full_dist,
        'clip_6db': matrix(np.clip(full, -6, 6)[:, mask]),
        'clip_18db': matrix(np.clip(full, -18, 18)[:, mask]),
        'align_500_2000': matrix(np.clip(aligned, -12, 12)[:, mask]),
        'bass_weight_2x': matrix(clipped[:, mask] * np.sqrt(weights)),
    }
    rows, results = [], {}
    for name, distances in methods.items():
        lists = core.top_neighbors(distances, names, k=K)
        overlaps, exact, rms = [], [], []
        for i, picked in enumerate(lists):
            ranked = [bases[j] for j, _ in picked]
            ov = overlap(production[i], ranked)
            error = float(np.mean([full_dist[i, j] for j, _ in picked]))
            overlaps.append(ov)
            exact.append(ranked == production[i])
            rms.append(error)
            rows.append({'rig': rig, 'queryId': local[i]['id'], 'method': name,
                         'isDefaultQuery': local[i]['isDefault'], 'overlapAt5': ov, 'unclippedRmsDb': error})
        results[name] = {'overlapAt5': summary(overlaps), 'orderedAgreement': float(np.mean(exact)),
                         'unclippedRmsDb': summary(rms),
                         'defaultQueryOverlapAt5': summary([v for i, v in enumerate(overlaps) if local[i]['isDefault']])}
    # Scores are saved to 2 decimals; compare distances with a conservative
    # 0.205 dB bound: two quantized errors can differ by at most 0.2 dB.
    diffs = []
    boundary_ties = 0
    local_idx = {g: j for j, g in enumerate(indices)}
    for i, g in enumerate(indices):
        row = neighbors[g]
        diffs.extend(abs(current_dist[i, local_idx[j]] - d) for j, _, d in row)
        boundary_ties += row[4][2] == row[5][2]
    default_by_base = {p['base']: i for i, p in enumerate(local) if p['isDefault']}
    variant_overlap = [overlap(production[i], production[default_by_base[p['base']]])
                       for i, p in enumerate(local) if not p['isDefault']]
    id_to_row = {p['id']: i for i, p in enumerate(local)}
    default_rows = [id_to_row[p[0]] for p in points]
    x, xy = clipped[default_rows][:, mask], np.asarray([p[1:3] for p in points])
    high, low = matrix(x), matrix(xy)
    np.fill_diagonal(high, np.inf)
    np.fill_diagonal(low, np.inf)
    high_nn, low_nn = np.argsort(high, axis=1, kind='stable')[:, :K], np.argsort(low, axis=1, kind='stable')[:, :K]
    map_overlap = [overlap(a.tolist(), b.tolist()) for a, b in zip(high_nn, low_nn)]
    identical = defaultdict(list)
    for i, row in enumerate(curves['raw']):
        identical[tuple(row)].append(local[i]['id'])
    duplicate_groups = [ids for ids in identical.values() if len(ids) > 1]
    return {'measurements': len(local), 'modelRigPairs': len(default_rows),
            'missingPreferenceScores': sum(p['pref'] is None for p in local),
            'fractionCellsClipped': float(np.mean(np.abs(full[:, mask]) > 12)),
            'measurementsWithClipping': int(np.sum(np.any(np.abs(full[:, mask]) > 12, axis=1))),
            'identicalQuantizedCurveGroups': duplicate_groups,
            'roundedBoundaryTiesAt5': boundary_ties,
            'maxExportDistanceDeltaDb': float(max(diffs)),
            'exportDistanceWithinQuantizationBound': bool(max(diffs) <= .2050001),
            'methods': results, 'variantOverlapAt5': summary(variant_overlap),
            'map': {'overlapAt5': summary(map_overlap), 'trustworthinessAt5': float(trustworthiness(x, xy, n_neighbors=K))}}, rows


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    meta, products, neighbors, maps = [load(DATA / f'{n}.json') for n in ('meta', 'products', 'neighbors', 'map')]
    curves = {r['id']: load(DATA / 'curves' / f"{r['id']}.json") for r in meta['rigs']}
    validate_export(meta, products, neighbors, maps, curves)
    cfg = load(ROOT / 'pipeline/rigs.json')
    if cfg['autoeq_commit'] != meta['autoeq']['commit']:
        raise ValueError('Source revision mismatch')
    ledger = []
    for r in cfg['rigs']:
        members = {m['name']: m for m in r['members']}
        selected = [p for p in products if p['rig'] == r['id']]
        if len(members) != len(selected):
            raise ValueError('Source-member count mismatch')
        for p in selected:
            m = members[p['name']]
            ledger.append({'measurementId': p['id'], 'modelRigGroup': f"{p['rig']}::{p['base']}",
                           'sourcePath': m['csv'], 'sourceCommit': cfg['autoeq_commit'],
                           'variantLabel': p['variant'], 'isDefault': p['isDefault'],
                           'physicalProductId': None, 'identityStatus': 'source-name-heuristic'})
    report = {'schemaVersion': 1, 'scope': 'full frozen export; descriptive, no human labels',
              'seed': 42, 'environment': environment(), 'catalog': meta['totals'],
              'inputHashes': {p.relative_to(ROOT).as_posix(): sha256(p) for p in sorted(DATA.rglob('*.json'))},
              'codeHashes': {n: sha256(ROOT / n) for n in ('pipeline/evaluate.py', 'pipeline/core.py', 'pipeline/catalog.py')},
              'structuralChecks': 'passed', 'rigs': {}}
    all_rows = []
    for r in meta['rigs']:
        report['rigs'][r['id']], rows = evaluate_rig(r['id'], products, neighbors, curves[r['id']], maps[r['id']], np.asarray(meta['grid']))
        all_rows.extend(rows)
    (OUT / 'metrics.json').write_text(json.dumps(report, indent=2, allow_nan=False), encoding='utf-8')
    (OUT / 'catalog-ledger.json').write_text(json.dumps(ledger, indent=2, ensure_ascii=False), encoding='utf-8')
    with (OUT / 'per-query.csv').open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=list(all_rows[0]))
        writer.writeheader()
        writer.writerows(all_rows)
    print(json.dumps({r: {'mapOverlap': v['map']['overlapAt5']['mean'],
                        'quantizationDelta': v['maxExportDistanceDeltaDb'],
                        'duplicateGroups': len(v['identicalQuantizedCurveGroups'])} for r, v in report['rigs'].items()}, indent=2))


if __name__ == '__main__':
    main()

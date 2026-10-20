import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from evaluate import validate_export, overlap
from build_data import read_csv_cached
from provenance import source_manifest, sha256

DATA = Path(__file__).resolve().parents[2] / 'public/data'


def inputs():
    def load(p):
        return json.loads(p.read_text(encoding='utf-8'))
    meta, products, neighbors, maps = [load(DATA / f'{n}.json') for n in ('meta', 'products', 'neighbors', 'map')]
    curves = {r['id']: load(DATA / 'curves' / f"{r['id']}.json") for r in meta['rigs']}
    return meta, products, neighbors, maps, curves


def test_full_export_passes_quality_gates():
    validate_export(*inputs())


@pytest.mark.parametrize('fault', ['orphan', 'same_base', 'cross_rig', 'nan', 'map', 'curve_id'])
def test_quality_gates_reject_corrupted_exports(fault):
    meta, products, neighbors, maps, curves = inputs()
    r = products[0]['rig']
    if fault == 'orphan': neighbors[0][0][0] = len(products)
    if fault == 'same_base': neighbors[0][0][0] = 0
    if fault == 'cross_rig': neighbors[0][0][0] = next(i for i, p in enumerate(products) if p['rig'] != r)
    if fault == 'nan': curves[r]['raw'][0][0] = float('nan')
    if fault == 'map': maps[r].pop()
    if fault == 'curve_id': curves[r]['ids'][0] = 'missing'
    with pytest.raises(ValueError): validate_export(meta, products, neighbors, maps, curves)


def test_overlap_is_set_membership_not_order_accuracy():
    assert overlap([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]) == 1
    assert overlap([1, 2, 3, 4, 5], [1, 2, 6, 7, 8]) == .4
    with pytest.raises(ValueError): overlap([], [])


@pytest.mark.parametrize('rows', ['20,0,0\n20,1,1\n20000,0,0', '20,nan,0\n20000,1,1', '20,0,0\n18000,1,1'])
def test_raw_source_validation_rejects_bad_grids_and_nan(tmp_path, rows):
    path = tmp_path / 'fixture.csv'
    path.write_text('frequency,raw,target\n' + rows)
    with pytest.raises(ValueError): read_csv_cached(path)


def test_reads_changed_source_without_stale_pickle_cache(tmp_path):
    p = tmp_path / 'fixture.csv'
    p.write_text('frequency,raw,target\n20,0,0\n19955.54,1,1')
    assert read_csv_cached(p)[1][0] == 0
    p.write_text('frequency,raw,target\n20,7,0\n19955.54,1,1')
    assert read_csv_cached(p)[1][0] == 7


def test_source_revision_mismatch_fails_before_build(monkeypatch, tmp_path):
    monkeypatch.setattr('provenance.subprocess.check_output', lambda *a, **k: 'wrong\n')
    with pytest.raises(ValueError, match='HEAD differs'):
        source_manifest(tmp_path, {'autoeq_commit': 'locked'})


def test_saved_evaluation_matches_current_inputs_and_code():
    root = DATA.parents[1]
    metrics = json.loads((root / 'docs/evaluation/metrics.json').read_text())
    for name, digest in {**metrics['inputHashes'], **metrics['codeHashes']}.items():
        assert sha256(root / name) == digest, f'Rerun offline evaluation after changing {name}'
    quiz = json.loads((root / 'docs/evaluation/quiz.json').read_text())
    assert sha256(root / 'src/lib/taste.ts') == quiz['tasteCodeSha256']

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pipeline'))
from catalog import catalog_totals


def test_counts_distinguish_variants_and_cross_rig_names():
    records = [
        {'id': 'a1', 'rig': 'a', 'base': 'model', 'isDefault': True},
        {'id': 'a2', 'rig': 'a', 'base': 'model', 'isDefault': False},
        {'id': 'b1', 'rig': 'b', 'base': 'model', 'isDefault': True},
    ]
    assert catalog_totals(records, {'a', 'b'}) == {'measurements': 3, 'modelRigPairs': 2, 'distinctBaseNames': 1}
    records[1]['isDefault'] = True
    with pytest.raises(ValueError, match='exactly one'):
        catalog_totals(records, {'a', 'b'})


def test_export_matches_catalog_definition():
    data = ROOT / 'public/data'
    products = json.loads((data / 'products.json').read_text(encoding='utf-8'))
    meta = json.loads((data / 'meta.json').read_text(encoding='utf-8'))
    assert meta['schemaVersion'] == 2
    assert meta['totals'] == catalog_totals(products, {r['id'] for r in meta['rigs']})
    assert sum(r['entries'] for r in meta['rigs']) == meta['totals']['measurements']
    assert sum(r['models'] for r in meta['rigs']) == meta['totals']['modelRigPairs']


@pytest.mark.parametrize('records,rigs', [
    ([{'id': 'x', 'rig': 'a', 'base': 'm', 'isDefault': True}] * 2, {'a'}),
    ([{'id': 'x', 'rig': 'missing', 'base': 'm', 'isDefault': True}], {'a'}),
    ([{'id': 'x', 'rig': 'a', 'base': 'm', 'isDefault': False}], {'a'}),
])
def test_rejects_ambiguous_or_invalid_records(records, rigs):
    with pytest.raises(ValueError):
        catalog_totals(records, rigs)

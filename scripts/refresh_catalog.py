"""Validate existing exported records and refresh counts without changing measurement curves."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'pipeline'))
from catalog import catalog_totals

path = ROOT / 'public/data/meta.json'
meta = json.loads(path.read_text(encoding='utf-8'))
products = json.loads((ROOT / 'public/data/products.json').read_text(encoding='utf-8'))
meta['schemaVersion'] = 2
meta['totals'] = catalog_totals(products, {r['id'] for r in meta['rigs']})
path.write_text(json.dumps(meta, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(meta['totals'])

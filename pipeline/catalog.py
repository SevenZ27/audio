"""Catalog counts describe measurement records, not verified physical product identities."""
from collections import defaultdict


def catalog_totals(products: list[dict], rig_ids: set[str]) -> dict[str, int]:
    seen: set[str] = set()
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for p in products:
        if not p['id'] or p['id'] in seen:
            raise ValueError('Duplicate or empty measurement id')
        seen.add(p['id'])
        if p['rig'] not in rig_ids or not p['base'].strip():
            raise ValueError('Unknown rig or empty base name')
        groups[(p['rig'], p['base'])].append(p)
    for records in groups.values():
        if sum(p['isDefault'] is True for p in records) != 1:
            raise ValueError('Each model-rig pair must have exactly one default measurement')
    return {
        'measurements': len(products),
        'modelRigPairs': len(groups),
        'distinctBaseNames': len({p['base'] for p in products}),
    }

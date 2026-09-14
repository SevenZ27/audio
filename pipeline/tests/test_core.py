import json
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import core  # noqa: E402

DATA = Path(__file__).resolve().parents[2] / "public" / "data"


def test_grid_is_log_spaced_20_to_20k():
    g = core.log_grid()
    assert len(g) == 96
    assert g[0] == pytest.approx(20)
    assert g[-1] == pytest.approx(20000)
    ratios = g[1:] / g[:-1]
    assert np.allclose(ratios, ratios[0])


def test_level_align_puts_300_3k_mean_at_zero():
    g = core.log_grid()
    curve = np.linspace(-5, 9, len(g)) + 7.5
    aligned = core.level_align(g, curve)
    m = core.band_mask(g, 300, 3000)
    assert aligned[m].mean() == pytest.approx(0, abs=1e-9)


def test_interp_skips_nan():
    g = core.log_grid(8)
    f = [20, 100, np.nan, 1000, 20000]
    v = [1, 1, 5, 1, 1]
    assert np.allclose(core.interp_log(f, v, g), 1)


def test_same_curve_has_distance_zero():
    rng = np.random.default_rng(0)
    g = core.log_grid()
    a = rng.normal(0, 3, len(g))
    mask = core.sim_mask(g)
    assert core.rms_distance(a, a, mask) == 0
    d = core.distance_matrix(np.stack([a, a + 1, a]), mask)
    assert np.allclose(np.diag(d), 0)
    assert d[0, 2] == pytest.approx(0, abs=1e-6)
    assert d[0, 1] == pytest.approx(1, abs=1e-6)
    assert core.similarity_score(0) == 100
    assert core.similarity_score(core.SCORE_ZERO_DB * 2) == 0


def test_similarity_ignores_above_10k():
    g = core.log_grid()
    a = np.zeros(len(g))
    b = a.copy()
    b[g > 10000] = 20
    assert core.rms_distance(a, b, core.sim_mask(g)) == 0


def test_product_is_never_its_own_neighbor():
    names = ["Foo X", "Foo X (ANC on)", "Bar", "Baz", "Qux"]
    curves = np.array([[0.0], [0.1], [3.0], [1.0], [2.0]])
    d = core.distance_matrix(curves, np.array([True]))
    neigh = core.top_neighbors(d, names, k=3)
    for i, row in enumerate(neigh):
        idx = [j for j, _ in row]
        assert i not in idx
        assert all(core.base_model(names[j]) != core.base_model(names[i]) for j in idx)
    assert [j for j, _ in neigh[0]] == [3, 4, 2]


def test_default_variant_rule():
    names = ["Sony WH-1000XM4 (ANC off)", "Sony WH-1000XM4 (ANC on)", "AirPods Pro 2 (transparency mode)", "AirPods Pro 2"]
    picked = core.pick_defaults(names)
    assert picked == {1, 3}


def test_cluster_names_follow_band_rules():
    flat = {k: 0.0 for k, *_ in core.BANDS}
    assert core.describe_centroid(flat) == ["netral"]
    bassy = dict(flat, subbass=6, bass=5)
    assert core.describe_centroid(bassy) == ["bass tebal"]
    v = dict(flat, subbass=6, bass=5, uppermid=3, treble=3)
    assert core.describe_centroid(v) == ["V-shape"]
    names = core.name_clusters([bassy, bassy, flat])
    assert names[2] == "Netral"
    assert sorted(names[:2]) == ["Bass tebal 1", "Bass tebal 2"]


@pytest.mark.skipif(not (DATA / "neighbors.json").exists(), reason="run build_data.py first")
def test_exported_neighbors_never_contain_self_or_same_model():
    products = json.loads((DATA / "products.json").read_text(encoding="utf-8"))
    neighbors = json.loads((DATA / "neighbors.json").read_text(encoding="utf-8"))
    assert len(products) == len(neighbors)
    for i, row in enumerate(neighbors):
        assert 0 < len(row) <= 10
        for j, score, dist in row:
            assert j != i
            assert products[j]["rig"] == products[i]["rig"], "neighbors must stay inside one rig"
            assert products[j]["base"] != products[i]["base"]
            # dist can be 0 when one measurement is published under two names (HD 650 and HD 6XX)
            assert 0 <= score <= 100 and dist >= 0
        dists = [d for _, _, d in row]
        assert dists == sorted(dists)


@pytest.mark.skipif(not (DATA / "meta.json").exists(), reason="run build_data.py first")
def test_exported_meta_is_consistent():
    meta = json.loads((DATA / "meta.json").read_text(encoding="utf-8"))
    products = json.loads((DATA / "products.json").read_text(encoding="utf-8"))
    for rig in meta["rigs"]:
        assert 3 <= rig["k"] <= 8
        assert len(rig["clusters"]) == rig["k"]
        members = [p for p in products if p["rig"] == rig["id"]]
        assert len(members) == rig["entries"]
        assert sum(p["isDefault"] for p in members) == rig["models"]
        curves = json.loads((DATA / "curves" / f"{rig['id']}.json").read_text(encoding="utf-8"))
        assert curves["ids"] == [p["id"] for p in members]
        assert len(curves["target"]) == len(meta["grid"])

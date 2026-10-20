"""Step 2: turn the checked out AutoEq CSVs into static JSON for the web app.

Reads pipeline/rigs.json (from fetch_data.py) and writes public/data/*.json,
docs/pipeline-report.md and docs/sanity-check.md.
Run: python pipeline/build_data.py
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from urllib.parse import unquote

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score

import core
from catalog import catalog_totals

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
REPO = HERE / ".cache" / "AutoEq"
OUT = ROOT / "public" / "data"
DOCS = ROOT / "docs"
SEED = 42
K_RANGE = range(3, 9)

SOURCE_LINKS = {
    "Super Review": "https://superreview.squig.link",
    "Rtings": "https://www.rtings.com",
    "HypetheSonics": "https://www.hypethesonics.com",
    "oratory1990": "https://www.reddit.com/r/oratory1990/wiki/index/list_of_presets/",
}

FORM_LABEL = {"in-ear": "In-ear", "earbud": "Earbud terbuka", "over-ear": "Over-ear"}

# Products that are widely described as bass heavy or close to neutral.
# Only used for the sanity check report, never for training.
SANITY = {
    "bass-heavy": [
        "Beats Studio3 Wireless", "Beats Solo3", "Sony WH-1000XM3", "Sony WH-1000XM4",
        "Skullcandy Crusher Wireless", "Skullcandy Crusher Evo", "Sony MDR-XB950B1",
        "JBL Tune 500BT", "Beats Studio Buds", "Beats Powerbeats Pro", "Sony WF-1000XM4",
        "Moondrop Chu", "KZ ZSN Pro X", "Tin HiFi T2",
    ],
    "neutral": [
        "Sennheiser HD 600", "Sennheiser HD 650", "Sennheiser HD 560S", "Etymotic ER4XR",
        "Etymotic ER4SR", "Etymotic ER2XR", "Moondrop Blessing 2", "Truthear Hexa",
        "Sennheiser IE 900", "Dan Clark Audio E3", "HIFIMAN Sundara",
    ],
}


def read_csv(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    df = pd.read_csv(path)
    for col in ("frequency", "raw", "target"):
        if col not in df.columns:
            raise ValueError(f"{path.name}: missing column {col}")
    return df["frequency"].to_numpy(float), df["raw"].to_numpy(float), df["target"].to_numpy(float)


_CACHE: dict = {}


def read_csv_cached(path: Path):
    if not _CACHE:
        cache_file = HERE / ".cache" / "csv_cache.pkl"
        if cache_file.exists():
            _CACHE.update(pd.read_pickle(cache_file))
        _CACHE["__dirty__"] = False
    key = str(path.relative_to(REPO))
    if key not in _CACHE:
        _CACHE[key] = read_csv(path)
        _CACHE["__dirty__"] = True
    return _CACHE[key]


def save_cache() -> None:
    if _CACHE.get("__dirty__"):
        data = {k: v for k, v in _CACHE.items() if k != "__dirty__"}
        pd.to_pickle(data, HERE / ".cache" / "csv_cache.pkl")


def ranking_scores() -> dict[str, dict]:
    text = (REPO / "results" / "RANKING.md").read_text(encoding="utf-8")
    out = {}
    section = ""
    for line in text.splitlines():
        if line.startswith("## "):
            section = "over-ear" if "Over-ear" in line else "in-ear"
            continue
        m = re.match(r"\|\s*\[[^\]]*\]\(\./([^)]+)\)\s*\|(.*)$", line)
        if not m:
            continue
        cells = [c.strip() for c in m.group(2).split("|") if c.strip()]
        try:
            score = float(cells[0])
        except (IndexError, ValueError):
            continue
        out[unquote(m.group(1))] = {"score": score, "table": section}
    return out


def orient_components(pca: PCA, grid_sim: np.ndarray) -> tuple[np.ndarray, list[dict]]:
    """Flip signs so the band with the largest average loading is positive and
    describe each axis by its strongest positive and negative bands."""
    signs = np.ones(pca.n_components_)
    axes = []
    for c in range(pca.n_components_):
        load = pca.components_[c]
        per_band = {}
        for key, label, lo, hi, used in core.BANDS:
            if not used:
                continue
            m = core.band_mask(grid_sim, lo, hi)
            if m.any():
                per_band[key] = (label, float(load[m].mean()))
        strongest = max(per_band.values(), key=lambda t: abs(t[1]))
        if strongest[1] < 0:
            signs[c] = -1
        signed = {k: (lab, v * signs[c]) for k, (lab, v) in per_band.items()}
        pos = max(signed.values(), key=lambda t: t[1])
        neg = min(signed.values(), key=lambda t: t[1])
        axes.append({"positive": pos[0], "negative": neg[0]})
    return signs, axes


def process_rig(rig: dict, grid: np.ndarray, scores: dict) -> dict:
    names, raws, targets, errors, paths = [], [], [], [], []
    for m in rig["members"]:
        path = REPO / m["csv"]
        if not path.exists():
            raise FileNotFoundError(f"{path} not checked out, run fetch_data.py")
        f, raw, target = read_csv_cached(path)
        r = core.level_align(grid, core.interp_log(f, raw, grid))
        t = core.level_align(grid, core.interp_log(f, target, grid))
        names.append(m["name"])
        raws.append(r)
        targets.append(t)
        errors.append(r - t)
        paths.append(f"{rig['source']}/{m['folder']}/{m['name']}")
    raws_a, targets_a = np.array(raws), np.array(targets)
    target_spread = float(np.abs(targets_a - targets_a[0]).max())
    # one target per rig (median over members) so every product in a rig is
    # measured against the same reference, even when AutoEq used different ones
    rig_target = np.median(targets_a, axis=0)
    err_full = raws_a - rig_target
    err = core.clip_error(err_full)

    mask = core.sim_mask(grid)
    dist = core.distance_matrix(err, mask)
    neigh = core.top_neighbors(dist, names, k=10)
    defaults = core.pick_defaults(names)
    default_idx = sorted(defaults)

    # PCA and k-means are fit on one variant per model so heavily measured
    # models do not pull the map; the other variants are projected afterwards.
    x_fit = err[default_idx][:, mask]
    pca = PCA(n_components=2, random_state=SEED).fit(x_fit)
    signs, axes = orient_components(pca, grid[mask])
    xy = pca.transform(err[:, mask]) * signs

    sil_by_k = {}
    models = {}
    for k in K_RANGE:
        if k >= len(default_idx):
            break
        km = KMeans(n_clusters=k, n_init=20, random_state=SEED).fit(x_fit)
        sil_by_k[k] = float(silhouette_score(x_fit, km.labels_))
        models[k] = km
    best_k = max(sil_by_k, key=lambda k: (sil_by_k[k], -k))
    km = models[best_k]
    labels = km.predict(err[:, mask])

    # centroid band values, computed from members on the full grid so "air" is filled too
    centroid_bands = []
    for c in range(best_k):
        members = [i for i in default_idx if labels[i] == c]
        centroid_bands.append(core.band_values(grid, err[members].mean(axis=0)))
    cluster_names = core.name_clusters(centroid_bands)
    # stable cluster order: by bass, high to low
    order = sorted(range(best_k), key=lambda c: -(centroid_bands[c]["subbass"] + centroid_bands[c]["bass"]))
    remap = {old: new for new, old in enumerate(order)}

    ids = [f"{rig['id']}~{s}" for s in core.unique_ids(names)]
    products = []
    for i, name in enumerate(names):
        sc = scores.get(paths[i])
        products.append({
            "id": ids[i],
            "name": name,
            "base": core.base_model(name),
            "variant": core.variant_label(name),
            "rig": rig["id"],
            "isDefault": i in defaults,
            "pref": sc["score"] if sc else None,
            "cluster": remap[int(labels[i])],
            "bands": {k: round(v, 1) for k, v in core.band_values(grid, err_full[i]).items()},
        })

    clusters = []
    for new, old in enumerate(order):
        size = int(sum(1 for i in default_idx if labels[i] == old))
        clusters.append({
            "id": new,
            "name": cluster_names[old],
            "size": size,
            "bands": {k: round(v, 1) for k, v in centroid_bands[old].items()},
        })

    # local indices for now, turned into global product indices in main()
    neighbors = [[[j, core.similarity_score(d), round(d, 2)] for j, d in neigh[i]] for i in range(len(names))]
    curves = {
        "rig": rig["id"],
        "ids": ids,
        "raw": [[int(round(v * 10)) for v in row] for row in raws_a],
        "target": [int(round(v * 10)) for v in rig_target],
        "targetSpreadDb": round(target_spread, 2),
    }
    map_points = [[ids[i], round(float(xy[i, 0]), 2), round(float(xy[i, 1]), 2), remap[int(labels[i])]] for i in default_idx]

    offdiag = dist[np.triu_indices(len(names), 1)]
    meta = {
        "id": rig["id"],
        "source": rig["source"],
        "sourceUrl": SOURCE_LINKS.get(rig["source"], ""),
        "rig": rig["rig"],
        "form": rig["form"],
        "formLabel": FORM_LABEL[rig["form"]],
        "role": rig["role"],
        "reason": rig["reason"],
        "entries": len(names),
        "models": len(default_idx),
        "withPref": int(sum(1 for p in products if p["pref"] is not None)),
        "pca": {"explained": [round(float(v), 4) for v in pca.explained_variance_ratio_], "axes": axes},
        "k": best_k,
        "silhouette": round(sil_by_k[best_k], 4),
        "silhouetteByK": {str(k): round(v, 4) for k, v in sil_by_k.items()},
        "clusters": clusters,
        "distanceStats": {
            "median": round(float(np.median(offdiag)), 2),
            "p05": round(float(np.percentile(offdiag, 5)), 2),
            "p95": round(float(np.percentile(offdiag, 95)), 2),
        },
        "targetSpreadDb": round(target_spread, 2),
    }
    return {"meta": meta, "products": products, "neighbors": neighbors, "curves": curves, "map": map_points, "dist": dist, "names": names, "labels": labels, "remap": remap}


def load_prices(products: list[dict]) -> list[dict]:
    path = HERE / "harga_manual.csv"
    if not path.exists():
        return []
    by_name = {}
    for p in products:
        by_name.setdefault(p["name"].lower(), []).append(p["id"])
    items = []
    with path.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            model = (row.get("model") or "").strip()
            harga = (row.get("harga_rp") or "").strip().replace(".", "").replace(",", "")
            if not model or not harga.isdigit():
                continue
            for pid in by_name.get(model.lower(), []):
                items.append({
                    "id": pid,
                    "hargaRp": int(harga),
                    "toko": (row.get("toko") or "").strip(),
                    "tanggalCek": (row.get("tanggal_cek") or "").strip(),
                    "url": (row.get("url") or "").strip(),
                })
    return items


def sanity_report(results: list[dict]) -> tuple[str, list[dict]]:
    rows = []
    for r in results:
        meta = r["meta"]
        lookup = {p["name"].lower(): p for p in r["products"]}
        for expected, names in SANITY.items():
            for n in names:
                p = lookup.get(n.lower())
                if not p:
                    continue
                cname = meta["clusters"][p["cluster"]]["name"]
                bass = (p["bands"]["subbass"] + p["bands"]["bass"]) / 2
                low = cname.lower()
                warm = any(w in low for w in ("bass tebal", "bass hangat", "v-shape"))
                ok = warm if expected == "bass-heavy" else (not warm and "terang" not in low)
                rows.append({"rig": meta["id"], "product": p["name"], "expected": expected, "cluster": cname, "bassDb": round(bass, 1), "ok": ok})
    lines = [
        "# Sanity check: do known products land in a sensible group?",
        "",
        "The list of products is picked by hand from what exists in the data (common opinion: bass heavy or close to neutral).",
        "It is not used for training. A row passes when a bass heavy product lands in a group named bass tebal, bass hangat",
        "or V-shape, and a neutral product lands in a group without bass tebal, bass hangat, V-shape or terang in its name.",
        "Note that groups are named relative to the rig target (Harman style targets already include a bass shelf),",
        "so a product that most people call neutral can show up as bass tipis here.",
        "`bass dB` is the average of sub-bass and bass relative to the rig target.",
        "",
        "| rig | product | expected | group | bass dB | pass |",
        "|---|---|---|---|---:|---|",
    ]
    for row in rows:
        lines.append(f"| {row['rig']} | {row['product']} | {row['expected']} | {row['cluster']} | {row['bassDb']} | {'yes' if row['ok'] else 'no'} |")
    passed = sum(1 for r in rows if r["ok"])
    lines += ["", f"Result: {passed} of {len(rows)} pass.", ""]
    return "\n".join(lines), rows


def main() -> None:
    cfg = json.loads((HERE / "rigs.json").read_text(encoding="utf-8"))
    grid = core.log_grid()
    scores = ranking_scores()
    results = [process_rig(r, grid, scores) for r in cfg["rigs"]]
    save_cache()

    (OUT / "curves").mkdir(parents=True, exist_ok=True)
    all_products = [p for r in results for p in r["products"]]
    prices = load_prices(all_products)
    rigs_meta = [r["meta"] for r in results]
    meta = {
        "schemaVersion": 2,
        "autoeq": {"commit": cfg["autoeq_commit"], "date": cfg["autoeq_date"], "url": "https://github.com/jaakkopasanen/AutoEq"},
        "grid": [round(float(f), 2) for f in grid],
        "bands": [{"key": k, "label": lab, "lo": lo, "hi": hi, "usedForSimilarity": used} for k, lab, lo, hi, used in core.BANDS],
        "simMaxHz": core.SIM_MAX_HZ,
        "levelBand": list(core.LEVEL_BAND),
        "scoreZeroDb": core.SCORE_ZERO_DB,
        "clipDb": core.CLIP_DB,
        "rigs": rigs_meta,
        "totals": catalog_totals(all_products, {m['id'] for m in rigs_meta}),
        "hasPrices": len(prices) > 0,
    }
    dump = lambda name, obj: (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    dump("meta.json", meta)
    dump("products.json", all_products)
    # neighbors.json is aligned with products.json: row i lists [product index, score 0-100, RMS dB]
    offsets, off = [], 0
    for r in results:
        offsets.append(off)
        off += len(r["products"])
    neighbors = [[[o + j, sc, d] for j, sc, d in row] for r, o in zip(results, offsets) for row in r["neighbors"]]
    dump("neighbors.json", neighbors)
    dump("map.json", {r["meta"]["id"]: r["map"] for r in results})
    dump("prices.json", prices)
    for r in results:
        dump(f"curves/{r['meta']['id']}.json", r["curves"])

    sanity_md, sanity_rows = sanity_report(results)
    (DOCS / "sanity-check.md").write_text(sanity_md, encoding="utf-8")

    rep = [
        "# Pipeline report",
        "",
        f"AutoEq commit `{cfg['autoeq_commit'][:10]}` ({cfg['autoeq_date']}). Grid {len(grid)} log points 20 Hz to 20 kHz.",
        f"Similarity and clustering use 20 Hz to {int(core.SIM_MAX_HZ)} Hz. Level aligned on {int(core.LEVEL_BAND[0])} Hz to {int(core.LEVEL_BAND[1])} Hz. Error clipped to +-{core.CLIP_DB:g} dB before distance, PCA and k-means.",
        f"Total {meta['totals']['measurements']} measurements, {meta['totals']['modelRigPairs']} model-rig pairs, {meta['totals']['distinctBaseNames']} distinct base names across rigs (not verified unique physical products).",
        "",
        "| rig | entries | models | with pref score | PCA PC1 | PCA PC2 | k | silhouette | median distance dB | target spread dB |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for m in rigs_meta:
        e = m["pca"]["explained"]
        rep.append(f"| {m['id']} | {m['entries']} | {m['models']} | {m['withPref']} | {e[0]:.1%} | {e[1]:.1%} | {m['k']} | {m['silhouette']:.3f} | {m['distanceStats']['median']} | {m['targetSpreadDb']} |")
    rep += ["", "## Silhouette per k", ""]
    for m in rigs_meta:
        rep.append(f"- {m['id']}: " + ", ".join(f"k={k}: {v:.3f}" for k, v in m["silhouetteByK"].items()))
    rep += ["", "## Groups", ""]
    for m in rigs_meta:
        rep.append(f"### {m['id']}")
        rep.append("")
        rep.append("| group | models | sub-bass | bass | low-mid | mid | upper-mid | treble | air |")
        rep.append("|---|---:|---:|---:|---:|---:|---:|---:|---:|")
        for c in m["clusters"]:
            b = c["bands"]
            rep.append(f"| {c['name']} | {c['size']} | {b['subbass']} | {b['bass']} | {b['lowmid']} | {b['mid']} | {b['uppermid']} | {b['treble']} | {b['air']} |")
        rep.append("")
    passed = sum(1 for r in sanity_rows if r["ok"])
    rep += [f"Sanity check: {passed} of {len(sanity_rows)} pass, details in sanity-check.md.", ""]
    (DOCS / "pipeline-report.md").write_text("\n".join(rep), encoding="utf-8")

    print("\n".join(rep[:12 + len(rigs_meta)]))
    print(f"prices: {len(prices)} rows matched")
    print(f"sanity: {passed}/{len(sanity_rows)}")


if __name__ == "__main__":
    main()

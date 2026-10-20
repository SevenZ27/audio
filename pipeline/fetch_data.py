"""Step 1: sparse clone AutoEq, count coverage per (source, rig, form), pick rigs,
check out only the CSV files of the picked rigs.

Writes docs/coverage.md and pipeline/rigs.json.
Run: python pipeline/fetch_data.py
"""
from __future__ import annotations

import collections
import argparse
import json
import re
import subprocess
from pathlib import Path

import autoeq_source as src

ROOT = src.HERE.parent
RIGS_JSON = src.HERE / "rigs.json"
COVERAGE_MD = ROOT / "docs" / "coverage.md"

FORM_LABEL = {"in-ear": "In-ear (IEM dan TWS)", "earbud": "Earbud terbuka", "over-ear": "Over-ear"}

# Extra rigs picked by hand on top of the coverage rule, with the reason.
EXTRA_RIGS = [
    ("HypetheSonics", "GRAS RA0045", "in-ear",
     "Satu-satunya rig in-ear yang punya CSV, skor preferensi di RANKING.md, dan AirPods Pro 2."),
    ("oratory1990", "GRAS 45BC-10", "over-ear",
     "Rig over-ear terbesar yang punya skor preferensi di RANKING.md, berisi AirPods Max."),
]


MIN_CSV = 100  # a rig needs at least this many CSVs before we show it

SHORT = {"Super Review": "superreview", "Rtings": "rtings", "HypetheSonics": "hypethesonics", "oratory1990": "oratory1990"}


def rig_id(source: str, rig: str, form: str) -> str:
    short = SHORT.get(source) or re.sub(r"[^a-z0-9]+", "", source.lower())
    return f"{short}-{form.replace('-', '')}"


def ranking_paths() -> set[str]:
    text = (src.REPO / "results" / "RANKING.md").read_text(encoding="utf-8")
    from urllib.parse import unquote
    return {unquote(m) for m in re.findall(r"\]\(\./([^)]+)\)", text)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--reselect', action='store_true', help='Explicitly regenerate coverage and rig membership at the checked-out revision')
    args = parser.parse_args()
    if not args.reselect:
        import runpy
        runpy.run_path(str(ROOT / 'scripts/fetch_locked_source.py'), run_name='__main__')
        return
    src.ensure_clone()
    subprocess.run(
        ["git", "-C", str(src.REPO), "sparse-checkout", "set", "--no-cone", "/results/*.md"],
        check=True,
    )
    sha, date = src.head_info()
    entries = src.list_result_csvs()
    models = src.list_result_models()
    scored = ranking_paths()

    index_cache: dict[str, dict] = {}
    cov: collections.Counter = collections.Counter()
    cov_scored: collections.Counter = collections.Counter()
    members: dict[tuple, list[dict]] = collections.defaultdict(list)
    for e in entries:
        if e.source not in index_cache:
            index_cache[e.source] = src.read_name_index(e.source)
        ni = index_cache[e.source].get(e.name)
        rig = e.rig_from_folder or (ni["rig"] if ni else "")
        key = (e.source, rig, e.form)
        cov[key] += 1
        rel = f"{e.source}/{e.folder}/{e.name}"
        if rel in scored:
            cov_scored[key] += 1
        members[key].append({"name": e.name, "csv": e.csv_path, "folder": e.folder})

    folders_per_source = collections.Counter(s for s, _f, _n in models)
    csv_per_source = collections.Counter(e.source for e in entries)

    picked = []
    skipped = []
    for form in ("in-ear", "over-ear", "earbud"):
        cands = [(n, k) for k, n in cov.items() if k[2] == form and k[1]]
        n, key = max(cands)
        if n < MIN_CSV:
            skipped.append((key, n))
            continue
        picked.append((key, "default", f"Cakupan terbanyak untuk {form} di antara rig yang tercatat."))
    for source, rig, form, why in EXTRA_RIGS:
        picked.append(((source, rig, form), "extra", why))

    rigs = []
    patterns = ["/results/*.md"]
    for (source, rig, form), role, why in picked:
        folder_set = sorted({m["folder"] for m in members[(source, rig, form)]})
        for folder in folder_set:
            patterns.append(f"/results/{source}/{folder}/*/*.csv")
        rigs.append({
            "id": rig_id(source, rig, form),
            "source": source,
            "rig": rig,
            "form": form,
            "role": role,
            "reason": why,
            "count": cov[(source, rig, form)],
            "scored": cov_scored[(source, rig, form)],
            "members": sorted(members[(source, rig, form)], key=lambda m: m["name"].lower()),
        })

    subprocess.run(["git", "-C", str(src.REPO), "sparse-checkout", "set", "--no-cone", *patterns], check=True)

    RIGS_JSON.write_text(json.dumps({"autoeq_commit": sha, "autoeq_date": date, "rigs": rigs}, indent=1), encoding="utf-8")

    lines = [
        "# Coverage per source, rig and form",
        "",
        f"Counted from AutoEq commit `{sha[:10]}` ({date}) with `git ls-tree`, no guessing.",
        "A row is one (source, rig, form). The rig comes from the results folder name when it has one",
        "(Rtings, HypetheSonics), otherwise from `measurements/<source>/name_index.tsv`.",
        "An empty rig means AutoEq does not record it (Innerfidelity, Headphone.com Legacy).",
        "",
        "Counts are result folders that contain a CSV. Variants (ANC on/off, earpads, filters) count separately.",
        "",
        "## Picked rigs",
        "",
        "| id | source | rig | form | CSV | with preference score | role | reason |",
        "|---|---|---|---|---:|---:|---|---|",
    ]
    for r in rigs:
        lines.append(f"| `{r['id']}` | {r['source']} | {r['rig']} | {r['form']} | {r['count']} | {r['scored']} | {r['role']} | {r['reason']} |")
    lines += [
        "",
        "Rule: for each form, the (source, rig) with the most CSVs among rows with a recorded rig becomes the default.",
        f"A rig needs at least {MIN_CSV} CSVs, otherwise clustering and a map make little sense.",
    ]
    for (source, rig, form), n in skipped:
        lines.append(f"Skipped: {form}, the biggest rig is {source} on {rig} with only {n} CSVs, so earbuds are not shown.")
    lines += [
        "Two extra rigs are added by hand (reason in the table). Products are never compared across rigs.",
        "",
        "## All rows",
        "",
        "| source | rig | form | CSV | with preference score |",
        "|---|---|---|---:|---:|",
    ]
    for (source, rig, form), n in sorted(cov.items(), key=lambda kv: (-kv[1], kv[0])):
        lines.append(f"| {source} | {rig or '(not recorded)'} | {form} | {n} | {cov_scored[(source, rig, form)]} |")
    lines += [
        "",
        "## Result folders without a CSV",
        "",
        "Some sources only ship EQ files in `results/`, so there is no frequency response to work with.",
        "",
        "| source | result folders | with CSV |",
        "|---|---:|---:|",
    ]
    for s in sorted(folders_per_source):
        lines.append(f"| {s} | {folders_per_source[s]} | {csv_per_source.get(s, 0)} |")
    lines.append("")
    COVERAGE_MD.parent.mkdir(parents=True, exist_ok=True)
    COVERAGE_MD.write_text("\n".join(lines), encoding="utf-8")

    print(f"AutoEq {sha[:10]} {date}, {len(entries)} CSV, {len(models)} result folders")
    for r in rigs:
        print(f"  {r['role']:7s} {r['id']:40s} {r['count']:4d} CSV, {r['scored']} scored")


if __name__ == "__main__":
    main()

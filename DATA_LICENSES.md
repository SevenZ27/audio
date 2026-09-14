# Data and licenses

## AutoEq

- Repository: https://github.com/jaakkopasanen/AutoEq
- Snapshot used: commit `7ae0f56d53` (2025-07-20)
- License file in the repo: MIT, "Copyright (c) 2018-2022 Jaakko Pasanen".
- Files used: `results/<source>/<rig folder>/<model>/<model>.csv` (columns used: `frequency`, `raw`, `target`),
  `results/RANKING.md` (Harman preference scores), `measurements/<source>/name_index.tsv` (rig name per model).

What the AutoEq README says about the data, checked on 2026-09-13: it describes the repo as a "collection of headphone
measurements as numerical data" from oratory1990, crinacle, Innerfidelity, Rtings and legacy headphone.com, with links
to each source. I did not find a separate license or usage note per measurer in the README, in `results/README.md`,
or in the per-source `results/<source>/README.md` files (those only list models). So the only written license is the
repository MIT license. The measurements themselves were made by the people and sites below, and credit goes to them.

crinacle has more than 1,800 result folders in AutoEq, but none of them contain a CSV (only EQ presets), and
`measurements/crinacle/` only has a name index that points to local raw files that are not in the repo. So crinacle
data is not used here.

## Measurement sources used in this app

| Source | Rig | Form | Link |
|---|---|---|---|
| Super Review | 711 | in-ear | https://superreview.squig.link |
| Rtings | HMS II.3 | over-ear | https://www.rtings.com |
| HypetheSonics | GRAS RA0045 | in-ear | https://www.hypethesonics.com |
| oratory1990 | GRAS 45BC-10 | over-ear | https://www.reddit.com/r/oratory1990/wiki/index/list_of_presets/ |

Each product page names the source that measured it.

Not checked: the terms of use on each measurer's own website. The app does not load anything from those sites, it
only ships numbers derived from the AutoEq snapshot. If a measurer asks for their data to be removed, delete their rig
from `pipeline/fetch_data.py` and rerun the pipeline.

## Other

- Harman preference scores come from AutoEq `RANKING.md`, which computes them with the published Harman research
  formulas. They are only available for some rigs.
- Prices: none. `pipeline/harga_manual.csv` is empty on purpose. Price features stay hidden until someone fills it
  with a checked source (store, date, URL).
- Music in "Dengar Bedanya" is generated in the browser with the Web Audio API. No recordings are used.
- Font: Inter (SIL Open Font License 1.1), bundled through `@fontsource-variable/inter`.

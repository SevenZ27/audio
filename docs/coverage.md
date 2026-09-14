# Coverage per source, rig and form

Counted from AutoEq commit `7ae0f56d53` (2025-07-20) with `git ls-tree`, no guessing.
A row is one (source, rig, form). The rig comes from the results folder name when it has one
(Rtings, HypetheSonics), otherwise from `measurements/<source>/name_index.tsv`.
An empty rig means AutoEq does not record it (Innerfidelity, Headphone.com Legacy).

Counts are result folders that contain a CSV. Variants (ANC on/off, earpads, filters) count separately.

## Picked rigs

| id | source | rig | form | CSV | with preference score | role | reason |
|---|---|---|---|---:|---:|---|---|
| `superreview-inear` | Super Review | 711 | in-ear | 714 | 0 | default | Cakupan terbanyak untuk in-ear di antara rig yang tercatat. |
| `rtings-overear` | Rtings | HMS II.3 | over-ear | 383 | 0 | default | Cakupan terbanyak untuk over-ear di antara rig yang tercatat. |
| `hypethesonics-inear` | HypetheSonics | GRAS RA0045 | in-ear | 152 | 86 | extra | Satu-satunya rig in-ear yang punya CSV, skor preferensi di RANKING.md, dan AirPods Pro 2. |
| `oratory1990-overear` | oratory1990 | GRAS 45BC-10 | over-ear | 261 | 207 | extra | Rig over-ear terbesar yang punya skor preferensi di RANKING.md, berisi AirPods Max. |

Rule: for each form, the (source, rig) with the most CSVs among rows with a recorded rig becomes the default.
A rig needs at least 100 CSVs, otherwise clustering and a map make little sense.
Skipped: earbud, the biggest rig is Super Review on KB006x + 711 with only 27 CSVs, so earbuds are not shown.
Two extra rigs are added by hand (reason in the table). Products are never compared across rigs.

## All rows

| source | rig | form | CSV | with preference score |
|---|---|---|---:|---:|
| Super Review | 711 | in-ear | 714 | 0 |
| Innerfidelity | (not recorded) | over-ear | 612 | 0 |
| ToneDeafMonk | 711 | in-ear | 433 | 0 |
| Rtings | HMS II.3 | over-ear | 383 | 0 |
| Jaytiss | 711 | in-ear | 377 | 0 |
| Innerfidelity | (not recorded) | in-ear | 306 | 0 |
| Hi End Portable | 711 | in-ear | 301 | 0 |
| Rtings | HMS II.3 | in-ear | 271 | 0 |
| Kuulokenurkka | KB501x + 711 | over-ear | 266 | 0 |
| oratory1990 | GRAS 45BC-10 | over-ear | 261 | 207 |
| Headphone.com Legacy | (not recorded) | over-ear | 225 | 0 |
| RikudouGoku | 711 | in-ear | 200 | 0 |
| oratory1990 | GRAS 43AC | in-ear | 192 | 181 |
| Harpo | 711 | in-ear | 185 | 0 |
| Fahryst | 711 | in-ear | 173 | 0 |
| oratory1990 | GRAS 45BC | over-ear | 173 | 112 |
| Regan Cipher | 711 | in-ear | 153 | 0 |
| HypetheSonics | GRAS RA0045 | in-ear | 152 | 86 |
| Super Review | KB006x + 711 | over-ear | 143 | 0 |
| Kazi | 711 | in-ear | 142 | 0 |
| Filk | KB006x + 711 | over-ear | 121 | 0 |
| DHRME | 711 | in-ear | 99 | 0 |
| Headphone.com Legacy | (not recorded) | in-ear | 94 | 0 |
| oratory1990 | GRAS 43AG | over-ear | 87 | 59 |
| kr0mka | 711 | in-ear | 85 | 0 |
| Auriculares Argentina | KB501x + 711 | over-ear | 70 | 0 |
| Rtings | Bruel & Kjaer 5128 | over-ear | 69 | 0 |
| freeryder05 | 711 | in-ear | 64 | 0 |
| kr0mka | KB501x + 711 | over-ear | 61 | 0 |
| Filk | 711 | in-ear | 53 | 0 |
| Rtings | Bruel & Kjaer 5128 | in-ear | 44 | 0 |
| Bakkwatan | 711 | in-ear | 40 | 0 |
| HypetheSonics | Bruel & Kjaer 5128 | over-ear | 32 | 0 |
| HypetheSonics | Bruel & Kjaer 5128 | in-ear | 28 | 0 |
| Super Review | KB006x + 711 | earbud | 27 | 0 |
| Rtings | HMS II.3 | earbud | 22 | 0 |
| HypetheSonics | Bruel & Kjaer 5128 | earbud | 16 | 0 |
| Innerfidelity | (not recorded) | earbud | 15 | 0 |
| Regan Cipher | 711 | earbud | 15 | 0 |
| Ted's Squig Hoard | 711 | in-ear | 15 | 0 |
| Regan Cipher | 711 | over-ear | 12 | 0 |
| Headphone.com Legacy | (not recorded) | earbud | 10 | 0 |
| oratory1990 | GRAS 45BC | in-ear | 10 | 8 |
| Auriculares Argentina | 711 | in-ear | 9 | 0 |
| Regan Cipher | KB500x + 711 | earbud | 9 | 0 |
| Auriculares Argentina | KB501x + 711 | in-ear | 6 | 0 |
| Rtings | Bruel & Kjaer 5128 | earbud | 6 | 0 |
| kr0mka | KB501x + 711 | earbud | 5 | 0 |
| oratory1990 | GRAS 45BC-10 | in-ear | 5 | 4 |
| Regan Cipher | KB500x + 711 | over-ear | 4 | 0 |
| oratory1990 | GRAS 43ACB | in-ear | 4 | 4 |
| kr0mka | (not recorded) | in-ear | 3 | 0 |
| Filk | 711 | over-ear | 2 | 0 |
| Filk | KB006x + 711 | in-ear | 2 | 0 |
| HypetheSonics | GRAS RA0045 | over-ear | 1 | 0 |
| Kazi | 711 | earbud | 1 | 0 |
| Super Review | KB006x + 711 | in-ear | 1 | 0 |
| freeryder05 | (not recorded) | in-ear | 1 | 0 |
| oratory1990 | GRAS 43AC | earbud | 1 | 0 |
| oratory1990 | GRAS 43AC | over-ear | 1 | 1 |
| oratory1990 | GRAS 43AG | earbud | 1 | 0 |
| oratory1990 | GRAS GRAS 43AC | in-ear | 1 | 1 |

## Result folders without a CSV

Some sources only ship EQ files in `results/`, so there is no frequency response to work with.

| source | result folders | with CSV |
|---|---:|---:|
| Auriculares Argentina | 85 | 85 |
| Bakkwatan | 40 | 40 |
| DHRME | 99 | 99 |
| Fahryst | 173 | 173 |
| Filk | 178 | 178 |
| Harpo | 185 | 185 |
| Headphone.com Legacy | 329 | 329 |
| Hi End Portable | 301 | 301 |
| HypetheSonics | 229 | 229 |
| Innerfidelity | 936 | 933 |
| Jaytiss | 377 | 377 |
| Kazi | 143 | 143 |
| Kuulokenurkka | 266 | 266 |
| Regan Cipher | 193 | 193 |
| RikudouGoku | 200 | 200 |
| Rtings | 795 | 795 |
| Super Review | 885 | 885 |
| Ted's Squig Hoard | 15 | 15 |
| ToneDeafMonk | 433 | 433 |
| crinacle | 2036 | 0 |
| freeryder05 | 65 | 65 |
| kr0mka | 154 | 154 |
| oratory1990 | 736 | 736 |

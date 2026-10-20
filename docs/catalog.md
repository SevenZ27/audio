# Catalog definitions (schema version 2)

The exported `Product` TypeScript type represents a **measurement record**, not a globally unique physical product.

| Field / count | Definition |
|---|---|
| `id` | Unique measurement/variant identifier within the export |
| `rig` | Source-specific measurement group; similarity comparisons stay inside it |
| `name` | Name supplied by the source |
| `base` | Source name normalized by the existing `base_model` rule, including removal of trailing parenthesized variant labels |
| `variant` | Trailing parenthesized label; not a verified structured configuration |
| `isDefault` | Exactly one representative measurement for each `(rig, base)` pair |
| `totals.measurements` | Number of measurement records, including variants |
| `totals.modelRigPairs` | Distinct `(rig, base)` pairs; a model on two rigs counts twice |
| `totals.distinctBaseNames` | Distinct normalized `base` strings across rigs; not a verified count of unique physical products |

Current export: **1,510 measurements, 1,230 model–rig pairs, 1,140 distinct base-name strings**. The last number can still contain aliases or merge meaningful variant/generation names. Canonical product resolution remains future work; no new canonical identities or connectivity labels have been inferred.

`pipeline/catalog.py` validates IDs, rig membership and one default per pair. The full build and `scripts/refresh_catalog.py` share that definition. The refresh command changes metadata only; it does not rerun measurements, neighbors, PCA or clustering.

The quiz supports **in-ear / over-ear**. It does not filter wired versus wireless, open earbuds, availability or price. Do not infer connectivity from a marketing name. Add such filters only with sourced metadata and an explicit unknown state.

Per-rig `entries` and `models` retain their original meanings: measurements and default model groups **inside that rig**. Historical reports describing the total as “1,230 models” should be read as 1,230 model–rig pairs.

## Measurement ledger and numeric fields

`evaluation/catalog-ledger.json` joins every measurement ID to a locked source CSV. `modelRigGroup` is the existing normalization group, `variantLabel` preserves the source suffix, and `physicalProductId` is null with `identityStatus=source-name-heuristic`. Do not merge exact-curve duplicates or cross-rig names without reviewed identity evidence.

Curves contain 96 log-spaced samples. `raw` and `target` are level-aligned dB encoded as integers in tenths of a dB; decode by dividing by 10. Product `bands` are mean raw-minus-target values, rounded to 0.1 dB. Neighbors contain `[global product index, similarity score, RMS distance in dB]`; distance is rounded to 0.01 dB and scores are a linear 0–100 display transformation, not calibrated probabilities. `pref=null` means no matched source score, not zero preference. Prices are structurally absent until sourced.

Map coordinates are PCA components rounded to two decimals, with no physical distance unit. Cluster indices refer to rule-named groups within a rig. Similarity and clustering exclude frequencies above 10 kHz. All selected AutoEq CSVs end at 19,955.54 Hz; the last value is held at 20 kHz for display only. Missing/non-finite source numeric values now fail a build rather than being silently interpolated away.

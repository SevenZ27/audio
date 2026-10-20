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

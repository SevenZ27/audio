# Offline evaluation protocol

Defined before running the stage-two experiments. Scope: the entire frozen export, all four rigs. This is a descriptive audit of a content-based retrieval system, not a supervised prediction benchmark or a listening study. No hyperparameters will be selected from these results in this stage.

## Units and boundaries

One row is a measurement variant. A candidate group is `(rig, normalized base name)`. This is a heuristic grouping, not verified physical identity. Neighbor retrieval excludes the query's group and retains the nearest variant per other group. Results are reported per rig; variants are never counted as independent participants. Cross-rig distances are prohibited.

No human relevance labels exist. Consequently we do not report preference accuracy, precision, NDCG or statistical significance. The old hand-picked bass/neutral check has no product-level source citations and is retained only as a legacy exploratory artifact. AutoEq preference scores are not used as labels for individual similarity.

## Experiments

1. **Quality gates:** unique IDs, source-member joins, one default per group, curve length/finiteness, orphan references, same-rig neighbors, no same-base recommendations, distinct candidate groups, valid map membership, missing preference scores and exact duplicate quantized curves. Duplicates are flagged, never automatically merged.
2. **Baselines:** seeded random candidate ranking and six equal-weight band means. Report top-5 base-group overlap with the deployed list and un-clipped full-curve RMS of returned candidates. Lower RMS for an RMS-based method is an internal diagnostic, not independent evidence of recommendation quality.
3. **Ablations:** no clipping, clipping at 6/18 dB, alternative level alignment at 500–2,000 Hz, and doubled bass weight below 250 Hz. Report mean and 10th percentile top-5 overlap against the deployed retrieval list and exact ordered-list agreement. Use stable input order for ties and report rounded-distance boundary ties separately.
4. **Export precision:** recompute production distance from 0.1 dB exported curves. Report distance discrepancies and membership changes caused by quantization, without calling them algorithmic accuracy failures. Full raw-source reconstruction is evaluated separately.
5. **Map:** use default variants only. Compare the saved 2D PCA map with high-dimensional clipped curves using neighborhood overlap@5 and trustworthiness@5. These measure representation quality, not human preference. PCA was fit on this same catalog; this is an in-sample diagnostic, not generalization.
6. **Variant sensitivity:** compare each non-default variant's recommended base groups with its default's list. A low overlap signals sensitivity to measurement/configuration; it does not identify a bad measurement.
7. **Quiz:** enumerate all 512 answer combinations using the actual TypeScript functions, compare with a neutral-profile baseline, perturb bass by +0.5 dB within the configured bound, report unique profiles/lists and catalog exposure. Exhaustive synthetic answers have no population probability interpretation.

All seeds are 42. Fixed comparisons are descriptive and have no p-values or post-hoc winner selection. Metrics and per-query rows are saved for inspection. For future human-labeled modeling, group variants (and verified aliases across rigs) before splitting and keep a held-out evaluation set; do not create labels from the same distance formula being evaluated.

## Source and rebuild

Lock AutoEq to the full SHA in `pipeline/rigs.json`. Require that HEAD matches and tracked files are unchanged before building. Fingerprint every selected CSV and RANKING.md with SHA-256, record versions and generated file hashes, and bypass the former path-only pickle cache. Build twice to separate output roots; compare JSON hashes for same-environment determinism. Compare the reconstruction with the existing app export separately, reporting drift rather than silently replacing it.

## References

- [AutoEq source and methodology](https://github.com/jaakkopasanen/AutoEq): measurement source; this app's retrieval/quiz is a separate method.
- [scikit-learn trustworthiness](https://scikit-learn.org/stable/modules/generated/sklearn.manifold.trustworthiness.html): preservation of local structure in an embedding.

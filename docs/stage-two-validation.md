# Stage-two validation and reproduction

Work is local on `codex/audiomatch-stage-two`, following stage-one commit `34c0017`. No production deployment or external user study was performed.

## Reproduce

Use Python 3.12 and a dedicated environment. `pipeline/requirements-evaluation.lock.txt` records the tested numerical, plotting and test packages. The existing media tooling is outside this environment snapshot.

```sh
python -m pip install -r pipeline/requirements-evaluation.lock.txt
python pipeline/fetch_data.py
python pipeline/build_data.py --output-root .stage-two/rebuild-a
python pipeline/build_data.py --output-root .stage-two/rebuild-b
python scripts/verify_rebuild.py
python pipeline/evaluate.py
npm ci
npm run evaluate:quiz
python scripts/render_evaluation.py
python -m pytest pipeline/tests -q
npm test
npm run build
```

For the same numerical environment, set `OMP_NUM_THREADS=1` and `OPENBLAS_NUM_THREADS=1` before building. The two recorded builds used those settings. `fetch_data.py` now restores the existing full commit lock by default. `--reselect` is an explicit separate operation to regenerate rig membership at the checkout revision; it does not silently choose the latest source.

The two output roots contain complete independent exports. Verification compares all nine files byte-for-byte between builds and compares JSON semantics against the app export. Five historical neighbor rows show tie-order differences between identical exported curves; see `evaluation/rebuild.json`. The app's existing data remains unchanged.

Copy the source manifest produced under `rebuild-a/docs/source-manifest.json` into `docs/evaluation/source-manifest.json` when recording a new run. The manifest describes that rebuild's output hashes, while `metrics.json` identifies the frozen app files used for evaluation. Keep that distinction when interpreting historical neighbor differences.

## Checks

- 29 Python tests passed, including full-export integrity, intentionally corrupted data, raw CSV validation, source-revision rejection, stale-cache regression and saved-evaluation fingerprint checks.
- 19 TypeScript tests passed, including exhaustive validation of all 512 quiz combinations using the real app functions.
- Both isolated source rebuilds completed; nine of nine generated files had matching hashes between runs.
- TypeScript and Vite production build passed. The map flow is checked on desktop and mobile, including its revised explanation, keyboard navigation and clicking a product.

This host used an ignored `.test-python` directory with the bundled Python runtime. Pytest's sandbox temporary directory failed to initialize; tests passed with an explicit workspace-local `--basetemp`. Vite's sandbox transform cache also failed once; the same unit tests passed outside that sandbox. These were environment failures, not silently excluded tests.

The source checkout initially used Windows line-ending conversion. Only the newly created cache checkout was normalized after checking that its differences were line endings alone. Fetching now disables automatic line-ending conversion for this dedicated source cache, so byte hashes are meaningful.

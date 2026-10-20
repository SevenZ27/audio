"""Render the saved numerical evaluation into a report and reusable chart."""
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

matplotlib.rcParams['svg.hashsalt'] = 'audiomatch-evaluation-v1'

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/evaluation'


def main():
    metrics = json.loads((OUT / 'metrics.json').read_text())
    quiz = json.loads((OUT / 'quiz.json').read_text())
    rebuild = json.loads((OUT / 'rebuild.json').read_text())
    rigs = metrics['rigs']
    methods = ['six_band_means', 'no_clipping', 'clip_6db', 'clip_18db', 'align_500_2000', 'bass_weight_2x']
    arr = np.array([[v['methods'][m]['defaultQueryOverlapAt5']['mean'] for m in methods] for v in rigs.values()])
    fig, axes = plt.subplots(1, 2, figsize=(13, 4.8), gridspec_kw={'width_ratios': [2, 1]}, layout='constrained')
    axes[0].imshow(arr, vmin=0, vmax=1, cmap='Blues', aspect='auto')
    axes[0].set_xticks(range(len(methods)), ['6 bands', 'No clip', 'Clip 6 dB', 'Clip 18 dB', 'Align\n500–2k', 'Bass ×2'])
    axes[0].set_yticks(range(len(rigs)), list(rigs))
    axes[0].set_title('Top-5 overlap with deployed retrieval\nOne default query per model–rig group')
    for i in range(arr.shape[0]):
        for j in range(arr.shape[1]):
            axes[0].text(j, i, f'{arr[i,j]:.0%}', ha='center', va='center', color='white' if arr[i,j] > .65 else 'black')
    vals = [v['map']['overlapAt5']['mean'] for v in rigs.values()]
    bars = axes[1].barh(range(len(rigs)), vals, color='#147d92')
    axes[1].set_yticks(range(len(rigs)), ['Super Review', 'Rtings', 'HypetheSonics', 'oratory1990'])
    axes[1].invert_yaxis()
    axes[1].set_xlim(0, 1)
    axes[1].bar_label(bars, labels=[f'{v:.1%}' for v in vals], padding=4)
    axes[1].set_title('PCA map neighborhood overlap@5\nDefault variants, in-sample')
    axes[1].set_xlabel('Fraction of high-dimensional neighbors retained')
    fig.suptitle('AudioMatch offline diagnostics — not preference accuracy', fontsize=14, fontweight='bold')
    fig.savefig(OUT / 'diagnostics.png', dpi=180)
    svg = OUT / 'diagnostics.svg'
    fig.savefig(svg, metadata={'Date': None})
    svg.write_text('\n'.join(line.rstrip() for line in svg.read_text(encoding='utf-8').splitlines()) + '\n', encoding='utf-8')
    plt.close(fig)
    lines = ['# AudioMatch: data quality and offline evaluation', '',
             'Stage two evaluates the frozen 1,510-measurement catalog. No listening or user-preference labels were collected. The retrieval method remains unchanged; these experiments identify limitations and establish a reproducible baseline.', '',
             '![Offline diagnostics](diagnostics.png)', '',
             '## Data quality and provenance', '',
             '- All exported IDs, curve references, map memberships and neighbor constraints passed the structural gates. The catalog ledger joins every measurement to its source path and commit; physical product identity remains explicitly unresolved.',
             '- AutoEq is locked to `7ae0f56d53074872b028649617a22bbb4232feb7`. The source manifest fingerprints 1,510 CSVs plus RANKING.md and records numerical package versions.',
             '- Raw CSVs are read afresh on every build. Non-finite values, duplicate/non-increasing frequencies and insufficient coverage fail before export. All selected sources end at 19,955.54 Hz; interpolation holds that endpoint at 20 kHz. This is outside the 10 kHz similarity cutoff.',
             f"- Two isolated rebuilds produced identical bytes for all nine exported JSON files: **{rebuild['repeatedBuildExact']}**. Compared with the existing export, {len(rebuild['neighborDrift'])} neighbor rows differ; each changed rank uses an identical exported curve and the same displayed score/distance. This is reported as tie-order drift, not exact historical reproduction. The existing app data was preserved.", '',
             '| Rig | Measurements | Missing preference score | Curves with clipping | Duplicate quantized-curve groups |',
             '|---|---:|---:|---:|---:|']
    for r, v in rigs.items():
        lines.append(f"| {r} | {v['measurements']} | {v['missingPreferenceScores']} | {v['measurementsWithClipping']} | {len(v['identicalQuantizedCurveGroups'])} |")
    lines += ['', 'Missing preference scores are structural source coverage, not zeros. Identical exported curves are review candidates, not proof of identical physical products. No records were deleted or merged.', '',
              '## Retrieval baselines and sensitivity', '',
              'The table uses one default query per model–rig group to avoid overweighting heavily measured models. Candidates still include all variants and exclude the query group. Values are mean top-5 base-group overlap with the saved deployed recommendations. Random ranks are uniform over candidate groups; the first variant breaks within-group ties. All-measurement aggregates, ordered agreement, unclipped RMS and per-query rows are also saved.', '',
              '| Rig | Recomputed export | Random | Six bands | No clipping | Clip 6 | Clip 18 | Align 500–2k | Bass ×2 |',
              '|---|---:|---:|---:|---:|---:|---:|---:|---:|']
    order = ['recomputed_export', 'random_seed42', *methods]
    for r, v in rigs.items():
        lines.append('| ' + r + ' | ' + ' | '.join(f"{v['methods'][m]['defaultQueryOverlapAt5']['mean']:.1%}" for m in order) + ' |')
    lines += ['', 'Agreement measures stability, not correctness. Six-band retrieval is a simpler baseline; it is not ground truth. Unclipped RMS is another internal geometric diagnostic and favors methods designed to minimize it. No method was chosen as a winner from these numbers.', '',
              'Recomputing from 0.1 dB exported curves changes some close ranks. The largest saved-distance discrepancy is ' + f"{max(v['maxExportDistanceDeltaDb'] for v in rigs.values()):.4f} dB" + ', within the conservative 0.205 dB quantization-plus-rounding bound. Stable sorting uses source order for exact numerical ties. Floating-point near-ties can still vary across numerical environments, as the historical rebuild comparison demonstrates.', '',
              '## PCA and measurement variants', '',
              '| Rig | Map overlap@5 | Trustworthiness@5 | Variant-to-default overlap@5 | Non-default measurements |',
              '|---|---:|---:|---:|---:|']
    for r, v in rigs.items():
        s = v['variantOverlapAt5']
        lines.append(f"| {r} | {v['map']['overlapAt5']['mean']:.1%} | {v['map']['trustworthinessAt5']:.3f} | {s['mean']:.1%} | {s['n']} |")
    lines += ['', 'Trustworthiness penalizes false local neighbors by their high-dimensional rank; overlap asks whether the exact five neighbors were preserved. A relatively high trustworthiness does not imply exact neighbor retention. The map is an exploratory summary, not the retrieval ranking. Its UI claim has been corrected accordingly.',
              '', 'Variant sensitivity is substantial. Preserve variant labels and make the default-selection rule visible; do not present a default measurement as universal product behavior. Rtings has only two non-default measurements, so its 0% overlap must not be generalized.', '',
              '## Exhaustive quiz diagnostics', '',
              'The actual TypeScript quiz and ranking functions were run on all 512 answer combinations, 256 per form. All returned five eligible, distinct default models in the selected rig. Each form has 146 distinct bass/treble profiles. These combinations are synthetic and uniformly enumerated; they do not estimate user behavior.', '',
              '| Rig | Unique ranked lists | Models exposed / eligible | Neutral-profile overlap@5 | +0.5 dB bass overlap@5 |',
              '|---|---:|---:|---:|---:|']
    for q in quiz['rigs']:
        lines.append(f"| {q['rig']} | {q['distinctRankedLists']} | {q['exposedModels']} / {q['eligibleModels']} | {q['neutralOverlapAt5']:.1%} | {q['bassPerturbationOverlapAt5']:.1%} |")
    lines += ['', 'The quiz explores a narrow two-parameter taste family, so limited catalog exposure is expected. Exposure is not a fairness or satisfaction metric. The bass perturbation is clamped to the existing range. Future work should test whether users understand these controls before adding or fitting more weights.', '',
              '## Decisions and portfolio claims', '',
              'Keep rig isolation, retain the current retrieval parameters, expose uncertainty in the map, and preserve source/variant provenance. The legacy “14 of 23” label check is not validated ground truth and is no longer presented as evidence of recommendation accuracy.', '',
              'Supported claim: built and audited a reproducible content-based retrieval pipeline over 1,510 measurements, evaluated baseline and parameter sensitivity per rig, and quantified PCA neighborhood preservation and quiz coverage. This describes project work; personal ownership should match the contribution history.', '',
              'Unsupported claims: recommendation accuracy percentages, demonstrated human preference prediction, improved purchasing outcomes, or equivalence to the physical headphone sound. The next evidence gap is human evaluation, using the prepared [study protocol](../human-evaluation-protocol.md).', '',
              '## Reproduction and evidence', '',
              'See [the pre-run protocol](../evaluation-protocol.md), [reproduction commands](../stage-two-validation.md), `metrics.json`, `quiz.json`, `per-query.csv`, `catalog-ledger.json`, `source-manifest.json` and `rebuild.json` in this directory.', '',
              'References: [AutoEq](https://github.com/jaakkopasanen/AutoEq); [scikit-learn trustworthiness definition](https://scikit-learn.org/stable/modules/generated/sklearn.manifold.trustworthiness.html).', '']
    (OUT / 'report.md').write_text('\n'.join(lines), encoding='utf-8')


if __name__ == '__main__':
    main()

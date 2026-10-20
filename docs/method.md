# Method notes

All code is in `pipeline/core.py` (pure functions, tested in `pipeline/tests/`) and `pipeline/build_data.py`.

## Rig choice

See `docs/coverage.md`. Rule: per form, the (source, rig) with the most CSVs among rows where AutoEq records the rig.
A rig needs at least 100 CSVs. Extra rigs added by hand: HypetheSonics GRAS RA0045 (in-ear) and oratory1990
GRAS 45BC-10 (over-ear), both because they have Harman preference scores in `RANKING.md`.

## Curve processing

1. Read `frequency`, `raw`, `target` from each result CSV (695 rows, 20 Hz to 19,955 Hz in the snapshot).
2. Interpolate linearly on log frequency to 96 points, 20 Hz to 20 kHz.
3. Level align: subtract the mean between 300 Hz and 3 kHz.
4. Rig target: median of the aligned targets of all products in that rig (the spread between targets inside one rig
   is 0.01 dB in all four rigs, so this is basically the AutoEq target).
5. Error = raw minus rig target. For distance, PCA and k-means the error is clipped to +-12 dB.

## Bands

| key | range | used for similarity |
|---|---|---|
| sub-bass | 20-60 Hz | yes |
| bass | 60-250 Hz | yes |
| low-mid | 250-500 Hz | yes |
| mid | 500-2k Hz | yes |
| upper-mid | 2k-5k Hz | yes |
| treble | 5k-10k Hz | yes |
| air | 10k-20k Hz | no, display only |

## Similarity

RMS of the difference between two clipped error curves over grid points up to 10 kHz.
Score = round(100 x max(0, 1 - distance / 6 dB)).
Neighbours: the 10 closest products in the same rig, skipping every variant of the same model
(same name after removing the text in brackets). If another model has several variants, only its closest one counts.

## Default variant

When a model has several measurements in one rig (ANC on/off, earpads, filters), one is the default:

1. a name without anything in brackets
2. a variant that says default, stock, reference, standard, original, normal or balanced
3. a variant that says ANC on or ANC mode (not "off")
4. otherwise the shortest name, then alphabetical

Only default variants are used to fit PCA and k-means and to show points on the map, so heavily measured models
do not pull the map. Other variants are still searchable and have their own neighbours.

## Map and groups

- PCA with 2 components on the clipped error curves (20 Hz to 10 kHz). The sign of each component is flipped so the
  band with the largest average loading is positive. The UI says which band grows to the right and upwards.
- K-means (`n_init=20`, `random_state=42`) for k = 3 to 8. The k with the highest silhouette wins.

## Group names

Computed from the centroid band values (dB relative to the rig target):

- bass = mean of sub-bass and bass, treble = mean of upper-mid and treble
- bass >= +4 and treble >= +2.5: "V-shape"
- bass >= +4: "bass tebal", +1.5 to +4: "bass hangat", <= -2: "bass tipis"
- treble >= +2.5: "terang", <= -2.5: "treble kalem"
- nothing above and |mid| >= 2: "mid maju" or "mid mundur"
- nothing at all: "netral"
- when two groups get the same name they are numbered by bass, highest first

## Quiz

Taste curve = rig target + bass shelf + treble tilt.

- shelf(f) = bass / (1 + (f / 150)^2), bass clamped to -2..+8 dB
- tilt(f) = 0 below 3 kHz, treble x ln(f / 3000) / ln(10000 / 3000) between 3 and 10 kHz, full value above,
  treble clamped to -3..+2 dB

Each answer adds a fixed amount to bass and/or treble (see `src/lib/taste.ts`). These amounts are assumptions to be
checked with user tests. Ranking uses the same RMS distance and score as the twins, on default variants of the
default rig for the chosen form.

## Dengar Bedanya

- Filter centres: 31.5, 63, 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz, peaking, Q 1.41
- Gain = curve B minus curve A at the centre frequency, clamped to +-12 dB
- Preamp = -10 log10(mean(10^(gain/10))), an equal-band power heuristic from requested gains. It is not a measured or perceptual loudness match; see [native audio diagnostics](audio/report.md).
- Mode A plays the loop with all gains at 0, mode B applies the gains

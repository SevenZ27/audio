# AudioMatch

Find headphones and earphones that sound like the one you already like, based on measured frequency response instead
of marketing. The UI is in Indonesian.

![AudioMatch on desktop](docs/screenshots/desktop-1440.jpg)

## Problem

Most people pick headphones from ads, reviews that disagree with each other, or whatever a friend owns. Measurement
data exists (AutoEq alone has thousands of curves), but a raw frequency response graph means nothing to a normal
buyer. I wanted a way to say "I like how my AirPods Pro sound, what else sounds like that?" and get an answer that
is backed by data.

## Who it's for

People in Indonesia shopping for a first "serious" pair of earphones or headphones, who know what they like but not
the vocabulary (sub-bass, upper-mid, target curve).

## Demo

https://audiomatch-steven.vercel.app

## How it works

1. **Data.** `pipeline/fetch_data.py` does a sparse, blob-less clone of AutoEq (the full repo is about 4 GB), counts
   coverage per (source, rig, form) with `git ls-tree`, picks rigs and checks out only their CSV files. Coverage table:
   [docs/coverage.md](docs/coverage.md).
2. **One rig at a time.** Curves from different measurement rigs are not comparable, so a product is only compared
   with products from the same rig. The default rig for each form is the one with the most CSVs. Two more rigs were
   added by hand because they have Harman preference scores (and AirPods Pro 2 / AirPods Max).
3. **Normalize.** Each curve is interpolated to 96 log-spaced points from 20 Hz to 20 kHz and shifted so the
   300 Hz to 3 kHz average is 0 dB. Error = curve minus the rig target, clipped to +-12 dB.
4. **Similarity.** RMS distance between error curves from 20 Hz to 10 kHz, turned into a 0-100 score
   (0 dB = 100, 6 dB or more = 0). The top 10 neighbours per product are precomputed.
5. **Map and groups.** PCA (2 components) for the map, k-means for groups with k chosen by silhouette from 3 to 8.
   Group names come from rules on the centroid bands, written in [docs/method.md](docs/method.md).
6. **Quiz.** Five questions shift two numbers: a bass shelf below 150 Hz (-2 to +8 dB) and a treble tilt above 3 kHz
   (-3 to +2 dB). Products are ranked by distance to that taste curve.
7. **Listen to the difference.** A small procedural loop (kick, snare, hats, bass, pad) made with the Web Audio API
   goes through 10 peaking filters at octave centres. Gains are the B minus A curve difference, clamped to +-12 dB,
   with a preamp so A and B play at about the same loudness.

Everything runs in the browser from static JSON. No backend, no API keys, no analytics.

```bash
npm ci
npm run dev          # http://localhost:4171
npm test             # Vitest
npm run build

python -m pip install -r pipeline/requirements.txt
npm run data:fetch   # sparse clone + coverage + rig choice
npm run data         # rebuild public/data
npm run test:pipeline
npm run media        # hero video from media-src/hero.mp4
```

## Data and licenses

Measurements from [AutoEq](https://github.com/jaakkopasanen/AutoEq) (MIT) and the people who measured them:
Super Review, Rtings, HypetheSonics and oratory1990. Details and what was and was not checked:
[DATA_LICENSES.md](DATA_LICENSES.md).

## Evaluation

Numbers from the last pipeline run ([docs/pipeline-report.md](docs/pipeline-report.md)):

| Rig | Form | Models | PCA PC1 + PC2 | k | Silhouette |
|---|---|---:|---|---:|---:|
| Super Review, 711 | in-ear | 488 | 51.2% + 15.5% | 3 | 0.226 |
| Rtings, HMS II.3 | over-ear | 381 | 43.8% + 15.5% | 3 | 0.144 |
| HypetheSonics, GRAS RA0045 | in-ear | 127 | 50.8% + 18.5% | 3 | 0.203 |
| oratory1990, GRAS 45BC-10 | over-ear | 234 | 54.1% + 11.8% | 3 | 0.193 |

1,510 measurements, 1,230 models in total. Silhouette is low everywhere: headphone tuning is a spectrum, not neat
boxes, so the group names are a rough guide.

Sanity check with products that are commonly called bass heavy or neutral: 14 of 23 land in a group that makes sense.
The misses are listed in [docs/sanity-check.md](docs/sanity-check.md). Part of the reason is that groups are named
relative to the rig target, and Harman style targets already have a bass shelf, so a "fun" IEM can still sit near
target.

Tests: pipeline tests (same product has distance 0, a product is never its own twin, neighbours never cross rigs) and
Vitest tests (search, quiz ranking changes when you like bass, filter gains match the curve difference).

User test: not done yet. The plan is to ask 5 friends to take the quiz and say whether the picks match what they like.

## Limitations

- Similarity is only as good as the measurement. Fit, ear shape and unit variation are not in the data.
- Cross-rig comparison is not possible on purpose, so a model measured on two rigs shows up twice.
- The quiz weights are design assumptions, not research.
- "Dengar Bedanya" is a rough simulation that is still coloured by whatever headphone you are wearing.
- No prices. The feature exists but stays hidden until prices with a checkable source are added.
- Open earbuds are left out: the biggest earbud rig only has 27 CSVs.

## What I learned

- Git partial clone (`--filter=blob:none --sparse`) lets you inspect a 4 GB repo in seconds and fetch only the files
  you need. `git ls-tree` was enough to count coverage without downloading any data.
- Checking the real data early changed the plan: crinacle results in AutoEq have no CSV, and the rig name for most
  sources is not in the folder name but in `name_index.tsv`.
- A few measurements with a -30 dB roll-off at 20 Hz created their own k-means cluster. Clipping the error to +-12 dB
  before PCA and k-means fixed that.
- One measurement can be published under two names (Sennheiser HD 650 and HD 6XX have distance 0), so a test that
  expected every distance to be positive was wrong.
- Silhouette picked k=3 on every rig. Honest low numbers are more useful than forcing more groups.

## Credits

- Measurement data: AutoEq by Jaakko Pasanen, and Super Review, Rtings, HypetheSonics, oratory1990.
- Hero video (when added): made with an image-to-video model, then edited with `scripts/make_hero.py`.
- Built by Steven Gerald Cahyadi ([SevenZ27](https://github.com/SevenZ27)).

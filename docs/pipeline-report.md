# Pipeline report

AutoEq commit `7ae0f56d53` (2025-07-20). Grid 96 log points 20 Hz to 20 kHz.
Similarity and clustering use 20 Hz to 10000 Hz. Level aligned on 300 Hz to 3000 Hz. Error clipped to +-12 dB before distance, PCA and k-means.
Total 1510 measurements, 1230 model-rig pairs, 1140 distinct base names across rigs (not verified unique physical products).

| rig | entries | models | with pref score | PCA PC1 | PCA PC2 | k | silhouette | median distance dB | target spread dB |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| superreview-inear | 714 | 488 | 0 | 51.2% | 15.5% | 3 | 0.226 | 2.94 | 0.01 |
| rtings-overear | 383 | 381 | 0 | 43.8% | 15.5% | 3 | 0.144 | 4.36 | 0.01 |
| hypethesonics-inear | 152 | 127 | 86 | 50.8% | 18.5% | 3 | 0.203 | 3.72 | 0.01 |
| oratory1990-overear | 261 | 234 | 207 | 54.1% | 11.8% | 3 | 0.193 | 3.75 | 0.01 |

## Silhouette per k

- superreview-inear: k=3: 0.226, k=4: 0.147, k=5: 0.153, k=6: 0.158, k=7: 0.155, k=8: 0.142
- rtings-overear: k=3: 0.144, k=4: 0.141, k=5: 0.132, k=6: 0.122, k=7: 0.128, k=8: 0.133
- hypethesonics-inear: k=3: 0.203, k=4: 0.171, k=5: 0.183, k=6: 0.172, k=7: 0.163, k=8: 0.154
- oratory1990-overear: k=3: 0.193, k=4: 0.178, k=5: 0.155, k=6: 0.155, k=7: 0.142, k=8: 0.128

## Groups

### superreview-inear

| group | models | sub-bass | bass | low-mid | mid | upper-mid | treble | air |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Bass tebal | 111 | 4.5 | 5.1 | 2.6 | -0.5 | -0.5 | 1.5 | 1.4 |
| Bass hangat | 279 | 1.2 | 2.0 | 1.3 | -0.1 | -1.6 | -0.8 | 1.1 |
| Netral | 98 | -4.3 | 0.6 | 1.7 | -0.2 | -1.7 | -0.2 | -0.5 |

### rtings-overear

| group | models | sub-bass | bass | low-mid | mid | upper-mid | treble | air |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Bass tebal | 95 | 4.2 | 5.3 | 0.9 | -0.3 | 0.3 | 4.2 | 3.6 |
| Netral | 190 | -1.1 | 2.3 | 0.4 | -0.0 | -1.0 | 2.2 | 2.0 |
| Bass tipis | 96 | -6.6 | -1.0 | -0.2 | 0.2 | -1.7 | 0.5 | 0.3 |

### hypethesonics-inear

| group | models | sub-bass | bass | low-mid | mid | upper-mid | treble | air |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Bass hangat | 56 | 3.4 | 3.8 | 1.8 | -0.4 | -0.6 | 0.7 | 2.1 |
| Netral | 61 | -1.5 | 1.0 | 1.2 | 0.0 | -2.3 | -1.5 | 0.7 |
| Bass tipis, treble kalem | 10 | -8.6 | -4.1 | -0.5 | 0.5 | -2.6 | -4.1 | -3.1 |

### oratory1990-overear

| group | models | sub-bass | bass | low-mid | mid | upper-mid | treble | air |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Bass hangat | 56 | 3.6 | 4.0 | 1.1 | 0.1 | -1.5 | 0.1 | 2.2 |
| Netral | 86 | -2.6 | 1.5 | 1.4 | -0.1 | -0.8 | -0.5 | 2.9 |
| Bass tipis, treble kalem | 92 | -6.8 | -0.8 | 0.3 | 0.3 | -2.1 | -3.1 | 1.5 |

Sanity check: 14 of 23 pass, details in sanity-check.md.

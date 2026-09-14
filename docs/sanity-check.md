# Sanity check: do known products land in a sensible group?

The list of products is picked by hand from what exists in the data (common opinion: bass heavy or close to neutral).
It is not used for training. A row passes when a bass heavy product lands in a group named bass tebal, bass hangat
or V-shape, and a neutral product lands in a group without bass tebal, bass hangat, V-shape or terang in its name.
Note that groups are named relative to the rig target (Harman style targets already include a bass shelf),
so a product that most people call neutral can show up as bass tipis here.
`bass dB` is the average of sub-bass and bass relative to the rig target.

| rig | product | expected | group | bass dB | pass |
|---|---|---|---|---:|---|
| superreview-inear | Moondrop Chu | bass-heavy | Netral | -1.2 | no |
| superreview-inear | Tin HiFi T2 | bass-heavy | Netral | -4.0 | no |
| superreview-inear | Etymotic ER2XR | neutral | Bass hangat | -0.6 | no |
| superreview-inear | Truthear Hexa | neutral | Bass hangat | 1.3 | no |
| superreview-inear | Sennheiser IE 900 | neutral | Bass hangat | 3.3 | no |
| rtings-overear | Beats Studio3 Wireless | bass-heavy | Netral | 0.5 | no |
| rtings-overear | Sony WH-1000XM3 | bass-heavy | Bass tebal | 4.0 | yes |
| rtings-overear | Skullcandy Crusher Wireless | bass-heavy | Bass tebal | 7.8 | yes |
| rtings-overear | Skullcandy Crusher Evo | bass-heavy | Bass tebal | 3.9 | yes |
| rtings-overear | Sony MDR-XB950B1 | bass-heavy | Bass tebal | 7.8 | yes |
| rtings-overear | Sennheiser HD 650 | neutral | Bass tipis | -4.9 | yes |
| hypethesonics-inear | Sony WF-1000XM4 | bass-heavy | Netral | 0.2 | no |
| hypethesonics-inear | Moondrop Chu | bass-heavy | Netral | -1.0 | no |
| hypethesonics-inear | Etymotic ER4SR | neutral | Bass tipis, treble kalem | -7.7 | yes |
| hypethesonics-inear | Moondrop Blessing 2 | neutral | Netral | -1.7 | yes |
| hypethesonics-inear | Truthear Hexa | neutral | Netral | -0.0 | yes |
| oratory1990-overear | Beats Studio3 Wireless | bass-heavy | Netral | -0.8 | no |
| oratory1990-overear | Sony WH-1000XM3 | bass-heavy | Bass hangat | 6.3 | yes |
| oratory1990-overear | Sony WH-1000XM4 | bass-heavy | Bass hangat | 5.9 | yes |
| oratory1990-overear | Sennheiser HD 600 | neutral | Bass tipis, treble kalem | -4.2 | yes |
| oratory1990-overear | Sennheiser HD 650 | neutral | Bass tipis, treble kalem | -3.6 | yes |
| oratory1990-overear | Sennheiser HD 560S | neutral | Bass tipis, treble kalem | -2.8 | yes |
| oratory1990-overear | Dan Clark Audio E3 | neutral | Netral | 0.3 | yes |

Result: 14 of 23 pass.

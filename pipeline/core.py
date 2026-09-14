"""Pure functions for the AudioMatch pipeline. No file or network access here."""
from __future__ import annotations

import math
import re
from typing import Iterable, Sequence

import numpy as np

GRID_POINTS = 96
F_MIN, F_MAX = 20.0, 20000.0
SIM_MAX_HZ = 10000.0  # similarity and clustering ignore everything above this
LEVEL_BAND = (300.0, 3000.0)

# (key, label, low Hz, high Hz, used for similarity)
BANDS: list[tuple[str, str, float, float, bool]] = [
    ("subbass", "Sub-bass", 20, 60, True),
    ("bass", "Bass", 60, 250, True),
    ("lowmid", "Low-mid", 250, 500, True),
    ("mid", "Mid", 500, 2000, True),
    ("uppermid", "Upper-mid", 2000, 5000, True),
    ("treble", "Treble", 5000, 10000, True),
    ("air", "Air", 10000, 20000, False),
]

# error beyond this is clipped before distance, PCA and k-means, so one leaky
# measurement (20 Hz roll-off of -30 dB) does not dominate a whole rig
CLIP_DB = 12.0

# distance (dB RMS) at which the similarity score reaches 0
SCORE_ZERO_DB = 6.0


def log_grid(n: int = GRID_POINTS, f_min: float = F_MIN, f_max: float = F_MAX) -> np.ndarray:
    return np.geomspace(f_min, f_max, n)


def interp_log(freq: Sequence[float], values: Sequence[float], grid: np.ndarray) -> np.ndarray:
    """Linear interpolation on log-frequency. NaN rows in the input are dropped."""
    f = np.asarray(freq, dtype=float)
    v = np.asarray(values, dtype=float)
    ok = np.isfinite(f) & np.isfinite(v) & (f > 0)
    if ok.sum() < 2:
        raise ValueError("not enough valid points to interpolate")
    f, v = f[ok], v[ok]
    order = np.argsort(f)
    return np.interp(np.log10(grid), np.log10(f[order]), v[order])


def band_mask(grid: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return (grid >= lo) & (grid <= hi)


def level_align(grid: np.ndarray, curve: np.ndarray, band: tuple[float, float] = LEVEL_BAND) -> np.ndarray:
    """Shift a curve so its mean between 300 Hz and 3 kHz is 0 dB."""
    m = band_mask(grid, *band)
    return curve - curve[m].mean()


def clip_error(error: np.ndarray, limit: float = CLIP_DB) -> np.ndarray:
    return np.clip(error, -limit, limit)


def sim_mask(grid: np.ndarray) -> np.ndarray:
    return grid <= SIM_MAX_HZ


def band_values(grid: np.ndarray, error: np.ndarray) -> dict[str, float]:
    out = {}
    for key, _label, lo, hi, _used in BANDS:
        m = band_mask(grid, lo, hi)
        out[key] = float(error[m].mean())
    return out


def rms_distance(a: np.ndarray, b: np.ndarray, mask: np.ndarray | None = None) -> float:
    d = np.asarray(a, dtype=float) - np.asarray(b, dtype=float)
    if mask is not None:
        d = d[mask]
    return float(math.sqrt(float(np.mean(d * d))))


def distance_matrix(curves: np.ndarray, mask: np.ndarray) -> np.ndarray:
    x = curves[:, mask]
    sq = (x * x).sum(axis=1)
    d2 = (sq[:, None] + sq[None, :] - 2.0 * x @ x.T) / x.shape[1]
    np.fill_diagonal(d2, 0.0)
    return np.sqrt(np.clip(d2, 0.0, None))


def similarity_score(distance_db: float) -> int:
    """0 dB RMS -> 100, SCORE_ZERO_DB or more -> 0, linear in between."""
    return int(round(100.0 * max(0.0, 1.0 - distance_db / SCORE_ZERO_DB)))


_PAREN = re.compile(r"\s*\([^()]*\)\s*$")


def base_model(name: str) -> str:
    """'Apple AirPods Pro 2 (ANC on)' -> 'apple airpods pro 2'."""
    s = name.strip()
    while True:
        t = _PAREN.sub("", s)
        if t == s:
            break
        s = t
    return re.sub(r"\s+", " ", s).strip().lower()


def variant_label(name: str) -> str:
    m = re.search(r"\(([^()]*)\)\s*$", name.strip())
    return m.group(1) if m else ""


DEFAULT_WORDS = ("default", "stock", "reference", "standard", "original", "normal", "balanced")
ANC_WORDS = ("anc on", "anc mode", "anc")


def default_variant_rank(name: str) -> tuple:
    """Lower is better. Rule written in docs/method.md:
    1. no variant in parentheses
    2. variant says default/stock/reference/standard/original/normal/balanced
    3. variant says ANC on / ANC mode
    4. shortest name, then alphabetical
    """
    v = variant_label(name).lower()
    if not v:
        tier = 0
    elif any(w in v for w in DEFAULT_WORDS):
        tier = 1
    elif any(w in v for w in ANC_WORDS) and "off" not in v:
        tier = 2
    else:
        tier = 3
    return (tier, len(name), name.lower())


def pick_defaults(names: Sequence[str]) -> set[int]:
    groups: dict[str, list[int]] = {}
    for i, n in enumerate(names):
        groups.setdefault(base_model(n), []).append(i)
    return {min(idx, key=lambda i: default_variant_rank(names[i])) for idx in groups.values()}


def top_neighbors(dist: np.ndarray, names: Sequence[str], k: int = 10) -> list[list[tuple[int, float]]]:
    """For each row, the k closest products that are not the same base model.
    When a model has several variants only its closest variant is kept."""
    bases = [base_model(n) for n in names]
    out = []
    for i in range(dist.shape[0]):
        order = np.argsort(dist[i], kind="stable")
        picked: list[tuple[int, float]] = []
        seen = {bases[i]}
        for j in order:
            if j == i or bases[j] in seen:
                continue
            seen.add(bases[j])
            picked.append((int(j), float(dist[i, j])))
            if len(picked) == k:
                break
        out.append(picked)
    return out


def describe_centroid(bands: dict[str, float]) -> list[str]:
    """Rule-based descriptors from the band values of a cluster centroid
    (dB relative to the rig target, after level alignment)."""
    bass = (bands["subbass"] + bands["bass"]) / 2.0
    treble = (bands["uppermid"] + bands["treble"]) / 2.0
    mid = bands["mid"]
    words: list[str] = []
    if bass >= 4.0 and treble >= 2.5:
        return ["V-shape"]
    if bass >= 4.0:
        words.append("bass tebal")
    elif bass >= 1.5:
        words.append("bass hangat")
    elif bass <= -2.0:
        words.append("bass tipis")
    if treble >= 2.5:
        words.append("terang")
    elif treble <= -2.5:
        words.append("treble kalem")
    if not words and abs(mid) >= 2.0:
        words.append("mid maju" if mid > 0 else "mid mundur")
    return words or ["netral"]


def name_clusters(centroid_bands: Sequence[dict[str, float]]) -> list[str]:
    names = [", ".join(describe_centroid(b)) for b in centroid_bands]
    names = [n[0].upper() + n[1:] for n in names]
    # same name twice: number them by how far their bass sits from target
    counts: dict[str, list[int]] = {}
    for i, n in enumerate(names):
        counts.setdefault(n, []).append(i)
    for n, idx in counts.items():
        if len(idx) > 1:
            idx.sort(key=lambda i: -(centroid_bands[i]["subbass"] + centroid_bands[i]["bass"]))
            for rank, i in enumerate(idx, start=1):
                names[i] = f"{n} {rank}"
    return names


def slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def unique_ids(names: Iterable[str]) -> list[str]:
    used: dict[str, int] = {}
    out = []
    for n in names:
        base = slugify(n) or "item"
        c = used.get(base, 0)
        used[base] = c + 1
        out.append(base if c == 0 else f"{base}-{c + 1}")
    return out

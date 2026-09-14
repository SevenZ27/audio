"""Turn media-src/hero.mp4 into the web hero assets.

    python scripts/make_hero.py                 # or: npm run media
    python scripts/make_hero.py --input x.mp4   # other source file
    python scripts/make_hero.py --og-placeholder

What it does:
1. makes a loop without a visible jump: drops the first second and crossfades the last second into it
2. exports H.264 MP4 without audio at 1920 px (target < 4 MB) and 1080 px (target < 2 MB)
3. writes hero-poster.jpg, public/og.jpg (1200x630) and docs/loop-check.jpg (last frame next to first frame)
4. sets public/media/manifest.json to {"hero": true}
5. prints the file sizes

Needs: pip install imageio-ffmpeg pillow
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "public" / "media"
MANIFEST = MEDIA / "manifest.json"
OG = ROOT / "public" / "og.jpg"
LOOP_CHECK = ROOT / "docs" / "loop-check.jpg"
FADE = 1.0
FPS = 30
TARGETS = [(1920, 4.0, "hero-1920.mp4"), (1080, 2.0, "hero-1080.mp4")]


def ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg
    except ImportError:
        sys.exit("imageio-ffmpeg is missing: python -m pip install --user imageio-ffmpeg")
    return imageio_ffmpeg.get_ffmpeg_exe()


def run(args: list[str]) -> subprocess.CompletedProcess:
    out = subprocess.run([ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit("ffmpeg failed: " + out.stderr.strip())
    return out


def duration_of(path: Path) -> float:
    out = subprocess.run([ffmpeg_exe(), "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", out.stderr)
    if not m:
        sys.exit(f"could not read duration of {path}")
    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)


def make_loop(src: Path, dst: Path) -> float:
    dur = duration_of(src)
    if dur < 3 * FADE:
        sys.exit(f"video is {dur:.1f} s, needs at least {3 * FADE:.0f} s")
    main_len = dur - FADE
    graph = (
        f"[0:v]fps={FPS},format=yuv420p,split[a][b];"
        f"[a]trim=start={FADE},setpts=PTS-STARTPTS,fps={FPS}[main];"
        f"[b]trim=start=0:end={FADE},setpts=PTS-STARTPTS,fps={FPS}[head];"
        f"[main][head]xfade=transition=fade:duration={FADE}:offset={main_len - FADE:.3f}[out]"
    )
    run(["-i", str(src), "-filter_complex", graph, "-map", "[out]", "-an", "-c:v", "libx264", "-crf", "12", "-preset", "fast", str(dst)])
    return main_len


def encode(src: Path, width: int, limit_mb: float, dst: Path) -> tuple[int, int]:
    size = 0
    crf = 23
    for crf in (23, 26, 29, 32, 35):
        run([
            "-i", str(src), "-an", "-vf", f"scale={width}:-2:flags=lanczos,format=yuv420p",
            "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", str(crf),
            "-movflags", "+faststart", str(dst),
        ])
        size = dst.stat().st_size
        if size <= limit_mb * 1024 * 1024:
            break
    return size, crf


def grab_frame(src: Path, t: float, dst: Path, width: int | None = None) -> None:
    vf = ["-vf", f"scale={width}:-2"] if width else []
    run(["-ss", f"{max(0.0, t):.3f}", "-i", str(src), "-frames:v", "1", *vf, "-q:v", "3", str(dst)])


def cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    w, h = size
    scale = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left = (img.width - w) // 2
    top = (img.height - h) // 2
    return img.crop((left, top, left + w, top + h))


def font(size: int) -> ImageFont.ImageFont:
    for name in ("seguisb.ttf", "segoeui.ttf", "Arial.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size)


def og_from(base: Image.Image) -> Image.Image:
    img = cover(base.convert("RGB"), (1200, 630))
    shade = Image.new("L", (1200, 630))
    d = ImageDraw.Draw(shade)
    for y in range(630):
        d.line([(0, y), (1200, y)], fill=int(40 + 180 * (y / 630) ** 1.6))
    img = Image.composite(Image.new("RGB", img.size, (7, 8, 10)), img, shade)
    draw = ImageDraw.Draw(img)
    draw.text((72, 400), "AudioMatch", font=font(88), fill=(245, 245, 247))
    draw.text((76, 510), "Cari kembaran suara headphone dari data pengukuran", font=font(34), fill=(161, 161, 166))
    return img


def og_placeholder() -> Image.Image:
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), (7, 8, 10))
    glow = Image.new("RGB", (w, h), (7, 8, 10))
    d = ImageDraw.Draw(glow)
    d.ellipse([180, 20, 640, 480], fill=(45, 212, 191))
    d.ellipse([560, 0, 1080, 460], fill=(139, 92, 246))
    glow = glow.filter(ImageFilter.GaussianBlur(140))
    img = Image.blend(img, glow, 0.45)
    draw = ImageDraw.Draw(img)
    pts = [(x, 330 + 60 * __import__("math").sin(x / 90) * (1 - x / 1600)) for x in range(0, w, 6)]
    draw.line(pts, fill=(245, 245, 247), width=3)
    return og_from(img)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--input", default=str(ROOT / "media-src" / "hero.mp4"))
    ap.add_argument("--og-placeholder", action="store_true", help="only write a gradient OG image, no video needed")
    args = ap.parse_args()

    if args.og_placeholder:
        og_placeholder().save(OG, quality=86)
        print(f"{OG.relative_to(ROOT)}  {OG.stat().st_size / 1024:.0f} KB")
        return

    src = Path(args.input)
    if not src.exists():
        sys.exit(f"{src} not found. Put the generated video there first.")
    MEDIA.mkdir(parents=True, exist_ok=True)
    LOOP_CHECK.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        loop = tmp / "loop.mp4"
        length = make_loop(src, loop)

        sizes = {}
        for width, limit, name in TARGETS:
            dst = MEDIA / name
            size, crf = encode(loop, width, limit, dst)
            sizes[name] = (size, limit, crf)

        poster = MEDIA / "hero-poster.jpg"
        grab_frame(loop, 0, poster, 1920)

        first, last = tmp / "first.jpg", tmp / "last.jpg"
        grab_frame(loop, 0, first, 960)
        grab_frame(loop, length - 1.5 / FPS, last, 960)
        a, b = Image.open(last), Image.open(first)
        pair = Image.new("RGB", (a.width + b.width + 12, max(a.height, b.height) + 48), (7, 8, 10))
        pair.paste(a, (0, 48))
        pair.paste(b, (a.width + 12, 48))
        d = ImageDraw.Draw(pair)
        d.text((12, 10), "last frame", font=font(24), fill=(245, 245, 247))
        d.text((a.width + 24, 10), "first frame", font=font(24), fill=(245, 245, 247))
        pair.save(LOOP_CHECK, quality=85)

        mid = tmp / "mid.jpg"
        grab_frame(loop, length / 2, mid)
        og_from(Image.open(mid)).save(OG, quality=86)

    MANIFEST.write_text(json.dumps({"hero": True}) + "\n", encoding="utf-8")

    print(f"loop length {length:.2f} s")
    for name, (size, limit, crf) in sizes.items():
        flag = "ok" if size <= limit * 1024 * 1024 else "OVER TARGET"
        print(f"public/media/{name}  {size / 1024 / 1024:.2f} MB (target < {limit:g} MB, crf {crf}) {flag}")
    for p in (MEDIA / "hero-poster.jpg", OG, LOOP_CHECK):
        print(f"{p.relative_to(ROOT).as_posix()}  {p.stat().st_size / 1024:.0f} KB")
    print("public/media/manifest.json  {\"hero\": true}")


if __name__ == "__main__":
    main()

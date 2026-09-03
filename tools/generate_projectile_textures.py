#!/usr/bin/env python3
"""Generate deterministic projectile-specific PBR WebP textures.

Profiles:
- HD: base color 2048²; normal/ORM 1024²
- mobile: base color 1024²; normal/ORM 512²

ORM convention: R=ambient occlusion, G=roughness, B=metallic.
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "textures" / "projectiles"
MOBILE = OUT / "mobile"
BASE = 2048
MAP = 1024
MOBILE_BASE = 1024
MOBILE_MAP = 512
SURFACES = ("chrome", "rubber", "concrete", "ceramic")


def _target(name: str, mobile: bool) -> int:
    base = "_basecolor." in name
    return (MOBILE_BASE if base else MOBILE_MAP) if mobile else (BASE if base else MAP)


def save(image: Image.Image, name: str, quality: int = 90) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    MOBILE.mkdir(parents=True, exist_ok=True)
    hd_size = _target(name, False)
    mobile_size = _target(name, True)
    hd = image if image.size == (hd_size, hd_size) else image.resize((hd_size, hd_size), Image.Resampling.LANCZOS)
    mobile = hd.resize((mobile_size, mobile_size), Image.Resampling.LANCZOS)
    hd.save(OUT / name, "WEBP", quality=quality, method=4)
    mobile.save(MOBILE / name, "WEBP", quality=max(84, quality - 3), method=4)


def normal_canvas() -> Image.Image:
    return Image.new("RGB", (MAP, MAP), (128, 128, 255))


def vertical_gradient(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    image = Image.new("RGB", (BASE, BASE))
    draw = ImageDraw.Draw(image)
    for y in range(BASE):
        t = y / (BASE - 1)
        color = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        draw.line((0, y, BASE, y), fill=color)
    return image


def make_chrome() -> None:
    image = vertical_gradient((218, 228, 232), (72, 87, 94))
    draw = ImageDraw.Draw(image, "RGBA")
    for x in range(0, BASE, 7):
        alpha = 62 if x % 49 == 0 else 20
        draw.line((x, 0, x, BASE), fill=(245, 250, 252, alpha), width=1)
    rng = random.Random(7101)
    for _ in range(230):
        y = rng.randrange(BASE)
        x = rng.randrange(BASE)
        length = rng.randrange(35, 390)
        draw.line((x, y, min(BASE, x + length), y + rng.randrange(-2, 3)), fill=(255, 255, 255, 45), width=1)
    save(image, "chrome_basecolor.webp", 92)

    normal = normal_canvas()
    draw = ImageDraw.Draw(normal)
    for x in range(0, MAP, 6):
        draw.line((x, 0, x, MAP), fill=(126 + (x % 5), 128, 253), width=1)
    save(normal, "chrome_normal.webp", 94)
    save(Image.new("RGB", (MAP, MAP), (252, 30, 255)), "chrome_orm.webp", 95)


def make_rubber() -> None:
    image = Image.new("RGB", (BASE, BASE), (20, 24, 26))
    draw = ImageDraw.Draw(image)
    spacing = 42
    radius = 8
    for row, y in enumerate(range(spacing // 2, BASE, spacing)):
        shift = spacing // 2 if row % 2 else 0
        for x in range(spacing // 2 + shift, BASE, spacing):
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(36, 42, 44), outline=(9, 12, 13))
    rng = random.Random(7202)
    for _ in range(500):
        x, y = rng.randrange(BASE), rng.randrange(BASE)
        draw.point((x, y), fill=(54, 59, 60))
    save(image, "rubber_basecolor.webp", 90)

    normal = normal_canvas()
    draw = ImageDraw.Draw(normal)
    spacing_n = 22
    for row, y in enumerate(range(spacing_n // 2, MAP, spacing_n)):
        shift = spacing_n // 2 if row % 2 else 0
        for x in range(spacing_n // 2 + shift, MAP, spacing_n):
            draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(121, 121, 246), outline=(134, 134, 255))
    save(normal, "rubber_normal.webp", 94)
    save(Image.new("RGB", (MAP, MAP), (236, 224, 0)), "rubber_orm.webp", 95)


def make_concrete() -> None:
    image = Image.new("RGB", (BASE, BASE), (128, 132, 132))
    draw = ImageDraw.Draw(image)
    rng = random.Random(7303)
    for _ in range(18000):
        x, y = rng.randrange(BASE), rng.randrange(BASE)
        value = rng.randrange(82, 184)
        r = rng.randrange(1, 5)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(value, value, min(195, value + 4)))
    for _ in range(32):
        x, y = rng.randrange(BASE), rng.randrange(BASE)
        points = [(x, y)]
        for __ in range(rng.randrange(4, 9)):
            x += rng.randrange(-70, 71)
            y += rng.randrange(18, 90)
            points.append((x, y))
        draw.line(points, fill=(62, 65, 66), width=rng.randrange(1, 4))
    image = image.filter(ImageFilter.GaussianBlur(0.35))
    save(image, "concrete_basecolor.webp", 88)

    normal = normal_canvas()
    draw = ImageDraw.Draw(normal)
    rng = random.Random(7304)
    for _ in range(2100):
        x, y = rng.randrange(MAP), rng.randrange(MAP)
        r = rng.randrange(1, 4)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(rng.randrange(119, 138), rng.randrange(119, 138), rng.randrange(242, 256)))
    save(normal, "concrete_normal.webp", 92)
    save(Image.new("RGB", (MAP, MAP), (226, 232, 0)), "concrete_orm.webp", 95)


def make_ceramic() -> None:
    image = vertical_gradient((252, 253, 252), (208, 219, 221))
    draw = ImageDraw.Draw(image, "RGBA")
    rng = random.Random(7404)
    for _ in range(260):
        x, y = rng.randrange(BASE), rng.randrange(BASE)
        points = [(x, y)]
        for __ in range(rng.randrange(2, 6)):
            x += rng.randrange(-28, 29)
            y += rng.randrange(8, 45)
            points.append((x, y))
        draw.line(points, fill=(78, 95, 101, 32), width=1)
    for radius in range(80, 900, 130):
        alpha = max(8, 34 - radius // 55)
        draw.ellipse((BASE // 2 - radius, BASE // 2 - radius, BASE // 2 + radius, BASE // 2 + radius), outline=(255, 255, 255, alpha), width=3)
    save(image, "ceramic_basecolor.webp", 92)

    normal = normal_canvas()
    draw = ImageDraw.Draw(normal)
    rng = random.Random(7405)
    for _ in range(180):
        x, y = rng.randrange(MAP), rng.randrange(MAP)
        draw.line((x, y, min(MAP, x + rng.randrange(8, 35)), min(MAP, y + rng.randrange(4, 30))), fill=(125, 130, 251), width=1)
    save(normal, "ceramic_normal.webp", 94)
    save(Image.new("RGB", (MAP, MAP), (252, 42, 0)), "ceramic_orm.webp", 95)


def maps(surface: str, prefix: str = "") -> dict[str, str]:
    return {
        "baseColor": f"{prefix}{surface}_basecolor.webp",
        "normal": f"{prefix}{surface}_normal.webp",
        "orm": f"{prefix}{surface}_orm.webp",
    }


def write_manifest() -> None:
    manifest = {
        "version": 1,
        "ormChannels": {"r": "ambientOcclusion", "g": "roughness", "b": "metallic"},
        "profiles": {
            "hd": {"materials": {surface: maps(surface) for surface in SURFACES}},
            "mobile": {"materials": {surface: maps(surface, "mobile/") for surface in SURFACES}},
        },
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    make_chrome()
    make_rubber()
    make_concrete()
    make_ceramic()
    write_manifest()
    print(f"Generated {len(list(OUT.glob('*.webp')))} HD + {len(list(MOBILE.glob('*.webp')))} mobile projectile maps")


if __name__ == "__main__":
    main()

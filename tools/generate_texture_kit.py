#!/usr/bin/env python3
"""Generate deterministic standalone HappyBlocks WebP PBR texture kits.

Profiles:
- HD: base color 2048²; normal/ORM/emissive 1024²
- mobile: base color 1024²; normal/ORM/emissive 512²

ORM convention: R=ambient occlusion, G=roughness, B=metallic.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "textures" / "pbr"
MOBILE = OUT / "mobile"
BASE = 2048
MAP = 1024
MOBILE_BASE = 1024
MOBILE_MAP = 512
MATERIALS = ("wood", "stone", "metal", "rubber", "ceramic", "energy")


def _target_for(name: str, mobile: bool) -> int:
    base_color = "_basecolor." in name
    if mobile:
        return MOBILE_BASE if base_color else MOBILE_MAP
    return BASE if base_color else MAP


def save(image: Image.Image, name: str, quality: int = 88) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    MOBILE.mkdir(parents=True, exist_ok=True)
    hd_target = _target_for(name, False)
    mobile_target = _target_for(name, True)
    hd = image if image.size == (hd_target, hd_target) else image.resize((hd_target, hd_target), Image.Resampling.LANCZOS)
    mobile = hd.resize((mobile_target, mobile_target), Image.Resampling.LANCZOS)
    hd.save(OUT / name, "WEBP", quality=quality, method=4)
    mobile.save(MOBILE / name, "WEBP", quality=max(82, quality - 2), method=4)


def gradient(size: int, start: tuple[int, int, int], end: tuple[int, int, int], horizontal: bool = True) -> Image.Image:
    image = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(image)
    steps = 256
    for index in range(steps):
        t = index / (steps - 1)
        color = tuple(int(start[channel] * (1 - t) + end[channel] * t) for channel in range(3))
        if horizontal:
            x0 = index * size // steps
            x1 = (index + 1) * size // steps
            draw.rectangle((x0, 0, x1, size), fill=color)
        else:
            y0 = index * size // steps
            y1 = (index + 1) * size // steps
            draw.rectangle((0, y0, size, y1), fill=color)
    return image


def solid_normal() -> Image.Image:
    return Image.new("RGB", (MAP, MAP), (128, 128, 255))


def make_wood() -> None:
    image = gradient(BASE, (86, 46, 21), (194, 126, 58))
    draw = ImageDraw.Draw(image, "RGBA")
    rng = random.Random(101)
    for index in range(190):
        y = (index + 1) * BASE / 191
        amplitude = 5 + (index % 7) * 2
        phase = rng.random() * math.tau
        points = [(x, y + math.sin(x / 105 + phase) * amplitude) for x in range(0, BASE + 1, 40)]
        draw.line(points, fill=(48, 24, 10, 65 if index % 3 else 100), width=1 + int(index % 3 == 0))
    for knot in range(9):
        cx = 150 + knot * 218
        cy = 250 + (knot % 3) * 555
        for radius in range(18, 100, 16):
            draw.ellipse((cx - radius * 2, cy - radius, cx + radius * 2, cy + radius), outline=(55, 25, 10, 105), width=2)
    save(image, "wood_basecolor.webp", 86)

    normal = solid_normal()
    draw = ImageDraw.Draw(normal)
    for index in range(115):
        y = (index + 1) * MAP / 116
        points = [(x, y + math.sin(x / 55 + index * 0.7) * (2 + index % 6)) for x in range(0, MAP + 1, 28)]
        draw.line(points, fill=(120 + (index % 3) * 6, 126, 248), width=1)
    save(normal, "wood_normal.webp", 90)

    orm = Image.new("RGB", (MAP, MAP), (240, 158, 3))
    draw = ImageDraw.Draw(orm)
    for y in range(20, MAP, 64):
        draw.line((0, y, MAP, y), fill=(235, 175, 3), width=2)
    save(orm, "wood_orm.webp", 92)


def make_stone() -> None:
    image = gradient(BASE, (126, 134, 138), (171, 179, 182), False)
    draw = ImageDraw.Draw(image, "RGBA")
    rng = random.Random(202)
    for _ in range(600):
        x, y = rng.randrange(BASE), rng.randrange(BASE)
        width = rng.randrange(3, 18)
        value = 85 + rng.randrange(80)
        draw.rectangle((x, y, x + width, y + width), fill=(value, value + 3, value + 5, 45))
    for _ in range(36):
        x, y = rng.randrange(BASE), rng.randrange(BASE)
        points = [(x, y)]
        for __ in range(7):
            x += rng.randrange(-50, 51)
            y += rng.randrange(10, 65)
            points.append((x, y))
        draw.line(points, fill=(48, 55, 58, 100), width=2)
    save(image, "stone_basecolor.webp", 86)

    normal = solid_normal()
    draw = ImageDraw.Draw(normal)
    rng = random.Random(203)
    for index in range(520):
        x, y = rng.randrange(MAP), rng.randrange(MAP)
        size = rng.randrange(1, 7)
        draw.rectangle((x, y, x + size, y + size), fill=(122 + (index % 4) * 4, 126, 246 + (index % 2) * 5))
    save(normal, "stone_normal.webp", 90)

    orm = Image.new("RGB", (MAP, MAP), (225, 207, 4))
    draw = ImageDraw.Draw(orm)
    for index in range(110):
        x, y = (index * 97) % MAP, (index * 173) % MAP
        draw.rectangle((x, y, x + 8, y + 8), fill=(215, 220, 4))
    save(orm, "stone_orm.webp", 92)


def make_metal() -> None:
    image = gradient(BASE, (74, 88, 94), (171, 184, 188))
    draw = ImageDraw.Draw(image, "RGBA")
    for x in range(0, BASE, 5):
        draw.line((x, 0, x, BASE), fill=(230, 242, 245, 30 if x % 20 else 70), width=1)
    for index in range(90):
        y, x = (index * 151) % BASE, (index * 283) % BASE
        draw.line((x, y, min(BASE, x + 220 + (index % 5) * 60), y + (index % 5) - 2), fill=(238, 246, 248, 55), width=1)
    save(image, "metal_basecolor.webp", 90)

    normal = solid_normal()
    draw = ImageDraw.Draw(normal)
    for x in range(0, MAP, 4):
        draw.line((x, 0, x, MAP), fill=(126 + (x % 12), 128, 252), width=1)
    save(normal, "metal_normal.webp", 92)

    orm = Image.new("RGB", (MAP, MAP), (248, 72, 240))
    draw = ImageDraw.Draw(orm)
    for x in range(0, MAP, 20):
        draw.line((x, 0, x, MAP), fill=(248, 82 + (x % 35), 242), width=1)
    save(orm, "metal_orm.webp", 92)


def make_rubber() -> None:
    image = Image.new("RGB", (BASE, BASE), (18, 29, 33))
    draw = ImageDraw.Draw(image)
    for y in range(8, BASE, 18):
        for x in range(8 + (y // 18 % 2) * 9, BASE, 18):
            draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(35, 48, 52))
    save(image, "rubber_basecolor.webp", 90)

    normal = solid_normal()
    draw = ImageDraw.Draw(normal)
    for y in range(6, MAP, 12):
        for x in range(6 + (y // 12 % 2) * 6, MAP, 12):
            draw.rectangle((x - 1, y - 1, x + 1, y + 1), fill=(122, 126, 248))
    save(normal, "rubber_normal.webp", 92)
    save(Image.new("RGB", (MAP, MAP), (222, 215, 0)), "rubber_orm.webp", 94)


def make_ceramic() -> None:
    image = gradient(BASE, (248, 250, 250), (198, 210, 212), False)
    draw = ImageDraw.Draw(image, "RGBA")
    rng = random.Random(504)
    for _ in range(650):
        x, y = rng.randrange(BASE), rng.randrange(BASE)
        radius = 1 + rng.randrange(2)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(110, 125, 130, 40))
    save(image, "ceramic_basecolor.webp", 90)

    normal = solid_normal()
    draw = ImageDraw.Draw(normal)
    for index in range(250):
        draw.point(((index * 137) % MAP, (index * 271) % MAP), fill=(126, 129, 252))
    save(normal, "ceramic_normal.webp", 94)
    save(Image.new("RGB", (MAP, MAP), (250, 58, 2)), "ceramic_orm.webp", 94)


def make_energy() -> None:
    image = gradient(BASE, (6, 26, 34), (18, 66, 76), False)
    draw = ImageDraw.Draw(image, "RGBA")
    cell = BASE // 24
    for index in range(25):
        draw.line((index * cell, 0, index * cell, BASE), fill=(90, 235, 255, 120), width=3)
        draw.line((0, index * cell, BASE, index * cell), fill=(90, 235, 255, 120), width=3)
    for radius in range(100, 900, 100):
        draw.ellipse((BASE // 2 - radius, BASE // 2 - radius, BASE // 2 + radius, BASE // 2 + radius), outline=(255, 184, 65, 95), width=3)
    save(image, "energy_basecolor.webp", 90)

    normal = solid_normal()
    draw = ImageDraw.Draw(normal)
    cell = MAP // 24
    for index in range(25):
        draw.line((index * cell, 0, index * cell, MAP), fill=(118, 132, 246), width=2)
        draw.line((0, index * cell, MAP, index * cell), fill=(118, 132, 246), width=2)
    save(normal, "energy_normal.webp", 92)
    save(Image.new("RGB", (MAP, MAP), (242, 62, 72)), "energy_orm.webp", 94)

    emissive = Image.new("RGB", (MAP, MAP), (0, 5, 8))
    draw = ImageDraw.Draw(emissive)
    for index in range(25):
        draw.line((index * cell, 0, index * cell, MAP), fill=(75, 228, 255), width=2)
        draw.line((0, index * cell, MAP, index * cell), fill=(75, 228, 255), width=2)
    for radius in range(50, 460, 52):
        draw.ellipse((MAP // 2 - radius, MAP // 2 - radius, MAP // 2 + radius, MAP // 2 + radius), outline=(255, 180, 55), width=2)
    save(emissive, "energy_emissive.webp", 92)


def material_maps(material: str, prefix: str = "") -> dict[str, str]:
    maps = {
        "baseColor": f"{prefix}{material}_basecolor.webp",
        "normal": f"{prefix}{material}_normal.webp",
        "orm": f"{prefix}{material}_orm.webp",
    }
    if material == "energy":
        maps["emissive"] = f"{prefix}energy_emissive.webp"
    return maps


def write_manifest() -> None:
    manifest = {
        "version": 2,
        "ormChannels": {"r": "ambientOcclusion", "g": "roughness", "b": "metallic"},
        "profiles": {
            "hd": {
                "resolution": {"baseColor": BASE, "normal": MAP, "orm": MAP, "emissive": MAP},
                "materials": {material: material_maps(material) for material in MATERIALS},
            },
            "mobile": {
                "resolution": {"baseColor": MOBILE_BASE, "normal": MOBILE_MAP, "orm": MOBILE_MAP, "emissive": MOBILE_MAP},
                "materials": {material: material_maps(material, "mobile/") for material in MATERIALS},
            },
        },
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    make_wood()
    make_stone()
    make_metal()
    make_rubber()
    make_ceramic()
    make_energy()
    write_manifest()
    hd_count = len(list(OUT.glob("*.webp")))
    mobile_count = len(list(MOBILE.glob("*.webp")))
    print(f"Generated {hd_count} HD + {mobile_count} mobile WebP maps in {OUT}")


if __name__ == "__main__":
    main()

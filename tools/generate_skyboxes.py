#!/usr/bin/env python3
"""Generate single-image 2:1 equirectangular HappyBlocks sky panoramas."""
from __future__ import annotations

import json
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "skyboxes"
WIDTH = 2048
HEIGHT = 1024
SKIES = (
    "clear_lab",
    "sunset_foundry",
    "aurora_night",
    "deep_space",
    "stormfront",
    "neon_twilight",
)


def lerp(a: int, b: int, t: float) -> int:
    return int(a * (1 - t) + b * t)


def vertical_gradient(top: tuple[int, int, int], mid: tuple[int, int, int], bottom: tuple[int, int, int], horizon: float = 0.62) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(image)
    split = max(1, min(HEIGHT - 2, int(HEIGHT * horizon)))
    for y in range(HEIGHT):
        if y <= split:
            t = y / split
            color = tuple(lerp(top[i], mid[i], t) for i in range(3))
        else:
            t = (y - split) / max(1, HEIGHT - 1 - split)
            color = tuple(lerp(mid[i], bottom[i], t) for i in range(3))
        draw.line((0, y, WIDTH, y), fill=color)
    return image


def add_stars(image: Image.Image, seed: int, count: int, y_max: int = 760) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    rng = random.Random(seed)
    for _ in range(count):
        x = rng.randrange(WIDTH)
        y = rng.randrange(max(1, y_max))
        r = 1 if rng.random() < 0.92 else 2
        a = rng.randrange(90, 240)
        tint = rng.choice(((220, 235, 255), (255, 244, 214), (190, 226, 255)))
        draw.ellipse((x-r, y-r, x+r, y+r), fill=(*tint, a))


def periodic_clouds(image: Image.Image, seed: int, color: tuple[int, int, int], alpha: int, band: tuple[float, float], count: int, blur: float) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rng = random.Random(seed)
    y0 = int(HEIGHT * band[0]); y1 = int(HEIGHT * band[1])
    for _ in range(count):
        x = rng.randrange(-260, WIDTH + 260)
        y = rng.randrange(y0, max(y0 + 1, y1))
        rx = rng.randrange(100, 360)
        ry = rng.randrange(25, 95)
        fill = (*color, rng.randrange(max(10, alpha - 45), alpha + 1))
        for dx in (-WIDTH, 0, WIDTH):
            draw.ellipse((x-rx+dx, y-ry, x+rx+dx, y+ry), fill=fill)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    image.paste(layer, (0, 0), layer)


def sun_disc(image: Image.Image, x: int, y: int, radius: int, color: tuple[int, int, int]) -> None:
    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    for mul, alpha in ((5, 15), (3, 28), (2, 48)):
        r = radius * mul
        draw.ellipse((x-r, y-r, x+r, y+r), fill=(*color, alpha))
    draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(*color, 245))
    glow = glow.filter(ImageFilter.GaussianBlur(radius * 0.35))
    image.paste(glow, (0, 0), glow)


def skyline(image: Image.Image, seed: int, y: int, color: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(image)
    rng = random.Random(seed)
    x = 0
    while x < WIDTH:
        w = rng.randrange(18, 70)
        h = rng.randrange(20, 135)
        draw.rectangle((x, y-h, x+w, HEIGHT), fill=color)
        if h > 75 and rng.random() < .45:
            draw.rectangle((x+w//2-2, y-h-rng.randrange(12, 50), x+w//2+2, y-h), fill=color)
        x += w + rng.randrange(3, 15)


def make_clear_lab() -> Image.Image:
    image = vertical_gradient((22, 92, 155), (111, 195, 228), (204, 223, 224), .66)
    periodic_clouds(image, 1001, (246, 251, 255), 120, (.18, .62), 58, 18)
    sun_disc(image, 1540, 275, 46, (255, 246, 205))
    return image


def make_sunset_foundry() -> Image.Image:
    image = vertical_gradient((34, 27, 78), (218, 91, 78), (42, 32, 43), .68)
    periodic_clouds(image, 1002, (55, 35, 63), 125, (.22, .58), 64, 23)
    sun_disc(image, 520, 620, 42, (255, 184, 89))
    skyline(image, 77, 790, (20, 24, 29))
    return image


def make_aurora_night() -> Image.Image:
    image = vertical_gradient((3, 9, 28), (13, 38, 61), (6, 14, 23), .72)
    add_stars(image, 1003, 620, 760)
    aurora = Image.new("RGBA", image.size, (0,0,0,0))
    draw = ImageDraw.Draw(aurora)
    for band, color in enumerate(((76, 255, 204, 92), (92, 186, 255, 80), (173, 93, 255, 58))):
        pts=[]
        for x in range(-40, WIDTH+80, 30):
            phase=x/WIDTH*math.tau*2 + band*1.4
            y=300+band*62+math.sin(phase)*95+math.sin(phase*.43)*42
            pts.append((x,y))
        pts += [(WIDTH+80,650),(-40,650)]
        draw.polygon(pts, fill=color)
    aurora=aurora.filter(ImageFilter.GaussianBlur(34))
    image.paste(aurora,(0,0),aurora)
    return image


def make_deep_space() -> Image.Image:
    image = vertical_gradient((2, 4, 17), (17, 9, 39), (2, 5, 15), .68)
    add_stars(image, 1004, 1100, HEIGHT)
    nebula=Image.new("RGBA",image.size,(0,0,0,0)); draw=ImageDraw.Draw(nebula)
    rng=random.Random(1005)
    for _ in range(48):
        x=rng.randrange(-250,WIDTH+250); y=rng.randrange(140,760); rx=rng.randrange(120,420); ry=rng.randrange(35,130)
        color=rng.choice(((70,116,255,28),(202,75,255,24),(41,232,211,20)))
        for dx in (-WIDTH,0,WIDTH): draw.ellipse((x-rx+dx,y-ry,x+rx+dx,y+ry),fill=color)
    nebula=nebula.filter(ImageFilter.GaussianBlur(58)); image.paste(nebula,(0,0),nebula)
    return image


def make_stormfront() -> Image.Image:
    image=vertical_gradient((26,36,48),(74,86,91),(28,31,35),.70)
    periodic_clouds(image,1006,(42,51,59),190,(.08,.62),92,28)
    periodic_clouds(image,1007,(170,177,177),70,(.28,.72),44,24)
    draw=ImageDraw.Draw(image,"RGBA")
    draw.rectangle((0,690,WIDTH,760),fill=(204,225,225,28))
    return image


def make_neon_twilight() -> Image.Image:
    image=vertical_gradient((10,15,46),(41,94,116),(32,16,48),.70)
    glow=Image.new("RGBA",image.size,(0,0,0,0)); draw=ImageDraw.Draw(glow)
    for x in range(WIDTH):
        t=(math.sin(x/WIDTH*math.tau)+1)*.5
        color=(40+int(130*t),210-int(70*t),220+int(30*(1-t)),58)
        draw.line((x,540,x,760),fill=color)
    glow=glow.filter(ImageFilter.GaussianBlur(65)); image.paste(glow,(0,0),glow)
    periodic_clouds(image,1008,(22,20,55),100,(.28,.56),38,22)
    add_stars(image,1009,280,470)
    skyline(image,91,820,(9,16,27))
    return image


def write_manifest() -> None:
    entries = [
        {"id":"clear_lab","file":"clear_lab.webp","label":"Clear Lab","environmentIntensity":1.05},
        {"id":"sunset_foundry","file":"sunset_foundry.webp","label":"Sunset Foundry","environmentIntensity":1.15},
        {"id":"aurora_night","file":"aurora_night.webp","label":"Aurora Night","environmentIntensity":0.95},
        {"id":"deep_space","file":"deep_space.webp","label":"Deep Space","environmentIntensity":0.8},
        {"id":"stormfront","file":"stormfront.webp","label":"Stormfront","environmentIntensity":0.9},
        {"id":"neon_twilight","file":"neon_twilight.webp","label":"Neon Twilight","environmentIntensity":1.0},
    ]
    (OUT / "manifest.json").write_text(json.dumps({"version":1,"projection":"equirectangular","resolution":[WIDTH,HEIGHT],"skies":entries},indent=2)+"\n",encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    makers={
        "clear_lab":make_clear_lab,
        "sunset_foundry":make_sunset_foundry,
        "aurora_night":make_aurora_night,
        "deep_space":make_deep_space,
        "stormfront":make_stormfront,
        "neon_twilight":make_neon_twilight,
    }
    for name in SKIES:
        makers[name]().save(OUT / f"{name}.webp","WEBP",quality=90,method=4)
    write_manifest()
    print(f"Generated {len(SKIES)} equirectangular sky panoramas in {OUT}")


if __name__ == "__main__":
    main()

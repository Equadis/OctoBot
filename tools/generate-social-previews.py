#!/usr/bin/env python3
"""Generate branded Open Graph previews for every OctoBot section.

Run from the repository root: python tools/generate-social-previews.py
Requires Pillow. The source logo is docs/favicon.png.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
OUT = DOCS / "social"
OUT.mkdir(parents=True, exist_ok=True)

PREVIEWS = {
    "home": ("OctoBot", "Community tools for OctoWoW: monitoring, planning and world events."),
    "population": ("Population", "Live player counts and interactive population history across all realms."),
    "status": ("Server Status", "Monitor realm availability, connection health, uptime and incidents."),
    "sim": ("Gear Planner", "Plan equipment, talents, buffs and builds for all nine classes."),
    "outfitter": ("Dressing Room", "Create, preview, save and share outfits in a 3D character viewer."),
    "world-info": ("World Info", "Track raid activity, world buffs and Darkmoon Faire observations."),
    "auction-house": ("Auction House", "Compare auctions, historical prices, item stats and market trends."),
}
WIDTH, HEIGHT = 1200, 630
NAVY = (16, 23, 39)
PANEL = (31, 43, 59)
GOLD = (239, 206, 71)
WHITE = (233, 237, 245)
MUTED = (163, 177, 196)

def font(size, bold=False):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for path in paths:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def wrap(text, draw, face, width):
    lines, pending = [], ""
    for word in text.split():
        trial = (pending + " " + word).strip()
        if draw.textbbox((0, 0), trial, font=face)[2] <= width:
            pending = trial
        else:
            if pending:
                lines.append(pending)
            pending = word
    if pending:
        lines.append(pending)
    return lines

def render(key, title, summary):
    image = Image.new("RGB", (WIDTH, HEIGHT), NAVY)
    px = image.load()
    # Subtle radial navy-blue glow; text remains high-contrast.
    for y in range(HEIGHT):
        for x in range(WIDTH):
            proximity = max(0.0, 1.0 - math.hypot((x-995)/740, (y-295)/570))
            tint = int(28 * proximity * proximity)
            px[x, y] = (NAVY[0] + tint // 5, NAVY[1] + tint // 2, NAVY[2] + tint)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((30, 30, WIDTH-30, HEIGHT-30), radius=18, outline=(70, 78, 91), width=2)
    draw.rectangle((30, 30, 38, HEIGHT-30), fill=GOLD)
    draw.rounded_rectangle((807, 132, 1124, 449), radius=30, fill=PANEL, outline=(96, 92, 65), width=2)

    logo = Image.open(DOCS / "favicon.png").convert("RGBA")
    logo.thumbnail((276, 276), Image.Resampling.LANCZOS)
    # Preserve the transparent favicon, keeping its original appearance.
    image.paste(logo, (965-logo.width//2, 290-logo.height//2), logo)
    draw = ImageDraw.Draw(image)
    draw.text((89, 91), "OCTOBOT", font=font(29, True), fill=GOLD)
    draw.text((89, 201), title, font=font(69 if len(title)<15 else 61, True), fill=WHITE)

    subfont = font(31)
    lines = wrap(summary, draw, subfont, 675)
    for i, line in enumerate(lines[:3]):
        draw.text((91, 321+i*51), line, font=subfont, fill=MUTED)

    draw.line((90, 523, 750, 523), fill=(91, 94, 88), width=2)
    draw.text((91, 549), "INDEPENDENT OCTOWOW COMMUNITY PROJECT", font=font(18, True), fill=(150, 157, 165))
    path = OUT / f"{key}.png"
    image.save(path, "PNG", optimize=True)
    print(f"{path.relative_to(ROOT)}  {path.stat().st_size} bytes")

for key, (title, summary) in PREVIEWS.items():
    render(key, title, summary)

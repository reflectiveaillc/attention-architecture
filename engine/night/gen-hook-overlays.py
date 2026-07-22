#!/usr/bin/env python3
# Generate transparent 1080x1920 hook-text overlay PNGs (ffmpeg here has no
# drawtext filter, so text is baked as PNG and composited with overlay=).
from PIL import Image, ImageDraw, ImageFont
import os, textwrap

HOOKS = [
    "99% quit EXTREME mode",
    "this game got 10x harder",
    "EXTREME mode is basically impossible",
    "how many bars before you rage quit",
    "my record is 4 bars. beat it.",
    "the decoy words get EVERYONE",
    "tap the wrong word = instant over",
    "nobody has hit 10 bars yet",
    "the hard version. good luck.",
    "POV: normal mode was too easy",
]

OUT = os.path.join(os.path.dirname(__file__), "..", "state", "capture-work", "lsd-extreme", "hooks")
os.makedirs(OUT, exist_ok=True)
FONT = "/System/Library/Fonts/Helvetica.ttc"

for i, text in enumerate(HOOKS, 1):
    img = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, 64, index=1)  # index 1 = Helvetica Bold
    lines = textwrap.wrap(text, width=22)
    y = 330
    for line in lines:
        w = d.textlength(line, font=font)
        x = (1080 - w) / 2
        pad = 26
        d.rounded_rectangle([x - pad, y - pad + 8, x + w + pad, y + 64 + pad - 2],
                            radius=18, fill=(0, 0, 0, 165))
        d.text((x, y), line, font=font, fill=(255, 255, 255, 255))
        y += 64 + 34
    img.save(os.path.join(OUT, f"hook-{i:02d}.png"))
    print(f"hook-{i:02d}.png  {text}")

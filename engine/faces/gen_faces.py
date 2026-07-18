#!/usr/bin/env python3
"""Generate AI face expression sets for the face games' viral demo videos.

Makes ONE consistent character, then edits it into each exaggerated expression
so the demo PiP shows a real, funny human face instead of a drawn smiley.

Base (gpt-image-2 generate) -> per-expression (gpt-image-2 edit with the base as
reference, for face consistency). Output: engine/faces/<char>/<expr>.png (square,
transparent-ish plain bg, framed for the corner PiP).

usage:
  .venv/bin/python engine/faces/gen_faces.py --char zoe
"""
import base64, os, sys, argparse
from pathlib import Path
from openai import OpenAI

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "engine" / "faces"

CHARS = {
    "zoe": "a 20-something woman with a bright expressive face, warm brown skin, short curly dark hair, big animated eyes, gen-z energy",
    "leo": "a 20-something man with a very expressive rubbery face, light-medium skin, messy hair, big eyebrows, comedic energy",
}

# each expression: the exaggerated funny face for that control
EXPR = {
    "neutral":   "relaxed neutral expression, mouth closed, looking at camera",
    "mouth_open":"mouth OPENED AS WIDE AS POSSIBLE in an exaggerated gasping 'O', like gulping air, eyes wide — a ridiculous flappy-bird gasp",
    "brows_up":  "eyebrows RAISED AS HIGH AS POSSIBLE, forehead wrinkled, eyes wide in exaggerated surprise",
    "big_smile": "a HUGE forced maniacal ear-to-ear grin, all teeth, cheeks pushed up, slightly strained",
    "eyes_shut": "both eyes SQUEEZED SHUT tight in an exaggerated hard blink, rest of face neutral",
    "pucker":    "lips PUCKERED forward in an exaggerated duck-face kiss, blowing a kiss to camera",
    "cheeks":    "cheeks PUFFED OUT FULL of air like a chipmunk / blowfish, holding breath, face slightly red",
}

STYLE = ("Ultra-close head-and-shoulders selfie framing, front-facing, looking straight at the camera, "
         "even soft lighting, plain neutral studio background, photorealistic, high detail, vertical phone-selfie vibe. "
         "The face fills the frame. Slightly comedic, meme-worthy, shareable.")


def load_key():
    k = os.environ.get("OPENAI_API_KEY")
    if not k:
        sys.exit("OPENAI_API_KEY not set")
    return k


def gen_base(client, desc, out):
    r = client.images.generate(model="gpt-image-2", prompt=f"{desc}. {EXPR['neutral']}. {STYLE}",
                               size="1024x1024", quality="high", n=1)
    out.write_bytes(base64.b64decode(r.data[0].b64_json))
    print("base", out.name)


def gen_expr(client, base_path, desc, expr_key, out):
    with open(base_path, "rb") as f:
        r = client.images.edit(model="gpt-image-2", image=[f],
                               prompt=f"Keep this EXACT same person, same hair, same identity and framing. Change ONLY the expression: {EXPR[expr_key]}. {STYLE}",
                               size="1024x1024", quality="high", n=1)
    out.write_bytes(base64.b64decode(r.data[0].b64_json))
    print("  expr", expr_key)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--char", default="zoe", choices=list(CHARS))
    ap.add_argument("--only", default="", help="one expression only (for testing)")
    a = ap.parse_args()
    client = OpenAI(api_key=load_key())
    d = OUT / a.char
    d.mkdir(parents=True, exist_ok=True)
    base = d / "neutral.png"
    if not base.exists():
        gen_base(client, CHARS[a.char], base)
    exprs = [a.only] if a.only else [e for e in EXPR if e != "neutral"]
    for e in exprs:
        out = d / f"{e}.png"
        if out.exists():
            print("  skip", e); continue
        gen_expr(client, base, CHARS[a.char], e, out)
    print("done ->", d)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Public-derivative image processing for docthor.music.

For every JPEG under assets/ this script:
  1. strips ALL metadata (EXIF, Photoshop IRB, XMP, thumbnails) — nothing
     private or device-related ships in public derivatives;
  2. embeds deliberate ownership fields only: Copyright, Artist, and a
     usage contact in ImageDescription;
  3. optionally bakes in a watermark for files opted in via
     tools/watermark.conf (disabled by default).

Run from the repo root:  python3 tools/process-images.py
Requires Pillow. Note: embedded metadata is evidence, not protection —
anyone can strip it again.
"""
import glob
import os
import sys
import datetime

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YEAR = datetime.date.today().year
COPYRIGHT = f"(c) {YEAR} DOCTHOR / Leon Strohmayer. Licensing: docthormusic@gmail.com"
ARTIST = "DOCTHOR"

# EXIF tag ids
TAG_ARTIST = 0x013B
TAG_COPYRIGHT = 0x8298
TAG_DESCRIPTION = 0x010E


def read_watermark_conf():
    conf = {"text": "© DOCTHOR", "opacity": 0.14, "scale": 0.05,
            "position": "diagonal-tile", "targets": []}
    path = os.path.join(ROOT, "tools", "watermark.conf")
    if not os.path.exists(path):
        return conf
    in_targets = False
    for line in open(path):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line == "TARGETS:":
            in_targets = True
            continue
        if in_targets:
            conf["targets"].append(line)
        elif line.startswith("WATERMARK_TEXT="):
            conf["text"] = line.split("=", 1)[1]
        elif line.startswith("OPACITY="):
            conf["opacity"] = float(line.split("=", 1)[1])
        elif line.startswith("SCALE="):
            conf["scale"] = float(line.split("=", 1)[1])
        elif line.startswith("POSITION="):
            conf["position"] = line.split("=", 1)[1].strip()
    return conf


def apply_watermark(im, conf):
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    size = max(14, int(im.height * conf["scale"]))
    try:
        font = ImageFont.truetype(
            os.path.join(ROOT, "assets", "fonts", "ibm-plex-mono-500-latin.woff2"), size)
    except Exception:
        font = ImageFont.load_default()
    alpha = int(255 * conf["opacity"])
    text = conf["text"]
    if conf["position"] == "diagonal-tile":
        step_x = size * len(text)
        step_y = size * 6
        for y in range(-im.height, im.height * 2, step_y):
            for x in range(-im.width, im.width * 2, step_x):
                draw.text((x, y), text, font=font, fill=(255, 255, 255, alpha))
        overlay = overlay.rotate(30, center=(im.width // 2, im.height // 2))
    else:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        pos = {"bottom-right": (im.width - tw - 24, im.height - th - 24),
               "center": ((im.width - tw) // 2, (im.height - th) // 2)}.get(
                   conf["position"], (24, 24))
        draw.text(pos, text, font=font, fill=(255, 255, 255, alpha))
    return Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")


def main():
    conf = read_watermark_conf()
    jpgs = sorted(glob.glob(os.path.join(ROOT, "assets", "**", "*.jpg"), recursive=True))
    changed = 0
    for path in jpgs:
        rel = os.path.relpath(path, ROOT)
        im = Image.open(path)
        im.load()
        had_meta = bool(im.getexif()) or "photoshop" in im.info or "xmp" in im.info
        clean = Image.new(im.mode, im.size)
        clean.putdata(list(im.getdata()))  # pixels only — all metadata gone
        if rel in conf["targets"]:
            clean = apply_watermark(clean, conf)
            print(f"  watermarked: {rel}")
        exif = Image.Exif()
        exif[TAG_ARTIST] = ARTIST
        exif[TAG_COPYRIGHT] = COPYRIGHT
        exif[TAG_DESCRIPTION] = COPYRIGHT
        clean.save(path, "JPEG", quality=85, optimize=True, exif=exif)
        changed += 1
        print(f"processed: {rel} (metadata stripped{', had prior metadata' if had_meta else ''}, ownership EXIF added)")
    print(f"\n{changed} JPEGs processed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

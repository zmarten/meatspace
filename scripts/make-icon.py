"""Generate a 400x400 brand icon for MeatSpace at public/icon.png.

Run: python scripts/make-icon.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Brand palette (from src/app/globals.css)
BG = (8, 11, 15)          # #080b0f
BORDER = (30, 37, 48)     # #1e2530
ACCENT = (232, 160, 32)   # #e8a020
TEXT = (240, 242, 245)    # #f0f2f5

SIZE = 400


def main() -> None:
    out = Path(__file__).resolve().parent.parent / "public" / "icon.png"
    out.parent.mkdir(parents=True, exist_ok=True)

    img = Image.new("RGB", (SIZE, SIZE), BG)
    draw = ImageDraw.Draw(img)

    # Outer rounded frame
    pad = 24
    draw.rounded_rectangle(
        (pad, pad, SIZE - pad, SIZE - pad),
        radius=18,
        outline=BORDER,
        width=3,
    )

    # Subtle dot grid (PCB substrate vibe, like the site)
    spacing = 16
    for x in range(spacing * 2, SIZE - spacing * 2 + 1, spacing):
        for y in range(spacing * 2, SIZE - spacing * 2 + 1, spacing):
            draw.ellipse((x - 1, y - 1, x + 1, y + 1), fill=(168, 189, 212, 14))

    # MS wordmark, big
    font_path = "C:/Windows/Fonts/consolab.ttf"
    big = ImageFont.truetype(font_path, 180)
    label = "MS"
    bbox = draw.textbbox((0, 0), label, font=big)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (SIZE - tw) // 2 - bbox[0]
    ty = (SIZE - th) // 2 - bbox[1] - 16
    draw.text((tx, ty), label, fill=ACCENT, font=big)

    # Pulse dot above
    cx, cy = SIZE // 2, 90
    draw.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=ACCENT)
    draw.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), outline=ACCENT, width=1)

    # Wordmark MEATSPACE below MS
    small = ImageFont.truetype(font_path, 22)
    word = "MEATSPACE"
    bbox = draw.textbbox((0, 0), word, font=small)
    ww = bbox[2] - bbox[0]
    wx = (SIZE - ww) // 2 - bbox[0]
    draw.text((wx, SIZE - 96), word, fill=TEXT, font=small)

    # Tagline
    tag_font = ImageFont.truetype(font_path, 14)
    tag = "HUMAN-IN-THE-LOOP"
    bbox = draw.textbbox((0, 0), tag, font=tag_font)
    tgw = bbox[2] - bbox[0]
    tgx = (SIZE - tgw) // 2 - bbox[0]
    draw.text((tgx, SIZE - 64), tag, fill=(120, 132, 152), font=tag_font)

    img.save(out, "PNG", optimize=True)
    print(f"Wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()

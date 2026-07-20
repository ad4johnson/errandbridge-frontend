#!/usr/bin/env python3
"""Export App Store screenshot sizes from source images.

Why this exists:
- App Store Connect (and ad platforms) can be picky about exact pixel sizes.
- This script generates exact iPhone screenshot dimensions via a center "cover" crop.

Outputs:
- Writes resized/cropped PNGs into the output directory.

Usage:
  python3 scripts/export-appstore-screenshots.py --in path/to/screenshots --out appstore-out

Optional:
  --formats 1242x2688 2688x1242 1284x2778 2778x1284
  --ext png

Dependencies:
  pip install pillow
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


@dataclass(frozen=True)
class Size:
    w: int
    h: int

    @staticmethod
    def parse(s: str) -> "Size":
        try:
            w_str, h_str = s.lower().split("x", 1)
            w, h = int(w_str), int(h_str)
            if w <= 0 or h <= 0:
                raise ValueError
            return Size(w=w, h=h)
        except Exception as e:
            raise argparse.ArgumentTypeError(f"Invalid size '{s}'. Expected e.g. 1242x2688") from e


def cover_resize(im: Image.Image, out_size: Size) -> Image.Image:
    """Resize image to cover out_size, then center-crop."""
    src_w, src_h = im.size
    target_w, target_h = out_size.w, out_size.h

    # Scale factor to cover
    scale = max(target_w / src_w, target_h / src_h)
    new_w = int(round(src_w * scale))
    new_h = int(round(src_h * scale))

    resized = im.resize((new_w, new_h), resample=Image.LANCZOS)

    # Center crop
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    right = left + target_w
    bottom = top + target_h

    return resized.crop((left, top, right, bottom))


def contain_resize(im: Image.Image, out_size: Size, background: tuple[int, int, int, int]) -> Image.Image:
    """Resize image to fit within out_size, then center-pad (no cropping)."""
    src_w, src_h = im.size
    target_w, target_h = out_size.w, out_size.h

    scale = min(target_w / src_w, target_h / src_h)
    new_w = int(round(src_w * scale))
    new_h = int(round(src_h * scale))

    resized = im.resize((new_w, new_h), resample=Image.LANCZOS)
    canvas = Image.new("RGBA", (target_w, target_h), color=background)

    left = (target_w - new_w) // 2
    top = (target_h - new_h) // 2
    canvas.paste(resized, (left, top))
    return canvas


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="in_dir", required=True, help="Input directory of screenshots")
    parser.add_argument("--out", dest="out_dir", required=True, help="Output directory")
    parser.add_argument(
        "--formats",
        nargs="*",
        type=Size.parse,
        default=[Size(1242, 2688), Size(2688, 1242), Size(1284, 2778), Size(2778, 1284)],
        help="List of WxH sizes to export",
    )
    parser.add_argument(
        "--mode",
        choices=["cover", "contain"],
        default="cover",
        help="Resize mode: 'cover' crops to fill; 'contain' pads to avoid cropping.",
    )
    parser.add_argument(
        "--background",
        default="#FFFFFF",
        help="Background color for contain mode (hex), e.g. #FFFFFF or #000000.",
    )
    parser.add_argument("--ext", default="png", choices=["png", "jpg", "jpeg"], help="Output extension")
    parser.add_argument(
        "--glob",
        default="*.png",
        help="Glob pattern for inputs (default: *.png). You can use '*.jpg' too.",
    )

    args = parser.parse_args()

    bg = args.background.strip()
    if not (bg.startswith("#") and len(bg) in (7, 9)):
        raise SystemExit("--background must be hex like #RRGGBB or #RRGGBBAA")
    r = int(bg[1:3], 16)
    g = int(bg[3:5], 16)
    b = int(bg[5:7], 16)
    a = int(bg[7:9], 16) if len(bg) == 9 else 255
    background = (r, g, b, a)

    in_dir = Path(args.in_dir).expanduser().resolve()
    out_dir = Path(args.out_dir).expanduser().resolve()

    if not in_dir.exists() or not in_dir.is_dir():
        raise SystemExit(f"Input directory not found: {in_dir}")

    out_dir.mkdir(parents=True, exist_ok=True)

    inputs = sorted(in_dir.glob(args.glob))
    if not inputs:
        raise SystemExit(f"No inputs found in {in_dir} for glob '{args.glob}'")

    for src_path in inputs:
        with Image.open(src_path) as im:
            im = im.convert("RGBA")
            base = src_path.stem

            for size in args.formats:
                if args.mode == "contain":
                    out_im = contain_resize(im, size, background=background)
                else:
                    out_im = cover_resize(im, size)
                out_name = f"{base}_{size.w}x{size.h}.{args.ext}"
                out_path = out_dir / out_name
                if args.ext in ("jpg", "jpeg"):
                    out_im = out_im.convert("RGB")
                    out_im.save(out_path, quality=95)
                else:
                    out_im.save(out_path, optimize=True)

                print(f"Wrote {out_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

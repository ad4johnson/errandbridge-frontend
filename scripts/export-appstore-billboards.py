#!/usr/bin/env python3
"""Export Apple-style "billboard" screenshots for App Store Connect.

Instead of uploading raw UI captures, this script generates composed images with:
- A top header area (big headline + optional subtext)
- Your app screenshot placed below (never covered by text)
- Exact output pixel sizes required by App Store Connect

Typical usage:
  python3 scripts/export-appstore-billboards.py \
    --in appstore/screenshots/source \
    --out appstore/screenshots/out \
    --preset errandbridge-v1

Dependencies:
  pip install pillow

Notes:
- Best results come from source screenshots matching the target orientation.
- This script intentionally does NOT attempt to auto-crop away device frames.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except Exception as e:  # pragma: no cover
    raise SystemExit(
        "Missing dependency: Pillow. Install with 'pip install pillow' (or use a venv)."
    ) from e


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


@dataclass(frozen=True)
class ScreenSpec:
    key: str
    # One filename or a pipe-delimited list of fallback filenames, e.g. "review.png|step3.png".
    input_name: str
    headline: str
    subtext: str | None = None
    # Optional orientation-specific inputs. If set, portrait/landscape outputs will prefer these.
    input_portrait: str | None = None
    input_landscape: str | None = None


ERRANDBRIDGE_V1: list[ScreenSpec] = [
    ScreenSpec(
        key="01-hero",
        input_name="hero.png|step1.png",
        input_portrait="hero-portrait.png|hero.png|step1.png",
        input_landscape="hero-landscape.png|hero.png|step1.png",
        headline="Get things done back home",
        subtext="Send errands in minutes. Track progress and receive proof.",
    ),
    ScreenSpec(
        key="02-create",
        input_name="create.png|step2.png",
        input_portrait="create-portrait.png|create.png|step2.png",
        input_landscape="create-landscape.png|create.png|step2.png",
        headline="Describe your errand fast",
        subtext="Tell us what you need - we handle the rest.",
    ),
    ScreenSpec(
        key="03-locations",
        input_name="locations.png|step3-locations.png",
        input_portrait="locations-portrait.png|locations.png|step3-locations.png",
        input_landscape="locations-landscape.png|locations.png|step3-locations.png",
        headline="Set pickup & delivery locations",
        subtext="We handle logistics and coordination.",
    ),
    ScreenSpec(
        key="04-review",
        input_name="review.png|step3.png",
        input_portrait="review-portrait.png|review.png|step3.png",
        input_landscape="review-landscape.png|review.png|step3.png",
        headline="Review before you confirm",
        subtext="Clear pricing. Full visibility before payment.",
    ),
    ScreenSpec(
        key="05-payment",
        input_name="payment.png|step4.png",
        input_portrait="payment-portrait.png|payment.png|step4.png",
        input_landscape="payment-landscape.png|payment.png|step4.png",
        headline="Secure payment, zero surprises",
        subtext="Pay safely and receive verified proof on completion.",
    ),
]

 # Current repo state: step3=review and step4=payment already exist in source/.
 # Hero/Create/Locations can be added later using the preferred names above.


def _parse_hex_rgba(s: str) -> tuple[int, int, int, int]:
    s = s.strip()
    if not (s.startswith("#") and len(s) in (7, 9)):
        raise ValueError("Expected hex like #RRGGBB or #RRGGBBAA")
    r = int(s[1:3], 16)
    g = int(s[3:5], 16)
    b = int(s[5:7], 16)
    a = int(s[7:9], 16) if len(s) == 9 else 255
    return (r, g, b, a)


def _clamp(n: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, n))


def _linear_gradient(size: Size, top: tuple[int, int, int, int], bottom: tuple[int, int, int, int]) -> Image.Image:
    """Create a vertical linear RGBA gradient."""
    w, h = size.w, size.h
    base = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)

    tr, tg, tb, ta = top
    br, bg, bb, ba = bottom

    for y in range(h):
        t = y / max(1, (h - 1))
        r = int(round(tr + (br - tr) * t))
        g = int(round(tg + (bg - tg) * t))
        b = int(round(tb + (bb - tb) * t))
        a = int(round(ta + (ba - ta) * t))
        draw.line([(0, y), (w, y)], fill=(r, g, b, a))

    return base


def _find_font(preferred_names: Iterable[str], size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Try common fonts; fall back to PIL default."""
    for name in preferred_names:
        try:
            return ImageFont.truetype(name, size=size)
        except Exception:
            continue

    # Pillow usually bundles DejaVu; try that even if not on PATH.
    for name in ("DejaVuSans-Bold.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size=size)
        except Exception:
            continue

    return ImageFont.load_default()


def _wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
    max_lines: int,
) -> list[str]:
    """Word-wrap text into up to max_lines.

    If wrapping truncates content, the last line is ellipsized.
    """
    words = [w for w in text.split() if w]
    if not words:
        return []

    lines: list[str] = []
    current: list[str] = []
    used_words = 0

    for i, word in enumerate(words):
        trial = (" ".join(current + [word])).strip()
        if not trial:
            continue

        if draw.textlength(trial, font=font) <= max_width or not current:
            current.append(word)
            continue

        # Commit current line and start a new one with this word.
        lines.append(" ".join(current))
        used_words = i
        current = [word]

        if len(lines) >= max_lines:
            break

    if len(lines) < max_lines and current:
        lines.append(" ".join(current))
        used_words = len(words)

    truncated = used_words < len(words)
    if truncated and lines:
        last = lines[-1]
        # Ensure ellipsis fits.
        while last and draw.textlength(last + "…", font=font) > max_width:
            last = last[:-1]
        lines[-1] = (last.rstrip() + "…") if last else "…"

    # Safety: never exceed max_lines.
    return lines[:max_lines]


def _text_block_height(font: ImageFont.ImageFont, lines: list[str], line_spacing: float) -> int:
    if not lines:
        return 0
    ascent, descent = font.getmetrics() if hasattr(font, "getmetrics") else (font.size, 0)
    line_h = int(round((ascent + descent) * line_spacing))
    return line_h * len(lines)


def _add_shadow(im: Image.Image, radius: int, opacity: int, offset: tuple[int, int]) -> Image.Image:
    """Return a new image with a soft drop shadow behind im."""
    w, h = im.size
    ox, oy = offset

    shadow_w = w + radius * 4 + abs(ox)
    shadow_h = h + radius * 4 + abs(oy)

    shadow = Image.new("RGBA", (shadow_w, shadow_h), (0, 0, 0, 0))
    shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, opacity))

    sx = radius * 2 + max(ox, 0)
    sy = radius * 2 + max(oy, 0)
    shadow.paste(shadow_layer, (sx, sy))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=radius))

    out = Image.new("RGBA", (shadow_w, shadow_h), (0, 0, 0, 0))
    out.alpha_composite(shadow)

    ix = radius * 2 + max(-ox, 0)
    iy = radius * 2 + max(-oy, 0)
    out.alpha_composite(im, (ix, iy))
    return out


def _contain_resize(im: Image.Image, max_w: int, max_h: int) -> Image.Image:
    src_w, src_h = im.size
    if src_w <= 0 or src_h <= 0:
        raise ValueError("Invalid source image")

    scale = min(max_w / src_w, max_h / src_h)
    new_w = max(1, int(round(src_w * scale)))
    new_h = max(1, int(round(src_h * scale)))
    return im.resize((new_w, new_h), resample=Image.LANCZOS)


def compose_billboard(
    screenshot: Image.Image,
    out_size: Size,
    headline: str,
    subtext: str | None,
    *,
    gradient_top: tuple[int, int, int, int],
    gradient_bottom: tuple[int, int, int, int],
    headline_px: int | None = None,
    subtext_px: int | None = None,
    top_pad_px: int | None = None,
    side_pad_px: int | None = None,
    bottom_pad_px: int | None = None,
    tilt_deg: float | None = None,
    phone_offset_px: int | None = None,
) -> Image.Image:
    """Compose billboard image at exact out_size."""
    canvas = _linear_gradient(out_size, top=gradient_top, bottom=gradient_bottom)
    draw = ImageDraw.Draw(canvas)

    # Global design system (consistent across all exports):
    # - Side padding: 64px
    # - Top padding: 80–100px (default 92px)
    # - Bottom padding: 60px
    side_pad = side_pad_px if side_pad_px is not None else 64
    top_pad = top_pad_px if top_pad_px is not None else 92
    bottom_pad = bottom_pad_px if bottom_pad_px is not None else 60

    # Typography system:
    # - Headline: 64–72px, bold, line-height 1.05, max 2–3 lines
    # - Subtext: 28–32px, soft grey, max 1–2 lines
    headline_size = headline_px if headline_px is not None else _clamp(int(round(out_size.w * 0.055)), 64, 72)
    subtext_size = subtext_px if subtext_px is not None else _clamp(int(round(out_size.w * 0.025)), 28, 32)

    headline_font = _find_font(
        preferred_names=(
            "SF Pro Display Bold",
            "SFProDisplay-Bold",
            "HelveticaNeue-Bold",
            "Helvetica Bold",
            "Arial Bold",
            "DejaVuSans-Bold.ttf",
        ),
        size=headline_size,
    )
    subtext_font = _find_font(
        preferred_names=(
            "SF Pro Display Regular",
            "SFProDisplay-Regular",
            "HelveticaNeue",
            "Helvetica",
            "Arial",
            "DejaVuSans.ttf",
        ),
        size=subtext_size,
    )

    headline_color = (15, 23, 42, 255)  # #0F172A
    subtext_color = (107, 114, 128, 255)  # #6B7280

    max_text_w = out_size.w - side_pad * 2
    headline_lines = _wrap_text(draw, headline, headline_font, max_text_w, max_lines=3)
    subtext_lines: list[str] = []
    if subtext:
        subtext_lines = _wrap_text(draw, subtext, subtext_font, max_text_w, max_lines=2)

    headline_line_height = 1.05
    subtext_line_height = 1.20
    headline_h = _text_block_height(headline_font, headline_lines, line_spacing=headline_line_height)
    subtext_h = _text_block_height(subtext_font, subtext_lines, line_spacing=subtext_line_height)

    gap_h = 18
    header_bottom_gap = 34

    text_total_h = headline_h + (gap_h if subtext_lines else 0) + subtext_h

    # Draw headline
    y = top_pad
    ascent_h, descent_h = headline_font.getmetrics() if hasattr(headline_font, "getmetrics") else (headline_font.size, 0)
    line_h_head = int(round((ascent_h + descent_h) * headline_line_height))
    for line in headline_lines:
        draw.text((side_pad, y), line, font=headline_font, fill=headline_color)
        y += line_h_head

    if subtext_lines:
        y += gap_h
        ascent_s, descent_s = subtext_font.getmetrics() if hasattr(subtext_font, "getmetrics") else (subtext_font.size, 0)
        line_h_sub = int(round((ascent_s + descent_s) * subtext_line_height))
        for line in subtext_lines:
            draw.text((side_pad, y), line, font=subtext_font, fill=subtext_color)
            y += line_h_sub

    content_top = top_pad + text_total_h + header_bottom_gap

    # Place screenshot below header; keep everything visible
    screenshot = screenshot.convert("RGBA")

    max_w = out_size.w - side_pad * 2
    max_h = out_size.h - content_top - bottom_pad
    if max_h < 50:
        # Fallback: if text used too much space (rare), just set a minimum
        content_top = int(round(out_size.h * 0.26))
        max_h = out_size.h - content_top - bottom_pad

    shot = _contain_resize(screenshot, max_w=max_w, max_h=max_h)

    # Optional slight tilt to mimic a phone mockup.
    if tilt_deg and abs(float(tilt_deg)) > 0.01:
        try:
            shot = shot.rotate(float(tilt_deg), resample=Image.BICUBIC, expand=True, fillcolor=(0, 0, 0, 0))
        except TypeError:
            # Older Pillow without fillcolor
            shot = shot.rotate(float(tilt_deg), resample=Image.BICUBIC, expand=True)

    # Add soft shadow around the screenshot so it reads as a "card" on the gradient
    shadow_radius = _clamp(int(round(out_size.w * 0.010)), 8, 40)
    shadow_opacity = 70
    shot_with_shadow = _add_shadow(shot, radius=shadow_radius, opacity=shadow_opacity, offset=(0, int(round(shadow_radius * 0.5))))

    # Center horizontally and center within the remaining vertical space.
    x = (out_size.w - shot_with_shadow.size[0]) // 2
    available_h = out_size.h - content_top - bottom_pad
    base_y = content_top + max(0, (available_h - shot_with_shadow.size[1]) // 2)
    default_offset = int(round(out_size.h * 0.015))
    y_shot = base_y + (phone_offset_px if phone_offset_px is not None else default_offset)
    if y_shot + shot_with_shadow.size[1] > out_size.h - bottom_pad:
        y_shot = out_size.h - bottom_pad - shot_with_shadow.size[1]
    y_shot = max(content_top, y_shot)

    canvas.alpha_composite(shot_with_shadow, (x, y_shot))
    return canvas


def _load_manifest(path: Path) -> list[ScreenSpec]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise SystemExit("Manifest must be a JSON object")

    screens = raw.get("screens")
    if not isinstance(screens, list) or not screens:
        raise SystemExit("Manifest must contain a non-empty 'screens' array")

    specs: list[ScreenSpec] = []
    for i, item in enumerate(screens):
        if not isinstance(item, dict):
            raise SystemExit(f"screens[{i}] must be an object")
        key = str(item.get("key") or "").strip()
        input_name = str(item.get("input") or "").strip()
        input_portrait = str(item.get("input_portrait") or item.get("inputPortrait") or "").strip() or None
        input_landscape = str(item.get("input_landscape") or item.get("inputLandscape") or "").strip() or None
        headline = str(item.get("headline") or "").strip()
        subtext = item.get("subtext")
        subtext_s = str(subtext).strip() if subtext is not None else None

        if not key or not input_name or not headline:
            raise SystemExit(f"screens[{i}] requires key, input, headline")

        specs.append(
            ScreenSpec(
                key=key,
                input_name=input_name,
                input_portrait=input_portrait,
                input_landscape=input_landscape,
                headline=headline,
                subtext=subtext_s or None,
            )
        )

    return specs


def _resolve_input(in_dir: Path, input_name: str) -> Path:
    """Resolve a possibly pipe-delimited list of candidate filenames."""
    candidates = [c.strip() for c in input_name.split("|") if c.strip()]
    for c in candidates:
        p = (in_dir / c).resolve()
        if p.exists():
            return p
    # Return the first candidate path for error messages.
    return (in_dir / (candidates[0] if candidates else input_name)).resolve()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="in_dir", required=True, help="Input directory of raw screenshots")
    parser.add_argument("--out", dest="out_dir", required=True, help="Output directory")

    parser.add_argument(
        "--formats",
        nargs="*",
        type=Size.parse,
        default=[Size(1242, 2688), Size(2688, 1242), Size(1284, 2778), Size(2778, 1284)],
        help="List of WxH sizes to export",
    )

    parser.add_argument(
        "--preset",
        choices=["errandbridge-v1"],
        default="errandbridge-v1",
        help="Predefined headline set.",
    )
    parser.add_argument(
        "--manifest",
        default="",
        help="Optional JSON manifest to override preset mapping. Example format: { 'screens': [ {key,input,headline,subtext} ] }",
    )

    parser.add_argument(
        "--bg-top",
        default="#FFFFFF",
        help="Gradient top color (hex).",
    )
    parser.add_argument(
        "--bg-bottom",
        default="#F3F7FF",
        help="Gradient bottom color (hex).",
    )

    parser.add_argument(
        "--headline-px",
        type=int,
        default=0,
        help="Override headline font size in pixels (optional).",
    )
    parser.add_argument(
        "--subtext-px",
        type=int,
        default=0,
        help="Override subtext font size in pixels (optional).",
    )
    parser.add_argument(
        "--top-pad-px",
        type=int,
        default=0,
        help="Override top padding in pixels (optional).",
    )
    parser.add_argument(
        "--side-pad-px",
        type=int,
        default=0,
        help="Override side padding in pixels (optional).",
    )

    parser.add_argument(
        "--bottom-pad-px",
        type=int,
        default=0,
        help="Override bottom padding in pixels (optional).",
    )

    parser.add_argument(
        "--tilt-deg",
        type=float,
        default=0.0,
        help="Optional slight tilt applied to the screenshot (e.g. 0, 1.5, -1.5).",
    )

    parser.add_argument(
        "--phone-offset-px",
        type=int,
        default=0,
        help="Optional extra downward offset for the phone image in pixels.",
    )

    parser.add_argument("--ext", default="png", choices=["png", "jpg", "jpeg"], help="Output extension")

    args = parser.parse_args()

    in_dir = Path(args.in_dir).expanduser().resolve()
    out_dir = Path(args.out_dir).expanduser().resolve()

    if not in_dir.exists() or not in_dir.is_dir():
        raise SystemExit(f"Input directory not found: {in_dir}")

    out_dir.mkdir(parents=True, exist_ok=True)

    if args.manifest:
        specs = _load_manifest(Path(args.manifest).expanduser().resolve())
    else:
        specs = list(ERRANDBRIDGE_V1)

    bg_top = _parse_hex_rgba(args.bg_top)
    bg_bottom = _parse_hex_rgba(args.bg_bottom)

    headline_px = args.headline_px if args.headline_px and args.headline_px > 0 else None
    subtext_px = args.subtext_px if args.subtext_px and args.subtext_px > 0 else None
    top_pad_px = args.top_pad_px if args.top_pad_px and args.top_pad_px > 0 else None
    side_pad_px = args.side_pad_px if args.side_pad_px and args.side_pad_px > 0 else None
    bottom_pad_px = args.bottom_pad_px if args.bottom_pad_px and args.bottom_pad_px > 0 else None
    tilt_deg = args.tilt_deg if args.tilt_deg and abs(args.tilt_deg) > 0.01 else None
    phone_offset_px = args.phone_offset_px if args.phone_offset_px and args.phone_offset_px != 0 else None

    wrote_any = False

    for spec in specs:
        for size in args.formats:
            is_portrait = size.h >= size.w
            preferred_input = (
                spec.input_portrait if (is_portrait and spec.input_portrait) else
                spec.input_landscape if ((not is_portrait) and spec.input_landscape) else
                spec.input_name
            )

            src_path = _resolve_input(in_dir, preferred_input)
            if not src_path.exists():
                # Fall back to generic input if orientation-specific wasn't found
                if preferred_input != spec.input_name:
                    src_path = _resolve_input(in_dir, spec.input_name)
                if not src_path.exists():
                    print(f"Skipping {spec.key} ({size.w}x{size.h}): missing input {src_path.name}")
                    continue

            with Image.open(src_path) as im:
                im = im.convert("RGBA")

                out_im = compose_billboard(
                    screenshot=im,
                    out_size=size,
                    headline=spec.headline,
                    subtext=spec.subtext,
                    gradient_top=bg_top,
                    gradient_bottom=bg_bottom,
                    headline_px=headline_px,
                    subtext_px=subtext_px,
                    top_pad_px=top_pad_px,
                    side_pad_px=side_pad_px,
                    bottom_pad_px=bottom_pad_px,
                    tilt_deg=tilt_deg,
                    phone_offset_px=phone_offset_px,
                )

                out_name = f"{spec.key}_{size.w}x{size.h}.{args.ext}"
                out_path = out_dir / out_name

                if args.ext in ("jpg", "jpeg"):
                    out_im = out_im.convert("RGB")
                    out_im.save(out_path, quality=95)
                else:
                    out_im.save(out_path, optimize=True)

                wrote_any = True
                print(f"Wrote {out_path}")

    if not wrote_any:
        raise SystemExit(
            "No outputs written. Ensure your source images exist in the input directory, e.g. step3.png, step4.png."
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

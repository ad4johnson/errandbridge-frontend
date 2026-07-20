from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path

from PIL import Image
from PIL import ImageEnhance
from PIL import ImageFilter


def resize_cover_center_crop(im: Image.Image, target_w: int, target_h: int) -> Image.Image:
    src_w, src_h = im.size
    scale = max(target_w / src_w, target_h / src_h)
    new_w = int(round(src_w * scale))
    new_h = int(round(src_h * scale))

    if (new_w, new_h) != (src_w, src_h):
        im = im.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)

    left = int(round((new_w - target_w) / 2))
    top = int(round((new_h - target_h) / 2))
    right = left + target_w
    bottom = top + target_h

    return im.crop((left, top, right, bottom))


def resize_contain(im: Image.Image, max_w: int, max_h: int) -> Image.Image:
    src_w, src_h = im.size
    scale = min(max_w / src_w, max_h / src_h)
    new_w = max(1, int(round(src_w * scale)))
    new_h = max(1, int(round(src_h * scale)))
    if (new_w, new_h) == (src_w, src_h):
        return im
    return im.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)


def place_on_blurred_background(
    im: Image.Image,
    target_w: int,
    target_h: int,
    *,
    padding: int = 96,
    blur_radius: int = 26,
) -> Image.Image:
    """Fit `im` into target size and pad the rest with a blurred cover background.

    This avoids cropping away content when converting portrait screenshots into
    landscape App Store sizes.
    """
    src = im.convert("RGBA")

    bg = resize_cover_center_crop(src, target_w, target_h)
    bg = bg.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    bg = ImageEnhance.Brightness(bg).enhance(0.92)
    bg = ImageEnhance.Color(bg).enhance(0.92)

    # Add a subtle dark wash for text/icon contrast.
    wash = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 46))
    bg = Image.alpha_composite(bg, wash)

    # Foreground (contained) + soft shadow.
    fg = resize_contain(src, target_w - 2 * padding, target_h - 2 * padding)
    fg_w, fg_h = fg.size

    x = int(round((target_w - fg_w) / 2))
    y = int(round((target_h - fg_h) / 2))

    # Shadow using alpha channel if present (otherwise it will still work, just a rectangle).
    shadow = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    try:
        alpha = fg.split()[-1]
    except Exception:
        alpha = None
    shadow_color = Image.new("RGBA", fg.size, (0, 0, 0, 120))
    if alpha is not None:
        shadow.paste(shadow_color, (x, y + 10), mask=alpha)
    else:
        shadow.paste(shadow_color, (x, y + 10))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=18))

    composed = Image.alpha_composite(bg, shadow)
    composed.paste(fg, (x, y), mask=alpha if alpha is not None else None)
    return composed


def main() -> int:
    # App Store Connect accepted sizes for iPhone 6.7" screenshots:
    # - portrait: 1284 x 2778
    # - landscape: 2778 x 1284
    src_dir = Path(__file__).resolve().parents[1] / "appstore" / "screenshots" / "out"
    target_w, target_h = (2778, 1284)

    if not src_dir.exists():
        raise SystemExit(f"Missing directory: {src_dir}")

    img_paths = sorted(
        [
            p
            for p in src_dir.iterdir()
            if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg"}
        ]
    )

    if not img_paths:
        raise SystemExit(f"No images found in {src_dir}")

    backup_dir = src_dir.parent / f"out_original_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{target_w}x{target_h}"
    backup_dir.mkdir(parents=True, exist_ok=False)

    for p in img_paths:
        shutil.copy2(p, backup_dir / p.name)

    changes: list[tuple[str, tuple[int, int], tuple[int, int]]] = []

    for path in img_paths:
        with Image.open(path) as im:
            im.load()
            src_size = im.size

            # Force the App Store Connect target size (landscape), while preserving
            # the original screenshot (often portrait) by fitting it inside.
            out = place_on_blurred_background(im, target_w, target_h)

            if path.suffix.lower() in {".jpg", ".jpeg"}:
                out = out.convert("RGB")
                out.save(path, format="JPEG", quality=95, optimize=True)
            else:
                out.save(path, format="PNG", optimize=True)

            changes.append((path.name, src_size, (target_w, target_h)))

    print(f"Backed up originals to: {backup_dir}")
    print("Resized:")
    for name, src_size, tgt in changes:
        print(f"- {name}: {src_size[0]}x{src_size[1]} -> {tgt[0]}x{tgt[1]}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

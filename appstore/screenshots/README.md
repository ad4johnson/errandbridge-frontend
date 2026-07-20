# App Store screenshots

Drop **source** screenshots into `errandbridge-frontend/appstore/screenshots/source/` and export **App Store Connect exact pixel sizes**.

Apple generally expects *designed* screenshots (marketing style), not raw UI captures.
This repo supports both:
- **Billboard exports (recommended):** big headline + optional subtext above the app UI.
- **Raw exports:** just resize/crop your original captures.

## Accepted iPhone sizes (common)
- 1242×2688 (portrait) / 2688×1242 (landscape)
- 1284×2778 (portrait) / 2778×1284 (landscape)

## Export
The helper script will generate exact sizes into `out/`.

### ✅ Recommended: Billboard (headline + subtext above UI)
This creates a top header area for your copy and places the app screenshot below it (so text never covers important UI).

Design defaults match the common App Store “mini billboard” guidance:
- Left/right padding: **64px**
- Top padding: **~92px** (target range: 80–100px)
- Bottom padding: **60px**
- Headline: **64–72px** (bold), line-height **1.05**, max **2–3 lines**
- Subtext: **28–32px** in soft grey (≈ `#6B7280`)
- Background: **white → soft blue** gradient (consistent)
- Text placed in the **top header only**; app UI is placed below.

1) Put your five screenshots into `source/` with these names:
- `hero.png`
- `create.png`
- `locations.png`
- `review.png`
- `payment.png`

2) Export billboard outputs:
- `python3 scripts/export-appstore-billboards.py --in appstore/screenshots/source --out appstore/screenshots/out --manifest appstore/screenshots/manifest.errandbridge.v1.json`

Optional tweaks:
- Slight phone tilt: `--tilt-deg 1.5`
- Extra downward phone offset: `--phone-offset-px 24`

If you're using the current repo's existing filenames (`step3.png`, `step4.png`), you can run the preset (it will export whatever inputs exist and skip missing ones):
- `python3 scripts/export-appstore-billboards.py --in appstore/screenshots/source --out appstore/screenshots/out --preset errandbridge-v1`

### Cover (default, center crop)
- Fills the target size and crops edges if needed.

### Contain (no crop, letterbox)
- Fits the entire image and pads with a background color.

## Example
1) Put a PNG screenshot in:
- `errandbridge-frontend/appstore/screenshots/source/hero.png`

2) Export:
- `python3 scripts/export-appstore-screenshots.py --in appstore/screenshots/source --out appstore/screenshots/out`

Contain mode (white background):
- `python3 scripts/export-appstore-screenshots.py --in appstore/screenshots/source --out appstore/screenshots/out --mode contain --background #FFFFFF`

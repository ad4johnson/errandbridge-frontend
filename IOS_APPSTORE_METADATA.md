# App Store Connect metadata checklist

Use this for ErrandBridge’s first App Store release.

## App information
- **Name:** ErrandBridge
- **Bundle ID:** com.errandbridge.app
- **SKU:** errandbridge-ios
- **Primary language:** English (UK)
- **Category:** Business (or Productivity)

## Pricing
- Set to free (or your pricing tier)

## Version information
- **Version:** 1.0
- **Release notes:** see below

## Review information
- Contact name, phone, and email
- Demo account (if reviewers need access)

## App privacy
- Complete App Privacy questionnaire
- Provide Privacy Policy URL

## Screenshots
- iPhone screenshots must match one of Apple’s accepted device pixel sizes exactly.

	Common accepted sizes (portrait + landscape):
	- 6.5" iPhone: **1242×2688** (portrait) / **2688×1242** (landscape)
	- 6.7" iPhone (older Pro Max / Plus class): **1284×2778** (portrait) / **2778×1284** (landscape)

	Notes:
	- App Store Connect typically expects **all screenshots for a given device size to share the same orientation**.
	- Newer 6.7" devices (e.g. iPhone 14 Pro Max) use **1290×2796**; only use that if App Store Connect is specifically requesting it.
	- Optional: iPad screenshots (only if you support iPad).

### Designed screenshots ("billboard" style)
Apple generally expects marketing-style screenshots with **big headlines** and optional **subtext** above the app UI.

This repo includes a helper exporter:
- Script: `errandbridge-frontend/scripts/export-appstore-billboards.py`
- Copy set (JSON manifest): `errandbridge-frontend/appstore/screenshots/manifest.errandbridge.v1.json`

Workflow:
- Put your source screenshots in `errandbridge-frontend/appstore/screenshots/source/` as:
	- `hero.png`, `create.png`, `locations.png`, `review.png`, `payment.png`
- Export:
	- `python3 scripts/export-appstore-billboards.py --in appstore/screenshots/source --out appstore/screenshots/out --manifest appstore/screenshots/manifest.errandbridge.v1.json`

## Xcode testing (Simulator)
If the iOS shell is loading the hosted website instead of your local dev build, use Capacitor live-reload:

- Start the dev server (`npm start`) so the app runs in development mode (local API base, etc.).
- Sync iOS with a server override:
	- `npm run cap:sync:ios:localhost`

Then open `ios/App/App.xcworkspace` in Xcode and run the app.

Notes:
- **Simulator** can usually reach your Mac via `http://localhost:3000`.
- **Physical device** needs your Mac’s LAN IP (and that IP must be allowed by ATS / allowNavigation).

## Release notes (draft)
- First public release of ErrandBridge
- Pilot onboarding and job browsing
- Secure authentication and profile management
- Real‑time notifications and updates


# Google Play release checklist

Use this checklist for the first production release of ErrandBridge on Google Play.

## 1) Upload the AAB
- Location: `android/app/build/outputs/bundle/release/app-release.aab`
- Play Console → Release → Production → Create new release

## 2) App signing
- Play Console → Setup → App integrity
- Confirm **Play App Signing** is enabled.
- Copy the **App signing SHA‑256** fingerprint (for `assetlinks.json`).

## 3) Store listing
- App name: ErrandBridge
- Short description (80 chars)
- Full description
- Feature graphic (1024x500)
- Screenshots (phone + 7" + 10" tablets)
- Privacy policy URL: https://www.errandbridge.com/privacy (or your live URL)
- Support URL: https://www.errandbridge.com

## 4) Content & compliance
- App access: No special access (unless you have admin-only features)
- Data safety: complete the questionnaire
- Ads: declare if you show ads
- Target audience: 13+ (unless you explicitly target kids)

## 5) Release notes
- Paste release notes from `PLAY_RELEASE_NOTES.md`

## 6) Final checks
- Run internal test track first if preferred
- Verify deep links:
  - https://errandbridge.com
  - https://www.errandbridge.com
  - https://app.errandbridge.com
  - errandbridge://


# Mobile registration checklist (iOS + Android)

This guide captures the best‑practice steps to register ErrandBridge for app stores, push notifications, and deep links.

## ✅ App store listing setup

### iOS (App Store Connect)
1. Create the app using bundle ID `com.errandbridge.app` and name **ErrandBridge**.
2. Set app privacy details and provide a support URL.
3. Upload screenshots (6.7" + 6.5" + 5.5"), app icon, and promotional text.
4. Configure App Store pricing and availability.
5. Create a release and attach the signed IPA build.

### Android (Google Play Console)
1. Create the app with package name `com.errandbridge.app`.
2. Complete store listing: app name, short/long descriptions, feature graphic, screenshots.
3. Configure content rating and target audience.
4. Upload AAB release to the **Production** track.

## ✅ Push notifications

### iOS (APNs)
1. In Apple Developer, enable **Push Notifications** for the app ID.
2. Use **Automatic signing** in Xcode or upload the APNs key to your push provider.
3. `App.entitlements` includes `aps-environment` (set to `production` for App Store releases).

### Android (FCM)
1. Create a Firebase project.
2. Download `google-services.json` and place it in:
   `android/app/google-services.json`
3. Enable FCM in Firebase console.

## ✅ Deep links / Universal links

### iOS
1. Ensure `App.entitlements` includes Associated Domains:
   - `applinks:errandbridge.com`
   - `applinks:www.errandbridge.com`
   - `applinks:app.errandbridge.com`
2. Host the Apple App Site Association (AASA) file at:
   `https://errandbridge.com/.well-known/apple-app-site-association`
3. Update `TEAMID` in the file:
   `TEAMID.com.errandbridge.app`

### Android
1. `AndroidManifest.xml` includes app links + custom scheme:
   - `https://errandbridge.com`
   - `https://www.errandbridge.com`
   - `https://app.errandbridge.com`
   - `errandbridge://`
2. Host `assetlinks.json` at:
   `https://errandbridge.com/.well-known/assetlinks.json`
3. Replace `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` with the Play Console SHA‑256.

## ✅ Required files in repo

- `ios/App/App.entitlements`
- `ios/App/App/Info.plist` (URL schemes)
- `android/app/src/main/AndroidManifest.xml` (intent filters + notification permission)
- `public/.well-known/apple-app-site-association`
- `public/.well-known/assetlinks.json`

## Notes
- The AASA/assetlinks files are already added to `public/.well-known/` so they can be served by the web app.
- If you use a separate CDN/domain, mirror those files there as well.

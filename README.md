# ErrandBridge Frontend

Standalone React + Capacitor frontend for ErrandBridge.

This repository is intentionally frontend-only. The backend is a separate FastAPI + GraphQL service accessed over HTTPS.

## API documentation

Production API docs:

- Swagger UI: <https://api.errandbridge.com/docs>
- OpenAPI JSON: <https://api.errandbridge.com/openapi.json>
- GraphQL: <https://api.errandbridge.com/graphql>

Local backend API docs, when the backend is running separately:

- Swagger UI: <http://localhost:8001/docs>
- OpenAPI JSON: <http://localhost:8001/openapi.json>
- GraphQL: <http://localhost:8001/graphql>

More details:

- `docs/SWAGGER_API_DOCUMENTATION.md`
- `docs/FRONTEND_EXTERNAL_DEVELOPER_HANDOFF.md`

## Requirements

- Node.js 18+
- npm 9+
- Xcode for iOS/Capacitor work
- Android Studio/JDK 17 for Android/Capacitor work

## Install

```bash
npm install
```

## Run web app locally

```bash
npm start
```

Default local frontend URL:

```text
http://localhost:3000
```

## Build web app

```bash
npm run build
```

The build also validates that backend files are not packaged into frontend or mobile assets.

## Validate package boundary

```bash
npm run validate:frontend-package
```

## API base configuration

Production defaults:

```text
REACT_APP_API_BASE=https://api.errandbridge.com
REACT_APP_API_BASE_URL=https://api.errandbridge.com
REACT_APP_GRAPHQL_ENDPOINT=https://api.errandbridge.com/graphql
```

Local backend example:

```text
REACT_APP_API_BASE=http://localhost:8001
REACT_APP_API_BASE_URL=http://localhost:8001
REACT_APP_GRAPHQL_ENDPOINT=http://localhost:8001/graphql
```

Use example env files only. Do not commit real secrets.

## Mobile sync

Bundled assets for both mobile shells:

```bash
npm run build
npx cap sync ios
npx cap sync android
```

Hosted production API sync helpers:

```bash
npm run cap:sync:ios:hosted-api
npm run cap:sync:android:hosted-api
```

## Contributor boundary

Frontend contributors should work only in frontend-owned paths such as:

- `src/**`
- `public/**`
- `scripts/**` when frontend-specific
- `android/**` and `ios/**` for Capacitor mobile shell work
- frontend docs and frontend package files

Backend, infrastructure, database, Stripe secrets, AWS resources, and deployment credentials are intentionally not part of this repository.

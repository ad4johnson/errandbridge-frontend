# ErrandBridge Frontend External Developer Handoff

Last updated: 2026-07-20

## Goal

External frontend developers should be able to work on the React/Capacitor app without receiving or modifying the backend package. The backend remains a separate service accessed through documented API URLs and Swagger/OpenAPI.

## Recommended handoff model

Use this public frontend-only GitHub repository instead of sharing the full
platform repository root.

Frontend-only repository:

```text
https://github.com/ad4johnson/errandbridge-frontend
```

Give the developer:

- `errandbridge-frontend/` source code
- `README.md` context if needed
- `document-md/SWAGGER_API_DOCUMENTATION.md`
- `document-md/FRONTEND_EXTERNAL_DEVELOPER_HANDOFF.md`
- Non-secret `.env.example` files only

Do not give the developer:

- `errandbridge-backend/`
- `infra/`
- `amplify/` backend internals
- `.env`, `.env.local`, `.env.production`, or any file containing secrets
- AWS, Stripe, App Store Connect, Google Play, database, SMTP, OAuth, or admin credentials

## Generate a frontend-only bundle

From the repository root, run:

```bash
./scripts/export_frontend_handoff.sh
```

The script creates an archive under:

```text
handoff-packages/
```

The archive includes frontend source and selected documentation only. It excludes backend source, infrastructure, local dependencies, build artifacts, secrets, caches, and generated native build outputs.

## Frontend directory ownership

The external developer should work inside:

```text
errandbridge-frontend/
```

Important source areas:

```text
errandbridge-frontend/src/          React app source
errandbridge-frontend/public/       Static public assets
errandbridge-frontend/scripts/      Frontend build/sync helper scripts
errandbridge-frontend/android/      Capacitor Android shell
errandbridge-frontend/ios/          Capacitor iOS shell
```

They should not edit backend files or deploy infrastructure.

## Local frontend setup

Inside the extracted frontend-only package:

```bash
cd errandbridge-frontend
npm install
npm start
```

The React dev server normally opens at:

```text
http://localhost:3000
```

## API connection contract

The frontend talks to the backend over HTTP/GraphQL. It does not import backend source code.

Production defaults:

```text
REACT_APP_API_BASE=https://api.errandbridge.com
REACT_APP_API_BASE_URL=https://api.errandbridge.com
REACT_APP_GRAPHQL_ENDPOINT=https://api.errandbridge.com/graphql
```

Local backend defaults:

```text
REACT_APP_API_BASE=http://localhost:8001
REACT_APP_API_BASE_URL=http://localhost:8001
REACT_APP_GRAPHQL_ENDPOINT=http://localhost:8001/graphql
```

API documentation:

```text
https://api.errandbridge.com/docs
https://api.errandbridge.com/openapi.json
```

Local backend API documentation:

```text
http://localhost:8001/docs
http://localhost:8001/openapi.json
```

## Environment file rules

Use example files for onboarding. Never share files containing real secrets.

Allowed examples:

- `errandbridge-frontend/.env.example`
- `errandbridge-frontend/.env.capacitor.example`
- `errandbridge-frontend/.env.production.local.example`

Do not share:

- `errandbridge-frontend/.env`
- `errandbridge-frontend/.env.local`
- `errandbridge-frontend/.env.development.local`
- `errandbridge-frontend/.env.production.local`
- Any backend `.env` file

## Build and validation

Frontend web build:

```bash
cd errandbridge-frontend
npm run build
```

The build automatically runs the frontend package boundary validator. If backend files appear in the frontend/mobile package, the build fails.

Manual package boundary check:

```bash
cd errandbridge-frontend
npm run validate:frontend-package
```

## Mobile sync

For bundled mobile assets:

```bash
cd errandbridge-frontend
npm run build
npx cap sync ios
npx cap sync android
```

For hosted production API mobile builds, use the existing hosted API scripts where appropriate:

```bash
npm run cap:sync:ios:hosted-api
npm run cap:sync:android:hosted-api
```

## Pull request expectations

Frontend-only contributors should limit pull requests to:

- `errandbridge-frontend/src/**`
- `errandbridge-frontend/public/**`
- `errandbridge-frontend/scripts/**` when frontend-specific
- `errandbridge-frontend/package.json` / `package-lock.json` when frontend dependencies change
- Frontend documentation files

They should avoid changing:

- `errandbridge-backend/**`
- `infra/**`
- `.github/workflows/**` unless explicitly assigned
- App Store / Google Play signing configuration unless explicitly assigned

## Acceptance checklist for external frontend work

Before merging frontend-only work:

- `npm run build` passes inside `errandbridge-frontend/`
- `npm run validate:frontend-package` passes
- No backend source files are copied into frontend source, web build, Android assets, or iOS assets
- API calls use configured base URLs instead of hardcoded backend internals
- No secrets are committed
- UI changes are tested against either local backend or documented staging/production API URL

## If backend changes are needed

If the frontend developer needs a backend response shape changed, they should open a request with:

1. The Swagger/OpenAPI endpoint involved.
2. The current response shape.
3. The desired response shape.
4. The frontend screen or flow that needs it.
5. Whether the change is backward compatible.

Backend changes should be handled separately by a backend-authorized developer.

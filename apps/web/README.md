# IZLedger Web App

Frontend for IZLedger, the behavior-first trading journal SaaS for day traders and prop firm traders.

## Requirements

- Node.js 22
- npm

## Install

```bash
npm ci
```

## Local development

```bash
npm run dev
```

## Production build

```bash
npm run build
```

## Test suites

Unit tests:

```bash
npm run test
```

Behavior E2E tests:

```bash
npx playwright install --with-deps chromium
npm run test:e2e -- --project=desktop
```

Visual regression tests:

```bash
npx playwright install --with-deps chromium
npm run test:visual -- --project=desktop
```

Update visual snapshots:

```bash
npm run test:visual:update -- --project=desktop
```

## Covered E2E flows

- Auth redirects for protected routes
- Session refresh persistence and expired-session handling
- Trade create/edit validation
- Missed-trade validation and creation
- Rules CRUD plus trade workflow integration
- Lot size calculator FX/account-currency scenarios
- Dashboard filter URL persistence
- Theme persistence across nested routes

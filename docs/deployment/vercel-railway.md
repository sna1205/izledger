# Vercel + Railway Deployment (Production)

Target stack:
- Frontend: Vercel (`apps/web`)
- Backend: Railway (`apps/api`)
- Database: Railway MySQL

## Required Repo Paths
- `apps/web/vercel.json`
- `apps/web/api/[...path].js`
- `apps/web/api/storage/[...path].js`
- `apps/web/api/sanctum/csrf-cookie.js`
- `infra/railway/api.json`
- `infra/railway/web.json` (optional, only if Railway hosts web)

## 1) Railway Setup (API + MySQL)
1. Create a new Railway project.
2. Add a `MySQL` service.
3. Add an `API` service from this repo.
4. In API service settings, set config-as-code path to `infra/railway/api.json`.
5. Keep build context/repo root as the monorepo root.
6. Add a persistent volume mounted at `/var/www/html/storage`.
7. Set these API environment variables:

```env
APP_NAME=Trading Journal API
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:REPLACE_ME
APP_URL=https://api.yourdomain.com

DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}

SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_DOMAIN=.yourdomain.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none

SANCTUM_EXPIRATION_MINUTES=120
SANCTUM_STATEFUL_DOMAINS=app.yourdomain.com,api.yourdomain.com
ALLOW_SELF_REGISTER=false

CORS_ALLOWED_ORIGINS=https://app.yourdomain.com
CORS_ALLOWED_ORIGIN_PATTERNS=
CORS_SUPPORTS_CREDENTIALS=true

RUN_MIGRATIONS=true
MIGRATION_TIMEOUT_SECONDS=120
```

Generate `APP_KEY` once (local shell):
```bash
php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
```

8. Deploy API service and confirm health:
```bash
curl -f https://api.yourdomain.com/api/health
curl -f https://api.yourdomain.com/up
```

## 2) Vercel Setup (Frontend)
1. Import this repository in Vercel.
2. Set `Root Directory` to `apps/web`.
3. Ensure project uses `apps/web/vercel.json`.
4. Add these environment variables:

```env
VITE_API_BASE_URL=/api
API_BASE_URL=https://api.yourdomain.com/api
SANCTUM_BASE_URL=https://api.yourdomain.com
STORAGE_BASE_URL=https://api.yourdomain.com
```

5. Deploy and attach your custom domain (for example `app.yourdomain.com`).

Notes:
- `/api/*` is proxied by `apps/web/api/[...path].js`.
- `/storage/*` is proxied by `apps/web/api/storage/[...path].js`.
- `/sanctum/csrf-cookie` is proxied by `apps/web/api/sanctum/csrf-cookie.js`.

## 3) Domain/Cookie Requirements
For stable cookie auth, use the same apex domain:
- App: `https://app.yourdomain.com`
- API: `https://api.yourdomain.com`

If frontend and API are on unrelated domains (for example `*.vercel.app` + `*.railway.app`), browser third-party cookie policies can break login/session behavior.

## 4) Post-Deploy Checks
1. Open frontend and log in.
2. Verify `XSRF-TOKEN` and session cookies are set.
3. Create/update a trade to confirm authenticated writes.
4. Upload an image and confirm `/storage/...` URL resolves through Vercel.

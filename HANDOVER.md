# SafeTech Handover Notes

This project is currently a frontend Angular application with direct integrations to:

- Supabase database and storage
- Google Apps Script for OTP dispatch
- Gemini API
- VirusTotal API

For final government deployment, these integrations should be treated as placeholders and reviewed by the hosting team before production use.

## Current Architecture

- Public website: Angular frontend
- Admin panel UI: Angular frontend
- Current database/storage integration: Supabase
- Current OTP integration: Google Apps Script endpoint
- Current hosting target in development: local Angular / Vercel-style build flow

## Items That Must Be Replaced or Reviewed During Handover

### 1. Environment variables

Do not deploy with hardcoded keys in tracked source.

Required build-time variables are listed in [.env.example](/d:/Website/SafeTech/.env.example):

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GEMINI_API_KEY`
- `SCRIPT_URL`
- `VIRUSTOTAL_API_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

The current build script reads these values from the environment in [set-env.js](/d:/Website/SafeTech/set-env.js).

### 2. Web server security headers

The current hosted configuration uses [vercel.json](/d:/Website/SafeTech/vercel.json) as the security header blueprint.

This file will not apply automatically on non-Vercel infrastructure. If the Government of Kerala hosts this on Nginx, Apache, IIS, or another platform, their server team must replicate the same header intent at the web server or reverse proxy layer.

General HTML/app traffic headers currently configured:

- `Content-Security-Policy`
- `Access-Control-Allow-Origin`
- `Cross-Origin-Resource-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Cache-Control: no-store, max-age=0, must-revalidate`

Static asset caching currently configured:

- `Cache-Control: public, max-age=31536000, immutable`

Current CSP values in [vercel.json](/d:/Website/SafeTech/vercel.json) allow:

- scripts from `'self'` and inline scripts
- styles from `'self'`, inline styles, Google Fonts, and `blob:`
- fonts from Google Fonts
- images from `'self'`, `data:`, and `blob:`
- network connections to `'self'`, `https://*.supabase.co`, and `https://generativelanguage.googleapis.com`

For final deployment:

- the government hosting team should copy these rules into their own server config
- the allowed origin and allowed connect domains must be updated to their final production domain and backend endpoints
- `vercel.json` should be treated as a security blueprint even if they do not use Vercel

### 3. Admin security

The current admin login is a frontend gate only.

Current behavior:
- admin credentials are checked in the browser
- admin session is stored in `localStorage`
- admin data actions are sent from the frontend using the public anon key

This is acceptable for demos or temporary testing, but it is not secure for a production government deployment.

Recommended production replacement:
- use a server-side admin API, or
- use Supabase Auth / enterprise auth with strict RLS tied to real authenticated admin identities

Admin actions that should not remain as broad anon frontend mutations:
- report status updates
- booking status updates
- trainer status updates
- training message creation
- training resource uploads

### 4. Database portability and CORS

If the government team migrates away from Supabase, the frontend integration points to replace are mainly in:

- [supabase.ts](/d:/Website/SafeTech/src/app/core/services/supabase.ts)
- [training.ts](/d:/Website/SafeTech/src/app/pages/training/training.ts)
- [auth.ts](/d:/Website/SafeTech/src/app/core/services/auth.ts)

If they keep PostgreSQL but replace Supabase with their own backend:
- keep the Angular UI
- replace the direct database/storage calls with calls to their server APIs

If they continue using Supabase temporarily, they must review:

- allowed origins / site URLs / redirect URLs
- storage bucket access rules
- row level security policies

If they replace Supabase with their own database/API:

- the database must not be publicly exposed
- the application server/API should enforce CORS for only the final government domain
- wildcard origins should not be used

The current `Access-Control-Allow-Origin` in [vercel.json](/d:/Website/SafeTech/vercel.json) is specific to the current hosted URL and must be changed during handover.

### 5. SQL migration delivered with project

Current admin-related schema helper:
- [20260315_admin_panel.sql](/d:/Website/SafeTech/supabase/migrations/20260315_admin_panel.sql)

This migration is useful only if the handover team continues with Supabase-compatible schema/storage.

### 6. Build and deployment process

Production deployments should use:

```bash
npm run build
```

This runs the Angular production build and generates the final deployable files in `dist/`.

Production build benefits:

- optimized and minified client bundle
- smaller and cleaner output than development mode
- correct deployable artifact for government hosting teams

The government team should host the generated production build output, not the raw source files.

Current Angular configuration uses [angular.json](/d:/Website/SafeTech/angular.json) with:

- `src/index.html` as the active index file
- `production` as the default build configuration

Note:
- this repository currently does not have a separate production index swap configured
- `src/index.prod.html` exists, but it is not wired into the Angular build at this time

### 7. Built-in code protections

The source includes some application-level protections that remain useful regardless of hosting platform:

- DOM sanitization in [tech-buddy-bubble.ts](/d:/Website/SafeTech/src/app/shared/components/tech-buddy-bubble/tech-buddy-bubble.ts) using `DOMPurify`
- Angular frontend routing and component structure
- CSP/security intent documented in [vercel.json](/d:/Website/SafeTech/vercel.json)

Important clarification:
- there is currently no CSP meta tag in [index.html](/d:/Website/SafeTech/src/index.html)
- security headers are currently delivered through hosting configuration, not an in-page CSP fallback

### 8. Training workflow limitations to review

Current training flow works as a frontend submission flow, but should be reviewed before final deployment:
- OTP verification is browser-managed
- booking validation text says 48 hours, but code currently does not fully enforce 48 hours
- required field validation is incomplete

Files involved:
- [training.ts](/d:/Website/SafeTech/src/app/pages/training/training.ts)
- [training.html](/d:/Website/SafeTech/src/app/pages/training/training.html)

## Recommended Handover Plan

1. Keep the Angular frontend as the UI layer.
2. Replace direct admin write operations with server-side endpoints.
3. Move all secrets to the hosting environment.
4. Re-issue all API/database credentials under government ownership.
5. Reconfigure security headers on the government web server using [vercel.json](/d:/Website/SafeTech/vercel.json) as the reference blueprint.
6. Review and harden authentication, authorization, logging, and audit trails.
7. Reconfigure file storage and OTP provider under government-controlled infrastructure.
8. Host the production build output generated by `npm run build`.

## Minimum Production Checklist

- No live secrets committed in source
- Security headers replicated on the final server
- Final domain/origin values updated in server and backend configuration
- No broad public update policies for admin tables
- Real admin authentication
- Server-side authorization for admin mutations
- Audit logging for admin actions
- Government-owned hosting, database, and storage credentials

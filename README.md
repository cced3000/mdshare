# MDShare

MDShare is a lightweight Markdown sharing app built with Next.js and deployed on Cloudflare Workers + D1.

It supports anonymous temporary sharing with optional password protection, burn-after-read behavior, and management links.  
It also supports optional MPP payment gating for API monetization.

## Features

- Create short-lived Markdown shares without signing in
- Optional MPP payment gate for `POST /api/mpp/shares`
- Paste content directly or upload `.md`, `.markdown`, `.txt`, or plain text files
- Password-protected shares
- Burn-after-read modes (`OFF`, `AFTER_FIRST_VIEW_GRACE`, `AFTER_FIRST_VIEW_INSTANT`)
- Separate link capabilities: public, edit, owner/manage
- Anonymous ownership and follow-up management without account system

## Tech Stack

- Next.js 16
- React 19
- Cloudflare Workers
- Cloudflare D1
- OpenNext for Cloudflare
- Drizzle ORM
- TypeScript

## Project Structure

- `src/app` — Next.js pages and API routes
- `src/components` — UI components
- `src/lib` — business logic, db schema, API helpers
- `migrations` — D1 SQL migrations
- `docs` — project documentation

## Local Development

### Prerequisites

- Node.js 22+
- pnpm
- Wrangler CLI authentication for Cloudflare workflows

### Install

```bash
pnpm install
```

### Local DB migrate

```bash
pnpm run db:migrate:local
```

### Run app

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## MPP Monetization Setup

MPP gating is implemented for `POST /api/mpp/shares`.  
When enabled, this endpoint returns a `402` challenge until payment is provided.

The standard UI and skill-facing creation endpoint remains `POST /api/shares`.  
Use the dedicated MPP route only when you explicitly want paid share creation.

### Where to configure

- Local template: `.env.mpp.example`
- Cloudflare vars/secrets reference: `wrangler.mpp.example.toml`
- Full guide: `docs/mpp-setup.md`

### Required env vars

- `MPP_SECRET_KEY` — random secret for challenge signing/verification
- `MPP_RECIPIENT` — recipient wallet address

### Optional env vars

- `MPP_ENABLED` (`true` / `false`)
- `MPP_AMOUNT` (default `0.01`)
- `MPP_CURRENCY` (default `0x20c0000000000000000000000000000000000000`)
- `MPP_MODE` (`pull` or `push`)
- `MPP_WAIT_FOR_CONFIRMATION` (`true` / `false`)

If `MPP_ENABLED` is not set, MPP auto-enables when both `MPP_SECRET_KEY` and `MPP_RECIPIENT` are set.

### Local quick start

1. Copy template:

```bash
cp .env.mpp.example .env.local
```

2. Edit `.env.local` and set real values.
3. Restart dev server.

If you want to test paid creation locally, keep MPP enabled and call the dedicated route below.

### Cloudflare production quick start

1. Put non-secret values in `[vars]` (see `wrangler.mpp.example.toml`).
2. Put secrets with Wrangler:

```bash
pnpm exec wrangler secret put MPP_SECRET_KEY
pnpm exec wrangler secret put MPP_RECIPIENT
```

3. Deploy:

```bash
pnpm run cf:build
pnpm exec wrangler deploy
```

This design keeps the browser UI and existing skill workflows on `/api/shares` unchanged while exposing paid creation separately on `/api/mpp/shares`.

### Verify payment flow

```bash
npx mppx account create
npx mppx http://localhost:3000/api/mpp/shares
```

This verification flow targets the dedicated paid-create endpoint.

Or run the local one-shot verifier:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-mpp.ps1
```

### Real payment validation (recommended first run)

To avoid request-body complexity, use the paid test endpoint:

```bash
npx mppx account create
npx mppx http://127.0.0.1:3000/api/test-paid
```

Expected result:

- command succeeds with `200`
- response body includes `"ok": true` and `"Payment accepted"`

Unpaid direct request to the same endpoint should still return `402`.

## Build and Deploy

### Build for Cloudflare

```bash
pnpm run cf:build
```

### Preview Cloudflare build

```bash
pnpm run cf:preview
```

### Deploy

```bash
pnpm exec wrangler deploy
```

## Useful Scripts

- `pnpm run dev` — run local dev server
- `pnpm run lint` — run ESLint
- `pnpm run build` — build Next.js app
- `pnpm run cf:build` — build Cloudflare worker bundle
- `pnpm run cf:preview` — preview Cloudflare worker
- `pnpm run cf:deploy` — deploy via OpenNext
- `pnpm run db:migrate:local` — migrate local D1
- `pnpm run db:migrate` — migrate remote D1

## Notes

- Payment gating currently applies only to `POST /api/mpp/shares`.
- Public read and share management routes are still free in this phase.

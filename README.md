# MDShare

MDShare is a lightweight Markdown sharing app built with Next.js and deployed on Cloudflare Workers + D1.

It is designed for fast, anonymous sharing: paste Markdown, generate a short link, optionally protect it with a password, and keep separate access, edit, and manage capabilities without requiring user accounts.

## Features

- Create short-lived Markdown shares without signing in
- Paste content directly or upload `.md`, `.markdown`, `.txt`, or plain text files
- Readable Markdown preview with improved Chinese typography and cleaner mixed CJK / English spacing
- Responsive editing experience for desktop and mobile
- Password-protected shares
- Burn-after-read modes:
  - Disable burn
  - Expire 10 minutes after first confirmed view
  - Expire immediately after first confirmed view
- Separate link capabilities:
  - Public access link
  - Optional edit link
  - Owner/manage link
- Anonymous ownership and follow-up management without an account system
- Inline password visibility toggles in create, manage, and gated public views

## Tech Stack

- Next.js 16
- React 19
- Cloudflare Workers
- Cloudflare D1
- OpenNext for Cloudflare
- Drizzle ORM
- TypeScript

## Project Structure

- `src/app` — Next.js app routes and API routes
- `src/components` — UI components for create, manage, public share, preview, and form controls
- `src/lib` — database schema, share service, helpers, and API error mapping
- `migrations` — D1 SQL migrations
- `scripts` — build-time helper scripts, including the OpenNext post-build patch
- `skills` — project-specific agent skill definitions and references

## Skills

This repository includes a project skill for agent-driven MDShare operations:

- `skills/mdshare-agent/SKILL.md`

The `mdshare-agent` skill is intended for AI agents that need to operate MDShare directly, for example:

- create a temporary Markdown share and return public / edit / manage links
- read an existing public share
- unlock password-protected or burn-after-read shares
- continue editing through an edit or manage token
- update share settings or delete a share

### Default Skill Target

The bundled skill is configured around the current production deployment:

- Base URL: `https://share.yekyos.com`

If you deploy MDShare to another domain or Workers URL, the skill can be adapted to point to that environment instead.

### Skill References

Additional reference material is included here:

- `skills/mdshare-agent/references/api.md` — endpoint and payload reference
- `skills/mdshare-agent/references/workflows.md` — end-to-end agent workflows
- `skills/mdshare-agent/references/install-examples.md` — installation and usage examples

### When to Use the Skill

Use the skill when the task is operational, such as:

- “share this markdown”
- “generate a temporary link”
- “read this MDShare link”
- “update this existing share”
- “delete this temporary share”

Do not use the skill when the task only needs local formatting, previewing, or Markdown cleanup without creating a share.

## Local Development

### Prerequisites

- Node.js 22+
- `pnpm`
- Wrangler CLI authentication for Cloudflare workflows

Install dependencies:

```bash
pnpm install
```

Log in to Wrangler:

```bash
pnpm exec wrangler login
```

Apply the local D1 schema:

```bash
pnpm run db:migrate:local
```

Start the app:

```bash
pnpm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## D1 Notes

If you see errors such as:

- `no such table: shares`
- `no such table: share_views`

your local or remote D1 database has not been migrated yet.

Use:

```bash
pnpm run db:migrate:local
```

for local development, or:

```bash
pnpm run db:migrate
```

for the remote Cloudflare database.

## Build for Cloudflare

Cloudflare production output is generated through OpenNext:

```bash
pnpm run cf:build
```

The build script also runs a post-build patch:

```bash
node scripts/patch_opennext_require_resolve.mjs
```

This patch works around an OpenNext runtime issue where `__require.resolve(...)` can remain in the generated worker bundle and crash on Cloudflare Workers.

## Preview the Cloudflare Build

```bash
pnpm run cf:build
pnpm run cf:preview
```

## Deploy to Cloudflare

1. Create a D1 database in Cloudflare.
2. Copy `wrangler.example.toml` to `wrangler.toml` if needed and set the correct `database_id`.
3. Apply remote migrations:

```bash
pnpm run db:migrate
```

4. Build the worker bundle:

```bash
pnpm run cf:build
```

5. Deploy:

```bash
pnpm exec wrangler deploy
```

## Windows / WSL Caveat

OpenNext for Cloudflare is significantly more reliable in Linux or WSL than in native Windows environments.

On Windows, you may run into issues such as:

- locked `.open-next` directories
- `EBUSY` when cleaning build output
- `EPERM` when creating symlinks during bundling

If that happens, run Cloudflare builds and deployments from WSL:

```bash
pnpm run cf:build
pnpm exec wrangler deploy
```

## Useful Scripts

- `pnpm run dev` — start local Next.js development server
- `pnpm run build` — production Next.js build
- `pnpm run start` — start the production Next.js server
- `pnpm run lint` — run ESLint
- `pnpm run cf:build` — build the Cloudflare worker bundle and patch OpenNext output
- `pnpm run cf:preview` — preview the Cloudflare worker locally
- `pnpm run cf:deploy` — deploy using OpenNext’s Cloudflare deploy command
- `pnpm run db:migrate:local` — apply D1 migrations locally
- `pnpm run db:migrate` — apply D1 migrations to the remote database

## Cleanup Endpoint

Expired and burned shares are cleaned up through the `/api/clean` route.

You can protect that route with a secret and trigger it from Cloudflare Cron Triggers.

## Current Product Behavior

- The home page is a focused Markdown composer with a real-time preview
- Public share pages are read-only
- The public result page does not show the “copy formatted preview” action
- Password fields support show / hide toggles
- Share management supports editing content, changing settings, and deleting the share

## License

This repository currently does not include a dedicated license file.

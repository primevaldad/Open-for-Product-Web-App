# Open for Product — Web App

This is the **authenticated product app** served at `app.openforproduct.com`.

## Stack

- **Framework:** Next.js 14 (App Router) with React 18
- **Styling:** Tailwind CSS v3
- **Auth & Data:** Firebase Auth, Firestore, Firebase Storage
- **Hosting:** Firebase App Hosting (SSR, auto-deployed on push to `main`)
- **Config:** `apphosting.yaml` — secrets injected at build/runtime via Firebase

## Project structure

- `src/app/(app)/` — Authenticated route group (feed, projects, settings, profile, etc.)
- `src/app/auth/`, `src/app/login/`, `src/app/signup/` — Public auth flows
- `src/app/api/` — API routes
- `src/app/actions/` — Server actions
- `src/components/` — Shared components
- `src/lib/` — Firebase config, utilities, Firestore helpers

## Conventions

- **Branches:** `feature/<name>`, `bug/<name>`, `fix` — merge to `main` via no-ff merge
- **Deploy:** Push to `main` triggers automatic App Hosting deploy
- **Dev server:** `npm run dev` → `http://localhost:3000`
- **Commits:** Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`)

## Sibling repo

The **static marketing site** at `openforproduct.com` lives in a separate repo:
`/Users/david/Documents/Open for Product/Open for Product Marketing/openforproduct-marketing`
(GitHub: `primevaldad/openforproduct-marketing`)

When linking from the app to public marketing pages (about, how-it-works, blog, podcast, contact, support), link to `https://openforproduct.com/<path>`.

When linking from the app to other app routes, use relative paths (`/projects`, `/feed`, etc.).

## Do not touch

- `apphosting.yaml` — only modify if explicitly asked; secrets are managed through Firebase Console
- `firestore.rules` — only modify with explicit instruction; always audit security after changes
- `.env.local` — never commit, never read contents aloud

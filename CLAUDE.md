@AGENTS.md

# app-docu

Personal document management app.

## Stack

- **Next.js 16.2.9** — App Router (note: cutting-edge version, check `node_modules/next/dist/docs/` before writing Next.js-specific code)
- **React 19.2.4**
- **TypeScript**
- **Tailwind CSS v4** — configured via `@tailwindcss/postcss`, not the v3 `tailwind.config.js` pattern

## Running the app

```bash
npm run dev
```

Open in Chrome at `http://localhost:3000`.

## Persistence

- **IndexedDB via `idb`** — chosen storage layer. Not yet installed or wired up; planned as the next major feature after the base UI is complete.
- Documents are currently held in React state (in-memory only).

## Constraints

- Do not create new folders without explicit permission.
- All source code lives under `app/` (Next.js App Router conventions).

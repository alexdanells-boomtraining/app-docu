# SuperDocu

A clean, personal document workspace that runs entirely in your browser — no account, no cloud, no backend.

## Features

### Documents
- Create, edit, and delete documents with live autosave
- Rich text editing via TipTap — bold, italic, underline, strikethrough, highlight, headings (H1/H2), bullet lists, numbered lists
- Unique URL per document (`/docs/abc123`) — shareable and bookmarkable
- Word count displayed in edit mode
- Starred / favourites for quick access

### Organisation
- **Folders** — flat one-level folder structure; assign documents by dropdown, right-click context menu, or drag-and-drop onto folder headers
- **Tags** — add multiple tags per document; filter the sidebar by tag
- **Search** — filter documents by title in the sidebar

### Trash
- Soft delete moves documents to a Trash section (reversible, no confirmation)
- Restore individual documents from trash
- Empty Trash permanently deletes all trashed documents (with confirmation)

### History
- Save named versions of a document with the Save button
- Up to 3 versions stored per document
- Restore any saved version

### Export / Import
- Export all documents as a JSON file
- Import from a previous export — choose merge (keep existing + add new) or replace (overwrite everything)

### Command Palette
- Open with `Cmd+K` / `Ctrl+K`
- Search and jump to any document, folder, or action
- Keyboard navigable (↑↓ arrows, Enter to select, Esc to close)

### Appearance
- Light, Dark, and High Contrast themes — toggle from the sidebar header
- Fully responsive — works on mobile and desktop

### Persistence
- All data stored locally in **IndexedDB** (via the `idb` library)
- No backend, no account required; data stays on your device

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Rich text | TipTap v2 |
| Storage | IndexedDB via `idb` |
| Runtime | React 19 |

---

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project structure

```
app/
  page.tsx              # Home page (/)
  layout.tsx            # Root layout — fonts, metadata
  globals.css           # Tailwind + TipTap styles
  db.ts                 # IndexedDB schema and all data access functions
  docs/
    workspace.tsx       # Main workspace client component
    [[...id]]/
      page.tsx          # Catch-all route — /docs and /docs/:id
```

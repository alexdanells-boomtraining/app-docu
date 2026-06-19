# SuperDocu

A clean, personal document workspace that runs entirely in your browser — no account, no cloud, no backend.

## Screenshot

![SuperDocu workspace](public/screenshot.png)

> **To add the screenshot:** open the app at `http://localhost:3000/docs`, open a document, take a screenshot, and save it as `public/screenshot.png`.

## Features

### Documents
- Create, edit, and delete documents with live autosave (500 ms debounce)
- Rich text editing via TipTap — bold, italic, underline, strikethrough, highlight, headings (H1/H2), bullet lists, numbered lists
- Inline link insertion with toolbar button and URL input strip
- Inline image support — paste or use the toolbar picker; base64, 5 MB max
- Unique URL per document (`/docs/abc123`) — shareable and bookmarkable
- Word count displayed in edit mode
- Starred / favourites for quick access
- Unsaved-changes indicator dot on the Save button
- `⌘S` shortcut to save a version

### Organisation
- **Folders** — flat one-level folder structure; assign by dropdown, right-click context menu, or drag-and-drop
- **Tags** — add multiple tags per document; filter the sidebar by tag
- **Sort order** — sort the document list by Last Updated, Created, or A–Z
- **Full-text search** — searches both titles and document body content

### Navigation & UX
- **Command Palette** (`⌘K`) — search documents, folders, and actions; keyboard navigable
- **Keyboard Shortcuts modal** (`?` key or via palette) — view all shortcuts
- **Focus Mode** (`⌘\`) — hides sidebar and toolbar for distraction-free writing
- **Table of Contents** — auto-generated from H1/H2 headings; click to scroll; appears when ≥ 2 headings exist
- **Scroll position memory** — returns to where you were when you switch back to a document

### Appearance
- **5 workspace themes** — Professional (blue), Videogames (purple), Space (indigo), Nature (green), CityScape (amber) — theme selector in sidebar
- **Light, Dark, High Contrast** display modes — toggle from the sidebar header; independent of workspace theme
- Gradient "SuperDocu" logo in sidebar and mobile header

### Trash
- Soft delete moves documents to a Trash section (reversible, no confirmation)
- Restore individual documents from trash
- Empty Trash permanently deletes all trashed documents (with confirmation)

### History
- Save snapshots with the Save button or `⌘S`
- Up to 3 versions stored per document
- Restore any saved version — toast notification confirms
- Toast notifications on all major actions (save, trash, restore, import, export)

### Export / Import
- Export all documents as a JSON file
- Import from a previous export — choose merge (keep existing + add new) or replace (overwrite everything)

### Print
- Print button in the document top bar — calls `window.print()`
- Sidebar, toolbar, and UI chrome hidden during printing

### Home Page
- Animated feature card grid showcasing all capabilities
- Recent documents strip — resume where you left off

---

## Optional Tasks Completed

All nine optional tasks were implemented across dedicated feature branches:

| Task | Branch | Difficulty |
|---|---|---|
| Starred documents | `easy` | Easy |
| Dark-mode toggle | `easy` | Easy |
| Document word count | `easy` | Easy |
| Tags & tag filtering | `medium` | Medium |
| Export / import JSON | `medium` | Medium |
| Document history (3 versions) | `medium` | Medium |
| Soft delete & Trash | `hard` | Hard |
| Keyboard command palette (⌘K) | `hard` | Hard |
| Folder structure | `hard` | Hard |

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

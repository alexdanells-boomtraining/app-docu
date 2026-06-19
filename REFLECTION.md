# QoL / UX / UI Features Added (UXUI Branch)

## Quality-of-Life
- **Autosave** — 500 ms debounce on every keystroke; no manual save required for content
- **Unsaved indicator** — amber dot on the Save button while a debounce is pending
- **⌘S shortcut** — saves a version snapshot at any time
- **Scroll position memory** — returns to the exact scroll position when switching back to a document
- **Full-text search** — sidebar search scans both titles and body content (HTML-stripped)
- **Sort order** — sidebar list sortable by Last Updated, Created date, or A–Z
- **One-click restore** — trashed documents restored with a single button; no extra confirmation

## UX Improvements
- **Toast notifications** — slide-in confirmations for every major action (save, trash, restore, export, import, image too large)
- **Keyboard shortcuts modal** — `?` key or command palette action shows all shortcuts in a panel
- **Command palette full-text** — palette now searches document body content, not just titles
- **Focus mode** — `⌘\` hides the sidebar and toolbar for distraction-free writing; `Esc` exits
- **Table of contents** — auto-generated from H1/H2 headings; appears when ≥ 2 headings exist; click to scroll
- **Link insertion** — toolbar button selects text then shows an inline URL input strip; `⌘K` inside editor left alone
- **Inline images** — toolbar image picker; base64 encoded; 5 MB cap with toast on rejection
- **Print support** — print button calls `window.print()`; sidebar, toolbar, and chrome hidden via `print:hidden`

## UI / Visual
- **5 workspace themes** — Professional (blue), Videogames (purple), Space (indigo), Nature (green), CityScape (amber); colour swatch picker in sidebar
- **Theme gradient accent line** — 1 px gradient rule under the document top bar, fades transparent → theme colour → secondary colour → transparent; updates instantly on theme change
- **Sidebar accent bar** — 2 px gradient stripe at the very top of the sidebar matching the active theme
- **Gradient "SuperDocu" logo** — "Super" in slate, "Docu" in blue→violet→indigo gradient; in sidebar and mobile header
- **Glassmorphism modals** — command palette and all modals use `backdrop-blur-xl` with semi-transparent white background and softened borders
- **Modal entrance animation** — spring scale + slide-up (`overlay-enter`) on all overlays
- **Sidebar doc row animations** — each row fades and slides up on mount (`row-enter`); hover lifts with `scale-[1.01]`
- **Body preview in sidebar** — first ~65 characters of document body shown below the title in each sidebar row
- **Formatting toolbar animation** — toolbar fades and slides down (`toolbar-enter`) when switching into edit mode
- **Richer toasts** — white glassmorphic background, theme-coloured left border strip, small filled tick icon; error toasts show red border + warning icon
- **Illustrated empty state** — "Nothing open yet" screen has an inline SVG document illustration with a New Document button
- **Home page app mockup** — detailed browser-frame SVG in the hero showing the real workspace UI (sidebar, toolbar, document, gradient accent line)
- **Home page palette mockup** — second SVG in a "Command Palette" spotlight section showing search results and keyboard hints
- **Hero two-column layout** — text left, mockup right on medium+ screens; mockup tilts 1° and straightens on hover

---

# Persistence Decision

## Choice: IndexedDB

Decided to use IndexedDB (via the `idb` wrapper library) for persisting documents between sessions.

## Reasons

- **localStorage ruled out** — hard 5–10 MB browser limit is insufficient for a document management app where files can grow large.
- **File System Access API ruled out** — requires documents to already exist as files on the filesystem, and re-prompts the user for folder permissions each session.
- **IndexedDB** stores data inside the browser with no size constraints that would affect normal document use, no permission prompts, and survives browser restarts — the right fit for a self-contained, single-user, no-backend app.

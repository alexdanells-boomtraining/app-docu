# Persistence Decision

## Choice: IndexedDB

Decided to use IndexedDB (via the `idb` wrapper library) for persisting documents between sessions.

## Reasons

- **localStorage ruled out** — hard 5–10 MB browser limit is insufficient for a document management app where files can grow large.
- **File System Access API ruled out** — requires documents to already exist as files on the filesystem, and re-prompts the user for folder permissions each session.
- **IndexedDB** stores data inside the browser with no size constraints that would affect normal document use, no permission prompts, and survives browser restarts — the right fit for a self-contained, single-user, no-backend app.

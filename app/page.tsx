"use client"

import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { type Doc, getAllDocs, putDoc, removeDoc, starDoc } from "./db"

type Mode = "edit" | "read"
type Theme = "light" | "dark" | "hc"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function isBlank(doc: Doc) {
  return !doc.title.trim() && !doc.body.trim()
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

// ── Theme icons ──────────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  )
}

function ContrastIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 3a9 9 0 0 1 0 18V3Z" fill="currentColor" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Home() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>("edit")
  const [query, setQuery] = useState("")
  const [blankWarning, setBlankWarning] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>("light")
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedDoc = docs.find((d) => d.id === selectedId) ?? null
  const count = wordCount(selectedDoc?.body ?? "")

  const starredDocs = docs.filter((d) => d.starred)
  const recentDocs = docs.filter((d) => !d.starred)
  const searchResults = query.trim()
    ? docs.filter(
        (d) =>
          d.title.toLowerCase().includes(query.toLowerCase()) ||
          d.body.toLowerCase().includes(query.toLowerCase())
      )
    : []

  // Load docs and theme on mount
  useEffect(() => {
    getAllDocs().then(setDocs)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem("docu-theme") as Theme | null
    if (saved && ["light", "dark", "hc"].includes(saved)) setTheme(saved)
  }, [])

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("dark", "hc")
    if (theme === "dark") root.classList.add("dark")
    if (theme === "hc") root.classList.add("hc")
    localStorage.setItem("docu-theme", theme)
  }, [theme])

  function cycleTheme() {
    setTheme((t) => (t === "light" ? "dark" : t === "dark" ? "hc" : "light"))
  }

  async function autoDeleteBlankIfSelected() {
    if (selectedDoc && isBlank(selectedDoc)) {
      await removeDoc(selectedDoc.id)
      setDocs((prev) => prev.filter((d) => d.id !== selectedDoc.id))
    }
  }

  async function handleNew() {
    const existingBlank = docs.find(isBlank)
    if (existingBlank) {
      setBlankWarning(true)
      if (warningTimer.current) clearTimeout(warningTimer.current)
      warningTimer.current = setTimeout(() => setBlankWarning(false), 3500)
      setSelectedId(existingBlank.id)
      setMode("edit")
      setSidebarOpen(false)
      return
    }
    const now = new Date().toISOString()
    const doc: Doc = { id: crypto.randomUUID(), title: "", body: "", createdAt: now, updatedAt: now }
    await putDoc(doc)
    setDocs((prev) => [doc, ...prev])
    setSelectedId(doc.id)
    setMode("edit")
    setSidebarOpen(false)
  }

  async function handleSelect(id: string) {
    await autoDeleteBlankIfSelected()
    setSelectedId(id)
    setMode("read")
    setSidebarOpen(false)
  }

  function handleUpdate(field: "title" | "body", value: string) {
    if (!selectedDoc) return
    setBlankWarning(false)
    const updated: Doc = { ...selectedDoc, [field]: value, updatedAt: new Date().toISOString() }
    setDocs((prev) => prev.map((d) => (d.id === selectedId ? updated : d)))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => putDoc(updated), 500)
  }

  async function handleDelete(id: string) {
    await removeDoc(id)
    setDocs((prev) => prev.filter((d) => d.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  async function handleStar(id: string) {
    const doc = docs.find((d) => d.id === id)
    if (!doc) return
    const next = !doc.starred
    await starDoc(id, next)
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, starred: next } : d)))
  }

  // ── Shared sidebar doc row ──────────────────────────────────────────────────

  function DocRow({ doc }: { doc: Doc }) {
    return (
      <div
        className={`group relative flex items-center rounded-md mb-0.5 transition-colors ${
          selectedId === doc.id
            ? "bg-gray-100 dark:bg-gray-700 hc:bg-white"
            : "hover:bg-gray-50 dark:hover:bg-gray-700/60 hc:hover:bg-white/10"
        }`}
      >
        <button onClick={() => handleSelect(doc.id)} className="flex-1 text-left px-3 py-2.5 min-w-0">
          <p className={`text-sm font-medium truncate pr-14 ${
            selectedId === doc.id
              ? "text-gray-900 dark:text-gray-100 hc:text-black"
              : "text-gray-600 dark:text-gray-300 hc:text-white group-hover:text-gray-900 dark:group-hover:text-gray-100 hc:group-hover:text-white"
          }`}>
            {doc.title || "Untitled"}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 hc:text-gray-300 mt-0.5">
            {formatDate(doc.updatedAt)}
          </p>
        </button>

        {/* Star */}
        <button
          onClick={(e) => { e.stopPropagation(); handleStar(doc.id) }}
          className={`absolute right-8 p-1 rounded transition-all ${
            doc.starred
              ? "text-amber-400 opacity-100 hover:text-amber-500"
              : "text-gray-400 opacity-0 group-hover:opacity-100 hover:text-amber-400 dark:text-gray-500"
          }`}
          aria-label={doc.starred ? "Unstar" : "Star"}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={doc.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </button>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(doc.id) }}
          className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
          aria-label="Delete document"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  // ── Section label ───────────────────────────────────────────────────────────

  function SectionLabel({ label }: { label: string }) {
    return (
      <p className="px-5 pb-1 text-xs font-medium text-gray-400 dark:text-gray-500 hc:text-gray-400 uppercase tracking-wide">
        {label}
      </p>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 hc:bg-black">

      {/* ── Mobile top bar ── */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 hc:bg-black border-b border-gray-200 dark:border-gray-700 hc:border-white shrink-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1 text-gray-500 dark:text-gray-400 hc:text-white hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          aria-label="Open sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Docu</h1>
        <button onClick={cycleTheme} className="ml-auto p-1 text-gray-400 dark:text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors" aria-label="Cycle theme">
          {theme === "light" ? <SunIcon /> : theme === "dark" ? <MoonIcon /> : <ContrastIcon />}
        </button>
      </header>

      {/* ── Main workspace ── */}
      <div className="flex flex-1 min-h-0">

        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar ── */}
        <aside className={`
          flex flex-col w-60 shrink-0 bg-white dark:bg-gray-800 hc:bg-black
          border-r border-gray-200 dark:border-gray-700 hc:border-white
          fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:inset-auto md:z-auto md:translate-x-0
        `}>

          {/* Brand + theme toggle (desktop) */}
          <div className="hidden md:flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 hc:border-white">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Docu</h1>
            <button
              onClick={cycleTheme}
              title={`Theme: ${theme}. Click to cycle.`}
              className="p-1 rounded text-gray-400 dark:text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              aria-label="Cycle theme"
            >
              {theme === "light" ? <SunIcon /> : theme === "dark" ? <MoonIcon /> : <ContrastIcon />}
            </button>
          </div>

          {/* New document */}
          <div className="px-3 pt-3 pb-2">
            <button
              onClick={handleNew}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white hc:bg-white text-white dark:text-gray-900 hc:text-black text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 hc:hover:bg-gray-200 transition-colors"
            >
              <span aria-hidden>+</span> New Document
            </button>
          </div>

          {/* Blank doc warning */}
          {blankWarning && (
            <div className="px-3 pb-2">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 leading-relaxed">
                You already have a blank document open. Add a title or some content first.
              </p>
            </div>
          )}

          {/* Search */}
          <div className="px-3 pb-3">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents…"
                className="w-full pl-8 pr-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hc:text-white placeholder-gray-400 dark:placeholder-gray-500 hc:placeholder-gray-400 bg-gray-50 dark:bg-gray-700 hc:bg-black border border-gray-200 dark:border-gray-600 hc:border-white rounded-md outline-none focus:border-gray-400 dark:focus:border-gray-400 hc:focus:border-white transition-colors"
              />
            </div>
          </div>

          {/* Document list */}
          <nav className="flex-1 px-3 overflow-y-auto">
            {docs.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 hc:text-white">No documents yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 hc:text-gray-300 mt-1 leading-relaxed">
                  Hit <strong className="font-medium text-gray-500 dark:text-gray-400 hc:text-white">New Document</strong> above to get started
                </p>
              </div>
            ) : query.trim() ? (
              searchResults.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 hc:text-white">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                  <button onClick={() => setQuery("")} className="mt-2 text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    Clear search
                  </button>
                </div>
              ) : (
                searchResults.map((doc) => <DocRow key={doc.id} doc={doc} />)
              )
            ) : (
              <>
                {starredDocs.length > 0 && (
                  <>
                    <SectionLabel label="Favourites" />
                    <div className="mb-3">
                      {starredDocs.map((doc) => <DocRow key={doc.id} doc={doc} />)}
                    </div>
                  </>
                )}
                <SectionLabel label="Recent" />
                {recentDocs.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 hc:text-gray-400">
                    All documents are starred
                  </p>
                ) : (
                  recentDocs.map((doc) => <DocRow key={doc.id} doc={doc} />)
                )}
              </>
            )}
          </nav>

          {/* Upload (disabled) */}
          <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 hc:border-white">
            <button disabled className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-100 dark:border-gray-700 hc:border-gray-800 text-gray-300 dark:text-gray-600 hc:text-gray-700 text-sm font-medium rounded-md cursor-not-allowed">
              <span aria-hidden>↑</span> Upload File
            </button>
          </div>
        </aside>

        {/* ── Content pane ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {docs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 hc:bg-gray-900 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-400 dark:text-gray-400 hc:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Welcome to Docu</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500 hc:text-gray-300 mt-1 leading-relaxed">
                  Your personal document workspace. Create your first document to get started.
                </p>
                <button onClick={handleNew} className="mt-4 px-4 py-2 bg-gray-900 dark:bg-white hc:bg-white text-white dark:text-gray-900 hc:text-black text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                  New Document
                </button>
              </div>
            </div>
          ) : !selectedDoc ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 hc:bg-gray-900 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-400 hc:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">No document open</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500 hc:text-gray-300 mt-1 leading-relaxed">
                  Select a document from the sidebar, or create a new one.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Top bar */}
              <header className="bg-white dark:bg-gray-800 hc:bg-black border-b border-gray-200 dark:border-gray-700 hc:border-white px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 hc:text-gray-300 truncate">
                  {selectedDoc.title || "Untitled"}
                </p>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 hc:bg-gray-900 rounded-md p-0.5">
                    <button
                      onClick={() => setMode("edit")}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        mode === "edit"
                          ? "bg-white dark:bg-gray-600 hc:bg-white text-gray-900 dark:text-gray-100 hc:text-black shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hc:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setMode("read")}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        mode === "read"
                          ? "bg-white dark:bg-gray-600 hc:bg-white text-gray-900 dark:text-gray-100 hc:text-black shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hc:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                    >
                      Read
                    </button>
                  </div>
                  <button onClick={() => handleDelete(selectedDoc.id)} className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors">
                    Delete
                  </button>
                </div>
              </header>

              {/* Document area */}
              <main className="flex-1 overflow-auto">
                <div className="max-w-2xl mx-auto px-6 md:px-8 py-10">
                  {mode === "edit" ? (
                    <>
                      <input
                        type="text"
                        value={selectedDoc.title}
                        onChange={(e) => handleUpdate("title", e.target.value)}
                        placeholder="Untitled"
                        className="w-full text-2xl font-semibold text-gray-900 dark:text-gray-100 hc:text-white placeholder-gray-300 dark:placeholder-gray-600 hc:placeholder-gray-600 bg-transparent border-none outline-none mb-6"
                      />
                      <textarea
                        value={selectedDoc.body}
                        onChange={(e) => handleUpdate("body", e.target.value)}
                        placeholder="Start writing… (Markdown supported)"
                        className="w-full text-base text-gray-700 dark:text-gray-300 hc:text-white placeholder-gray-300 dark:placeholder-gray-600 hc:placeholder-gray-600 bg-transparent border-none outline-none resize-none leading-relaxed min-h-96 font-mono"
                      />
                      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 hc:text-gray-400">
                        {count} {count === 1 ? "word" : "words"}
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 hc:text-white mb-6">
                        {selectedDoc.title || "Untitled"}
                      </h1>
                      {selectedDoc.body ? (
                        <div className="prose prose-gray dark:prose-invert hc:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedDoc.body}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-base text-gray-400 dark:text-gray-500 hc:text-gray-400">No content yet.</p>
                      )}
                    </>
                  )}
                </div>
              </main>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  type Doc,
  type HistoryEntry,
  getAllDocs,
  putDoc,
  putAllDocs,
  clearAllDocs,
  removeDoc,
  starDoc,
  snapshotDoc,
} from "./db"

type Mode = "edit" | "read"
type Theme = "light" | "dark" | "hc"
type ImportStep =
  | { step: "idle" }
  | { step: "review"; parsed: Doc[]; choice: "merge" | "replace" | null }
  | { step: "confirm"; parsed: Doc[]; choice: "merge" | "replace" }
  | { step: "done"; count: number; mode: "merge" | "replace" }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function isBlank(doc: Doc) {
  return !doc.title.trim() && !doc.body.trim()
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

// ── Icons ─────────────────────────────────────────────────────────────────────

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

function CogIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Home() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>("edit")
  const [query, setQuery] = useState("")
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [blankWarning, setBlankWarning] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>("light")
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [importStep, setImportStep] = useState<ImportStep>({ step: "idle" })
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedDoc = docs.find((d) => d.id === selectedId) ?? null
  const count = wordCount(selectedDoc?.body ?? "")

  // All unique tags across all docs
  const allTags = Array.from(new Set(docs.flatMap((d) => d.tags ?? []))).sort()

  // Filtering: search query + active tags
  const baseFiltered = query.trim()
    ? docs.filter(
        (d) =>
          d.title.toLowerCase().includes(query.toLowerCase()) ||
          d.body.toLowerCase().includes(query.toLowerCase())
      )
    : docs

  const tagFiltered =
    activeTags.length > 0
      ? baseFiltered.filter((d) => activeTags.every((t) => (d.tags ?? []).includes(t)))
      : baseFiltered

  const starredDocs = tagFiltered.filter((d) => d.starred)
  const recentDocs = tagFiltered.filter((d) => !d.starred)
  const isFiltering = query.trim() !== "" || activeTags.length > 0

  // Load docs + theme on mount
  useEffect(() => { getAllDocs().then(setDocs) }, [])

  useEffect(() => {
    const saved = localStorage.getItem("docu-theme") as Theme | null
    if (saved && ["light", "dark", "hc"].includes(saved)) setTheme(saved)
  }, [])

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

  // ── Navigation away: snapshot non-blank, delete blank ──────────────────────

  async function handleNavigateAway() {
    if (!selectedDoc) return
    if (isBlank(selectedDoc)) {
      await removeDoc(selectedDoc.id)
      setDocs((prev) => prev.filter((d) => d.id !== selectedDoc.id))
    } else {
      const snapped = snapshotDoc(selectedDoc)
      if (snapped !== selectedDoc) {
        await putDoc(snapped)
        setDocs((prev) => prev.map((d) => (d.id === selectedDoc.id ? snapped : d)))
      }
    }
  }

  // ── Document actions ───────────────────────────────────────────────────────

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
    const doc: Doc = { id: crypto.randomUUID(), title: "", body: "", tags: [], createdAt: now, updatedAt: now }
    await putDoc(doc)
    setDocs((prev) => [doc, ...prev])
    setSelectedId(doc.id)
    setMode("edit")
    setSidebarOpen(false)
  }

  async function handleSelect(id: string) {
    await handleNavigateAway()
    setSelectedId(id)
    setMode("read")
    setShowHistory(false)
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
    if (selectedId === id) { setSelectedId(null); setShowHistory(false) }
  }

  async function handleStar(id: string) {
    const doc = docs.find((d) => d.id === id)
    if (!doc) return
    const next = !doc.starred
    await starDoc(id, next)
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, starred: next } : d)))
  }

  // ── Tags ───────────────────────────────────────────────────────────────────

  function commitTag(raw: string) {
    const tag = raw.trim().toLowerCase()
    if (!tag || !selectedDoc) return
    if ((selectedDoc.tags ?? []).includes(tag)) { setTagInput(""); return }
    const updated: Doc = { ...selectedDoc, tags: [...(selectedDoc.tags ?? []), tag], updatedAt: new Date().toISOString() }
    setDocs((prev) => prev.map((d) => (d.id === selectedId ? updated : d)))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => putDoc(updated), 500)
    setTagInput("")
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commitTag(tagInput) }
    if (e.key === "Backspace" && tagInput === "" && selectedDoc?.tags?.length) {
      const tags = selectedDoc.tags.slice(0, -1)
      const updated: Doc = { ...selectedDoc, tags, updatedAt: new Date().toISOString() }
      setDocs((prev) => prev.map((d) => (d.id === selectedId ? updated : d)))
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => putDoc(updated), 500)
    }
  }

  function handleRemoveTag(tag: string) {
    if (!selectedDoc) return
    const tags = (selectedDoc.tags ?? []).filter((t) => t !== tag)
    const updated: Doc = { ...selectedDoc, tags, updatedAt: new Date().toISOString() }
    setDocs((prev) => prev.map((d) => (d.id === selectedId ? updated : d)))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => putDoc(updated), 500)
  }

  function toggleTagFilter(tag: string) {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  // ── History ────────────────────────────────────────────────────────────────

  async function handleSaveVersion() {
    if (!selectedDoc || isBlank(selectedDoc)) return
    const snapped = snapshotDoc({ ...selectedDoc, updatedAt: new Date().toISOString() })
    await putDoc(snapped)
    setDocs((prev) => prev.map((d) => (d.id === selectedDoc.id ? snapped : d)))
  }

  async function handleRestore(entry: HistoryEntry) {
    if (!selectedDoc) return
    const restored: Doc = {
      ...selectedDoc,
      title: entry.title,
      body: entry.body,
      tags: entry.tags,
      updatedAt: new Date().toISOString(),
    }
    await putDoc(restored)
    setDocs((prev) => prev.map((d) => (d.id === selectedDoc.id ? restored : d)))
    setShowHistory(false)
    setMode("edit")
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  function handleExport() {
    const payload = JSON.stringify({ version: 1, exported: new Date().toISOString(), docs }, null, 2)
    const blob = new Blob([payload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `docu-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string)
        const parsed: Doc[] = Array.isArray(raw) ? raw : raw.docs ?? []
        if (!parsed.length) throw new Error("No documents found")
        setImportStep({ step: "review", parsed, choice: null })
      } catch {
        alert("Could not read this file. Make sure it's a valid Docu export.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleImportConfirm() {
    if (importStep.step !== "confirm") return
    const { parsed, choice } = importStep
    if (choice === "replace") {
      await clearAllDocs()
      await putAllDocs(parsed)
      setDocs(parsed)
      setSelectedId(null)
    } else {
      const existingIds = new Set(docs.map((d) => d.id))
      const incoming = parsed.filter((d) => !existingIds.has(d.id))
      await putAllDocs(incoming)
      setDocs((prev) => [...incoming, ...prev])
    }
    setImportStep({ step: "done", count: parsed.length, mode: choice })
  }

  // ── Shared sidebar doc row ─────────────────────────────────────────────────

  function DocRow({ doc }: { doc: Doc }) {
    return (
      <div className={`group relative flex items-center rounded-md mb-0.5 transition-colors ${
        selectedId === doc.id ? "bg-gray-100 dark:bg-gray-700 hc:bg-white" : "hover:bg-gray-50 dark:hover:bg-gray-700/60 hc:hover:bg-white/10"
      }`}>
        <button onClick={() => handleSelect(doc.id)} className="flex-1 text-left px-3 py-2 min-w-0">
          <p className={`text-sm font-medium truncate pr-14 ${
            selectedId === doc.id ? "text-gray-900 dark:text-gray-100 hc:text-black" : "text-gray-600 dark:text-gray-300 hc:text-white group-hover:text-gray-900 dark:group-hover:text-gray-100"
          }`}>
            {doc.title || "Untitled"}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 hc:text-gray-300 mt-0.5">{formatDate(doc.updatedAt)}</p>
          {(doc.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(doc.tags ?? []).map((tag) => (
                <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 hc:bg-gray-800 text-gray-500 dark:text-gray-300 hc:text-gray-200">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleStar(doc.id) }}
          className={`absolute right-8 p-1 rounded transition-all ${
            doc.starred ? "text-amber-400 opacity-100 hover:text-amber-500" : "text-gray-400 opacity-0 group-hover:opacity-100 hover:text-amber-400 dark:text-gray-500"
          }`} aria-label={doc.starred ? "Unstar" : "Star"}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={doc.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id) }}
          className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
          aria-label="Delete document">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  function SectionLabel({ label }: { label: string }) {
    return (
      <p className="px-5 pb-1 text-xs font-medium text-gray-400 dark:text-gray-500 hc:text-gray-400 uppercase tracking-wide">
        {label}
      </p>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 hc:bg-black">

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 hc:bg-black border-b border-gray-200 dark:border-gray-700 hc:border-white shrink-0">
        <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-500 dark:text-gray-400 hc:text-white hover:text-gray-900 dark:hover:text-gray-100 transition-colors" aria-label="Open sidebar">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Docu</h1>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={cycleTheme} className="p-1 text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors" aria-label="Cycle theme">
            {theme === "light" ? <SunIcon /> : theme === "dark" ? <MoonIcon /> : <ContrastIcon />}
          </button>
          <button onClick={() => { setShowSettings(true); setImportStep({ step: "idle" }) }} className="p-1 text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors" aria-label="Settings">
            <CogIcon />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* ── Sidebar ── */}
        <aside className={`flex flex-col w-60 shrink-0 bg-white dark:bg-gray-800 hc:bg-black border-r border-gray-200 dark:border-gray-700 hc:border-white fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:static md:inset-auto md:z-auto md:translate-x-0`}>

          {/* Brand + controls (desktop) */}
          <div className="hidden md:flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 hc:border-white">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Docu</h1>
            <div className="flex items-center gap-1">
              <button onClick={cycleTheme} title={`Theme: ${theme}`} className="p-1 rounded text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors" aria-label="Cycle theme">
                {theme === "light" ? <SunIcon /> : theme === "dark" ? <MoonIcon /> : <ContrastIcon />}
              </button>
              <button onClick={() => { setShowSettings(true); setImportStep({ step: "idle" }) }} className="p-1 rounded text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors" aria-label="Settings">
                <CogIcon />
              </button>
            </div>
          </div>

          {/* New document */}
          <div className="px-3 pt-3 pb-2">
            <button onClick={handleNew} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white hc:bg-white text-white dark:text-gray-900 hc:text-black text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
              <span aria-hidden>+</span> New Document
            </button>
          </div>

          {blankWarning && (
            <div className="px-3 pb-2">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 leading-relaxed">
                You already have a blank document open. Add a title or some content first.
              </p>
            </div>
          )}

          {/* Search */}
          <div className="px-3 pb-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents…"
                className="w-full pl-8 pr-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hc:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-gray-50 dark:bg-gray-700 hc:bg-black border border-gray-200 dark:border-gray-600 hc:border-white rounded-md outline-none focus:border-gray-400 dark:focus:border-gray-400 transition-colors" />
            </div>
          </div>

          {/* Tag filter pills */}
          {allTags.length > 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button key={tag} onClick={() => toggleTagFilter(tag)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    activeTags.includes(tag)
                      ? "bg-gray-900 dark:bg-white hc:bg-white text-white dark:text-gray-900 hc:text-black border-gray-900 dark:border-white"
                      : "bg-transparent text-gray-500 dark:text-gray-400 hc:text-gray-300 border-gray-200 dark:border-gray-600 hc:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400"
                  }`}>
                  {tag}
                </button>
              ))}
              {activeTags.length > 0 && (
                <button onClick={() => setActiveTags([])} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2">
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Document list */}
          <nav className="flex-1 px-3 overflow-y-auto">
            {docs.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 hc:text-white">No documents yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 hc:text-gray-300 mt-1 leading-relaxed">
                  Hit <strong className="font-medium text-gray-500 dark:text-gray-400 hc:text-white">New Document</strong> above
                </p>
              </div>
            ) : tagFiltered.length === 0 && isFiltering ? (
              <div className="px-3 py-6 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 hc:text-white">No results</p>
                <button onClick={() => { setQuery(""); setActiveTags([]) }} className="mt-2 text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                {starredDocs.length > 0 && (
                  <>
                    <SectionLabel label="Favourites" />
                    <div className="mb-3">{starredDocs.map((doc) => <DocRow key={doc.id} doc={doc} />)}</div>
                  </>
                )}
                <SectionLabel label={isFiltering ? "Results" : "Recent"} />
                {recentDocs.length === 0 && starredDocs.length > 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">All documents are starred</p>
                ) : (
                  recentDocs.map((doc) => <DocRow key={doc.id} doc={doc} />)
                )}
              </>
            )}
          </nav>

          {/* Upload (disabled) */}
          <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 hc:border-white">
            <button disabled className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-100 dark:border-gray-700 hc:border-gray-800 text-gray-300 dark:text-gray-600 text-sm font-medium rounded-md cursor-not-allowed">
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
                  <svg className="w-6 h-6 text-gray-400 hc:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Welcome to Docu</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500 hc:text-gray-300 mt-1 leading-relaxed">Your personal document workspace.</p>
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
                <p className="text-sm text-gray-400 dark:text-gray-500 hc:text-gray-300 mt-1 leading-relaxed">Select a document from the sidebar, or create a new one.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Top bar */}
              <header className="bg-white dark:bg-gray-800 hc:bg-black border-b border-gray-200 dark:border-gray-700 hc:border-white px-4 md:px-6 py-3 flex items-center justify-between gap-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 hc:text-gray-300 truncate min-w-0">{selectedDoc.title || "Untitled"}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={handleSaveVersion}
                    title="Save version"
                    disabled={!selectedDoc || isBlank(selectedDoc)}
                    className="px-2.5 py-1 text-xs font-medium rounded bg-gray-900 dark:bg-white hc:bg-white text-white dark:text-gray-900 hc:text-black hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Save
                  </button>
                  <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 hc:bg-gray-900 rounded-md p-0.5">
                    {(["edit", "read"] as Mode[]).map((m) => (
                      <button key={m} onClick={() => setMode(m)}
                        className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-colors ${
                          mode === m ? "bg-white dark:bg-gray-600 hc:bg-white text-gray-900 dark:text-gray-100 hc:text-black shadow-sm" : "text-gray-500 dark:text-gray-400 hc:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}>{m}</button>
                    ))}
                  </div>
                  <button onClick={() => setShowHistory((v) => !v)}
                    title="Version history"
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                      showHistory ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hc:text-white" : "text-gray-500 dark:text-gray-400 hc:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}>
                    <ClockIcon />
                    <span className="hidden sm:inline">History</span>
                  </button>
                  <button onClick={() => handleDelete(selectedDoc.id)}
                    title="Delete document"
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors" aria-label="Delete document">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </header>

              {/* History panel */}
              {showHistory && (
                <div className="bg-gray-50 dark:bg-gray-800/60 hc:bg-gray-950 border-b border-gray-200 dark:border-gray-700 hc:border-white px-4 md:px-6 py-3">
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 hc:text-gray-300 uppercase tracking-wide">Version history</p>
                  </div>
                  {!selectedDoc.history?.length ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 hc:text-gray-400">No saved versions yet. Navigate away or click &ldquo;Save version&rdquo; to capture one.</p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {selectedDoc.history.map((entry, i) => (
                        <div key={i} className="shrink-0 w-48 rounded-md border border-gray-200 dark:border-gray-600 hc:border-gray-600 bg-white dark:bg-gray-700 hc:bg-gray-900 p-3">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-200 hc:text-white truncate">{entry.title || "Untitled"}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 hc:text-gray-400 mt-0.5">{formatTime(entry.savedAt)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{wordCount(entry.body)} words</p>
                          <button onClick={() => handleRestore(entry)} className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-300 hc:text-white hover:text-gray-900 dark:hover:text-gray-100 underline underline-offset-2 transition-colors">
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Document area */}
              <main className="flex-1 overflow-auto">
                <div className="max-w-2xl mx-auto px-6 md:px-8 py-10">
                  {mode === "edit" ? (
                    <>
                      <input type="text" value={selectedDoc.title} onChange={(e) => handleUpdate("title", e.target.value)} placeholder="Untitled"
                        className="w-full text-2xl font-semibold text-gray-900 dark:text-gray-100 hc:text-white placeholder-gray-300 dark:placeholder-gray-600 bg-transparent border-none outline-none mb-6" />
                      <textarea value={selectedDoc.body} onChange={(e) => handleUpdate("body", e.target.value)} placeholder="Start writing… (Markdown supported)"
                        className="w-full text-base text-gray-700 dark:text-gray-300 hc:text-white placeholder-gray-300 dark:placeholder-gray-600 bg-transparent border-none outline-none resize-none leading-relaxed min-h-96 font-mono" />
                      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 hc:text-gray-400">{count} {count === 1 ? "word" : "words"}</p>

                      {/* Tags input */}
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 hc:border-gray-800">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {(selectedDoc.tags ?? []).map((tag) => (
                            <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 hc:bg-gray-800 text-gray-600 dark:text-gray-300 hc:text-gray-200">
                              {tag}
                              <button onClick={() => handleRemoveTag(tag)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label={`Remove tag ${tag}`}>×</button>
                            </span>
                          ))}
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            onBlur={() => commitTag(tagInput)}
                            placeholder={(selectedDoc.tags ?? []).length === 0 ? "Add tags…" : ""}
                            className="text-xs text-gray-600 dark:text-gray-300 hc:text-white placeholder-gray-400 bg-transparent outline-none min-w-16"
                          />
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Press Enter or comma to add a tag</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 hc:text-white mb-6">{selectedDoc.title || "Untitled"}</h1>
                      {(selectedDoc.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          {(selectedDoc.tags ?? []).map((tag) => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 hc:bg-gray-800 text-gray-500 dark:text-gray-300 hc:text-gray-200">{tag}</span>
                          ))}
                        </div>
                      )}
                      {selectedDoc.body ? (
                        <div className="prose prose-gray dark:prose-invert hc:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedDoc.body}</ReactMarkdown>
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

      {/* ── Settings modal ─────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSettings(false)} />
          <div className="relative bg-white dark:bg-gray-800 hc:bg-black border border-gray-200 dark:border-gray-600 hc:border-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Export */}
            <div className="mb-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 hc:text-gray-300 uppercase tracking-wide mb-2">Export</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 hc:text-gray-400 mb-3">Download all your documents as a JSON file you can back up or re-import later.</p>
              <button onClick={handleExport} className="w-full px-3 py-2 bg-gray-900 dark:bg-white hc:bg-white text-white dark:text-gray-900 hc:text-black text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                Download workspace
              </button>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 hc:border-gray-800 pt-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 hc:text-gray-300 uppercase tracking-wide mb-2">Import</p>

              {importStep.step === "idle" && (
                <>
                  <p className="text-xs text-gray-400 dark:text-gray-500 hc:text-gray-400 mb-3">Load documents from a previously exported file.</p>
                  <label className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-600 hc:border-white text-sm font-medium text-gray-600 dark:text-gray-300 hc:text-white text-center rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                    Choose file…
                    <input ref={fileInputRef} type="file" accept=".json" className="sr-only" onChange={handleImportFile} />
                  </label>
                </>
              )}

              {importStep.step === "review" && (
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-200 hc:text-white mb-3">
                    Found <strong>{importStep.parsed.length}</strong> document{importStep.parsed.length !== 1 ? "s" : ""}.
                    How would you like to import?
                  </p>
                  <div className="space-y-2 mb-4">
                    {(["merge", "replace"] as const).map((choice) => (
                      <label key={choice} className={`flex items-start gap-2.5 p-3 rounded-md border cursor-pointer transition-colors ${
                        importStep.choice === choice ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-700" : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                      }`}>
                        <input type="radio" name="import-choice" value={choice} checked={importStep.choice === choice}
                          onChange={() => setImportStep({ ...importStep, choice })} className="mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 hc:text-white capitalize">{choice}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {choice === "merge" ? "Keep your current documents and add any new ones from the file." : "Remove all current documents and replace with the imported ones."}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setImportStep({ step: "idle" })} className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                    <button disabled={!importStep.choice} onClick={() => importStep.choice && setImportStep({ step: "confirm", parsed: importStep.parsed, choice: importStep.choice })}
                      className="flex-1 px-3 py-1.5 bg-gray-900 dark:bg-white hc:bg-white disabled:opacity-40 text-white dark:text-gray-900 text-xs font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {importStep.step === "confirm" && (
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-200 hc:text-white mb-1">
                    <strong>Are you sure?</strong>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 hc:text-gray-400 mb-4">
                    {importStep.choice === "replace"
                      ? `This will permanently delete all ${docs.length} current document${docs.length !== 1 ? "s" : ""} and replace them with the ${importStep.parsed.length} imported.`
                      : `${importStep.parsed.filter((d) => !docs.find((e) => e.id === d.id)).length} new document${importStep.parsed.filter((d) => !docs.find((e) => e.id === d.id)).length !== 1 ? "s" : ""} will be added to your workspace.`}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setImportStep({ step: "review", parsed: importStep.parsed, choice: importStep.choice })} className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Back</button>
                    <button onClick={handleImportConfirm} className={`flex-1 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors ${
                      importStep.choice === "replace" ? "bg-red-600 hover:bg-red-700" : "bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100"
                    }`}>
                      {importStep.choice === "replace" ? "Replace everything" : "Merge documents"}
                    </button>
                  </div>
                </div>
              )}

              {importStep.step === "done" && (
                <div className="text-center py-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200 hc:text-white">Import complete</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {importStep.mode === "replace" ? `Workspace replaced with ${importStep.count} document${importStep.count !== 1 ? "s" : ""}.` : "Documents merged successfully."}
                  </p>
                  <button onClick={() => setImportStep({ step: "idle" })} className="mt-3 text-xs text-gray-500 dark:text-gray-400 underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-200">
                    Import another file
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

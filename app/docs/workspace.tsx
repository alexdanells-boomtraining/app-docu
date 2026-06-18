"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"
import {
  type Doc,
  type Folder,
  type HistoryEntry,
  getAllDocs,
  putDoc,
  putAllDocs,
  clearAllDocs,
  removeDoc,
  trashDoc,
  restoreDoc,
  emptyTrash,
  setDocFolder,
  starDoc,
  snapshotDoc,
  getAllFolders,
  putFolder,
  removeFolder,
} from "../db"

type Mode = "edit" | "read"
type Theme = "light" | "dark" | "hc"
type ImportStep =
  | { step: "idle" }
  | { step: "review"; parsed: Doc[]; choice: "merge" | "replace" | null }
  | { step: "confirm"; parsed: Doc[]; choice: "merge" | "replace" }
  | { step: "done"; count: number; mode: "merge" | "replace" }
type PaletteItem =
  | { kind: "action"; id: string; label: string; onSelect: () => void }
  | { kind: "folder"; folder: Folder }
  | { kind: "doc"; doc: Doc; folderName: string | null }

// ── Helpers ────────────────────────────────────────────────────────────────────

function stripHtml(html: string) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}

function isBlank(doc: Doc) {
  return !doc.title.trim() && !stripHtml(doc.body ?? "")
}

function wordCount(html: string) {
  const text = stripHtml(html)
  return text ? text.split(" ").length : 0
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function formatUpdated(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// Converts plain text / Markdown to simple HTML for the one-time migration
function textToHtml(text: string): string {
  if (!text.trim()) return ""
  return text
    .split(/\n{2,}/)
    .map((para) =>
      `<p>${para
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")
      }</p>`
    )
    .join("")
}

async function runMigration(docs: Doc[]): Promise<Doc[]> {
  if (typeof localStorage === "undefined") return docs
  if (localStorage.getItem("superdocu-v2-rich-text")) return docs
  const needsMigration = docs.filter(
    (d) => d.body && !/<[a-z][\s\S]*>/i.test(d.body)
  )
  if (needsMigration.length > 0) {
    const updated = needsMigration.map((d) => ({ ...d, body: textToHtml(d.body) }))
    await putAllDocs(updated)
    docs = docs.map((d) => updated.find((u) => u.id === d.id) ?? d)
  }
  localStorage.setItem("superdocu-v2-rich-text", "1")
  return docs
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function SunIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg> }
function MoonIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg> }
function ContrastIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" /><path d="M12 3a9 9 0 0 1 0 18V3Z" fill="currentColor" /></svg> }
function CogIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg> }
function ClockIcon() { return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> }
function FolderIcon({ open }: { open?: boolean }) {
  return open
    ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" /></svg>
    : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0v-8.25a2.25 2.25 0 0 0-2.25-2.25H8.69" /></svg>
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className ?? "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
}

// ── Toolbar button ─────────────────────────────────────────────────────────────

function ToolbarBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`px-1.5 py-1 text-sm rounded transition-colors ${
        active
          ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 hc:bg-white hc:text-black"
          : "text-gray-500 dark:text-gray-400 hc:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
      }`}>
      {children}
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Workspace({ initialId }: { initialId: string | null }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(initialId)
  const [mode, setMode] = useState<Mode>(initialId ? "read" : "edit")
  const [query, setQuery] = useState("")
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [blankWarning, setBlankWarning] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>("light")
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [importStep, setImportStep] = useState<ImportStep>({ step: "idle" })
  const [notFound, setNotFound] = useState(false)
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set())
  const [trashOpen, setTrashOpen] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null)
  const [contextMenu, setContextMenu] = useState<{ docId: string; x: number; y: number } | null>(null)
  const [dragDocId, setDragDocId] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | "unfiled" | null>(null)
  const [showPalette, setShowPalette] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState("")
  const [paletteIndex, setPaletteIndex] = useState(0)
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const paletteInputRef = useRef<HTMLInputElement>(null)
  const newFolderRef = useRef<HTMLInputElement>(null)
  // Ref so TipTap's onUpdate callback always sees the latest handler without stale closures
  const bodyUpdateRef = useRef<(html: string) => void>(() => {})

  const activeDocs = docs.filter((d) => !d.deletedAt)
  const trashedDocs = docs.filter((d) => !!d.deletedAt)
  const selectedDoc = activeDocs.find((d) => d.id === selectedId) ?? null

  const allTags = Array.from(new Set(activeDocs.flatMap((d) => d.tags ?? []))).sort()
  const isFiltering = query.trim() !== "" || activeTags.length > 0

  const searchFiltered = useMemo(() => {
    let base = activeDocs
    if (query.trim()) base = base.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
    if (activeTags.length) base = base.filter((d) => activeTags.every((t) => (d.tags ?? []).includes(t)))
    return base
  }, [docs, query, activeTags]) // eslint-disable-line react-hooks/exhaustive-deps

  const starredDocs = searchFiltered.filter((d) => d.starred)
  const nonStarred = searchFiltered.filter((d) => !d.starred)

  // Keep the body update handler fresh so TipTap's onUpdate never goes stale
  bodyUpdateRef.current = (html: string) => {
    if (!selectedDoc) return
    const updated: Doc = { ...selectedDoc, body: html, updatedAt: new Date().toISOString() }
    setDocs((prev) => prev.map((d) => (d.id === selectedId ? updated : d)))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => putDoc(updated), 500)
  }

  // ── Rich text editor ──────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: "",
    editable: mode === "edit",
    onUpdate: ({ editor }) => {
      bodyUpdateRef.current(editor.getHTML())
    },
  })

  // Sync editor content when doc changes or docs first load
  useEffect(() => {
    if (!editor || !docsLoaded) return
    editor.commands.setContent(selectedDoc?.body ?? "", { emitUpdate: false })
  }, [editor, selectedId, docsLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync editable state when mode changes
  useEffect(() => {
    if (!editor) return
    editor.setEditable(mode === "edit")
  }, [mode, editor])

  // ── URL sync ──────────────────────────────────────────────────────────────

  function navigate(id: string | null) {
    setSelectedId(id)
    window.history.replaceState(null, "", id ? `/docs/${id}` : "/docs")
  }

  // ── Load data + theme ─────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([getAllDocs(), getAllFolders()]).then(async ([loadedDocs, loadedFolders]) => {
      const migrated = await runMigration(loadedDocs)
      setDocs(migrated)
      setFolders(loadedFolders)
      setDocsLoaded(true)
      if (initialId && !migrated.find((d) => d.id === initialId && !d.deletedAt)) {
        setNotFound(true)
        setSelectedId(null)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Auto-focus title on new blank doc
  useEffect(() => {
    if (selectedDoc && isBlank(selectedDoc) && mode === "edit") {
      setTimeout(() => titleRef.current?.focus(), 30)
    }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [contextMenu])

  // Cmd+K palette shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setShowPalette((v) => !v)
        setPaletteQuery("")
        setPaletteIndex(0)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (showPalette) setTimeout(() => paletteInputRef.current?.focus(), 30)
  }, [showPalette])

  useEffect(() => { setPaletteIndex(0) }, [paletteQuery])

  function cycleTheme() {
    setTheme((t) => (t === "light" ? "dark" : t === "dark" ? "hc" : "light"))
  }

  // ── Navigate away ─────────────────────────────────────────────────────────

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

  // ── Document actions ──────────────────────────────────────────────────────

  async function handleNew() {
    const existingBlank = activeDocs.find(isBlank)
    if (existingBlank) {
      setBlankWarning(true)
      if (warningTimer.current) clearTimeout(warningTimer.current)
      warningTimer.current = setTimeout(() => setBlankWarning(false), 3500)
      navigate(existingBlank.id)
      setMode("edit")
      setSidebarOpen(false)
      return
    }
    const now = new Date().toISOString()
    const doc: Doc = { id: crypto.randomUUID(), title: "", body: "", tags: [], createdAt: now, updatedAt: now }
    await putDoc(doc)
    setDocs((prev) => [doc, ...prev])
    navigate(doc.id)
    setMode("edit")
    setSidebarOpen(false)
  }

  async function handleSelect(id: string) {
    await handleNavigateAway()
    navigate(id)
    setMode("read")
    setShowHistory(false)
    setSidebarOpen(false)
  }

  function handleUpdate(field: "title", value: string) {
    if (!selectedDoc) return
    setBlankWarning(false)
    const updated: Doc = { ...selectedDoc, [field]: value, updatedAt: new Date().toISOString() }
    setDocs((prev) => prev.map((d) => (d.id === selectedId ? updated : d)))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => putDoc(updated), 500)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); editor?.commands.focus("start") }
  }

  async function handleTrash(id: string) {
    await trashDoc(id)
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, deletedAt: new Date().toISOString() } : d)))
    if (selectedId === id) { navigate(null); setShowHistory(false) }
  }

  async function handleRestore(id: string) {
    await restoreDoc(id)
    setDocs((prev) => prev.map((d) => {
      if (d.id !== id) return d
      const r = { ...d }; delete r.deletedAt; return r
    }))
  }

  async function handleEmptyTrash() {
    await emptyTrash()
    setDocs((prev) => prev.filter((d) => !d.deletedAt))
    setConfirmEmptyTrash(false)
  }

  async function handleStar(id: string) {
    const doc = docs.find((d) => d.id === id)
    if (!doc) return
    const next = !doc.starred
    await starDoc(id, next)
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, starred: next } : d)))
  }

  // ── Folders ───────────────────────────────────────────────────────────────

  async function handleCreateFolder() {
    const name = newFolderName.trim()
    setCreatingFolder(false); setNewFolderName("")
    if (!name) return
    const folder: Folder = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
    await putFolder(folder)
    setFolders((prev) => [...prev, folder])
  }

  async function handleMoveDocToFolder(docId: string, folderId: string | null) {
    await setDocFolder(docId, folderId)
    setDocs((prev) => prev.map((d) => {
      if (d.id !== docId) return d
      const u = { ...d }
      if (folderId) u.folderId = folderId; else delete u.folderId
      return u
    }))
    setContextMenu(null)
  }

  function handleDrop(target: string | "unfiled") {
    if (!dragDocId) return
    handleMoveDocToFolder(dragDocId, target === "unfiled" ? null : target)
    setDragDocId(null); setDragOverTarget(null)
  }

  function openContextMenu(docId: string, e: React.MouseEvent) {
    e.preventDefault()
    const x = Math.min(e.clientX, window.innerWidth - 180)
    const y = Math.min(e.clientY, window.innerHeight - (folders.length * 36 + 80))
    setContextMenu({ docId, x, y })
  }

  async function handleDeleteFolder(action: "unfiled" | "trash") {
    if (!deleteFolderTarget) return
    const affected = activeDocs.filter((d) => d.folderId === deleteFolderTarget.id)
    for (const doc of affected) {
      if (action === "trash") {
        await trashDoc(doc.id)
        setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, deletedAt: new Date().toISOString() } : d))
      } else {
        await setDocFolder(doc.id, null)
        setDocs((prev) => prev.map((d) => { if (d.id !== doc.id) return d; const u = { ...d }; delete u.folderId; return u }))
      }
    }
    await removeFolder(deleteFolderTarget.id)
    setFolders((prev) => prev.filter((f) => f.id !== deleteFolderTarget.id))
    if (selectedId && affected.find((d) => d.id === selectedId) && action === "trash") navigate(null)
    setDeleteFolderTarget(null)
  }

  function toggleFolder(id: string) {
    setCollapsedFolderIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  // ── Tags ──────────────────────────────────────────────────────────────────

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

  // ── History ───────────────────────────────────────────────────────────────

  async function handleSaveVersion() {
    if (!selectedDoc || isBlank(selectedDoc)) return
    const snapped = snapshotDoc({ ...selectedDoc, updatedAt: new Date().toISOString() })
    await putDoc(snapped)
    setDocs((prev) => prev.map((d) => (d.id === selectedDoc.id ? snapped : d)))
  }

  async function handleRestoreVersion(entry: HistoryEntry) {
    if (!selectedDoc) return
    const restored: Doc = { ...selectedDoc, title: entry.title, body: entry.body, tags: entry.tags, updatedAt: new Date().toISOString() }
    await putDoc(restored)
    setDocs((prev) => prev.map((d) => (d.id === selectedDoc.id ? restored : d)))
    editor?.commands.setContent(entry.body, { emitUpdate: false })
    setShowHistory(false)
    setMode("edit")
  }

  // ── Export / Import ───────────────────────────────────────────────────────

  function handleExport() {
    const payload = JSON.stringify({ version: 2, exported: new Date().toISOString(), docs: activeDocs, folders }, null, 2)
    const blob = new Blob([payload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `superdocu-export-${new Date().toISOString().slice(0, 10)}.json`
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
        if (!parsed.length) throw new Error()
        setImportStep({ step: "review", parsed, choice: null })
      } catch {
        alert("Could not read this file. Make sure it's a valid SuperDocu export.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleImportConfirm() {
    if (importStep.step !== "confirm") return
    const { parsed, choice } = importStep
    if (choice === "replace") {
      await clearAllDocs(); await putAllDocs(parsed)
      setDocs(parsed); navigate(null)
    } else {
      const existingIds = new Set(docs.map((d) => d.id))
      const incoming = parsed.filter((d) => !existingIds.has(d.id))
      await putAllDocs(incoming)
      setDocs((prev) => [...incoming, ...prev])
    }
    setImportStep({ step: "done", count: parsed.length, mode: choice })
  }

  // ── Command palette ───────────────────────────────────────────────────────

  const paletteItems: PaletteItem[] = useMemo(() => {
    const q = paletteQuery.toLowerCase()
    const rawActions: Array<{ kind: "action"; id: string; label: string; onSelect: () => void }> = [
      { kind: "action", id: "new-doc", label: "New Document", onSelect: () => { setShowPalette(false); handleNew() } },
      { kind: "action", id: "new-folder", label: "New Folder", onSelect: () => { setShowPalette(false); setCreatingFolder(true); setTimeout(() => newFolderRef.current?.focus(), 50) } },
      { kind: "action", id: "settings", label: "Open Settings", onSelect: () => { setShowPalette(false); setShowSettings(true); setImportStep({ step: "idle" }) } },
      { kind: "action", id: "theme", label: `Toggle theme (${theme})`, onSelect: () => cycleTheme() },
    ]
    if (trashedDocs.length > 0) rawActions.push({ kind: "action", id: "empty-trash", label: "Empty Trash", onSelect: () => { setShowPalette(false); setConfirmEmptyTrash(true) } })
    const actions: PaletteItem[] = rawActions.filter((a) => !q || a.label.toLowerCase().includes(q))
    const folderItems: PaletteItem[] = folders.filter((f) => !q || f.name.toLowerCase().includes(q)).map((f) => ({ kind: "folder", folder: f }))
    const docItems: PaletteItem[] = activeDocs.filter((d) => !q || d.title.toLowerCase().includes(q)).map((d) => ({ kind: "doc", doc: d, folderName: folders.find((f) => f.id === d.folderId)?.name ?? null }))
    return [...actions, ...folderItems, ...docItems]
  }, [paletteQuery, docs, folders, theme]) // eslint-disable-line react-hooks/exhaustive-deps

  function selectPaletteItem(item: PaletteItem) {
    if (item.kind === "action") { item.onSelect(); return }
    if (item.kind === "folder") { setShowPalette(false); setCollapsedFolderIds((prev) => { const next = new Set(prev); next.delete(item.folder.id); return next }); setSidebarOpen(true); return }
    setShowPalette(false); handleSelect(item.doc.id)
  }

  function handlePaletteKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIndex((i) => Math.min(i + 1, paletteItems.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setPaletteIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === "Enter") { e.preventDefault(); if (paletteItems[paletteIndex]) selectPaletteItem(paletteItems[paletteIndex]) }
    else if (e.key === "Escape") { e.preventDefault(); setShowPalette(false) }
  }

  // ── DocRow ────────────────────────────────────────────────────────────────

  function DocRow({ doc, inTrash = false }: { doc: Doc; inTrash?: boolean }) {
    return (
      <div
        draggable={!inTrash}
        onDragStart={() => setDragDocId(doc.id)}
        onDragEnd={() => { setDragDocId(null); setDragOverTarget(null) }}
        onContextMenu={(e) => !inTrash && openContextMenu(doc.id, e)}
        className={`group relative flex items-center rounded-md mb-0.5 transition-colors ${dragDocId === doc.id ? "opacity-40" : ""} ${
          selectedId === doc.id && !inTrash ? "bg-gray-100 dark:bg-gray-700 hc:bg-white" : "hover:bg-gray-50 dark:hover:bg-gray-700/60 hc:hover:bg-white/10"
        }`}
      >
        <button onClick={() => !inTrash && handleSelect(doc.id)} className="flex-1 text-left px-3 py-2 min-w-0">
          <p className={`text-sm font-medium truncate pr-14 ${selectedId === doc.id && !inTrash ? "text-gray-900 dark:text-gray-100 hc:text-black" : "text-gray-600 dark:text-gray-300 hc:text-white group-hover:text-gray-900 dark:group-hover:text-gray-100"}`}>
            {doc.title || "Untitled"}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 hc:text-gray-300 mt-0.5">
            {inTrash ? `Trashed ${formatUpdated(doc.deletedAt!)}` : formatUpdated(doc.updatedAt)}
          </p>
          {(doc.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(doc.tags ?? []).map((tag) => (
                <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 hc:bg-gray-800 text-gray-500 dark:text-gray-300 hc:text-gray-200">{tag}</span>
              ))}
            </div>
          )}
        </button>
        {inTrash ? (
          <button onClick={() => handleRestore(doc.id)} className="absolute right-2 text-xs font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors opacity-0 group-hover:opacity-100">Restore</button>
        ) : (
          <>
            <button onClick={(e) => { e.stopPropagation(); handleStar(doc.id) }}
              className={`absolute right-8 p-1 rounded transition-all ${doc.starred ? "text-amber-400 opacity-100 hover:text-amber-500" : "text-gray-400 opacity-0 group-hover:opacity-100 hover:text-amber-400 dark:text-gray-500"}`}
              aria-label={doc.starred ? "Unstar" : "Star"}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={doc.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleTrash(doc.id) }}
              className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
              aria-label="Move to trash">
              <TrashIcon />
            </button>
          </>
        )}
      </div>
    )
  }

  function SectionLabel({ label }: { label: string }) {
    return <p className="px-3 pb-1 text-xs font-medium text-gray-400 dark:text-gray-500 hc:text-gray-400 uppercase tracking-wide">{label}</p>
  }

  function FolderDropZone({ target, children }: { target: string | "unfiled"; children: React.ReactNode }) {
    return (
      <div
        onDragOver={(e) => { if (dragDocId) { e.preventDefault(); setDragOverTarget(target) } }}
        onDragLeave={() => setDragOverTarget(null)}
        onDrop={() => handleDrop(target)}
        className={`rounded-md transition-colors ${dragDocId && dragOverTarget === target ? "bg-gray-50 dark:bg-gray-700/40 ring-1 ring-gray-200 dark:ring-gray-600" : ""}`}
      >
        {children}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 hc:bg-black">

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 hc:bg-black border-b border-gray-200 dark:border-gray-700 hc:border-white shrink-0">
        <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-500 dark:text-gray-400 hc:text-white" aria-label="Open sidebar">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
        </button>
        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">SuperDocu</h1>
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
        <aside className={`flex flex-col w-64 shrink-0 bg-white dark:bg-gray-800 hc:bg-black border-r border-gray-200 dark:border-gray-700 hc:border-white fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:static md:inset-auto md:z-auto md:translate-x-0`}>
          <div className="hidden md:flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 hc:border-white">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">SuperDocu</h1>
            <div className="flex items-center gap-1">
              <button onClick={cycleTheme} title={`Theme: ${theme}`} className="p-1 rounded text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors"><svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg></button>
              <button onClick={cycleTheme} title={`Theme: ${theme}`} className="p-1 rounded text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors" aria-label="Cycle theme">
                {theme === "light" ? <SunIcon /> : theme === "dark" ? <MoonIcon /> : <ContrastIcon />}
              </button>
              <button onClick={() => { setShowSettings(true); setImportStep({ step: "idle" }) }} className="p-1 rounded text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors" aria-label="Settings">
                <CogIcon />
              </button>
            </div>
          </div>

          <div className="px-3 pt-3 pb-2 flex gap-2">
            <button onClick={handleNew} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white hc:bg-white text-white dark:text-gray-900 hc:text-black text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
              <span>+</span> New Document
            </button>
            <button onClick={() => { setCreatingFolder(true); setTimeout(() => newFolderRef.current?.focus(), 30) }} title="New folder" className="px-3 py-2 border border-gray-200 dark:border-gray-600 hc:border-white text-gray-500 dark:text-gray-400 hc:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors" aria-label="New folder">
              <FolderIcon />
            </button>
          </div>

          {blankWarning && (
            <div className="px-3 pb-2">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 leading-relaxed">You already have a blank document open.</p>
            </div>
          )}

          {creatingFolder && (
            <div className="px-3 pb-2">
              <input ref={newFolderRef} type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName("") } }}
                onBlur={handleCreateFolder} placeholder="Folder name…"
                className="w-full px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-200 hc:text-white bg-gray-50 dark:bg-gray-700 hc:bg-black border border-gray-300 dark:border-gray-500 hc:border-white rounded-md outline-none focus:border-gray-500 transition-colors" />
            </div>
          )}

          <div className="px-3 pb-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title…"
                className="w-full pl-8 pr-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hc:text-white placeholder-gray-400 bg-gray-50 dark:bg-gray-700 hc:bg-black border border-gray-200 dark:border-gray-600 hc:border-white rounded-md outline-none focus:border-gray-400 transition-colors" />
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button key={tag} onClick={() => toggleTagFilter(tag)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${activeTags.includes(tag) ? "bg-gray-900 dark:bg-white hc:bg-white text-white dark:text-gray-900 hc:text-black border-gray-900 dark:border-white" : "text-gray-500 dark:text-gray-400 hc:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400"}`}>
                  {tag}
                </button>
              ))}
              {activeTags.length > 0 && <button onClick={() => setActiveTags([])} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">Clear</button>}
            </div>
          )}

          <nav className="flex-1 px-3 overflow-y-auto">
            {activeDocs.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-xs font-medium text-gray-500 hc:text-white">No documents yet</p>
                <p className="text-xs text-gray-400 mt-1">Hit <strong className="text-gray-500">New Document</strong> above</p>
              </div>
            ) : isFiltering ? (
              searchFiltered.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-xs font-medium text-gray-500 hc:text-white">No results</p>
                  <button onClick={() => { setQuery(""); setActiveTags([]) }} className="mt-2 text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600">Clear filters</button>
                </div>
              ) : (
                <><SectionLabel label="Results" />{searchFiltered.map((doc) => <DocRow key={doc.id} doc={doc} />)}</>
              )
            ) : (
              <>
                {starredDocs.length > 0 && (
                  <><SectionLabel label="Favourites" /><div className="mb-3">{starredDocs.map((doc) => <DocRow key={doc.id} doc={doc} />)}</div></>
                )}
                {folders.map((folder) => {
                  const folderDocs = nonStarred.filter((d) => d.folderId === folder.id)
                  const expanded = !collapsedFolderIds.has(folder.id)
                  return (
                    <FolderDropZone key={folder.id} target={folder.id}>
                      <div className="flex items-center justify-between pr-1 mb-0.5 group/folder">
                        <button onClick={() => toggleFolder(folder.id)} className="flex-1 flex items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hc:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                          <FolderIcon open={expanded} />
                          <span>{folder.name}</span>
                          <span className="text-gray-300 dark:text-gray-600 font-normal ml-0.5">{folderDocs.length}</span>
                        </button>
                        <button onClick={() => setDeleteFolderTarget(folder)} className="opacity-0 group-hover/folder:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all" aria-label={`Delete folder ${folder.name}`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      {expanded && (
                        <div className="mb-2">
                          {folderDocs.length === 0 ? <p className="px-3 py-1 text-xs text-gray-400 italic">Empty — drag documents here</p> : folderDocs.map((doc) => <DocRow key={doc.id} doc={doc} />)}
                        </div>
                      )}
                    </FolderDropZone>
                  )
                })}
                <FolderDropZone target="unfiled">
                  {(folders.length > 0 || nonStarred.filter((d) => !d.folderId).length > 0) && (
                    <SectionLabel label={folders.length > 0 ? "Unfiled" : "Recent"} />
                  )}
                  {nonStarred.filter((d) => !d.folderId).map((doc) => <DocRow key={doc.id} doc={doc} />)}
                </FolderDropZone>
              </>
            )}
          </nav>

          {/* Trash */}
          <div className="border-t border-gray-100 dark:border-gray-700 hc:border-gray-800">
            <button onClick={() => setTrashOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <span className="flex items-center gap-1.5"><TrashIcon className="w-3.5 h-3.5" /> Trash {trashedDocs.length > 0 && `(${trashedDocs.length})`}</span>
              <svg className={`w-3 h-3 transition-transform ${trashOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
            </button>
            {trashOpen && (
              <div className="px-3 pb-2">
                {trashedDocs.length === 0 ? (
                  <p className="text-xs text-gray-400 px-3 py-1">Trash is empty</p>
                ) : (
                  <>
                    {trashedDocs.map((doc) => <DocRow key={doc.id} doc={doc} inTrash />)}
                    <button onClick={() => setConfirmEmptyTrash(true)} className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">Empty Trash</button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 hc:border-white">
            <button disabled className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600 text-sm font-medium rounded-md cursor-not-allowed">
              <span>↑</span> Upload File
            </button>
          </div>
        </aside>

        {/* ── Content pane ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {notFound ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Document not found</h2>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">This document may have been deleted or the link is incorrect.</p>
                <Link href="/docs" onClick={() => setNotFound(false)} className="inline-block mt-4 px-4 py-2 bg-gray-900 dark:bg-white hc:bg-white text-white dark:text-gray-900 hc:text-black text-sm font-medium rounded-md hover:bg-gray-700 transition-colors">Back to workspace</Link>
              </div>
            </div>
          ) : activeDocs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Welcome to SuperDocu</h2>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">Your personal document workspace.</p>
                <button onClick={handleNew} className="mt-4 px-4 py-2 bg-gray-900 dark:bg-white hc:bg-white text-white dark:text-gray-900 hc:text-black text-sm font-medium rounded-md hover:bg-gray-700 transition-colors">New Document</button>
              </div>
            </div>
          ) : !selectedDoc ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">No document open</h2>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">Select a document from the sidebar, or create a new one.</p>
                <p className="text-xs text-gray-400 mt-3">Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-gray-600 dark:text-gray-300">⌘K</kbd> to open the command palette</p>
              </div>
            </div>
          ) : (
            <>
              {/* Top bar */}
              <header className="bg-white dark:bg-gray-800 hc:bg-black border-b border-gray-200 dark:border-gray-700 hc:border-white px-4 md:px-6 py-3 flex items-center justify-between gap-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 hc:text-gray-300 truncate min-w-0">{selectedDoc.title || "Untitled"}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={handleSaveVersion} title="Save version" disabled={isBlank(selectedDoc)}
                    className="px-2.5 py-1 text-xs font-medium rounded bg-gray-900 dark:bg-white hc:bg-white text-white dark:text-gray-900 hc:text-black hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Save
                  </button>
                  <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 hc:bg-gray-900 rounded-md p-0.5">
                    {(["edit", "read"] as Mode[]).map((m) => (
                      <button key={m} onClick={() => setMode(m)}
                        className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-colors ${mode === m ? "bg-white dark:bg-gray-600 hc:bg-white text-gray-900 dark:text-gray-100 hc:text-black shadow-sm" : "text-gray-500 dark:text-gray-400 hc:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"}`}>{m}</button>
                    ))}
                  </div>
                  <button onClick={() => setShowHistory((v) => !v)} title="Version history"
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${showHistory ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hc:text-white" : "text-gray-500 dark:text-gray-400 hc:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                    <ClockIcon /><span className="hidden sm:inline">History</span>
                  </button>
                  <button onClick={() => handleTrash(selectedDoc.id)} title="Move to trash" className="p-1 text-gray-400 hover:text-red-500 transition-colors" aria-label="Move to trash">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {/* Formatting toolbar — edit mode only */}
              {mode === "edit" && editor && (
                <div className="bg-white dark:bg-gray-800 hc:bg-black border-b border-gray-100 dark:border-gray-700 hc:border-gray-800 px-4 md:px-6 py-1 flex items-center gap-0.5 flex-wrap">
                  <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (⌘B)">
                    <span className="font-bold text-xs">B</span>
                  </ToolbarBtn>
                  <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (⌘I)">
                    <span className="italic text-xs">I</span>
                  </ToolbarBtn>
                  <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (⌘U)">
                    <span className="underline text-xs">U</span>
                  </ToolbarBtn>
                  <ToolbarBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
                    <span className="line-through text-xs">S</span>
                  </ToolbarBtn>
                  <ToolbarBtn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight">
                    <span className="text-xs"><span className={editor.isActive("highlight") ? "bg-yellow-200 text-gray-800 px-0.5" : ""}>A</span></span>
                  </ToolbarBtn>
                  <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                  <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
                    <span className="text-xs font-semibold">H1</span>
                  </ToolbarBtn>
                  <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
                    <span className="text-xs font-semibold">H2</span>
                  </ToolbarBtn>
                  <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                  <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
                    <span className="text-xs">• List</span>
                  </ToolbarBtn>
                  <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
                    <span className="text-xs">1. List</span>
                  </ToolbarBtn>
                </div>
              )}

              {/* History panel */}
              {showHistory && (
                <div className="bg-gray-50 dark:bg-gray-800/60 hc:bg-gray-950 border-b border-gray-200 dark:border-gray-700 hc:border-white px-4 md:px-6 py-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Version history</p>
                  {!selectedDoc.history?.length ? (
                    <p className="text-xs text-gray-400">No saved versions yet. Click <strong>Save</strong> in the toolbar to capture one.</p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {selectedDoc.history.map((entry, i) => (
                        <div key={i} className="shrink-0 w-48 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-3">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{entry.title || "Untitled"}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatTime(entry.savedAt)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{wordCount(entry.body)} words</p>
                          <button onClick={() => handleRestoreVersion(entry)} className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 underline underline-offset-2 transition-colors">Restore</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Document area */}
              <main className="flex-1 overflow-auto">
                <div className="max-w-2xl mx-auto px-6 md:px-8 py-10">
                  <input ref={titleRef} type="text" value={selectedDoc.title}
                    onChange={(e) => handleUpdate("title", e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    placeholder="Untitled"
                    readOnly={mode === "read"}
                    className="w-full text-2xl font-semibold text-gray-900 dark:text-gray-100 hc:text-white placeholder-gray-300 dark:placeholder-gray-600 bg-transparent border-none outline-none mb-6" />

                  {/* Folder + tags in read mode */}
                  {mode === "read" && (
                    <div className="flex flex-wrap gap-1.5 mb-6 items-center">
                      {selectedDoc.folderId && folders.find((f) => f.id === selectedDoc.folderId) && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                          <FolderIcon /> {folders.find((f) => f.id === selectedDoc.folderId)!.name}
                        </span>
                      )}
                      {(selectedDoc.tags ?? []).map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300">{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Rich text editor (both edit and read modes) */}
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <EditorContent editor={editor} />
                  </div>

                  {/* Edit mode metadata */}
                  {mode === "edit" && (
                    <>
                      <p className="mt-4 text-xs text-gray-400">{wordCount(selectedDoc.body)} {wordCount(selectedDoc.body) === 1 ? "word" : "words"}</p>

                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 hc:border-gray-800">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {(selectedDoc.tags ?? []).map((tag) => (
                            <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {tag}
                              <button onClick={() => handleRemoveTag(tag)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label={`Remove tag ${tag}`}>×</button>
                            </span>
                          ))}
                          <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} onBlur={() => commitTag(tagInput)}
                            placeholder={(selectedDoc.tags ?? []).length === 0 ? "Add tags…" : ""}
                            className="text-xs text-gray-600 dark:text-gray-300 hc:text-white placeholder-gray-400 bg-transparent outline-none min-w-16" />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add a tag</p>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <FolderIcon />
                        <select value={selectedDoc.folderId ?? ""} onChange={(e) => handleMoveDocToFolder(selectedDoc.id, e.target.value || null)}
                          className="text-xs text-gray-500 dark:text-gray-400 hc:text-gray-300 bg-transparent outline-none cursor-pointer">
                          <option value="">No folder</option>
                          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </main>
            </>
          )}
        </div>
      </div>

      {/* ── Command palette ──────────────────────────────────────────────────── */}
      {showPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4" onClick={() => setShowPalette(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 hc:bg-black border border-gray-200 dark:border-gray-600 hc:border-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              <input ref={paletteInputRef} type="text" value={paletteQuery} onChange={(e) => setPaletteQuery(e.target.value)} onKeyDown={handlePaletteKeyDown}
                placeholder="Search documents and actions…"
                className="flex-1 text-sm text-gray-700 dark:text-gray-200 hc:text-white bg-transparent outline-none placeholder-gray-400" />
              <kbd className="hidden sm:block text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
            </div>
            <ul className="max-h-80 overflow-y-auto py-1">
              {paletteItems.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-400 text-center">No results</li>
              ) : paletteItems.map((item, i) => {
                const isActive = i === paletteIndex
                const base = `w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"}`
                if (item.kind === "action") return (
                  <li key={item.id}><button onClick={() => selectPaletteItem(item)} onMouseEnter={() => setPaletteIndex(i)} className={base}>
                    <span className="w-4 text-gray-400 shrink-0">⚡</span>{item.label}
                  </button></li>
                )
                if (item.kind === "folder") return (
                  <li key={item.folder.id}><button onClick={() => selectPaletteItem(item)} onMouseEnter={() => setPaletteIndex(i)} className={base}>
                    <FolderIcon open />{item.folder.name}
                    <span className="ml-auto text-xs text-gray-400">{activeDocs.filter((d) => d.folderId === item.folder.id).length} docs</span>
                  </button></li>
                )
                return (
                  <li key={item.doc.id}><button onClick={() => selectPaletteItem(item)} onMouseEnter={() => setPaletteIndex(i)} className={base}>
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                    <span className="truncate">{item.doc.title || "Untitled"}</span>
                    {item.folderName && <span className="ml-auto text-xs text-gray-400 shrink-0">{item.folderName}</span>}
                  </button></li>
                )
              })}
            </ul>
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex gap-4">
              <span className="text-xs text-gray-400">↑↓ navigate</span>
              <span className="text-xs text-gray-400">↵ select</span>
              <span className="text-xs text-gray-400">Esc close</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings modal ───────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSettings(false)} />
          <div className="relative bg-white dark:bg-gray-800 hc:bg-black border border-gray-200 dark:border-gray-600 hc:border-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="mb-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Export</p>
              <p className="text-xs text-gray-400 mb-3">Download all your documents as a JSON file.</p>
              <button onClick={handleExport} className="w-full px-3 py-2 bg-gray-900 dark:bg-white hc:bg-white text-white dark:text-gray-900 hc:text-black text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">Download workspace</button>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Import</p>
              {importStep.step === "idle" && (
                <><p className="text-xs text-gray-400 mb-3">Load documents from a previously exported file.</p>
                <label className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 text-center rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  Choose file…<input ref={fileInputRef} type="file" accept=".json" className="sr-only" onChange={handleImportFile} />
                </label></>
              )}
              {importStep.step === "review" && (
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-200 mb-3">Found <strong>{importStep.parsed.length}</strong> document{importStep.parsed.length !== 1 ? "s" : ""}. How would you like to import?</p>
                  <div className="space-y-2 mb-4">
                    {(["merge", "replace"] as const).map((choice) => (
                      <label key={choice} className={`flex items-start gap-2.5 p-3 rounded-md border cursor-pointer transition-colors ${importStep.choice === choice ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-700" : "border-gray-200 dark:border-gray-600 hover:border-gray-300"}`}>
                        <input type="radio" name="import-choice" value={choice} checked={importStep.choice === choice} onChange={() => setImportStep({ ...importStep, choice })} className="mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 capitalize">{choice}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{choice === "merge" ? "Keep your current documents and add any new ones." : "Remove all current documents and replace with the imported ones."}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setImportStep({ step: "idle" })} className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                    <button disabled={!importStep.choice} onClick={() => importStep.choice && setImportStep({ step: "confirm", parsed: importStep.parsed, choice: importStep.choice })} className="flex-1 px-3 py-1.5 bg-gray-900 dark:bg-white disabled:opacity-40 text-white dark:text-gray-900 text-xs font-medium rounded-md hover:bg-gray-700 transition-colors">Continue</button>
                  </div>
                </div>
              )}
              {importStep.step === "confirm" && (
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-200 mb-1"><strong>Are you sure?</strong></p>
                  <p className="text-xs text-gray-400 mb-4">{importStep.choice === "replace" ? `This will permanently delete all ${docs.length} current documents and replace them with the ${importStep.parsed.length} imported.` : `${importStep.parsed.filter((d) => !docs.find((e) => e.id === d.id)).length} new documents will be added.`}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setImportStep({ step: "review", parsed: importStep.parsed, choice: importStep.choice })} className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 transition-colors">Back</button>
                    <button onClick={handleImportConfirm} className={`flex-1 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors ${importStep.choice === "replace" ? "bg-red-600 hover:bg-red-700" : "bg-gray-900 hover:bg-gray-700"}`}>
                      {importStep.choice === "replace" ? "Replace everything" : "Merge documents"}
                    </button>
                  </div>
                </div>
              )}
              {importStep.step === "done" && (
                <div className="text-center py-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200">Import complete</p>
                  <p className="text-xs text-gray-400 mt-1">{importStep.mode === "replace" ? `Workspace replaced with ${importStep.count} document${importStep.count !== 1 ? "s" : ""}.` : "Documents merged successfully."}</p>
                  <button onClick={() => setImportStep({ step: "idle" })} className="mt-3 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700">Import another file</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete folder dialog ─────────────────────────────────────────────── */}
      {deleteFolderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteFolderTarget(null)} />
          <div className="relative bg-white dark:bg-gray-800 hc:bg-black border border-gray-200 dark:border-gray-600 hc:border-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white mb-2">Delete &ldquo;{deleteFolderTarget.name}&rdquo;?</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              This folder contains {activeDocs.filter((d) => d.folderId === deleteFolderTarget.id).length} document{activeDocs.filter((d) => d.folderId === deleteFolderTarget.id).length !== 1 ? "s" : ""}. What should happen to them?
            </p>
            <div className="space-y-2 mb-4">
              <button onClick={() => handleDeleteFolder("unfiled")} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400 transition-colors">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Move to Unfiled</p>
                <p className="text-xs text-gray-400 mt-0.5">Documents remain in your workspace, without a folder.</p>
              </button>
              <button onClick={() => handleDeleteFolder("trash")} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-red-300 transition-colors">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Move to Trash</p>
                <p className="text-xs text-gray-400 mt-0.5">Documents move to trash and can be restored later.</p>
              </button>
            </div>
            <button onClick={() => setDeleteFolderTarget(null)} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Empty trash confirm ──────────────────────────────────────────────── */}
      {confirmEmptyTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmEmptyTrash(false)} />
          <div className="relative bg-white dark:bg-gray-800 hc:bg-black border border-gray-200 dark:border-gray-600 hc:border-white rounded-xl shadow-xl w-full max-w-xs p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white mb-2">Empty Trash?</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">This permanently deletes {trashedDocs.length} document{trashedDocs.length !== 1 ? "s" : ""}. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmEmptyTrash(false)} className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleEmptyTrash} className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-xs font-medium text-white rounded-md transition-colors">Delete permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Right-click context menu ─────────────────────────────────────────── */}
      {contextMenu && (
        <div className="fixed z-50 bg-white dark:bg-gray-800 hc:bg-black border border-gray-200 dark:border-gray-600 hc:border-white rounded-lg shadow-lg py-1 min-w-44"
          style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Move to folder</p>
          <button onClick={() => handleMoveDocToFolder(contextMenu.docId, null)} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">No folder</button>
          {folders.map((f) => (
            <button key={f.id} onClick={() => handleMoveDocToFolder(contextMenu.docId, f.id)} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <FolderIcon open /> {f.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

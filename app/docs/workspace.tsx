"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"
import TiptapLink from "@tiptap/extension-link"
import TiptapImage from "@tiptap/extension-image"
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
type WorkspaceTheme = "professional" | "videogames" | "space" | "nature" | "cityscape"
type SortOrder = "updated" | "created" | "title"
type Toast = { id: string; message: string; isError?: boolean }
type Heading = { level: 1 | 2; text: string }
type ImportStep =
  | { step: "idle" }
  | { step: "review"; parsed: Doc[]; choice: "merge" | "replace" | null }
  | { step: "confirm"; parsed: Doc[]; choice: "merge" | "replace" }
  | { step: "done"; count: number; mode: "merge" | "replace" }
type PaletteItem =
  | { kind: "action"; id: string; label: string; onSelect: () => void }
  | { kind: "folder"; folder: Folder }
  | { kind: "doc"; doc: Doc; folderName: string | null }

// ── Workspace theme config ─────────────────────────────────────────────────────

type ThemeConfig = {
  label: string; swatch: string; accentBar: string; accentGradient: string
  btn: string; activeDoc: string; activeDocTitle: string
  toolbarActive: string; paletteActive: string
}

const THEMES: Record<WorkspaceTheme, ThemeConfig> = {
  professional: {
    label: "Professional", swatch: "#3b82f6", accentBar: "bg-blue-500",
    accentGradient: "linear-gradient(to right, transparent, #3b82f6 40%, #6366f1, transparent)",
    btn: "bg-blue-600 hover:bg-blue-700 text-white hc:bg-white hc:text-black",
    activeDoc: "bg-blue-50 dark:bg-blue-900/20 hc:bg-white",
    activeDocTitle: "text-blue-900 dark:text-blue-100 hc:text-black",
    toolbarActive: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 hc:bg-white hc:text-black",
    paletteActive: "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100",
  },
  videogames: {
    label: "Videogames", swatch: "#a855f7", accentBar: "bg-purple-500",
    accentGradient: "linear-gradient(to right, transparent, #a855f7 40%, #ec4899, transparent)",
    btn: "bg-purple-600 hover:bg-purple-700 text-white hc:bg-white hc:text-black",
    activeDoc: "bg-purple-50 dark:bg-purple-900/20 hc:bg-white",
    activeDocTitle: "text-purple-900 dark:text-purple-100 hc:text-black",
    toolbarActive: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 hc:bg-white hc:text-black",
    paletteActive: "bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100",
  },
  space: {
    label: "Space", swatch: "#6366f1", accentBar: "bg-indigo-500",
    accentGradient: "linear-gradient(to right, transparent, #6366f1 40%, #8b5cf6, transparent)",
    btn: "bg-indigo-600 hover:bg-indigo-700 text-white hc:bg-white hc:text-black",
    activeDoc: "bg-indigo-50 dark:bg-indigo-900/20 hc:bg-white",
    activeDocTitle: "text-indigo-900 dark:text-indigo-100 hc:text-black",
    toolbarActive: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 hc:bg-white hc:text-black",
    paletteActive: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100",
  },
  nature: {
    label: "Nature", swatch: "#22c55e", accentBar: "bg-emerald-500",
    accentGradient: "linear-gradient(to right, transparent, #22c55e 40%, #10b981, transparent)",
    btn: "bg-emerald-600 hover:bg-emerald-700 text-white hc:bg-white hc:text-black",
    activeDoc: "bg-emerald-50 dark:bg-emerald-900/20 hc:bg-white",
    activeDocTitle: "text-emerald-900 dark:text-emerald-100 hc:text-black",
    toolbarActive: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 hc:bg-white hc:text-black",
    paletteActive: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100",
  },
  cityscape: {
    label: "CityScape", swatch: "#f59e0b", accentBar: "bg-amber-500",
    accentGradient: "linear-gradient(to right, transparent, #f59e0b 40%, #f97316, transparent)",
    btn: "bg-amber-500 hover:bg-amber-600 text-white hc:bg-white hc:text-black",
    activeDoc: "bg-amber-50 dark:bg-amber-900/20 hc:bg-white",
    activeDocTitle: "text-amber-900 dark:text-amber-100 hc:text-black",
    toolbarActive: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 hc:bg-white hc:text-black",
    paletteActive: "bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100",
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function stripHtml(html: string) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}
function isBlank(doc: Doc) { return !doc.title.trim() && !stripHtml(doc.body ?? "") }
function wordCount(html: string) { const t = stripHtml(html); return t ? t.split(" ").length : 0 }
function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}
function formatUpdated(iso: string) {
  const d = new Date(iso), now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
function textToHtml(text: string): string {
  if (!text.trim()) return ""
  return text.split(/\n{2,}/).map(p => `<p>${p.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")}</p>`).join("")
}
async function runMigration(docs: Doc[]): Promise<Doc[]> {
  if (typeof localStorage === "undefined") return docs
  if (localStorage.getItem("superdocu-v2-rich-text")) return docs
  const needs = docs.filter(d => d.body && !/<[a-z][\s\S]*>/i.test(d.body))
  if (needs.length) {
    const updated = needs.map(d => ({ ...d, body: textToHtml(d.body) }))
    await putAllDocs(updated)
    docs = docs.map(d => updated.find(u => u.id === d.id) ?? d)
  }
  localStorage.setItem("superdocu-v2-rich-text", "1")
  return docs
}
function extractHeadings(html: string): Heading[] {
  return [...(html ?? "").matchAll(/<h([12])[^>]*>([\s\S]*?)<\/h[12]>/gi)]
    .map(m => ({ level: parseInt(m[1]) as 1 | 2, text: m[2].replace(/<[^>]+>/g, "").trim() }))
    .filter(h => h.text)
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function SunIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg> }
function MoonIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg> }
function ContrastIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M12 3a9 9 0 0 1 0 18V3Z" fill="currentColor"/></svg> }
function CogIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg> }
function ClockIcon() { return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg> }
function FolderIcon({ open }: { open?: boolean }) {
  return open
    ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"/></svg>
    : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0v-8.25a2.25 2.25 0 0 0-2.25-2.25H8.69"/></svg>
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className ?? "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
}
function ExpandIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></svg> }
function CollapseIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"/></svg> }
function PrintIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z"/></svg> }
function LinkIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/></svg> }
function ImageIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg> }
function ListIcon() { return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg> }
function KeyboardIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3m4.5 4.5h.008v.008H7.5V9.75Zm3 0h.008v.008H10.5V9.75Zm3 0h.008v.008H13.5V9.75Zm3 0h.008v.008H16.5V9.75Zm-9 3h.008v.008H7.5v-.008Zm3 0h.008v.008H10.5v-.008Zm3 0h.008v.008H13.5v-.008Zm3 0h.008v.008H16.5v-.008Zm-9 3h6.008v.008H7.5v-.008Z"/></svg> }
function BookOpenIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg> }

// ── Tutorial steps ────────────────────────────────────────────────────────────

type TutorialStep = {
  title: string; body: string
  shortcutKeys?: string[]; shortcutHint?: string
  iconBg: string; iconColor: string; iconPath: string
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to SuperDocu",
    body: "Your personal document workspace, entirely in your browser. No account required, no cloud, and nothing ever leaves your device.",
    iconBg: "bg-violet-100", iconColor: "text-violet-600",
    iconPath: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z",
  },
  {
    title: "Creating & writing",
    body: "Click '+ New Document' in the sidebar to start writing. Give it a title, then type in the body below. Your work autosaves 500ms after every keystroke — the amber dot on Save means a save is pending.",
    iconBg: "bg-blue-100", iconColor: "text-blue-600",
    iconPath: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  },
  {
    title: "Rich text formatting",
    body: "Use the formatting toolbar to apply bold, italic, underline, headings, highlight, bullet lists, and numbered lists. Insert links and images directly into your documents.",
    shortcutKeys: ["⌘", "B"], shortcutHint: "bold · ⌘I italic · ⌘U underline",
    iconBg: "bg-indigo-100", iconColor: "text-indigo-600",
    iconPath: "M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10",
  },
  {
    title: "Folders, tags & search",
    body: "Create folders to group related documents and drag-and-drop docs between them. Add tags to each document for sidebar filtering. The search bar scans both titles and body content.",
    iconBg: "bg-emerald-100", iconColor: "text-emerald-600",
    iconPath: "M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0v-8.25a2.25 2.25 0 0 0-2.25-2.25H8.69",
  },
  {
    title: "Command palette & shortcuts",
    body: "Press ⌘K from anywhere to search documents and trigger any action without a mouse. ⌘S saves a version snapshot. ⌘\\ toggles focus mode for distraction-free writing. Press ? to see all shortcuts.",
    shortcutKeys: ["⌘", "K"], shortcutHint: "open the command palette from anywhere",
    iconBg: "bg-rose-100", iconColor: "text-rose-600",
    iconPath: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z",
  },
  {
    title: "Themes, history & more",
    body: "Pick from 5 workspace themes using the colour swatches in the sidebar. Version History (the clock button) saves and restores up to 3 snapshots per document. Export your workspace from Settings anytime.",
    iconBg: "bg-amber-100", iconColor: "text-amber-600",
    iconPath: "M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z",
  },
]

// ── User guide sections ────────────────────────────────────────────────────────

type GuideItem = { name: string; description: string }
type GuideSection = { title: string; items: GuideItem[] }

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "Writing",
    items: [
      { name: "New Document", description: "Click '+ New Document' in the sidebar. The title field auto-focuses so you can start immediately." },
      { name: "Autosave", description: "Content saves automatically 500ms after you stop typing. The amber dot on the Save button means a save is in progress." },
      { name: "Rich text", description: "Format with the toolbar: Bold (⌘B), Italic (⌘I), Underline (⌘U), Strikethrough, Highlight, H1/H2 headings, bullet and numbered lists." },
      { name: "Links", description: "Select text, click the link icon in the toolbar, and paste a URL. Click an active link and press the icon again to remove it." },
      { name: "Images", description: "Click the image icon in the toolbar to embed an image from your device. Images are stored as base64 — maximum 5 MB each." },
      { name: "Read mode", description: "Toggle between Edit and Read using the buttons in the top bar. Read mode prevents accidental edits and hides the formatting toolbar." },
      { name: "Word count", description: "Shown below the editor in Edit mode." },
    ],
  },
  {
    title: "Organising",
    items: [
      { name: "Folders", description: "Click the folder icon next to '+ New Document' to create a folder. Drag document rows between folders, or right-click a row for a context menu." },
      { name: "Tags", description: "In Edit mode, type a tag in the input at the bottom of the editor and press Enter or comma. Tags appear in the sidebar as filter buttons." },
      { name: "Search", description: "The sidebar search scans both document titles and body content in real time — no need to open each document." },
      { name: "Sort order", description: "Sort the document list by Last Updated, Created date, or A–Z title using the Sort buttons above the list." },
      { name: "Starred documents", description: "Hover a document row and click the star icon to mark it as a favourite. Starred documents float to the top of the sidebar." },
    ],
  },
  {
    title: "Navigation",
    items: [
      { name: "Command Palette (⌘K)", description: "Press ⌘K from anywhere to search documents, open folders, or trigger actions like New Document or Settings — entirely keyboard driven." },
      { name: "Focus Mode (⌘\\)", description: "Hides the sidebar and toolbar so you can write without distractions. Press ⌘\\ again or Esc to exit." },
      { name: "Table of Contents", description: "If a document contains 2 or more headings, a Contents button appears in the top bar. Click it for a clickable outline to jump between sections." },
      { name: "Scroll memory", description: "SuperDocu remembers your exact scroll position in each document and returns you to it when you switch back." },
      { name: "Keyboard Shortcuts (?)", description: "Press ? at any time (outside a text input) to open a list of all keyboard shortcuts." },
    ],
  },
  {
    title: "History & Data",
    items: [
      { name: "Version History", description: "Click the clock (History) button in the document top bar. Up to 3 snapshots are stored per document." },
      { name: "Save a version (⌘S)", description: "Press ⌘S or click the Save button to capture a snapshot. You can restore any saved version with one click." },
      { name: "Export", description: "Open Settings (cog icon) and click 'Download workspace' to save all documents as a JSON file." },
      { name: "Import", description: "In Settings, use 'Choose file' under Import to load an exported file. Choose Merge (keep existing) or Replace (overwrite everything)." },
      { name: "Trash", description: "Click the trash icon on a document to move it to Trash. Restore individually, or 'Empty Trash' to permanently delete all trashed documents." },
      { name: "Print", description: "Click the print icon in the top bar. The sidebar, toolbar, and UI chrome hide automatically when printing." },
    ],
  },
  {
    title: "Appearance",
    items: [
      { name: "Workspace themes", description: "Choose from Professional (blue), Videogames (purple), Space (indigo), Nature (green), or CityScape (amber) using the colour swatches in the sidebar." },
      { name: "Light / Dark / High Contrast", description: "Click the sun or moon icon in the sidebar header to cycle between light mode, dark mode, and high-contrast mode." },
    ],
  },
]

// ── Toolbar button ─────────────────────────────────────────────────────────────

function ToolbarBtn({ active, onClick, title, children, themeActive }: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode; themeActive: string
}) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`px-1.5 py-1 text-sm rounded transition-colors ${active ? themeActive : "text-gray-500 dark:text-gray-400 hc:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"}`}>
      {children}
    </button>
  )
}

// ── Keyboard shortcut row ──────────────────────────────────────────────────────

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd key={i} className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded shadow-sm">{k}</kbd>
        ))}
      </div>
    </div>
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
  const [workspaceTheme, setWorkspaceTheme] = useState<WorkspaceTheme>("professional")
  const [sortOrder, setSortOrder] = useState<SortOrder>("updated")
  const [showHistory, setShowHistory] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [importStep, setImportStep] = useState<ImportStep>({ step: "idle" })
  const [notFound, setNotFound] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
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
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [showUserGuide, setShowUserGuide] = useState(false)
  const [guideSection, setGuideSection] = useState(0)

  const t = THEMES[workspaceTheme]

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const paletteInputRef = useRef<HTMLInputElement>(null)
  const newFolderRef = useRef<HTMLInputElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const mainScrollRef = useRef<HTMLElement | null>(null)
  const scrollPositionsRef = useRef<Record<string, number>>({})
  const bodyUpdateRef = useRef<(html: string) => void>(() => {})
  const saveVersionRef = useRef<() => Promise<void>>(async () => {})

  // ── Derived values ────────────────────────────────────────────────────────

  const activeDocs = docs.filter(d => !d.deletedAt)
  const trashedDocs = docs.filter(d => !!d.deletedAt)
  const selectedDoc = activeDocs.find(d => d.id === selectedId) ?? null
  const allTags = Array.from(new Set(activeDocs.flatMap(d => d.tags ?? []))).sort()
  const isFiltering = query.trim() !== "" || activeTags.length > 0
  const headings: Heading[] = extractHeadings(selectedDoc?.body ?? "")

  const sortedActiveDocs = useMemo(() => {
    const base = [...activeDocs]
    if (sortOrder === "created") return base.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (sortOrder === "title") return base.sort((a, b) => (a.title || "z").localeCompare(b.title || "z"))
    return base
  }, [docs, sortOrder]) // eslint-disable-line react-hooks/exhaustive-deps

  const searchFiltered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = sortedActiveDocs
    if (q) base = base.filter(d =>
      d.title.toLowerCase().includes(q) ||
      stripHtml(d.body ?? "").toLowerCase().includes(q)
    )
    if (activeTags.length) base = base.filter(d => activeTags.every(tag => (d.tags ?? []).includes(tag)))
    return base
  }, [sortedActiveDocs, query, activeTags])

  const starredDocs = searchFiltered.filter(d => d.starred)
  const nonStarred = searchFiltered.filter(d => !d.starred)

  // ── Toast helper ──────────────────────────────────────────────────────────

  function addToast(message: string, isError = false) {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, isError }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  // ── Body update (stale-closure safe via ref) ──────────────────────────────

  bodyUpdateRef.current = (html: string) => {
    if (!selectedDoc) return
    setIsDirty(true)
    const updated: Doc = { ...selectedDoc, body: html, updatedAt: new Date().toISOString() }
    setDocs(prev => prev.map(d => d.id === selectedId ? updated : d))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { putDoc(updated); setIsDirty(false) }, 500)
  }

  // ── Rich text editor ──────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      Placeholder.configure({ placeholder: "Start writing…" }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      TiptapImage.configure({ allowBase64: true }),
    ],
    content: "",
    editable: mode === "edit",
    onUpdate: ({ editor }) => bodyUpdateRef.current(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor || !docsLoaded) return
    editor.commands.setContent(selectedDoc?.body ?? "", { emitUpdate: false })
  }, [editor, selectedId, docsLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editor) return
    editor.setEditable(mode === "edit")
  }, [mode, editor])

  // ── URL sync ──────────────────────────────────────────────────────────────

  function navigate(id: string | null) {
    setSelectedId(id)
    window.history.replaceState(null, "", id ? `/docs/${id}` : "/docs")
  }

  // ── Load data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([getAllDocs(), getAllFolders()]).then(async ([loadedDocs, loadedFolders]) => {
      const migrated = await runMigration(loadedDocs)
      setDocs(migrated); setFolders(loadedFolders); setDocsLoaded(true)
      if (initialId && !migrated.find(d => d.id === initialId && !d.deletedAt)) {
        setNotFound(true); setSelectedId(null)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Theme persistence ─────────────────────────────────────────────────────

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

  useEffect(() => {
    const saved = localStorage.getItem("docu-workspace-theme") as WorkspaceTheme | null
    if (saved && saved in THEMES) setWorkspaceTheme(saved)
  }, [])

  useEffect(() => { localStorage.setItem("docu-workspace-theme", workspaceTheme) }, [workspaceTheme])

  // ── First-visit tutorial ──────────────────────────────────────────────────

  useEffect(() => {
    if (!localStorage.getItem("superdocu-tutorial-seen")) {
      const timer = setTimeout(() => setShowTutorial(true), 700)
      return () => clearTimeout(timer)
    }
  }, [])

  function closeTutorial() {
    localStorage.setItem("superdocu-tutorial-seen", "1")
    setShowTutorial(false)
    setTutorialStep(0)
  }

  // ── Reset dirty flag on doc switch ────────────────────────────────────────

  useEffect(() => { setIsDirty(false) }, [selectedId])

  // ── Auto-focus title on new blank doc ────────────────────────────────────

  useEffect(() => {
    if (selectedDoc && isBlank(selectedDoc) && mode === "edit")
      setTimeout(() => titleRef.current?.focus(), 30)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close context menu on outside click ──────────────────────────────────

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [contextMenu])

  // ── Close link input on outside click ────────────────────────────────────

  useEffect(() => {
    if (!showLinkInput) return
    const close = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest("[data-link-input]")) setShowLinkInput(false)
    }
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [showLinkInput])

  // ── Global keyboard shortcuts ─────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as Element
      const inInput = !!target.closest("input, textarea, .ProseMirror")

      // ⌘K — command palette (unless in editor where it might be used for links)
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && !target.closest(".ProseMirror")) {
        e.preventDefault()
        setShowPalette(v => !v); setPaletteQuery(""); setPaletteIndex(0)
      }
      // ⌘\ — focus mode
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault(); setFocusMode(v => !v)
      }
      // ⌘S — save version
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault(); saveVersionRef.current()
      }
      // ? — keyboard shortcuts (not in inputs)
      if (e.key === "?" && !inInput) {
        e.preventDefault(); setShowShortcuts(v => !v)
      }
      // Escape — close focus mode
      if (e.key === "Escape" && focusMode) setFocusMode(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [focusMode])

  useEffect(() => {
    if (showPalette) setTimeout(() => paletteInputRef.current?.focus(), 30)
  }, [showPalette])

  useEffect(() => { setPaletteIndex(0) }, [paletteQuery])

  function cycleTheme() { setTheme(t => t === "light" ? "dark" : t === "dark" ? "hc" : "light") }

  // ── Navigate away (save/clean blank) ─────────────────────────────────────

  async function handleNavigateAway() {
    if (!selectedDoc) return
    if (isBlank(selectedDoc)) {
      await removeDoc(selectedDoc.id)
      setDocs(prev => prev.filter(d => d.id !== selectedDoc.id))
    } else {
      const snapped = snapshotDoc(selectedDoc)
      if (snapped !== selectedDoc) {
        await putDoc(snapped)
        setDocs(prev => prev.map(d => d.id === selectedDoc.id ? snapped : d))
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
      navigate(existingBlank.id); setMode("edit"); setSidebarOpen(false); return
    }
    const now = new Date().toISOString()
    const doc: Doc = { id: crypto.randomUUID(), title: "", body: "", tags: [], createdAt: now, updatedAt: now }
    await putDoc(doc); setDocs(prev => [doc, ...prev])
    navigate(doc.id); setMode("edit"); setSidebarOpen(false)
  }

  async function handleSelect(id: string) {
    if (selectedId && mainScrollRef.current)
      scrollPositionsRef.current[selectedId] = mainScrollRef.current.scrollTop
    await handleNavigateAway()
    navigate(id); setMode("read"); setShowHistory(false); setShowToc(false); setSidebarOpen(false)
    setTimeout(() => {
      if (mainScrollRef.current)
        mainScrollRef.current.scrollTop = scrollPositionsRef.current[id] ?? 0
    }, 60)
  }

  function handleUpdate(field: "title", value: string) {
    if (!selectedDoc) return
    setBlankWarning(false); setIsDirty(true)
    const updated: Doc = { ...selectedDoc, [field]: value, updatedAt: new Date().toISOString() }
    setDocs(prev => prev.map(d => d.id === selectedId ? updated : d))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { putDoc(updated); setIsDirty(false) }, 500)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); editor?.commands.focus("start") }
  }

  async function handleTrash(id: string) {
    await trashDoc(id)
    setDocs(prev => prev.map(d => d.id === id ? { ...d, deletedAt: new Date().toISOString() } : d))
    if (selectedId === id) { navigate(null); setShowHistory(false) }
    addToast("Moved to Trash")
  }

  async function handleRestore(id: string) {
    await restoreDoc(id)
    setDocs(prev => prev.map(d => {
      if (d.id !== id) return d
      const r = { ...d }; delete r.deletedAt; return r
    }))
    addToast("Document restored")
  }

  async function handleEmptyTrash() {
    await emptyTrash()
    setDocs(prev => prev.filter(d => !d.deletedAt))
    setConfirmEmptyTrash(false); addToast("Trash emptied")
  }

  async function handleStar(id: string) {
    const doc = docs.find(d => d.id === id); if (!doc) return
    const next = !doc.starred
    await starDoc(id, next)
    setDocs(prev => prev.map(d => d.id === id ? { ...d, starred: next } : d))
  }

  // ── Folders ───────────────────────────────────────────────────────────────

  async function handleCreateFolder() {
    const name = newFolderName.trim(); setCreatingFolder(false); setNewFolderName("")
    if (!name) return
    const folder: Folder = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
    await putFolder(folder); setFolders(prev => [...prev, folder])
  }

  async function handleMoveDocToFolder(docId: string, folderId: string | null) {
    await setDocFolder(docId, folderId)
    setDocs(prev => prev.map(d => {
      if (d.id !== docId) return d
      const u = { ...d }; if (folderId) u.folderId = folderId; else delete u.folderId; return u
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
    setContextMenu({ docId, x: Math.min(e.clientX, window.innerWidth - 180), y: Math.min(e.clientY, window.innerHeight - (folders.length * 36 + 80)) })
  }

  async function handleDeleteFolder(action: "unfiled" | "trash") {
    if (!deleteFolderTarget) return
    const affected = activeDocs.filter(d => d.folderId === deleteFolderTarget.id)
    for (const doc of affected) {
      if (action === "trash") {
        await trashDoc(doc.id)
        setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, deletedAt: new Date().toISOString() } : d))
      } else {
        await setDocFolder(doc.id, null)
        setDocs(prev => prev.map(d => { if (d.id !== doc.id) return d; const u = { ...d }; delete u.folderId; return u }))
      }
    }
    await removeFolder(deleteFolderTarget.id)
    setFolders(prev => prev.filter(f => f.id !== deleteFolderTarget.id))
    if (selectedId && affected.find(d => d.id === selectedId) && action === "trash") navigate(null)
    setDeleteFolderTarget(null)
  }

  function toggleFolder(id: string) {
    setCollapsedFolderIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  // ── Tags ──────────────────────────────────────────────────────────────────

  function commitTag(raw: string) {
    const tag = raw.trim().toLowerCase(); if (!tag || !selectedDoc) return
    if ((selectedDoc.tags ?? []).includes(tag)) { setTagInput(""); return }
    const updated: Doc = { ...selectedDoc, tags: [...(selectedDoc.tags ?? []), tag], updatedAt: new Date().toISOString() }
    setDocs(prev => prev.map(d => d.id === selectedId ? updated : d))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => putDoc(updated), 500)
    setTagInput("")
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commitTag(tagInput) }
    if (e.key === "Backspace" && tagInput === "" && selectedDoc?.tags?.length) {
      const tags = selectedDoc.tags.slice(0, -1)
      const updated: Doc = { ...selectedDoc, tags, updatedAt: new Date().toISOString() }
      setDocs(prev => prev.map(d => d.id === selectedId ? updated : d))
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => putDoc(updated), 500)
    }
  }

  function handleRemoveTag(tag: string) {
    if (!selectedDoc) return
    const tags = (selectedDoc.tags ?? []).filter(t2 => t2 !== tag)
    const updated: Doc = { ...selectedDoc, tags, updatedAt: new Date().toISOString() }
    setDocs(prev => prev.map(d => d.id === selectedId ? updated : d))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => putDoc(updated), 500)
  }

  function toggleTagFilter(tag: string) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t2 => t2 !== tag) : [...prev, tag])
  }

  // ── History ───────────────────────────────────────────────────────────────

  async function handleSaveVersion() {
    if (!selectedDoc || isBlank(selectedDoc)) return
    const docToSnapshot = { ...selectedDoc, updatedAt: new Date().toISOString() }
    const snapped = snapshotDoc(docToSnapshot)
    if (snapped === docToSnapshot) { addToast("No changes since last save"); return }
    await putDoc(snapped)
    setDocs(prev => prev.map(d => d.id === selectedDoc.id ? snapped : d))
    addToast("Version saved")
  }
  saveVersionRef.current = handleSaveVersion

  async function handleRestoreVersion(entry: HistoryEntry) {
    if (!selectedDoc) return
    const restored: Doc = { ...selectedDoc, title: entry.title, body: entry.body, tags: entry.tags, updatedAt: new Date().toISOString() }
    await putDoc(restored)
    setDocs(prev => prev.map(d => d.id === selectedDoc.id ? restored : d))
    editor?.commands.setContent(entry.body, { emitUpdate: false })
    setShowHistory(false); setMode("edit"); addToast("Version restored")
  }

  // ── Export / Import ───────────────────────────────────────────────────────

  function handleExport() {
    const payload = JSON.stringify({ version: 2, exported: new Date().toISOString(), docs: activeDocs, folders }, null, 2)
    const blob = new Blob([payload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url
    a.download = `superdocu-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url); addToast("Workspace downloaded")
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const raw = JSON.parse(ev.target?.result as string)
        const parsed: Doc[] = Array.isArray(raw) ? raw : raw.docs ?? []
        if (!parsed.length) throw new Error()
        setImportStep({ step: "review", parsed, choice: null })
      } catch { addToast("Could not read this file", true) }
    }
    reader.readAsText(file); e.target.value = ""
  }

  async function handleImportConfirm() {
    if (importStep.step !== "confirm") return
    const { parsed, choice } = importStep
    if (choice === "replace") {
      await clearAllDocs(); await putAllDocs(parsed)
      setDocs(parsed); navigate(null)
    } else {
      const existingIds = new Set(docs.map(d => d.id))
      const incoming = parsed.filter(d => !existingIds.has(d.id))
      await putAllDocs(incoming); setDocs(prev => [...incoming, ...prev])
    }
    setImportStep({ step: "done", count: parsed.length, mode: choice })
    addToast("Import complete")
  }

  // ── Link / Image ──────────────────────────────────────────────────────────

  function handleLinkButtonClick() {
    if (!editor) return
    if (editor.isActive("link")) { editor.chain().focus().unsetLink().run(); return }
    const { from, to } = editor.state.selection
    if (from === to) { addToast("Select text first to add a link"); return }
    setShowLinkInput(true); setLinkUrl("")
    setTimeout(() => linkInputRef.current?.focus(), 30)
  }

  function handleLinkSubmit() {
    const url = linkUrl.trim()
    if (url) {
      const href = url.startsWith("http") ? url : `https://${url}`
      editor?.chain().focus().setLink({ href }).run()
    }
    setShowLinkInput(false); setLinkUrl("")
  }

  function handleImageInsert() {
    const input = document.createElement("input")
    input.type = "file"; input.accept = "image/*"
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return
      if (file.size > 5 * 1024 * 1024) { addToast("Image must be under 5 MB", true); return }
      const reader = new FileReader()
      reader.onload = ev => {
        const src = ev.target?.result as string
        editor?.chain().focus().setImage({ src }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  function scrollToHeading(index: number) {
    const container = mainScrollRef.current; if (!container) return
    const els = container.querySelectorAll(".ProseMirror h1, .ProseMirror h2")
    const target = els[index] as HTMLElement
    if (target) container.scrollTo({ top: target.offsetTop - 80, behavior: "smooth" })
  }

  // ── Command palette ───────────────────────────────────────────────────────

  const paletteItems: PaletteItem[] = useMemo(() => {
    const q = paletteQuery.toLowerCase()
    const rawActions: Array<{ kind: "action"; id: string; label: string; onSelect: () => void }> = [
      { kind: "action", id: "new-doc", label: "New Document", onSelect: () => { setShowPalette(false); handleNew() } },
      { kind: "action", id: "new-folder", label: "New Folder", onSelect: () => { setShowPalette(false); setCreatingFolder(true); setTimeout(() => newFolderRef.current?.focus(), 50) } },
      { kind: "action", id: "settings", label: "Open Settings", onSelect: () => { setShowPalette(false); setShowSettings(true); setImportStep({ step: "idle" }) } },
      { kind: "action", id: "shortcuts", label: "Keyboard Shortcuts", onSelect: () => { setShowPalette(false); setShowShortcuts(true) } },
      { kind: "action", id: "theme", label: `Toggle theme (${theme})`, onSelect: () => { cycleTheme() } },
      { kind: "action", id: "focus", label: focusMode ? "Exit Focus Mode" : "Focus Mode", onSelect: () => { setFocusMode(v => !v); setShowPalette(false) } },
    ]
    if (trashedDocs.length > 0) rawActions.push({ kind: "action", id: "empty-trash", label: "Empty Trash", onSelect: () => { setShowPalette(false); setConfirmEmptyTrash(true) } })
    const actions: PaletteItem[] = rawActions.filter(a => !q || a.label.toLowerCase().includes(q))
    const folderItems: PaletteItem[] = folders.filter(f => !q || f.name.toLowerCase().includes(q)).map(f => ({ kind: "folder", folder: f }))
    const docItems: PaletteItem[] = activeDocs.filter(d => !q || d.title.toLowerCase().includes(q) || stripHtml(d.body ?? "").toLowerCase().includes(q)).map(d => ({ kind: "doc", doc: d, folderName: folders.find(f => f.id === d.folderId)?.name ?? null }))
    return [...actions, ...folderItems, ...docItems]
  }, [paletteQuery, docs, folders, theme, focusMode]) // eslint-disable-line react-hooks/exhaustive-deps

  function selectPaletteItem(item: PaletteItem) {
    if (item.kind === "action") { item.onSelect(); return }
    if (item.kind === "folder") { setShowPalette(false); setCollapsedFolderIds(prev => { const next = new Set(prev); next.delete(item.folder.id); return next }); setSidebarOpen(true); return }
    setShowPalette(false); handleSelect(item.doc.id)
  }

  function handlePaletteKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIndex(i => Math.min(i + 1, paletteItems.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setPaletteIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === "Enter") { e.preventDefault(); if (paletteItems[paletteIndex]) selectPaletteItem(paletteItems[paletteIndex]) }
    else if (e.key === "Escape") { e.preventDefault(); setShowPalette(false) }
  }

  // ── DocRow ────────────────────────────────────────────────────────────────

  function DocRow({ doc, inTrash = false }: { doc: Doc; inTrash?: boolean }) {
    const preview = stripHtml(doc.body ?? "").slice(0, 65).trim()
    return (
      <div
        draggable={!inTrash}
        onDragStart={() => setDragDocId(doc.id)}
        onDragEnd={() => { setDragDocId(null); setDragOverTarget(null) }}
        onContextMenu={e => !inTrash && openContextMenu(doc.id, e)}
        className={`row-enter group relative flex items-center rounded-lg mb-0.5 transition-all duration-150 ${dragDocId === doc.id ? "opacity-40" : ""} ${selectedId === doc.id && !inTrash ? t.activeDoc + " shadow-sm" : "hover:bg-gray-50 dark:hover:bg-gray-700/60 hc:hover:bg-white/10 hover:scale-[1.01] active:scale-[0.99]"}`}
      >
        <button onClick={() => !inTrash && handleSelect(doc.id)} className="flex-1 text-left px-3 py-2 min-w-0">
          <p className={`text-sm font-medium truncate pr-14 ${selectedId === doc.id && !inTrash ? t.activeDocTitle : "text-gray-600 dark:text-gray-300 hc:text-white group-hover:text-gray-900 dark:group-hover:text-gray-100"}`}>
            {doc.title || "Untitled"}
          </p>
          {!inTrash && preview && (
            <p className="text-xs text-gray-400 dark:text-gray-500 hc:text-gray-400 mt-0.5 truncate leading-relaxed">
              {preview}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 hc:text-gray-300 mt-0.5">
            {inTrash ? `Trashed ${formatUpdated(doc.deletedAt!)}` : formatUpdated(doc.updatedAt)}
          </p>
          {(doc.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(doc.tags ?? []).map(tag => <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 hc:bg-gray-800 text-gray-500 dark:text-gray-300">{tag}</span>)}
            </div>
          )}
        </button>
        {inTrash ? (
          <button onClick={() => handleRestore(doc.id)} className="absolute right-2 text-xs font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors opacity-0 group-hover:opacity-100">Restore</button>
        ) : (
          <>
            <button onClick={e => { e.stopPropagation(); handleStar(doc.id) }}
              className={`absolute right-8 p-1 rounded transition-all ${doc.starred ? "text-amber-400 opacity-100 hover:text-amber-500" : "text-gray-400 opacity-0 group-hover:opacity-100 hover:text-amber-400 dark:text-gray-500"}`}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={doc.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/></svg>
            </button>
            <button onClick={e => { e.stopPropagation(); handleTrash(doc.id) }}
              className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">
              <TrashIcon />
            </button>
          </>
        )}
      </div>
    )
  }

  function SectionLabel({ label }: { label: string }) {
    return <p className="px-3 pb-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
  }

  function FolderDropZone({ target, children }: { target: string | "unfiled"; children: React.ReactNode }) {
    return (
      <div onDragOver={e => { if (dragDocId) { e.preventDefault(); setDragOverTarget(target) } }} onDragLeave={() => setDragOverTarget(null)} onDrop={() => handleDrop(target)}
        className={`rounded-md transition-colors ${dragDocId && dragOverTarget === target ? "bg-gray-50 dark:bg-gray-700/40 ring-1 ring-gray-200 dark:ring-gray-600" : ""}`}>
        {children}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const sidebarHidden = focusMode

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 hc:bg-black">

      {/* Mobile top bar */}
      <header className={`md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 hc:bg-black border-b border-gray-200 dark:border-gray-700 hc:border-white shrink-0 print:hidden ${sidebarHidden ? "hidden" : ""}`}>
        <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-500 dark:text-gray-400 hc:text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
        </button>
        <Link href="/" className="text-sm font-extrabold tracking-tight hover:opacity-75 transition-opacity">
          <span className="text-gray-900 dark:text-gray-100 hc:text-white">Super</span><span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">Docu</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={cycleTheme} className="p-1 text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            {theme === "light" ? <SunIcon /> : theme === "dark" ? <MoonIcon /> : <ContrastIcon />}
          </button>
          <button onClick={() => { setShowSettings(true); setImportStep({ step: "idle" }) }} className="p-1 text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors"><CogIcon /></button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {sidebarOpen && !sidebarHidden && <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* ── Sidebar ── */}
        <aside className={`flex flex-col w-64 shrink-0 bg-white dark:bg-gray-800 hc:bg-black border-r border-gray-200 dark:border-gray-700 hc:border-white fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out print:hidden ${sidebarOpen && !sidebarHidden ? "translate-x-0" : "-translate-x-full"} ${sidebarHidden ? "!-translate-x-full" : "md:static md:inset-auto md:z-auto md:translate-x-0"}`}>

          <div className={`h-0.5 w-full transition-colors duration-500 ${t.accentBar}`} />

          <div className="hidden md:flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 hc:border-white">
            <Link href="/" className="text-sm font-extrabold tracking-tight hover:opacity-75 transition-opacity">
              <span className="text-gray-900 dark:text-gray-100 hc:text-white">Super</span><span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">Docu</span>
            </Link>
            <div className="flex items-center gap-1">
              <button onClick={cycleTheme} title={`Mode: ${theme}`} className="p-1 rounded text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                {theme === "light" ? <SunIcon /> : theme === "dark" ? <MoonIcon /> : <ContrastIcon />}
              </button>
              <button onClick={() => { setShowSettings(true); setImportStep({ step: "idle" }) }} className="p-1 rounded text-gray-400 hc:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors"><CogIcon /></button>
            </div>
          </div>

          <div className="px-3 pt-3 pb-2 flex gap-2">
            <button onClick={handleNew} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${t.btn}`}>
              <span>+</span> New Document
            </button>
            <button onClick={() => { setCreatingFolder(true); setTimeout(() => newFolderRef.current?.focus(), 30) }} title="New folder" className="px-3 py-2 border border-gray-200 dark:border-gray-600 hc:border-white text-gray-500 dark:text-gray-400 hc:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
              <FolderIcon />
            </button>
          </div>

          {/* Workspace theme swatches */}
          <div className="px-3 pb-2.5 flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">Theme</span>
            <div className="flex items-center gap-1.5">
              {(Object.keys(THEMES) as WorkspaceTheme[]).map(id => (
                <button key={id} onClick={() => setWorkspaceTheme(id)} title={THEMES[id].label}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${workspaceTheme === id ? "ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-300 scale-110" : "opacity-60 hover:opacity-100 hover:scale-110"}`}
                  style={{ backgroundColor: THEMES[id].swatch }} />
              ))}
            </div>
          </div>

          {blankWarning && (
            <div className="px-3 pb-2">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 leading-relaxed">You already have a blank document open.</p>
            </div>
          )}

          {creatingFolder && (
            <div className="px-3 pb-2">
              <input ref={newFolderRef} type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName("") } }}
                onBlur={handleCreateFolder} placeholder="Folder name…"
                className="w-full px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-200 hc:text-white bg-gray-50 dark:bg-gray-700 hc:bg-black border border-gray-300 dark:border-gray-500 hc:border-white rounded-md outline-none focus:border-gray-500 transition-colors" />
            </div>
          )}

          <div className="px-3 pb-1.5">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/></svg>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search titles and content…"
                className="w-full pl-8 pr-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hc:text-white placeholder-gray-400 bg-gray-50 dark:bg-gray-700 hc:bg-black border border-gray-200 dark:border-gray-600 hc:border-white rounded-md outline-none focus:border-gray-400 transition-colors" />
            </div>
          </div>

          {/* Sort order */}
          {activeDocs.length > 0 && (
            <div className="px-3 pb-2 flex items-center gap-1">
              <span className="text-xs text-gray-400 dark:text-gray-500 mr-0.5">Sort</span>
              {(["updated", "created", "title"] as SortOrder[]).map(order => (
                <button key={order} onClick={() => setSortOrder(order)}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${sortOrder === order ? t.btn : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"}`}>
                  {order === "updated" ? "Recent" : order === "created" ? "Created" : "A–Z"}
                </button>
              ))}
            </div>
          )}

          {allTags.length > 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {allTags.map(tag => (
                <button key={tag} onClick={() => toggleTagFilter(tag)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${activeTags.includes(tag) ? `${t.btn} border-transparent` : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400"}`}>
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
                <><SectionLabel label="Results" />{searchFiltered.map(doc => <DocRow key={doc.id} doc={doc} />)}</>
              )
            ) : (
              <>
                {starredDocs.length > 0 && <><SectionLabel label="Favourites" /><div className="mb-3">{starredDocs.map(doc => <DocRow key={doc.id} doc={doc} />)}</div></>}
                {folders.map(folder => {
                  const folderDocs = nonStarred.filter(d => d.folderId === folder.id)
                  const expanded = !collapsedFolderIds.has(folder.id)
                  return (
                    <FolderDropZone key={folder.id} target={folder.id}>
                      <div className="flex items-center justify-between pr-1 mb-0.5 group/folder">
                        <button onClick={() => toggleFolder(folder.id)} className="flex-1 flex items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                          <FolderIcon open={expanded} /><span>{folder.name}</span>
                          <span className="text-gray-300 dark:text-gray-600 font-normal ml-0.5">{folderDocs.length}</span>
                        </button>
                        <button onClick={() => setDeleteFolderTarget(folder)} className="opacity-0 group-hover/folder:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                      {expanded && <div className="mb-2">{folderDocs.length === 0 ? <p className="px-3 py-1 text-xs text-gray-400 italic">Empty — drag documents here</p> : folderDocs.map(doc => <DocRow key={doc.id} doc={doc} />)}</div>}
                    </FolderDropZone>
                  )
                })}
                <FolderDropZone target="unfiled">
                  {(folders.length > 0 || nonStarred.filter(d => !d.folderId).length > 0) && <SectionLabel label={folders.length > 0 ? "Unfiled" : "Recent"} />}
                  {nonStarred.filter(d => !d.folderId).map(doc => <DocRow key={doc.id} doc={doc} />)}
                </FolderDropZone>
              </>
            )}
          </nav>

          {/* Trash */}
          <div className="border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => setTrashOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <span className="flex items-center gap-1.5"><TrashIcon className="w-3.5 h-3.5" /> Trash {trashedDocs.length > 0 && `(${trashedDocs.length})`}</span>
              <svg className={`w-3 h-3 transition-transform ${trashOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
            </button>
            {trashOpen && (
              <div className="px-3 pb-2">
                {trashedDocs.length === 0 ? <p className="text-xs text-gray-400 px-3 py-1">Trash is empty</p> : (
                  <>{trashedDocs.map(doc => <DocRow key={doc.id} doc={doc} inTrash />)}
                  <button onClick={() => setConfirmEmptyTrash(true)} className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">Empty Trash</button></>
                )}
              </div>
            )}
          </div>

          <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 hc:border-white flex flex-col gap-1">
            <button onClick={() => setShowShortcuts(true)} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
              <KeyboardIcon /> Keyboard shortcuts
            </button>
            <button onClick={() => setShowUserGuide(true)} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
              <BookOpenIcon /> User Guide
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
                <Link href="/docs" onClick={() => setNotFound(false)} className={`inline-block mt-4 px-4 py-2 text-sm font-medium rounded-md transition-colors ${t.btn}`}>Back to workspace</Link>
              </div>
            </div>
          ) : activeDocs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Welcome to SuperDocu</h2>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">Your personal document workspace.</p>
                <button onClick={handleNew} className={`mt-4 px-4 py-2 text-sm font-medium rounded-md transition-colors ${t.btn}`}>New Document</button>
              </div>
            </div>
          ) : !selectedDoc ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                <div className="mx-auto mb-6 w-28 h-28 flex items-center justify-center">
                  <svg viewBox="0 0 120 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <rect x="18" y="14" width="72" height="86" rx="9" fill="#f3f4f6" className="dark:fill-gray-700"/>
                    <rect x="18" y="14" width="72" height="86" rx="9" stroke="#e5e7eb" className="dark:stroke-gray-600" strokeWidth="2"/>
                    <rect x="34" y="36" width="44" height="5" rx="2.5" fill="#d1d5db" className="dark:fill-gray-500"/>
                    <rect x="34" y="49" width="36" height="5" rx="2.5" fill="#e5e7eb" className="dark:fill-gray-600"/>
                    <rect x="34" y="62" width="40" height="5" rx="2.5" fill="#e5e7eb" className="dark:fill-gray-600"/>
                    <rect x="34" y="75" width="28" height="5" rx="2.5" fill="#e5e7eb" className="dark:fill-gray-600"/>
                    <circle cx="93" cy="24" r="18" fill="white" className="dark:fill-gray-800"/>
                    <circle cx="93" cy="24" r="17" stroke="#e5e7eb" className="dark:stroke-gray-600" strokeWidth="1.5"/>
                    <path d="M87 24h12M93 18v12" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Nothing open yet</h2>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">Pick a document from the sidebar, or start fresh.</p>
                <div className="mt-5 flex flex-col items-center gap-2">
                  <button onClick={handleNew} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${t.btn}`}>New Document</button>
                  <p className="text-xs text-gray-400 mt-1">or press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-gray-600 dark:text-gray-300">⌘K</kbd></p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Top bar */}
              <header className="bg-white dark:bg-gray-800 hc:bg-black border-b-0 px-4 md:px-6 py-3 flex items-center justify-between gap-2 print:hidden">
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate min-w-0">{selectedDoc.title || "Untitled"}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={handleSaveVersion} title="Save version (⌘S)" disabled={isBlank(selectedDoc)}
                    className={`relative px-2.5 py-1 text-xs font-medium rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${t.btn}`}>
                    Save
                    {isDirty && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white dark:ring-gray-800" title="Unsaved changes" />}
                  </button>
                  <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 hc:bg-gray-900 rounded-md p-0.5">
                    {(["edit", "read"] as Mode[]).map(m => (
                      <button key={m} onClick={() => setMode(m)}
                        className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-colors ${mode === m ? "bg-white dark:bg-gray-600 hc:bg-white text-gray-900 dark:text-gray-100 hc:text-black shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>{m}</button>
                    ))}
                  </div>
                  <button onClick={() => setShowHistory(v => !v)} title="Version history"
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${showHistory ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                    <ClockIcon /><span className="hidden sm:inline">History</span>
                  </button>
                  {headings.length >= 2 && (
                    <button onClick={() => setShowToc(v => !v)} title="Table of contents"
                      className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${showToc ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                      <ListIcon /><span className="hidden sm:inline">Contents</span>
                    </button>
                  )}
                  <button onClick={() => setFocusMode(v => !v)} title={focusMode ? "Exit focus mode (⌘\\)" : "Focus mode (⌘\\)"}
                    className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    {focusMode ? <CollapseIcon /> : <ExpandIcon />}
                  </button>
                  <button onClick={() => window.print()} title="Print document"
                    className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    <PrintIcon />
                  </button>
                  <button onClick={() => handleTrash(selectedDoc.id)} title="Move to trash" className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {/* Theme accent gradient line under top bar */}
              <div className="h-px w-full print:hidden border-b border-gray-200 dark:border-gray-700 hc:border-white" style={{ background: t.accentGradient }} />

              {/* Formatting toolbar */}
              {mode === "edit" && editor && !focusMode && (
                <div className="toolbar-enter relative bg-white dark:bg-gray-800 hc:bg-black border-b border-gray-100 dark:border-gray-700 px-4 md:px-6 py-1 flex items-center gap-0.5 flex-wrap print:hidden">
                  <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (⌘B)" themeActive={t.toolbarActive}><span className="font-bold text-xs">B</span></ToolbarBtn>
                  <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (⌘I)" themeActive={t.toolbarActive}><span className="italic text-xs">I</span></ToolbarBtn>
                  <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (⌘U)" themeActive={t.toolbarActive}><span className="underline text-xs">U</span></ToolbarBtn>
                  <ToolbarBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough" themeActive={t.toolbarActive}><span className="line-through text-xs">S</span></ToolbarBtn>
                  <ToolbarBtn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight" themeActive={t.toolbarActive}><span className="text-xs"><span className={editor.isActive("highlight") ? "bg-yellow-200 text-gray-800 px-0.5" : ""}>A</span></span></ToolbarBtn>
                  <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                  <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1" themeActive={t.toolbarActive}><span className="text-xs font-semibold">H1</span></ToolbarBtn>
                  <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2" themeActive={t.toolbarActive}><span className="text-xs font-semibold">H2</span></ToolbarBtn>
                  <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                  <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list" themeActive={t.toolbarActive}><span className="text-xs">• List</span></ToolbarBtn>
                  <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list" themeActive={t.toolbarActive}><span className="text-xs">1. List</span></ToolbarBtn>
                  <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                  <ToolbarBtn active={editor.isActive("link")} onClick={handleLinkButtonClick} title="Link" themeActive={t.toolbarActive}><LinkIcon /></ToolbarBtn>
                  <ToolbarBtn active={false} onClick={handleImageInsert} title="Insert image" themeActive={t.toolbarActive}><ImageIcon /></ToolbarBtn>

                  {/* Inline link input */}
                  {showLinkInput && (
                    <div data-link-input className="absolute left-0 right-0 top-full z-10 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-md">
                      <LinkIcon />
                      <input ref={linkInputRef} type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleLinkSubmit() } if (e.key === "Escape") setShowLinkInput(false) }}
                        placeholder="Paste or type URL…"
                        className="flex-1 text-sm outline-none bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400" />
                      <button onClick={handleLinkSubmit} className={`text-xs font-medium px-2 py-1 rounded ${t.btn}`}>Add</button>
                      <button onClick={() => setShowLinkInput(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                  )}
                </div>
              )}

              {/* History panel */}
              {showHistory && (
                <div className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 print:hidden">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Version history</p>
                  {!selectedDoc.history?.length ? (
                    <p className="text-xs text-gray-400">No saved versions yet. Click <strong>Save</strong> or press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-gray-500 text-xs">⌘S</kbd> to capture one.</p>
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

              {/* Table of contents panel */}
              {showToc && headings.length >= 2 && (
                <div className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 print:hidden">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Contents</p>
                  <nav className="flex flex-wrap gap-x-6 gap-y-1">
                    {headings.map((h, i) => (
                      <button key={i} onClick={() => scrollToHeading(i)}
                        className={`text-xs text-left text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors ${h.level === 2 ? "pl-3 opacity-80" : "font-medium"}`}>
                        {h.text}
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              {/* Document area */}
              <main
                ref={el => { mainScrollRef.current = el }}
                onScroll={() => { if (selectedId && mainScrollRef.current) scrollPositionsRef.current[selectedId] = mainScrollRef.current.scrollTop }}
                className="flex-1 overflow-auto">
                <div className="max-w-2xl mx-auto px-6 md:px-8 py-10 print:max-w-none print:px-0 print:py-6">
                  <input ref={titleRef} type="text" value={selectedDoc.title}
                    onChange={e => handleUpdate("title", e.target.value)}
                    onKeyDown={handleTitleKeyDown} placeholder="Untitled" readOnly={mode === "read"}
                    className="w-full text-2xl font-semibold text-gray-900 dark:text-gray-100 hc:text-white placeholder-gray-300 dark:placeholder-gray-600 bg-transparent border-none outline-none mb-6" />

                  {mode === "read" && (selectedDoc.folderId || (selectedDoc.tags ?? []).length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mb-6 items-center print:hidden">
                      {selectedDoc.folderId && folders.find(f => f.id === selectedDoc.folderId) && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                          <FolderIcon /> {folders.find(f => f.id === selectedDoc.folderId)!.name}
                        </span>
                      )}
                      {(selectedDoc.tags ?? []).map(tag => <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300">{tag}</span>)}
                    </div>
                  )}

                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <EditorContent editor={editor} />
                  </div>

                  {mode === "edit" && (
                    <div className="print:hidden">
                      <p className="mt-4 text-xs text-gray-400">{wordCount(selectedDoc.body)} {wordCount(selectedDoc.body) === 1 ? "word" : "words"}</p>
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {(selectedDoc.tags ?? []).map(tag => (
                            <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {tag}<button onClick={() => handleRemoveTag(tag)} className="text-gray-400 hover:text-gray-600">×</button>
                            </span>
                          ))}
                          <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} onBlur={() => commitTag(tagInput)}
                            placeholder={(selectedDoc.tags ?? []).length === 0 ? "Add tags…" : ""}
                            className="text-xs text-gray-600 dark:text-gray-300 hc:text-white placeholder-gray-400 bg-transparent outline-none min-w-16" />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add a tag</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <FolderIcon />
                        <select value={selectedDoc.folderId ?? ""} onChange={e => handleMoveDocToFolder(selectedDoc.id, e.target.value || null)}
                          className="text-xs text-gray-500 dark:text-gray-400 bg-transparent outline-none cursor-pointer">
                          <option value="">No folder</option>
                          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </main>
            </>
          )}
        </div>
      </div>

      {/* ── Tutorial popup ── */}
      {showTutorial && (() => {
        const step = TUTORIAL_STEPS[tutorialStep]
        const isLast = tutorialStep === TUTORIAL_STEPS.length - 1
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="overlay-enter relative bg-white/95 dark:bg-gray-800/95 hc:bg-black backdrop-blur-xl border border-gray-200/70 dark:border-gray-600/70 rounded-2xl shadow-2xl shadow-black/15 w-full max-w-md p-8">

              {/* Header row */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-medium text-gray-400 tabular-nums">Step {tutorialStep + 1} of {TUTORIAL_STEPS.length}</span>
                <button onClick={closeTutorial} title="Close tutorial" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${step.iconBg} ${step.iconColor} mb-5`}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={step.iconPath} />
                </svg>
              </div>

              {/* Content */}
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 hc:text-white mb-3 leading-tight">{step.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">{step.body}</p>

              {step.shortcutKeys && (
                <div className="flex items-center gap-2 mb-5">
                  {step.shortcutKeys.map((k, i) => (
                    <kbd key={i} className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm font-mono text-gray-600 dark:text-gray-300">{k}</kbd>
                  ))}
                  <span className="text-xs text-gray-400 ml-1">{step.shortcutHint}</span>
                </div>
              )}

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 mb-6">
                {TUTORIAL_STEPS.map((_, i) => (
                  <button key={i} onClick={() => setTutorialStep(i)}
                    className={`rounded-full transition-all duration-200 ${i === tutorialStep ? "w-5 h-2 bg-gray-800 dark:bg-gray-200" : "w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"}`} />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-3">
                {tutorialStep > 0 ? (
                  <button onClick={() => setTutorialStep(s => s - 1)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Back
                  </button>
                ) : (
                  <button onClick={closeTutorial}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Skip
                  </button>
                )}
                <button
                  onClick={() => isLast ? closeTutorial() : setTutorialStep(s => s + 1)}
                  className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${t.btn}`}>
                  {isLast ? "Get started" : "Next"}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── User Guide modal ── */}
      {showUserGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowUserGuide(false)} />
          <div className="overlay-enter relative bg-white/95 dark:bg-gray-800/95 hc:bg-black backdrop-blur-xl border border-gray-200/70 dark:border-gray-600/70 rounded-2xl shadow-2xl shadow-black/10 w-full max-w-lg flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpenIcon />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">User Guide</h2>
              </div>
              <button onClick={() => setShowUserGuide(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Section tabs */}
            <div className="px-4 pb-3 shrink-0 overflow-x-auto">
              <div className="flex items-center gap-1.5 min-w-max">
                {GUIDE_SECTIONS.map((section, i) => (
                  <button
                    key={section.title}
                    onClick={() => setGuideSection(i)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      guideSection === i
                        ? `${t.btn}`
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 shrink-0 mx-6" />

            {/* Section content */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <div className="space-y-3">
                {GUIDE_SECTIONS[guideSection].items.map((item) => (
                  <div key={item.name} className="flex gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.accentBar}`} style={{ marginTop: "6px" }} />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 hc:text-white">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-gray-100 dark:border-gray-700 shrink-0">
              <p className="text-xs text-gray-400 text-center">
                Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-gray-500 text-xs">?</kbd> at any time to see keyboard shortcuts
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Command palette ── */}
      {showPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/20 backdrop-blur-sm" onClick={() => setShowPalette(false)}>
          <div className="overlay-enter w-full max-w-lg bg-white/85 dark:bg-gray-800/85 hc:bg-black backdrop-blur-xl border border-gray-200/70 dark:border-gray-600/70 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/></svg>
              <input ref={paletteInputRef} type="text" value={paletteQuery} onChange={e => setPaletteQuery(e.target.value)} onKeyDown={handlePaletteKeyDown}
                placeholder="Search documents and actions…"
                className="flex-1 text-sm text-gray-700 dark:text-gray-200 hc:text-white bg-transparent outline-none placeholder-gray-400" />
              <kbd className="hidden sm:block text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
            </div>
            <ul className="max-h-80 overflow-y-auto py-1">
              {paletteItems.length === 0 ? <li className="px-4 py-3 text-sm text-gray-400 text-center">No results</li>
              : paletteItems.map((item, i) => {
                const isActive = i === paletteIndex
                const base = `w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive ? t.paletteActive : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"}`
                if (item.kind === "action") return <li key={item.id}><button onClick={() => selectPaletteItem(item)} onMouseEnter={() => setPaletteIndex(i)} className={base}><span className="w-4 text-gray-400 shrink-0">⚡</span>{item.label}</button></li>
                if (item.kind === "folder") return <li key={item.folder.id}><button onClick={() => selectPaletteItem(item)} onMouseEnter={() => setPaletteIndex(i)} className={base}><FolderIcon open />{item.folder.name}<span className="ml-auto text-xs text-gray-400">{activeDocs.filter(d => d.folderId === item.folder.id).length} docs</span></button></li>
                return <li key={item.doc.id}><button onClick={() => selectPaletteItem(item)} onMouseEnter={() => setPaletteIndex(i)} className={base}>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>
                  <span className="truncate">{item.doc.title || "Untitled"}</span>
                  {item.folderName && <span className="ml-auto text-xs text-gray-400 shrink-0">{item.folderName}</span>}
                </button></li>
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

      {/* ── Keyboard shortcuts modal ── */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowShortcuts(false)} />
          <div className="overlay-enter relative bg-white/90 dark:bg-gray-800/90 hc:bg-black backdrop-blur-xl border border-gray-200/70 dark:border-gray-600/70 rounded-2xl shadow-2xl shadow-black/10 w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h2>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-700">
              <div className="pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Global</p>
                <ShortcutRow keys={["⌘", "K"]} label="Command palette" />
                <ShortcutRow keys={["⌘", "S"]} label="Save version" />
                <ShortcutRow keys={["⌘", "\\"]} label="Toggle focus mode" />
                <ShortcutRow keys={["?"]} label="Show shortcuts" />
              </div>
              <div className="py-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Formatting</p>
                <ShortcutRow keys={["⌘", "B"]} label="Bold" />
                <ShortcutRow keys={["⌘", "I"]} label="Italic" />
                <ShortcutRow keys={["⌘", "U"]} label="Underline" />
              </div>
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Palette</p>
                <ShortcutRow keys={["↑", "↓"]} label="Navigate" />
                <ShortcutRow keys={["↵"]} label="Select" />
                <ShortcutRow keys={["Esc"]} label="Close" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings modal ── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowSettings(false)} />
          <div className="overlay-enter relative bg-white/90 dark:bg-gray-800/90 hc:bg-black backdrop-blur-xl border border-gray-200/70 dark:border-gray-600/70 rounded-2xl shadow-2xl shadow-black/10 w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 hc:text-white">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="mb-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Export</p>
              <p className="text-xs text-gray-400 mb-3">Download all your documents as a JSON file.</p>
              <button onClick={handleExport} className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${t.btn}`}>Download workspace</button>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Import</p>
              {importStep.step === "idle" && (
                <><p className="text-xs text-gray-400 mb-3">Load documents from a previously exported file.</p>
                <label className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 text-center rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  Choose file…<input ref={fileInputRef} type="file" accept=".json" className="sr-only" onChange={handleImportFile} />
                </label></>
              )}
              {importStep.step === "review" && (
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-200 mb-3">Found <strong>{importStep.parsed.length}</strong> document{importStep.parsed.length !== 1 ? "s" : ""}.</p>
                  <div className="space-y-2 mb-4">
                    {(["merge", "replace"] as const).map(choice => (
                      <label key={choice} className={`flex items-start gap-2.5 p-3 rounded-md border cursor-pointer transition-colors ${importStep.choice === choice ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-700" : "border-gray-200 dark:border-gray-600 hover:border-gray-300"}`}>
                        <input type="radio" name="import-choice" value={choice} checked={importStep.choice === choice} onChange={() => setImportStep({ ...importStep, choice })} className="mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 capitalize">{choice}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{choice === "merge" ? "Keep existing docs and add new ones." : "Replace everything with the imported docs."}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setImportStep({ step: "idle" })} className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
                    <button disabled={!importStep.choice} onClick={() => importStep.choice && setImportStep({ step: "confirm", parsed: importStep.parsed, choice: importStep.choice })} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-40 ${t.btn}`}>Continue</button>
                  </div>
                </div>
              )}
              {importStep.step === "confirm" && (
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-200 mb-1"><strong>Are you sure?</strong></p>
                  <p className="text-xs text-gray-400 mb-4">{importStep.choice === "replace" ? `This will permanently delete all ${docs.length} current documents.` : `${importStep.parsed.filter(d => !docs.find(e => e.id === d.id)).length} new documents will be added.`}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setImportStep({ step: "review", parsed: importStep.parsed, choice: importStep.choice })} className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 rounded-md hover:bg-gray-50 transition-colors">Back</button>
                    <button onClick={handleImportConfirm} className={`flex-1 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors ${importStep.choice === "replace" ? "bg-red-600 hover:bg-red-700" : t.btn}`}>
                      {importStep.choice === "replace" ? "Replace everything" : "Merge documents"}
                    </button>
                  </div>
                </div>
              )}
              {importStep.step === "done" && (
                <div className="text-center py-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200">Import complete</p>
                  <p className="text-xs text-gray-400 mt-1">{importStep.mode === "replace" ? `Workspace replaced with ${importStep.count} doc${importStep.count !== 1 ? "s" : ""}.` : "Documents merged successfully."}</p>
                  <button onClick={() => setImportStep({ step: "idle" })} className="mt-3 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700">Import another file</button>
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-5 mt-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tutorial</p>
              <p className="text-xs text-gray-400 mb-3">Show the welcome tutorial again the next time you open the workspace.</p>
              <button
                onClick={() => {
                  localStorage.removeItem("superdocu-tutorial-seen")
                  setShowSettings(false)
                  addToast("Tutorial reset — reopen the workspace to see it")
                }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Reset tutorial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete folder dialog ── */}
      {deleteFolderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setDeleteFolderTarget(null)} />
          <div className="overlay-enter relative bg-white/90 dark:bg-gray-800/90 hc:bg-black backdrop-blur-xl border border-gray-200/70 dark:border-gray-600/70 rounded-2xl shadow-2xl shadow-black/10 w-full max-w-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete &ldquo;{deleteFolderTarget.name}&rdquo;?</h2>
            <p className="text-xs text-gray-500 mb-5">Contains {activeDocs.filter(d => d.folderId === deleteFolderTarget.id).length} document{activeDocs.filter(d => d.folderId === deleteFolderTarget.id).length !== 1 ? "s" : ""}.</p>
            <div className="space-y-2 mb-4">
              <button onClick={() => handleDeleteFolder("unfiled")} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-400 transition-colors">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Move to Unfiled</p>
                <p className="text-xs text-gray-400 mt-0.5">Documents stay in your workspace without a folder.</p>
              </button>
              <button onClick={() => handleDeleteFolder("trash")} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-red-300 transition-colors">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Move to Trash</p>
                <p className="text-xs text-gray-400 mt-0.5">Documents can be restored later from trash.</p>
              </button>
            </div>
            <button onClick={() => setDeleteFolderTarget(null)} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Empty trash confirm ── */}
      {confirmEmptyTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setConfirmEmptyTrash(false)} />
          <div className="overlay-enter relative bg-white/90 dark:bg-gray-800/90 hc:bg-black backdrop-blur-xl border border-gray-200/70 dark:border-gray-600/70 rounded-2xl shadow-2xl shadow-black/10 w-full max-w-xs p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Empty Trash?</h2>
            <p className="text-xs text-gray-500 mb-5">Permanently deletes {trashedDocs.length} document{trashedDocs.length !== 1 ? "s" : ""}. Cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmEmptyTrash(false)} className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleEmptyTrash} className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-xs font-medium text-white rounded-md transition-colors">Delete permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Right-click context menu ── */}
      {contextMenu && (
        <div className="fixed z-50 bg-white dark:bg-gray-800 hc:bg-black border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-44"
          style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
          <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Move to folder</p>
          <button onClick={() => handleMoveDocToFolder(contextMenu.docId, null)} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">No folder</button>
          {folders.map(f => (
            <button key={f.id} onClick={() => handleMoveDocToFolder(contextMenu.docId, f.id)} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <FolderIcon open /> {f.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Toast notifications ── */}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 pointer-events-none print:hidden">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-enter relative flex items-center gap-3 pl-5 pr-5 py-3 rounded-xl shadow-xl shadow-black/10 text-sm font-medium pointer-events-auto max-w-xs overflow-hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-100 dark:border-gray-700 ${toast.isError ? "text-red-700 dark:text-red-300" : "text-gray-800 dark:text-gray-100"}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${toast.isError ? "bg-red-500" : t.accentBar}`} />
            {!toast.isError && (
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${t.btn.split(" ")[0]}`}>
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
              </div>
            )}
            {toast.isError && <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/></svg>}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

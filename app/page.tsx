"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getAllDocs, type Doc } from "./db"

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return "just now"
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// ── App workspace mockup ───────────────────────────────────────────────────────

function AppMockup() {
  return (
    <svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <defs>
        <linearGradient id="sidebarAccent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="contentAccent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="30%" stopColor="#3b82f6" />
          <stop offset="65%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <filter id="winShadow" x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#1e293b" floodOpacity="0.18" />
        </filter>
        <clipPath id="winClip">
          <rect x="0" y="0" width="640" height="420" rx="12" />
        </clipPath>
      </defs>

      {/* Window shadow + frame */}
      <rect x="0" y="0" width="640" height="420" rx="12" fill="white" filter="url(#winShadow)" />

      <g clipPath="url(#winClip)">
        {/* Chrome bar */}
        <rect x="0" y="0" width="640" height="38" fill="#f1f5f9" />
        <line x1="0" y1="38" x2="640" y2="38" stroke="#e2e8f0" strokeWidth="1" />

        {/* Traffic lights */}
        <circle cx="20" cy="19" r="6" fill="#ef4444" />
        <circle cx="38" cy="19" r="6" fill="#f59e0b" />
        <circle cx="56" cy="19" r="6" fill="#22c55e" />

        {/* URL bar */}
        <rect x="210" y="10" width="220" height="18" rx="9" fill="white" stroke="#e2e8f0" strokeWidth="1" />
        <text x="320" y="22" textAnchor="middle" fontSize="8.5" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">superdocu.app/docs/q3-strategy</text>

        {/* ── Sidebar ── */}
        <rect x="0" y="38" width="172" height="382" fill="#ffffff" />
        <line x1="172" y1="38" x2="172" y2="420" stroke="#e5e7eb" strokeWidth="1" />

        {/* Sidebar accent bar */}
        <rect x="0" y="38" width="172" height="3" fill="url(#sidebarAccent)" />

        {/* Logo */}
        <text x="16" y="65" fontSize="12" fontWeight="700" fill="#111827" fontFamily="ui-sans-serif,system-ui,sans-serif">Super</text>
        <text x="60" y="65" fontSize="12" fontWeight="700" fill="#3b82f6" fontFamily="ui-sans-serif,system-ui,sans-serif">Docu</text>

        {/* New Document button */}
        <rect x="12" y="71" width="148" height="26" rx="6" fill="#3b82f6" />
        <text x="86" y="87.5" textAnchor="middle" fontSize="9" fill="white" fontFamily="ui-sans-serif,system-ui,sans-serif">+ New Document</text>

        {/* Theme swatches */}
        <text x="12" y="113" fontSize="7.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Theme</text>
        <circle cx="54" cy="110" r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
        <circle cx="67" cy="110" r="4" fill="#a855f7" opacity="0.55" />
        <circle cx="79" cy="110" r="4" fill="#6366f1" opacity="0.55" />
        <circle cx="91" cy="110" r="4" fill="#22c55e" opacity="0.55" />
        <circle cx="103" cy="110" r="4" fill="#f59e0b" opacity="0.55" />

        {/* Search bar */}
        <rect x="12" y="119" width="148" height="20" rx="5" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1" />
        <text x="24" y="132" fontSize="8" fill="#d1d5db" fontFamily="ui-sans-serif,system-ui,sans-serif">Search titles and content…</text>

        {/* Sort row */}
        <text x="12" y="155" fontSize="7.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Sort</text>
        <rect x="32" y="145" width="34" height="14" rx="3" fill="#3b82f6" />
        <text x="49" y="155" textAnchor="middle" fontSize="7" fill="white" fontFamily="ui-sans-serif,system-ui,sans-serif">Recent</text>
        <text x="72" y="155" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Created</text>
        <text x="103" y="155" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">A–Z</text>

        {/* Section label */}
        <text x="12" y="174" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif" letterSpacing="0.07em">RECENT</text>

        {/* Doc row 1 — selected */}
        <rect x="4" y="180" width="164" height="54" rx="7" fill="#eff6ff" />
        <text x="14" y="196" fontSize="9.5" fontWeight="600" fill="#1e3a8a" fontFamily="ui-sans-serif,system-ui,sans-serif">Q3 Strategy Notes</text>
        <text x="14" y="208" fontSize="7.5" fill="#93c5fd" fontFamily="ui-sans-serif,system-ui,sans-serif">Meeting goals and OKRs for…</text>
        <text x="14" y="221" fontSize="7" fill="#93c5fd" fontFamily="ui-sans-serif,system-ui,sans-serif">Today 14:32</text>

        {/* Doc row 2 */}
        <text x="14" y="250" fontSize="9.5" fontWeight="600" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif">Weekly Meeting Minutes</text>
        <text x="14" y="262" fontSize="7.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Attendees: Alex, Sam, Jordan…</text>
        <text x="14" y="274" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Yesterday</text>

        {/* Doc row 3 */}
        <text x="14" y="302" fontSize="9.5" fontWeight="600" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif">Product Roadmap 2025</text>
        <text x="14" y="314" fontSize="7.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Phase 1: Core features, Phase…</text>
        <text x="14" y="326" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">3 days ago</text>

        {/* ── Content area ── */}
        <rect x="172" y="38" width="468" height="382" fill="white" />

        {/* Top bar */}
        <rect x="172" y="38" width="468" height="44" fill="white" />
        <text x="188" y="64" fontSize="10" fill="#6b7280" fontFamily="ui-sans-serif,system-ui,sans-serif">Q3 Strategy Notes</text>

        {/* Save button */}
        <rect x="512" y="50" width="36" height="20" rx="4" fill="#3b82f6" />
        <text x="530" y="63" textAnchor="middle" fontSize="8" fill="white" fontFamily="ui-sans-serif,system-ui,sans-serif">Save</text>

        {/* Edit / Read toggle */}
        <rect x="554" y="48" width="62" height="22" rx="5" fill="#f3f4f6" />
        <rect x="556" y="50" width="28" height="18" rx="4" fill="white" />
        <text x="570" y="62" textAnchor="middle" fontSize="7.5" fill="#111827" fontFamily="ui-sans-serif,system-ui,sans-serif">Edit</text>
        <text x="598" y="62" textAnchor="middle" fontSize="7.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Read</text>

        {/* Gradient accent line */}
        <rect x="172" y="82" width="468" height="2" fill="url(#contentAccent)" />

        {/* Formatting toolbar */}
        <rect x="172" y="84" width="468" height="30" fill="white" />
        <line x1="172" y1="114" x2="640" y2="114" stroke="#f1f5f9" strokeWidth="1" />

        {/* Toolbar: B active */}
        <rect x="182" y="89" width="18" height="18" rx="3" fill="#dbeafe" />
        <text x="191" y="101" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1d4ed8" fontFamily="ui-sans-serif,system-ui,sans-serif">B</text>
        <text x="207" y="101" textAnchor="middle" fontSize="9" fontStyle="italic" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">I</text>
        <text x="221" y="101" textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">U</text>
        <line x1="231" y1="93" x2="231" y2="107" stroke="#e5e7eb" strokeWidth="1" />
        <text x="243" y="101" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">H1</text>
        <text x="258" y="101" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">H2</text>
        <line x1="268" y1="93" x2="268" y2="107" stroke="#e5e7eb" strokeWidth="1" />
        <text x="282" y="101" textAnchor="middle" fontSize="7.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">• List</text>
        <text x="304" y="101" textAnchor="middle" fontSize="7.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">1. List</text>

        {/* Document content */}
        {/* Title */}
        <text x="232" y="152" fontSize="19" fontWeight="700" fill="#0f172a" fontFamily="ui-sans-serif,system-ui,sans-serif">Q3 Strategy Notes</text>

        {/* Heading 1 */}
        <text x="232" y="183" fontSize="13" fontWeight="700" fill="#0f172a" fontFamily="ui-sans-serif,system-ui,sans-serif">Overview</text>

        {/* Body lines */}
        <rect x="232" y="193" width="320" height="7" rx="3.5" fill="#e2e8f0" />
        <rect x="232" y="207" width="290" height="7" rx="3.5" fill="#e2e8f0" />
        <rect x="232" y="221" width="310" height="7" rx="3.5" fill="#e2e8f0" />
        <rect x="232" y="235" width="180" height="7" rx="3.5" fill="#e2e8f0" />

        {/* Heading 2 */}
        <text x="232" y="265" fontSize="13" fontWeight="700" fill="#0f172a" fontFamily="ui-sans-serif,system-ui,sans-serif">Key Objectives</text>

        {/* Bullet points with blue dots */}
        <circle cx="240" cy="279" r="3" fill="#3b82f6" />
        <rect x="250" y="274" width="240" height="7" rx="3.5" fill="#e2e8f0" />
        <circle cx="240" cy="296" r="3" fill="#3b82f6" />
        <rect x="250" y="291" width="200" height="7" rx="3.5" fill="#e2e8f0" />
        <circle cx="240" cy="313" r="3" fill="#3b82f6" />
        <rect x="250" y="308" width="258" height="7" rx="3.5" fill="#e2e8f0" />

        {/* Tags */}
        <rect x="232" y="345" width="48" height="16" rx="8" fill="#f1f5f9" />
        <text x="256" y="356.5" textAnchor="middle" fontSize="7.5" fill="#64748b" fontFamily="ui-sans-serif,system-ui,sans-serif">strategy</text>
        <rect x="286" y="345" width="42" height="16" rx="8" fill="#f1f5f9" />
        <text x="307" y="356.5" textAnchor="middle" fontSize="7.5" fill="#64748b" fontFamily="ui-sans-serif,system-ui,sans-serif">q3-2025</text>

        {/* Word count */}
        <text x="232" y="386" fontSize="7.5" fill="#cbd5e1" fontFamily="ui-sans-serif,system-ui,sans-serif">247 words</text>
      </g>
    </svg>
  )
}

// ── Command palette mockup ─────────────────────────────────────────────────────

function PaletteMockup() {
  return (
    <svg viewBox="0 0 480 270" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <defs>
        <filter id="palShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="12" stdDeviation="20" floodColor="#1e293b" floodOpacity="0.22" />
        </filter>
        <clipPath id="palClip">
          <rect x="40" y="20" width="400" height="230" rx="16" />
        </clipPath>
      </defs>

      {/* Dimmed app background */}
      <rect x="0" y="0" width="480" height="270" fill="#0f172a" opacity="0.25" rx="12" />

      {/* Frosted palette panel */}
      <rect x="40" y="20" width="400" height="230" rx="16" fill="white" opacity="0.96" filter="url(#palShadow)" />

      <g clipPath="url(#palClip)">
        {/* Search row */}
        <rect x="40" y="20" width="400" height="52" fill="white" />
        <line x1="40" y1="72" x2="440" y2="72" stroke="#f1f5f9" strokeWidth="1" />

        {/* Magnifier */}
        <circle cx="66" cy="46" r="7" fill="none" stroke="#94a3b8" strokeWidth="2" />
        <line x1="71" y1="51" x2="76" y2="56" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

        {/* Search text + cursor */}
        <text x="86" y="50" fontSize="12" fill="#1e293b" fontFamily="ui-sans-serif,system-ui,sans-serif">meeting</text>
        <rect x="149" y="38" width="2" height="18" rx="1" fill="#3b82f6" opacity="0.9" />

        {/* Esc hint */}
        <rect x="398" y="38" width="28" height="16" rx="4" fill="#f1f5f9" />
        <text x="412" y="49" textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="ui-mono,monospace">Esc</text>

        {/* Result list */}
        {/* Item 1 — doc (selected/highlighted) */}
        <rect x="40" y="72" width="400" height="40" fill="#eff6ff" />
        <rect x="56" y="88" width="14" height="14" rx="3" fill="#dbeafe" />
        <text x="63" y="98" textAnchor="middle" fontSize="9" fill="#3b82f6" fontFamily="ui-sans-serif,system-ui,sans-serif">D</text>
        <text x="78" y="97" fontSize="11" fill="#1e3a8a" fontWeight="500" fontFamily="ui-sans-serif,system-ui,sans-serif">Weekly Meeting Minutes</text>
        <text x="78" y="108" fontSize="8.5" fill="#93c5fd" fontFamily="ui-sans-serif,system-ui,sans-serif">Attendees: Alex, Sam, Jordan, Priya…</text>

        {/* Item 2 */}
        <rect x="56" y="128" width="14" height="14" rx="3" fill="#f1f5f9" />
        <text x="63" y="138" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">D</text>
        <text x="78" y="138" fontSize="11" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif">Product Design Meeting</text>
        <text x="78" y="149" fontSize="8.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Design review notes from last sprint</text>

        {/* Item 3 */}
        <text x="63" y="176" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">⚡</text>
        <text x="78" y="176" fontSize="11" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif">New Document</text>

        {/* Item 4 */}
        <text x="63" y="204" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">⚡</text>
        <text x="78" y="204" fontSize="11" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif">Keyboard Shortcuts</text>

        {/* Footer hints */}
        <rect x="40" y="220" width="400" height="30" fill="#fafafa" />
        <line x1="40" y1="220" x2="440" y2="220" stroke="#f1f5f9" strokeWidth="1" />
        <text x="56" y="238" fontSize="8.5" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">↑↓ navigate</text>
        <text x="136" y="238" fontSize="8.5" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">↵ select</text>
        <text x="206" y="238" fontSize="8.5" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">Esc close</text>
      </g>
    </svg>
  )
}

// ── Feature cards data ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: "Rich Text Editing",
    description: "Format with bold, italic, headings, and highlights. Write naturally without any Markdown syntax.",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
      </svg>
    ),
  },
  {
    title: "Folders & Tags",
    description: "Organise documents into folders and tag them for instant sidebar filtering.",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0v-8.25a2.25 2.25 0 0 0-2.25-2.25H8.69" />
      </svg>
    ),
  },
  {
    title: "Version History",
    description: "Save snapshots of your work and restore any previous version at any time.",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    title: "Export & Import",
    description: "Download your full workspace as JSON and import it back on any device.",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
  {
    title: "Command Palette",
    description: "Jump to any document or action instantly. Press ⌘K from anywhere in the app.",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
  {
    title: "Themes & Appearance",
    description: "Choose from five workspace themes. Toggle light, dark, or high-contrast mode.",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
      </svg>
    ),
  },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [recentDocs, setRecentDocs] = useState<Doc[]>([])

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    getAllDocs()
      .then((docs) => setRecentDocs(docs.filter((d) => !d.deletedAt).slice(0, 3)))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-100 to-violet-100 opacity-50 blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-20 w-80 h-80 rounded-full bg-gradient-to-tr from-indigo-100 to-pink-100 opacity-30 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-center">

            {/* Text column */}
            <div className={`text-center lg:text-left transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-7 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-full shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Runs entirely in your browser · No account needed
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-5 leading-[1.05]">
                Super
                <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Docu
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-500 max-w-sm mx-auto lg:mx-0 mb-9 leading-relaxed">
                A clean personal workspace for your writing and notes. Organised, searchable, always there.
              </p>

              <div className="flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors shadow-sm"
                >
                  Open workspace
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>

              <p className="mt-5 text-xs text-slate-400 text-center lg:text-left">
                Press{" "}
                <kbd className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded shadow-sm font-mono">⌘K</kbd>
                {" "}once inside to open the command palette
              </p>
            </div>

            {/* Mockup column */}
            <div className={`hidden md:block transition-all duration-1000 ease-out delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="relative">
                {/* Glow behind the window */}
                <div className="absolute -inset-6 bg-gradient-to-br from-blue-400/20 via-violet-400/15 to-indigo-400/10 rounded-3xl blur-2xl" />
                <div className="relative rotate-[1deg] hover:rotate-0 transition-transform duration-500">
                  <AppMockup />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Recent docs ── */}
      {mounted && recentDocs.length > 0 && (
        <section className="bg-white px-6 py-12 border-t border-slate-100">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">
              Continue where you left off
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recentDocs.map((doc, i) => (
                <Link
                  key={doc.id}
                  href={`/docs/${doc.id}`}
                  className={`group flex flex-col gap-1 p-5 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 hover:shadow-lg transition-all duration-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-900">
                    {doc.title || "Untitled"}
                  </p>
                  <p className="text-xs text-slate-400">{timeAgo(doc.updatedAt)}</p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
                    <span>Open</span>
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Command palette spotlight ── */}
      <section className="bg-slate-50 border-t border-slate-100 px-6 py-16 md:py-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Text */}
          <div className={`text-center md:text-left transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Command Palette</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Find anything,{" "}
              <span className="bg-gradient-to-r from-rose-500 to-violet-600 bg-clip-text text-transparent">
                instantly
              </span>
            </h2>
            <p className="text-slate-500 leading-relaxed mb-6 max-w-sm mx-auto md:mx-0">
              Press <kbd className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded shadow-sm font-mono">⌘K</kbd> from anywhere to search documents by title or content, jump between files, or trigger any action — all without lifting your hands from the keyboard.
            </p>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <kbd className="px-2 py-1 text-sm bg-white border border-slate-200 rounded-lg shadow-sm font-mono text-slate-600">⌘</kbd>
              <kbd className="px-2 py-1 text-sm bg-white border border-slate-200 rounded-lg shadow-sm font-mono text-slate-600">K</kbd>
              <span className="text-sm text-slate-400 ml-1">anywhere in the app</span>
            </div>
          </div>

          {/* Palette mockup */}
          <div className={`transition-all duration-1000 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-rose-400/10 via-violet-400/10 to-blue-400/10 rounded-3xl blur-2xl" />
              <div className="relative">
                <PaletteMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="bg-white px-6 py-20 md:py-28 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className={`text-center mb-14 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              What&apos;s inside
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything you need,{" "}
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                nothing you don&apos;t
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className={`group bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${300 + i * 80}ms` }}
              >
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${feature.iconBg} ${feature.iconColor} mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  {feature.icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-slate-100 px-6 py-8 text-center">
        <p className="text-xs text-slate-400">
          SuperDocu &middot; All data stored locally in your browser &middot;{" "}
          <Link href="/docs" className="underline underline-offset-2 hover:text-slate-600 transition-colors">
            Open workspace
          </Link>
        </p>
      </footer>
    </div>
  )
}

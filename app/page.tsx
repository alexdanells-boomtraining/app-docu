"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
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
        <linearGradient id="am_sidebarAccent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="am_contentAccent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="30%" stopColor="#3b82f6" />
          <stop offset="65%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <filter id="am_winShadow" x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#1e293b" floodOpacity="0.18" />
        </filter>
        <clipPath id="am_winClip">
          <rect x="0" y="0" width="640" height="420" rx="12" />
        </clipPath>
      </defs>

      <rect x="0" y="0" width="640" height="420" rx="12" fill="white" filter="url(#am_winShadow)" />

      <g clipPath="url(#am_winClip)">
        <rect x="0" y="0" width="640" height="38" fill="#f1f5f9" />
        <line x1="0" y1="38" x2="640" y2="38" stroke="#e2e8f0" strokeWidth="1" />
        <circle cx="20" cy="19" r="6" fill="#ef4444" />
        <circle cx="38" cy="19" r="6" fill="#f59e0b" />
        <circle cx="56" cy="19" r="6" fill="#22c55e" />
        <rect x="210" y="10" width="220" height="18" rx="9" fill="white" stroke="#e2e8f0" strokeWidth="1" />
        <text x="320" y="22" textAnchor="middle" fontSize="8.5" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">superdocu.app/docs/q3-strategy</text>

        <rect x="0" y="38" width="172" height="382" fill="#ffffff" />
        <line x1="172" y1="38" x2="172" y2="420" stroke="#e5e7eb" strokeWidth="1" />
        <rect x="0" y="38" width="172" height="3" fill="url(#am_sidebarAccent)" />
        <text x="16" y="65" fontSize="12" fontWeight="700" fill="#111827" fontFamily="ui-sans-serif,system-ui,sans-serif">Super</text>
        <text x="60" y="65" fontSize="12" fontWeight="700" fill="#3b82f6" fontFamily="ui-sans-serif,system-ui,sans-serif">Docu</text>
        <rect x="12" y="71" width="148" height="26" rx="6" fill="#3b82f6" />
        <text x="86" y="87.5" textAnchor="middle" fontSize="9" fill="white" fontFamily="ui-sans-serif,system-ui,sans-serif">+ New Document</text>
        <text x="12" y="113" fontSize="7.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Theme</text>
        <circle cx="54" cy="110" r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
        <circle cx="67" cy="110" r="4" fill="#a855f7" opacity="0.55" />
        <circle cx="79" cy="110" r="4" fill="#6366f1" opacity="0.55" />
        <circle cx="91" cy="110" r="4" fill="#22c55e" opacity="0.55" />
        <circle cx="103" cy="110" r="4" fill="#f59e0b" opacity="0.55" />
        <rect x="12" y="119" width="148" height="20" rx="5" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1" />
        <text x="24" y="132" fontSize="8" fill="#d1d5db" fontFamily="ui-sans-serif,system-ui,sans-serif">Search titles and content…</text>
        <text x="12" y="155" fontSize="7.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Sort</text>
        <rect x="32" y="145" width="34" height="14" rx="3" fill="#3b82f6" />
        <text x="49" y="155" textAnchor="middle" fontSize="7" fill="white" fontFamily="ui-sans-serif,system-ui,sans-serif">Recent</text>
        <text x="72" y="155" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Created</text>
        <text x="103" y="155" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">A–Z</text>
        <text x="12" y="174" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif" letterSpacing="0.07em">RECENT</text>
        <rect x="4" y="180" width="164" height="54" rx="7" fill="#eff6ff" />
        <text x="14" y="196" fontSize="9.5" fontWeight="600" fill="#1e3a8a" fontFamily="ui-sans-serif,system-ui,sans-serif">Q3 Strategy Notes</text>
        <text x="14" y="208" fontSize="7.5" fill="#93c5fd" fontFamily="ui-sans-serif,system-ui,sans-serif">Meeting goals and OKRs for…</text>
        <text x="14" y="221" fontSize="7" fill="#93c5fd" fontFamily="ui-sans-serif,system-ui,sans-serif">Today 14:32</text>
        <text x="14" y="250" fontSize="9.5" fontWeight="600" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif">Weekly Meeting Minutes</text>
        <text x="14" y="262" fontSize="7.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Attendees: Alex, Sam, Jordan…</text>
        <text x="14" y="274" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Yesterday</text>
        <text x="14" y="302" fontSize="9.5" fontWeight="600" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif">Product Roadmap 2025</text>
        <text x="14" y="314" fontSize="7.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Phase 1: Core features, Phase…</text>
        <text x="14" y="326" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">3 days ago</text>

        <rect x="172" y="38" width="468" height="382" fill="white" />
        <rect x="172" y="38" width="468" height="44" fill="white" />
        <text x="188" y="64" fontSize="10" fill="#6b7280" fontFamily="ui-sans-serif,system-ui,sans-serif">Q3 Strategy Notes</text>
        <rect x="512" y="50" width="36" height="20" rx="4" fill="#3b82f6" />
        <text x="530" y="63" textAnchor="middle" fontSize="8" fill="white" fontFamily="ui-sans-serif,system-ui,sans-serif">Save</text>
        <rect x="554" y="48" width="62" height="22" rx="5" fill="#f3f4f6" />
        <rect x="556" y="50" width="28" height="18" rx="4" fill="white" />
        <text x="570" y="62" textAnchor="middle" fontSize="7.5" fill="#111827" fontFamily="ui-sans-serif,system-ui,sans-serif">Edit</text>
        <text x="598" y="62" textAnchor="middle" fontSize="7.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Read</text>
        <rect x="172" y="82" width="468" height="2" fill="url(#am_contentAccent)" />
        <rect x="172" y="84" width="468" height="30" fill="white" />
        <line x1="172" y1="114" x2="640" y2="114" stroke="#f1f5f9" strokeWidth="1" />
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
        <text x="232" y="152" fontSize="19" fontWeight="700" fill="#0f172a" fontFamily="ui-sans-serif,system-ui,sans-serif">Q3 Strategy Notes</text>
        <text x="232" y="183" fontSize="13" fontWeight="700" fill="#0f172a" fontFamily="ui-sans-serif,system-ui,sans-serif">Overview</text>
        <rect x="232" y="193" width="320" height="7" rx="3.5" fill="#e2e8f0" />
        <rect x="232" y="207" width="290" height="7" rx="3.5" fill="#e2e8f0" />
        <rect x="232" y="221" width="310" height="7" rx="3.5" fill="#e2e8f0" />
        <rect x="232" y="235" width="180" height="7" rx="3.5" fill="#e2e8f0" />
        <text x="232" y="265" fontSize="13" fontWeight="700" fill="#0f172a" fontFamily="ui-sans-serif,system-ui,sans-serif">Key Objectives</text>
        <circle cx="240" cy="279" r="3" fill="#3b82f6" />
        <rect x="250" y="274" width="240" height="7" rx="3.5" fill="#e2e8f0" />
        <circle cx="240" cy="296" r="3" fill="#3b82f6" />
        <rect x="250" y="291" width="200" height="7" rx="3.5" fill="#e2e8f0" />
        <circle cx="240" cy="313" r="3" fill="#3b82f6" />
        <rect x="250" y="308" width="258" height="7" rx="3.5" fill="#e2e8f0" />
        <rect x="232" y="345" width="48" height="16" rx="8" fill="#f1f5f9" />
        <text x="256" y="356.5" textAnchor="middle" fontSize="7.5" fill="#64748b" fontFamily="ui-sans-serif,system-ui,sans-serif">strategy</text>
        <rect x="286" y="345" width="42" height="16" rx="8" fill="#f1f5f9" />
        <text x="307" y="356.5" textAnchor="middle" fontSize="7.5" fill="#64748b" fontFamily="ui-sans-serif,system-ui,sans-serif">q3-2025</text>
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
        <filter id="pm_palShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="12" stdDeviation="20" floodColor="#1e293b" floodOpacity="0.22" />
        </filter>
        <clipPath id="pm_palClip">
          <rect x="40" y="20" width="400" height="230" rx="16" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width="480" height="270" fill="#0f172a" opacity="0.25" rx="12" />
      <rect x="40" y="20" width="400" height="230" rx="16" fill="white" opacity="0.96" filter="url(#pm_palShadow)" />
      <g clipPath="url(#pm_palClip)">
        <rect x="40" y="20" width="400" height="52" fill="white" />
        <line x1="40" y1="72" x2="440" y2="72" stroke="#f1f5f9" strokeWidth="1" />
        <circle cx="66" cy="46" r="7" fill="none" stroke="#94a3b8" strokeWidth="2" />
        <line x1="71" y1="51" x2="76" y2="56" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <text x="86" y="50" fontSize="12" fill="#1e293b" fontFamily="ui-sans-serif,system-ui,sans-serif">meeting</text>
        <rect x="149" y="38" width="2" height="18" rx="1" fill="#3b82f6" opacity="0.9" />
        <rect x="398" y="38" width="28" height="16" rx="4" fill="#f1f5f9" />
        <text x="412" y="49" textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="ui-mono,monospace">Esc</text>
        <rect x="40" y="72" width="400" height="40" fill="#eff6ff" />
        <rect x="56" y="88" width="14" height="14" rx="3" fill="#dbeafe" />
        <text x="63" y="98" textAnchor="middle" fontSize="9" fill="#3b82f6" fontFamily="ui-sans-serif,system-ui,sans-serif">D</text>
        <text x="78" y="97" fontSize="11" fill="#1e3a8a" fontWeight="500" fontFamily="ui-sans-serif,system-ui,sans-serif">Weekly Meeting Minutes</text>
        <text x="78" y="108" fontSize="8.5" fill="#93c5fd" fontFamily="ui-sans-serif,system-ui,sans-serif">Attendees: Alex, Sam, Jordan, Priya…</text>
        <rect x="56" y="128" width="14" height="14" rx="3" fill="#f1f5f9" />
        <text x="63" y="138" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">D</text>
        <text x="78" y="138" fontSize="11" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif">Product Design Meeting</text>
        <text x="78" y="149" fontSize="8.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">Design review notes from last sprint</text>
        <text x="63" y="176" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">⚡</text>
        <text x="78" y="176" fontSize="11" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif">New Document</text>
        <text x="63" y="204" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">⚡</text>
        <text x="78" y="204" fontSize="11" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif">Keyboard Shortcuts</text>
        <rect x="40" y="220" width="400" height="30" fill="#fafafa" />
        <line x1="40" y1="220" x2="440" y2="220" stroke="#f1f5f9" strokeWidth="1" />
        <text x="56" y="238" fontSize="8.5" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">↑↓ navigate</text>
        <text x="136" y="238" fontSize="8.5" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">↵ select</text>
        <text x="206" y="238" fontSize="8.5" fill="#94a3b8" fontFamily="ui-sans-serif,system-ui,sans-serif">Esc close</text>
      </g>
    </svg>
  )
}

// ── Rich text editing mockup ───────────────────────────────────────────────────

function RichTextMockup() {
  return (
    <svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <defs>
        <filter id="rt_shadow" x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#1e293b" floodOpacity="0.15" />
        </filter>
        <clipPath id="rt_clip">
          <rect x="0" y="0" width="480" height="300" rx="12" />
        </clipPath>
        <linearGradient id="rt_accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="25%" stopColor="#3b82f6" />
          <stop offset="65%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="480" height="300" rx="12" fill="white" filter="url(#rt_shadow)" />

      <g clipPath="url(#rt_clip)">
        {/* Chrome */}
        <rect x="0" y="0" width="480" height="32" fill="#f1f5f9" />
        <line x1="0" y1="32" x2="480" y2="32" stroke="#e2e8f0" strokeWidth="1" />
        <circle cx="16" cy="16" r="5" fill="#ef4444" />
        <circle cx="30" cy="16" r="5" fill="#f59e0b" />
        <circle cx="44" cy="16" r="5" fill="#22c55e" />

        {/* Top bar */}
        <rect x="0" y="32" width="480" height="30" fill="white" />
        <rect x="0" y="32" width="480" height="2" fill="url(#rt_accent)" />
        <line x1="0" y1="62" x2="480" y2="62" stroke="#f1f5f9" strokeWidth="1" />

        {/* Toolbar */}
        <rect x="0" y="62" width="480" height="26" fill="white" />
        <line x1="0" y1="88" x2="480" y2="88" stroke="#f1f5f9" strokeWidth="1" />

        {/* B active */}
        <rect x="12" y="66" width="16" height="16" rx="3" fill="#dbeafe" />
        <text x="20" y="77.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1d4ed8" fontFamily="ui-sans-serif,system-ui,sans-serif">B</text>
        <text x="36" y="78" textAnchor="middle" fontSize="8" fontStyle="italic" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">I</text>
        <text x="50" y="78" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">U</text>
        <line x1="60" y1="68" x2="60" y2="82" stroke="#e5e7eb" strokeWidth="1" />
        <text x="72" y="78" textAnchor="middle" fontSize="7" fontWeight="700" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">H1</text>
        <text x="86" y="78" textAnchor="middle" fontSize="7" fontWeight="700" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">H2</text>
        <line x1="96" y1="68" x2="96" y2="82" stroke="#e5e7eb" strokeWidth="1" />
        <text x="110" y="78" textAnchor="middle" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">• List</text>
        <text x="132" y="78" textAnchor="middle" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">1. List</text>
        {/* Highlight button active */}
        <rect x="146" y="65" width="44" height="18" rx="4" fill="#fef9c3" />
        <text x="168" y="77.5" textAnchor="middle" fontSize="7" fill="#854d0e" fontFamily="ui-sans-serif,system-ui,sans-serif">Highlight</text>

        {/* Document */}
        <rect x="0" y="88" width="480" height="212" fill="white" />

        {/* Title */}
        <text x="60" y="124" fontSize="18" fontWeight="700" fill="#0f172a" fontFamily="ui-sans-serif,system-ui,sans-serif">Project Brief</text>

        {/* Heading */}
        <text x="60" y="148" fontSize="11" fontWeight="700" fill="#0f172a" fontFamily="ui-sans-serif,system-ui,sans-serif">Overview</text>

        {/* Body with inline bold */}
        <text x="60" y="166" fontSize="9.5" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif">This project aims to</text>
        <rect x="178" y="155" width="64" height="14" rx="2" fill="#dbeafe" />
        <text x="210" y="166" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#1d4ed8" fontFamily="ui-sans-serif,system-ui,sans-serif">deliver value</text>
        <text x="247" y="166" fontSize="9.5" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif"> by Q3 2025.</text>

        {/* Highlighted sentence */}
        <rect x="60" y="175" width="280" height="16" rx="3" fill="#fef08a" />
        <text x="60" y="186.5" fontSize="9.5" fill="#713f12" fontFamily="ui-sans-serif,system-ui,sans-serif">Key milestone: launch beta to 500 users by August.</text>

        {/* Body lines */}
        <rect x="60" y="200" width="330" height="6" rx="3" fill="#e2e8f0" />
        <rect x="60" y="212" width="290" height="6" rx="3" fill="#e2e8f0" />

        {/* Deliverables heading */}
        <text x="60" y="237" fontSize="11" fontWeight="700" fill="#0f172a" fontFamily="ui-sans-serif,system-ui,sans-serif">Deliverables</text>

        {/* Bullets */}
        <circle cx="68" cy="250" r="3" fill="#3b82f6" />
        <rect x="78" y="245" width="210" height="6" rx="3" fill="#e2e8f0" />
        <circle cx="68" cy="265" r="3" fill="#3b82f6" />
        <rect x="78" y="260" width="170" height="6" rx="3" fill="#e2e8f0" />
        <circle cx="68" cy="280" r="3" fill="#3b82f6" />
        <rect x="78" y="275" width="230" height="6" rx="3" fill="#e2e8f0" />
      </g>
    </svg>
  )
}

// ── Themes mockup ──────────────────────────────────────────────────────────────

function ThemesMockup() {
  const themes = [
    { name: "Professional", c1: "#3b82f6", c2: "#6366f1", bg: "#eff6ff", textC: "#1e3a8a" },
    { name: "Videogames",   c1: "#a855f7", c2: "#ec4899", bg: "#faf5ff", textC: "#581c87" },
    { name: "Space",        c1: "#6366f1", c2: "#8b5cf6", bg: "#eef2ff", textC: "#312e81" },
    { name: "Nature",       c1: "#22c55e", c2: "#10b981", bg: "#f0fdf4", textC: "#14532d" },
    { name: "CityScape",    c1: "#f59e0b", c2: "#f97316", bg: "#fffbeb", textC: "#78350f" },
  ]
  const cardW = 84, cardH = 236, gap = 7
  const totalW = themes.length * cardW + (themes.length - 1) * gap
  const startX = (480 - totalW) / 2

  return (
    <svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <defs>
        <filter id="tm_shadow" x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="6" stdDeviation="14" floodColor="#1e293b" floodOpacity="0.14" />
        </filter>
        <filter id="tm_cardShadow" x="-12%" y="-8%" width="124%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#1e293b" floodOpacity="0.18" />
        </filter>
        {themes.map((t, i) => (
          <linearGradient key={i} id={`tm_tg${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={t.c1} />
            <stop offset="100%" stopColor={t.c2} />
          </linearGradient>
        ))}
      </defs>

      {/* Background */}
      <rect x="0" y="0" width="480" height="300" rx="12" fill="#f8fafc" filter="url(#tm_shadow)" />

      {/* Theme cards */}
      {themes.map((th, i) => {
        const x = startX + i * (cardW + gap)
        const y = (300 - cardH) / 2
        const isActive = i === 0
        return (
          <g key={i}>
            <rect x={x} y={y} width={cardW} height={cardH} rx="10"
              fill="white"
              filter={isActive ? "url(#tm_cardShadow)" : undefined}
              stroke={isActive ? "none" : "#e5e7eb"}
              strokeWidth={isActive ? 0 : 1}
            />
            {/* Top gradient stripe */}
            <rect x={x} y={y} width={cardW} height="5" fill={`url(#tm_tg${i})`} />
            {/* Logo */}
            <text x={x + 8} y={y + 22} fontSize="7" fontWeight="700" fill="#111827" fontFamily="ui-sans-serif,system-ui,sans-serif">Super</text>
            <text x={x + 38} y={y + 22} fontSize="7" fontWeight="700" fill={th.c1} fontFamily="ui-sans-serif,system-ui,sans-serif">Docu</text>
            {/* New button */}
            <rect x={x + 6} y={y + 27} width={cardW - 12} height="17" rx="4" fill={th.c1} />
            <text x={x + cardW / 2} y={y + 38.5} textAnchor="middle" fontSize="6.5" fill="white" fontFamily="ui-sans-serif,system-ui,sans-serif">+ New</text>
            {/* Theme name */}
            <text x={x + cardW / 2} y={y + 56} textAnchor="middle" fontSize="5.5" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">{th.name}</text>
            {/* Doc rows */}
            {[0, 1, 2].map((j) => (
              <g key={j}>
                <rect x={x + 4} y={y + 62 + j * 30} width={cardW - 8} height={j === 0 ? 26 : 22} rx="4"
                  fill={j === 0 ? th.bg : "transparent"}
                />
                <rect x={x + 9} y={y + 68 + j * 30} width={48} height="5" rx="2.5"
                  fill={j === 0 ? th.textC : "#d1d5db"} opacity={j === 0 ? 0.6 : 1}
                />
                <rect x={x + 9} y={y + 76 + j * 30} width={32} height="4" rx="2"
                  fill={j === 0 ? th.c1 : "#e5e7eb"} opacity="0.45"
                />
              </g>
            ))}
            {/* Active ring */}
            {isActive && (
              <rect x={x - 2} y={y - 2} width={cardW + 4} height={cardH + 4} rx="12"
                fill="none" stroke={th.c1} strokeWidth="2" strokeOpacity="0.6"
              />
            )}
            {/* Active dot below */}
            {isActive && (
              <circle cx={x + cardW / 2} cy={y + cardH + 12} r="3" fill={th.c1} />
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Version history mockup ─────────────────────────────────────────────────────

function HistoryMockup() {
  return (
    <svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <defs>
        <filter id="his_shadow" x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#1e293b" floodOpacity="0.15" />
        </filter>
        <clipPath id="his_clip">
          <rect x="0" y="0" width="480" height="300" rx="12" />
        </clipPath>
        <linearGradient id="his_accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="65%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="480" height="300" rx="12" fill="white" filter="url(#his_shadow)" />

      <g clipPath="url(#his_clip)">
        {/* Chrome */}
        <rect x="0" y="0" width="480" height="32" fill="#f1f5f9" />
        <line x1="0" y1="32" x2="480" y2="32" stroke="#e2e8f0" strokeWidth="1" />
        <circle cx="16" cy="16" r="5" fill="#ef4444" />
        <circle cx="30" cy="16" r="5" fill="#f59e0b" />
        <circle cx="44" cy="16" r="5" fill="#22c55e" />

        {/* Top bar */}
        <rect x="0" y="32" width="480" height="36" fill="white" />
        <text x="16" y="54" fontSize="9.5" fill="#6b7280" fontFamily="ui-sans-serif,system-ui,sans-serif">Q3 Strategy Notes</text>
        <rect x="288" y="43" width="52" height="17" rx="4" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1" />
        <text x="314" y="54.5" textAnchor="middle" fontSize="7" fill="#92400e" fontFamily="ui-sans-serif,system-ui,sans-serif">History</text>
        <rect x="346" y="43" width="32" height="17" rx="4" fill="#f59e0b" />
        <text x="362" y="54.5" textAnchor="middle" fontSize="7.5" fill="white" fontFamily="ui-sans-serif,system-ui,sans-serif">Save</text>

        {/* Accent line */}
        <rect x="0" y="68" width="480" height="2" fill="url(#his_accent)" />

        {/* History panel bar */}
        <rect x="0" y="70" width="480" height="68" fill="#fffbeb" />
        <line x1="0" y1="138" x2="480" y2="138" stroke="#fde68a" strokeWidth="1" />
        <text x="16" y="88" fontSize="7.5" fontWeight="600" fill="#92400e" fontFamily="ui-sans-serif,system-ui,sans-serif" letterSpacing="0.07em">VERSION HISTORY</text>

        {/* Three version cards */}
        {[
          { time: "Today, 14:32",   words: "247 words", x: 14 },
          { time: "Today, 11:08",   words: "183 words", x: 175 },
          { time: "Yesterday",      words: "95 words",  x: 336 },
        ].map((card, i) => (
          <g key={i}>
            <rect x={card.x} y={96} width={148} height={32} rx="6"
              fill="white"
              stroke={i === 0 ? "#fcd34d" : "#e5e7eb"}
              strokeWidth="1"
            />
            <text x={card.x + 10} y={108.5} fontSize="7.5" fontWeight="600"
              fill={i === 0 ? "#92400e" : "#374151"}
              fontFamily="ui-sans-serif,system-ui,sans-serif">{card.time}</text>
            <text x={card.x + 10} y={120} fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">{card.words}</text>
            <text x={card.x + 105} y={116} fontSize="7" fill={i === 0 ? "#f59e0b" : "#9ca3af"}
              fontFamily="ui-sans-serif,system-ui,sans-serif">Restore</text>
          </g>
        ))}

        {/* Document content below */}
        <rect x="0" y="138" width="480" height="162" fill="white" />
        <text x="60" y="175" fontSize="17" fontWeight="700" fill="#0f172a" fontFamily="ui-sans-serif,system-ui,sans-serif">Q3 Strategy Notes</text>
        <text x="60" y="200" fontSize="11" fontWeight="700" fill="#0f172a" fontFamily="ui-sans-serif,system-ui,sans-serif">Overview</text>
        <rect x="60" y="209" width="300" height="6" rx="3" fill="#e2e8f0" />
        <rect x="60" y="221" width="260" height="6" rx="3" fill="#e2e8f0" />
        <rect x="60" y="233" width="280" height="6" rx="3" fill="#e2e8f0" />
        <rect x="60" y="245" width="160" height="6" rx="3" fill="#e2e8f0" />

        {/* Toast notification */}
        <rect x="338" y="255" width="128" height="34" rx="10" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <rect x="338" y="255" width="4" height="34" rx="2" fill="#f59e0b" />
        <circle cx="356" cy="272" r="9" fill="#f59e0b" />
        <text x="356" y="275.5" textAnchor="middle" fontSize="9" fill="white" fontFamily="ui-sans-serif,system-ui,sans-serif">✓</text>
        <text x="372" y="269" fontSize="7.5" fontWeight="500" fill="#374151" fontFamily="ui-sans-serif,system-ui,sans-serif">Version saved</text>
        <text x="372" y="280" fontSize="7" fill="#9ca3af" fontFamily="ui-sans-serif,system-ui,sans-serif">247 words · 14:32</text>
      </g>
    </svg>
  )
}

// ── Floating hero elements (bolts + documents) ────────────────────────────────

type FloatEl = {
  kind: "bolt" | "doc"
  x: string; y: string; size: number; color: string; opacity: number
  dur: string; delay: string; rot: string; dx: string
}

const ELEMENTS: FloatEl[] = [
  // ── Bolts — fast, streak upward-right ──
  { kind: "bolt", x: "5%",  y: "15%", size: 20, color: "#3b82f6", opacity: 0.35, dur: "3.2s", delay: "0s",   rot: "-12deg", dx: "24px"  },
  { kind: "bolt", x: "22%", y: "40%", size: 24, color: "#8b5cf6", opacity: 0.30, dur: "3.6s", delay: "2.8s", rot: "-15deg", dx: "30px"  },
  { kind: "bolt", x: "50%", y: "75%", size: 21, color: "#3b82f6", opacity: 0.30, dur: "3.4s", delay: "2.1s", rot: "-13deg", dx: "26px"  },
  { kind: "bolt", x: "66%", y: "25%", size: 17, color: "#8b5cf6", opacity: 0.28, dur: "4.3s", delay: "0.9s", rot: "-9deg",  dx: "20px"  },
  { kind: "bolt", x: "87%", y: "18%", size: 22, color: "#3b82f6", opacity: 0.32, dur: "3.0s", delay: "1.7s", rot: "-14deg", dx: "22px"  },
  { kind: "bolt", x: "93%", y: "68%", size: 14, color: "#6366f1", opacity: 0.26, dur: "4.5s", delay: "4.4s", rot: "-8deg",  dx: "12px"  },
  // ── Documents — slightly slower, tumble as they travel ──
  { kind: "doc",  x: "12%", y: "60%", size: 22, color: "#6366f1", opacity: 0.55, dur: "5.2s", delay: "1.2s", rot: "-8deg",  dx: "18px"  },
  { kind: "doc",  x: "33%", y: "8%",  size: 18, color: "#3b82f6", opacity: 0.50, dur: "4.8s", delay: "3.5s", rot: "6deg",   dx: "-14px" },
  { kind: "doc",  x: "46%", y: "83%", size: 26, color: "#8b5cf6", opacity: 0.48, dur: "5.6s", delay: "0.7s", rot: "-12deg", dx: "22px"  },
  { kind: "doc",  x: "74%", y: "52%", size: 20, color: "#6366f1", opacity: 0.52, dur: "4.6s", delay: "2.6s", rot: "8deg",   dx: "-16px" },
  { kind: "doc",  x: "81%", y: "32%", size: 16, color: "#3b82f6", opacity: 0.45, dur: "5.8s", delay: "4.0s", rot: "-5deg",  dx: "-18px" },
  { kind: "doc",  x: "18%", y: "22%", size: 19, color: "#8b5cf6", opacity: 0.48, dur: "5.0s", delay: "5.5s", rot: "10deg",  dx: "16px"  },
]

function FloatingElements() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {ELEMENTS.map((el, i) => (
        <div
          key={i}
          className={`absolute ${el.kind === "bolt" ? "bolt-float" : "doc-float"}`}
          style={{
            left: el.x, top: el.y,
            "--bolt-dur": el.dur,
            "--bolt-delay": el.delay,
            "--bolt-r": el.rot,
            "--bolt-dx": el.dx,
          } as React.CSSProperties}
        >
          {el.kind === "bolt" ? (
            <svg width={el.size} height={Math.round(el.size * 1.57)} viewBox="0 0 14 22" fill={el.color} opacity={el.opacity}>
              <path d="M8 0L0 13h5.5L4 22l10-13H8.5z" />
            </svg>
          ) : (
            <svg width={el.size} height={Math.round(el.size * 1.3)} viewBox="0 0 16 21" fill="none" opacity={el.opacity}>
              <path d="M1 3C1 1.9 1.9 1 3 1h8l4 4v13c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3Z" fill={el.color} fillOpacity={0.12} stroke={el.color} strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M11 1v4h4" stroke={el.color} strokeWidth="1.2" strokeLinejoin="round"/>
              <line x1="4" y1="9"  x2="12" y2="9"  stroke={el.color} strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="4" y1="12" x2="12" y2="12" stroke={el.color} strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="4" y1="15" x2="8.5" y2="15" stroke={el.color} strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Feature showcase (cycling) ─────────────────────────────────────────────────

const SHOWCASE = [
  {
    label: "Rich Text Editing",
    headlineA: "Write beautifully,",
    headlineB: "format effortlessly",
    gradFrom: "from-blue-600",
    gradTo: "to-violet-600",
    description: "Bold, italic, underlines, headings, highlights, and bullet lists — all without touching Markdown. Add inline images and links with a single click.",
    shortcut: { keys: ["⌘", "B"], hint: "to bold, and more" },
    glowFrom: "from-blue-400/10",
    glowTo: "to-violet-400/10",
    dot: "bg-blue-500",
    mockup: <RichTextMockup />,
  },
  {
    label: "Command Palette",
    headlineA: "Find anything,",
    headlineB: "instantly",
    gradFrom: "from-rose-500",
    gradTo: "to-violet-600",
    description: "Press ⌘K from anywhere to search documents by title or content, jump between files, or trigger any action — keyboard only, zero mouse required.",
    shortcut: { keys: ["⌘", "K"], hint: "anywhere in the app" },
    glowFrom: "from-rose-400/10",
    glowTo: "to-violet-400/10",
    dot: "bg-rose-500",
    mockup: <PaletteMockup />,
  },
  {
    label: "Workspace Themes",
    headlineA: "Five themes,",
    headlineB: "one click",
    gradFrom: "from-indigo-500",
    gradTo: "to-pink-500",
    description: "Switch between Professional, Videogames, Space, Nature, and CityScape. Each theme updates the accent colour across the entire workspace instantly.",
    shortcut: null,
    glowFrom: "from-indigo-400/10",
    glowTo: "to-pink-400/10",
    dot: "bg-indigo-500",
    mockup: <ThemesMockup />,
  },
  {
    label: "Version History",
    headlineA: "Every edit,",
    headlineB: "preserved",
    gradFrom: "from-amber-500",
    gradTo: "to-orange-500",
    description: "Save a snapshot any time with ⌘S. Up to 3 versions per document — restore any of them in one click, with a confirmation toast so you always know what happened.",
    shortcut: { keys: ["⌘", "S"], hint: "to save a version" },
    glowFrom: "from-amber-400/10",
    glowTo: "to-orange-400/10",
    dot: "bg-amber-500",
    mockup: <HistoryMockup />,
  },
]

function FeatureShowcase({ mounted }: { mounted: boolean }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % SHOWCASE.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const f = SHOWCASE[active]

  return (
    <section className="bg-slate-50 border-t border-slate-100 px-6 py-16 md:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Text */}
          <div key={`text-${active}`} className="feature-enter text-center md:text-left">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{f.label}</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4 leading-tight">
              {f.headlineA}{" "}
              <span className={`bg-gradient-to-r ${f.gradFrom} ${f.gradTo} bg-clip-text text-transparent`}>
                {f.headlineB}
              </span>
            </h2>
            <p className="text-slate-500 leading-relaxed mb-6 max-w-sm mx-auto md:mx-0">
              {f.description}
            </p>
            {f.shortcut && (
              <div className="flex items-center justify-center md:justify-start gap-2">
                {f.shortcut.keys.map((k, i) => (
                  <kbd key={i} className="px-2 py-1 text-sm bg-white border border-slate-200 rounded-lg shadow-sm font-mono text-slate-600">{k}</kbd>
                ))}
                <span className="text-sm text-slate-400 ml-1">{f.shortcut.hint}</span>
              </div>
            )}
          </div>

          {/* Mockup */}
          <div key={`mockup-${active}`} className="feature-enter">
            <div className="relative">
              <div className={`absolute -inset-4 bg-gradient-to-br ${f.glowFrom} ${f.glowTo} rounded-3xl blur-2xl`} />
              <div className="relative">{f.mockup}</div>
            </div>
          </div>
        </div>

        {/* Indicator dots */}
        <div className="flex items-center justify-center gap-3 mt-10">
          {SHOWCASE.map((feat, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={feat.label}
              className={`h-2 rounded-full transition-all duration-400 cursor-pointer ${active === i ? `w-8 ${feat.dot}` : "w-2 bg-slate-300 hover:bg-slate-400"}`}
            />
          ))}
        </div>
      </div>
    </section>
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
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-100 to-violet-100 opacity-50 blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-20 w-80 h-80 rounded-full bg-gradient-to-tr from-indigo-100 to-pink-100 opacity-30 blur-3xl pointer-events-none" />
        <FloatingElements />

        <div className="max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-center">

            <div className={`text-center lg:text-left transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
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

            <div className={`hidden md:block transition-all duration-1000 ease-out delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="relative">
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

      {/* ── Feature showcase (cycling) ── */}
      <FeatureShowcase mounted={mounted} />

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

      {/* ── Brainchild ── */}
      <section className="bg-slate-50 border-t border-slate-100 px-6 py-16 md:py-20">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-10 text-center sm:text-left">
          <div className="shrink-0">
            <Image
              src="/alex.jpg"
              alt="Alex Danells"
              width={120}
              height={120}
              className="rounded-full object-cover ring-4 ring-white shadow-xl"
            />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">The brainchild of</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
              Alex Danells
            </h2>
            <p className="text-slate-500 leading-relaxed max-w-lg">
              SuperDocu is a personal side project — built to scratch the itch of having a fast, private, no-nonsense document workspace that lives entirely in the browser. No cloud sync, no subscriptions, no noise. Just your writing, always there.
            </p>
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

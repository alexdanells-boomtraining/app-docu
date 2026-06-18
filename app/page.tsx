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
      <section className="relative overflow-hidden flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-16 md:pt-32 md:pb-24 text-center">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white" />
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 opacity-40 blur-3xl -z-10" />
        <div className="absolute -bottom-12 -left-12 w-72 h-72 rounded-full bg-gradient-to-tr from-indigo-100 to-pink-100 opacity-30 blur-3xl -z-10" />

        <div
          className={`transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-full shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Runs entirely in your browser · No account needed
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-5">
            Super
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Docu
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 max-w-sm mx-auto mb-10 leading-relaxed">
            A clean personal workspace for your writing and notes. Organised, searchable, always there.
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
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

          <p className="mt-5 text-xs text-slate-400">
            Press{" "}
            <kbd className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded shadow-sm font-mono">
              ⌘K
            </kbd>{" "}
            once inside to open the command palette
          </p>
        </div>
      </section>

      {/* ── Recent docs (shown after mount if any exist) ── */}
      {mounted && recentDocs.length > 0 && (
        <section className="bg-white px-6 pb-14">
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

      {/* ── Feature cards ── */}
      <section className="bg-slate-50 px-6 py-20 md:py-28 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div
            className={`text-center mb-14 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
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
                <div
                  className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${feature.iconBg} ${feature.iconColor} mb-4 group-hover:scale-110 transition-transform duration-200`}
                >
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

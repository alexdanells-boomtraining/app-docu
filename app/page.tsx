"use client"

import { useState, useRef } from "react"

type Doc = {
  id: string
  title: string
  body: string
  createdAt: string
}

type Mode = "edit" | "read"

const SEED_DOCS: Doc[] = [
  {
    id: "1",
    title: "Meeting Notes — June",
    body: "Discussed Q3 roadmap and upcoming feature releases.\n\nAction items:\n- Review timeline\n- Assign owners",
    createdAt: "15 Jun 2026",
  },
  {
    id: "2",
    title: "Project Brief",
    body: "Overview of the document management application scope and goals.",
    createdAt: "10 Jun 2026",
  },
]

export default function Home() {
  const [docs, setDocs] = useState<Doc[]>(SEED_DOCS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>("edit")
  const idCounter = useRef(SEED_DOCS.length + 1)

  const selectedDoc = docs.find((d) => d.id === selectedId) ?? null

  function handleNew() {
    const id = String(idCounter.current++)
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    const newDoc: Doc = { id, title: "", body: "", createdAt: today }
    setDocs([newDoc, ...docs])
    setSelectedId(id)
    setMode("edit")
  }

  function handleSelect(id: string) {
    setSelectedId(id)
    setMode("read")
  }

  function handleUpdate(field: "title" | "body", value: string) {
    setDocs(docs.map((d) => (d.id === selectedId ? { ...d, [field]: value } : d)))
  }

  return (
    <div className="flex h-full">
      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-gray-200">
          <h1 className="text-sm font-semibold text-gray-900">Docu</h1>
        </div>

        {/* New document */}
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={handleNew}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
          >
            <span aria-hidden>+</span> New Document
          </button>
        </div>

        {/* Recent list */}
        <p className="px-5 pb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
          Recent
        </p>

        <nav className="flex-1 px-3 overflow-y-auto">
          {docs.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">No documents yet</p>
          ) : (
            docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleSelect(doc.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md mb-0.5 transition-colors ${
                  selectedId === doc.id
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <p className="text-sm font-medium truncate">
                  {doc.title || "Untitled"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{doc.createdAt}</p>
              </button>
            ))
          )}
        </nav>

        {/* Upload */}
        <div className="px-3 py-3 border-t border-gray-200">
          <button
            disabled
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-100 text-gray-300 text-sm font-medium rounded-md cursor-not-allowed"
          >
            <span aria-hidden>↑</span> Upload File
          </button>
        </div>
      </aside>

      {/* ── Content pane ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedDoc ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <p className="text-sm font-medium text-gray-500">No document open</p>
              <p className="text-sm text-gray-400 mt-1">
                Create a new document or select one from the sidebar
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Top bar */}
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-500 truncate">
                {selectedDoc.title || "Untitled"}
              </p>

              {/* Edit / Read toggle */}
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5 shrink-0">
                <button
                  onClick={() => setMode("edit")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    mode === "edit"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setMode("read")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    mode === "read"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Read
                </button>
              </div>
            </header>

            {/* Document area */}
            <main className="flex-1 overflow-auto">
              <div className="max-w-2xl mx-auto px-8 py-10">
                {mode === "edit" ? (
                  <>
                    <input
                      type="text"
                      value={selectedDoc.title}
                      onChange={(e) => handleUpdate("title", e.target.value)}
                      placeholder="Untitled"
                      className="w-full text-2xl font-semibold text-gray-900 placeholder-gray-300 bg-transparent border-none outline-none mb-6"
                    />
                    <textarea
                      value={selectedDoc.body}
                      onChange={(e) => handleUpdate("body", e.target.value)}
                      placeholder="Start writing..."
                      className="w-full text-base text-gray-700 placeholder-gray-300 bg-transparent border-none outline-none resize-none leading-relaxed min-h-96"
                    />
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-semibold text-gray-900 mb-6">
                      {selectedDoc.title || "Untitled"}
                    </h1>
                    {selectedDoc.body ? (
                      <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {selectedDoc.body}
                      </p>
                    ) : (
                      <p className="text-base text-gray-400">No content yet.</p>
                    )}
                  </>
                )}
              </div>
            </main>
          </>
        )}
      </div>
    </div>
  )
}

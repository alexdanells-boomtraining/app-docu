import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center max-w-xs">
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-3">SuperDocu</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          A clean personal workspace for your writing and notes. Organised, searchable, and saved to your device.
        </p>
        <Link
          href="/docs"
          className="inline-block px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
        >
          Open workspace
        </Link>
      </div>
    </main>
  )
}

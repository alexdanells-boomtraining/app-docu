import { openDB, type DBSchema } from "idb"

export type HistoryEntry = {
  title: string
  body: string
  tags: string[]
  savedAt: string  // ISO string
}

export type Doc = {
  id: string
  title: string
  body: string
  tags?: string[]
  createdAt: string  // ISO string
  updatedAt: string  // ISO string
  starred?: boolean
  history?: HistoryEntry[]
}

interface AppDB extends DBSchema {
  docs: {
    key: string
    value: Doc
    indexes: { updatedAt: string }
  }
}

function getDB() {
  return openDB<AppDB>("docu", 1, {
    upgrade(db) {
      const store = db.createObjectStore("docs", { keyPath: "id" })
      store.createIndex("updatedAt", "updatedAt")
    },
  })
}

export async function getAllDocs(): Promise<Doc[]> {
  const db = await getDB()
  const docs = await db.getAllFromIndex("docs", "updatedAt")
  return docs.reverse()
}

export async function putDoc(doc: Doc): Promise<void> {
  const db = await getDB()
  await db.put("docs", doc)
}

export async function putAllDocs(docs: Doc[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("docs", "readwrite")
  await Promise.all(docs.map((doc) => tx.store.put(doc)))
  await tx.done
}

export async function clearAllDocs(): Promise<void> {
  const db = await getDB()
  await db.clear("docs")
}

export async function removeDoc(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("docs", id)
}

export async function starDoc(id: string, starred: boolean): Promise<void> {
  const db = await getDB()
  const doc = await db.get("docs", id)
  if (!doc) return
  await db.put("docs", { ...doc, starred })
}

export function snapshotDoc(doc: Doc): Doc {
  const entry: HistoryEntry = {
    title: doc.title,
    body: doc.body,
    tags: doc.tags ?? [],
    savedAt: new Date().toISOString(),
  }
  const prev = doc.history ?? []
  const last = prev[0]
  const unchanged =
    last &&
    last.title === entry.title &&
    last.body === entry.body &&
    JSON.stringify(last.tags) === JSON.stringify(entry.tags)
  if (unchanged) return doc
  return { ...doc, history: [entry, ...prev].slice(0, 3) }
}

import { openDB, type DBSchema } from "idb"

export type HistoryEntry = {
  title: string
  body: string
  tags: string[]
  savedAt: string
}

export type Doc = {
  id: string
  title: string
  body: string
  tags?: string[]
  folderId?: string
  createdAt: string
  updatedAt: string
  starred?: boolean
  history?: HistoryEntry[]
  deletedAt?: string
}

export type Folder = {
  id: string
  name: string
  createdAt: string
}

interface AppDB extends DBSchema {
  docs: {
    key: string
    value: Doc
    indexes: { updatedAt: string }
  }
  folders: {
    key: string
    value: Folder
  }
}

function getDB() {
  return openDB<AppDB>("docu", 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const store = db.createObjectStore("docs", { keyPath: "id" })
        store.createIndex("updatedAt", "updatedAt")
      }
      if (oldVersion < 2) {
        db.createObjectStore("folders", { keyPath: "id" })
      }
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

export async function trashDoc(id: string): Promise<void> {
  const db = await getDB()
  const doc = await db.get("docs", id)
  if (!doc) return
  await db.put("docs", { ...doc, deletedAt: new Date().toISOString() })
}

export async function restoreDoc(id: string): Promise<void> {
  const db = await getDB()
  const doc = await db.get("docs", id)
  if (!doc) return
  const restored = { ...doc }
  delete restored.deletedAt
  await db.put("docs", restored)
}

export async function emptyTrash(): Promise<void> {
  const db = await getDB()
  const all = await db.getAll("docs")
  const tx = db.transaction("docs", "readwrite")
  await Promise.all(all.filter((d) => d.deletedAt).map((d) => tx.store.delete(d.id)))
  await tx.done
}

export async function setDocFolder(id: string, folderId: string | null): Promise<void> {
  const db = await getDB()
  const doc = await db.get("docs", id)
  if (!doc) return
  const updated: Doc = { ...doc }
  if (folderId) {
    updated.folderId = folderId
  } else {
    delete updated.folderId
  }
  await db.put("docs", updated)
}

export async function starDoc(id: string, starred: boolean): Promise<void> {
  const db = await getDB()
  const doc = await db.get("docs", id)
  if (!doc) return
  await db.put("docs", { ...doc, starred })
}

export async function getAllFolders(): Promise<Folder[]> {
  const db = await getDB()
  return db.getAll("folders")
}

export async function putFolder(folder: Folder): Promise<void> {
  const db = await getDB()
  await db.put("folders", folder)
}

export async function removeFolder(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("folders", id)
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

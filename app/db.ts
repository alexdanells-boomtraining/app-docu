import { openDB, type DBSchema } from "idb"

export type Doc = {
  id: string
  title: string
  body: string
  createdAt: string  // ISO string
  updatedAt: string  // ISO string
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

export async function removeDoc(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("docs", id)
}

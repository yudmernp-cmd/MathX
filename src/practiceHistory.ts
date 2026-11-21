import { restore, type Run } from './math/session'

export class HistoryError extends Error {
  constructor() {
    super(
      'No se pudo guardar el historial de ejercicios. Comprueba que el navegador permite almacenar datos de MathX.',
    )
  }
}

function openHistory(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('mathx.mai.historial', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('historial')
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(new HistoryError())
  })
}

// Read, check and update in one IndexedDB transaction. Even in different
// browser processes, only one tab can reserve a particular question first.
type Reservation = { seen: string[]; accepted: boolean }

function reserve(
  db: IDBDatabase,
  keys: string[],
  exclusive: boolean,
): Promise<Reservation> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('historial', 'readwrite')
    const store = tx.objectStore('historial')
    const get = store.get('vistos')
    let seen: string[], accepted: boolean
    get.onsuccess = () => {
      const history = new Set<string>(get.result ?? [])
      accepted = !exclusive || keys.every((key) => !history.has(key))
      const previousSize = history.size
      if (accepted) keys.forEach((key) => history.add(key))
      seen = [...history]
      if (history.size !== previousSize) store.put(seen, 'vistos')
    }
    tx.oncomplete = () => resolve({ seen, accepted })
    tx.onabort = () => reject(new HistoryError())
  })
}

function keysFor(run: Run | null) {
  return (run?.questions ?? []).flatMap((q) => {
    if (!q.id) throw new HistoryError()
    return q.historyKey ? [q.id, q.historyKey] : [q.id]
  })
}

export async function withHistory(select?: (seen: string[]) => Promise<Run>) {
  const db = await openHistory().catch(() => {
    throw new HistoryError()
  })
  try {
    let state: Reservation
    try {
      const legacy = JSON.parse(
        sessionStorage.getItem('mathx.recientes') ?? '[]',
      )
      if (
        !Array.isArray(legacy) ||
        !legacy.every((id) => typeof id === 'string')
      )
        throw new HistoryError()
      state = await reserve(db, [...legacy, ...keysFor(restore())], false)
      sessionStorage.removeItem('mathx.recientes')
    } catch {
      throw new HistoryError()
    }
    if (!select) return
    for (;;) {
      const run = await select(state.seen)
      const keys = keysFor(run)
      if (keys.some((key) => state.seen.includes(key))) throw new HistoryError()
      state = await reserve(db, keys, true)
      if (state.accepted) return run
    }
  } finally {
    db.close()
  }
}

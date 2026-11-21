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
type Ticket = { recent: string[]; draw: number; offset: number }

// Reserve the numerical draw before making the request. Failed requests may skip a
// number; two tabs (including across reloads) can never take the same ticket.
function nextTicket(db: IDBDatabase): Promise<Ticket> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('historial', 'readwrite'),
      store = tx.objectStore('historial')
    const previous = store.get('vistos'),
      counter = store.get('serie')
    let draw: number, offset: number
    counter.onsuccess = () => {
      draw = counter.result?.next ?? 0
      offset =
        counter.result?.offset ??
        crypto.getRandomValues(new Uint32Array(1))[0] % 330
      store.put({ next: draw + 1, offset }, 'serie')
    }
    tx.oncomplete = () =>
      resolve({ recent: previous.result ?? [], draw, offset })
    tx.onabort = () => reject(new HistoryError())
  })
}
function reserve(
  db: IDBDatabase,
  run: Run | null,
  legacy: string[],
  exclusive: boolean,
): Promise<boolean> {
  const questions = run?.questions ?? []
  if (questions.some((q) => !q.id || (q.generated && !q.historyKey)))
    return Promise.reject(new HistoryError())
  return new Promise((resolve, reject) => {
    const tx = db.transaction('historial', 'readwrite'),
      store = tx.objectStore('historial')
    const previous = store.get('vistos')
    const items = questions.map((q) => ({
      // Only finite bank identifiers are sent back to the API. Content hashes live
      // as individual IndexedDB keys, including for on-demand variants.
      fixed: q.generated
        ? []
        : [q.id!, ...(q.historyKey ? [q.historyKey] : [])],
      content: q.wordingKey ?? (q.generated ? q.historyKey : undefined),
    }))
    const reads = items.map((i) => (i.content ? store.getKey(i.content) : null))
    const barrier = store.getKey('serie')
    let accepted = false
    barrier.onsuccess = () => {
      const seen = new Set<string>(previous.result ?? []),
        size = seen.size
      const collision = items.map(
        (i, j) =>
          reads[j]?.result !== undefined || i.fixed.some((k) => seen.has(k)),
      )
      accepted = !exclusive || collision.every((v) => !v)
      legacy.forEach((k) => seen.add(k))
      items.forEach((i, j) => {
        if (accepted || collision[j]) {
          i.fixed.forEach((k) => seen.add(k))
          if (i.content) store.put(true, i.content)
        }
      })
      if (seen.size !== size) store.put([...seen], 'vistos')
    }
    tx.oncomplete = () => resolve(accepted)
    tx.onabort = () => reject(new HistoryError())
  })
}
export async function withHistory(select?: (ticket: Ticket) => Promise<Run>) {
  const db = await openHistory()
  try {
    const legacy = JSON.parse(sessionStorage.getItem('mathx.recientes') ?? '[]')
    if (!Array.isArray(legacy) || !legacy.every((id) => typeof id === 'string'))
      throw new HistoryError()
    await reserve(db, restore(), legacy, false)
    sessionStorage.removeItem('mathx.recientes')
    if (!select) return
    for (;;) {
      const run = await select(await nextTicket(db))
      if (await reserve(db, run, [], true)) return run
    }
  } finally {
    db.close()
  }
}

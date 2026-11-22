import { restore, type Run } from './math/session'

export class HistoryError extends Error {
  constructor(
    message = 'No se pudo guardar el historial de ejercicios. Comprueba que el navegador permite almacenar datos de MathX.',
  ) {
    super(message)
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
function nextTicket(db: IDBDatabase, series: string): Promise<Ticket> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('historial', 'readwrite', {
        durability: 'strict',
      }),
      store = tx.objectStore('historial')
    const previous = store.get('vistos'),
      counter = store.get(series)
    let draw: number, offset: number
    counter.onsuccess = () => {
      draw = counter.result?.next ?? 0
      offset =
        counter.result?.offset ??
        crypto.getRandomValues(new Uint32Array(1))[0] % 330
      store.put({ next: draw + 1, offset }, series)
    }
    tx.oncomplete = () =>
      resolve({
        recent: ((previous.result ?? []) as string[]).filter(
          (k) => !k.startsWith('serie-'),
        ),
        draw,
        offset,
      })
    tx.onabort = () => reject(new HistoryError())
  })
}
function reserve(
  db: IDBDatabase,
  run: Run | null,
  legacy: string[],
  exclusive: boolean,
): Promise<string[]> {
  const questions = run?.questions ?? []
  if (
    questions.some(
      (q) =>
        !q.id ||
        (q.generated && !q.historyKey) ||
        (q.individual && (!q.structureKey || !q.wordingKey)),
    )
  )
    return Promise.reject(new HistoryError())
  return new Promise((resolve, reject) => {
    const tx = db.transaction('historial', 'readwrite', {
        durability: 'strict',
      }),
      store = tx.objectStore('historial')
    const previous = store.get('vistos')
    const student = store.get('estudiante')
    const items = questions.map((q) => ({
      id: q.id!,
      fixed: q.structureKey
        ? [q.structureKey, ...(q.patternKey ? [q.patternKey] : [])]
        : q.generated
          ? []
          : [q.id!, ...(q.historyKey ? [q.historyKey] : [])],
      content: q.wordingKey ?? (q.generated ? q.historyKey : undefined),
    }))
    // Keep the open-ended series on disk, one indexed key per fingerprint.
    // Only the finite catalogue goes in the request body. Transactions serialize
    // both kinds of reservations across tabs and across catalogue upgrades.
    const structures = items.map((item, i) =>
      questions[i].composed ? item.fixed.map((k) => store.getKey(k)) : [],
    )
    const reads = items.map((i) => (i.content ? store.getKey(i.content) : null))
    const barrier = store.getKey('serie')
    const conflicts: string[] = []
    barrier.onsuccess = () => {
      const profile = student.result ?? crypto.randomUUID()
      if (!student.result) store.put(profile, 'estudiante')
      const seen = new Set<string>(previous.result ?? [])
      const size = seen.size
      if (exclusive) {
        const batch = new Set<string>()
        items.forEach((i, j) => {
          const key = i.content ?? i.id
          if (
            reads[j]?.result !== undefined ||
            structures[j].some((read) => read.result !== undefined) ||
            i.fixed.some((k) => seen.has(k) || batch.has(k)) ||
            batch.has(key)
          )
            conflicts.push(key)
          batch.add(key)
          i.fixed.forEach((k) => batch.add(k))
        })
      }
      legacy.forEach((k) => seen.add(k))
      if (!conflicts.length) {
        items.forEach((i, j) => {
          if (questions[j].composed) i.fixed.forEach((k) => store.put(true, k))
          else i.fixed.forEach((k) => seen.add(k))
          if (i.content && reads[j]?.result === undefined)
            store.put(
              {
                student: profile,
                id: i.id,
                structureKey: questions[j].structureKey,
              },
              i.content,
            )
        })
      }
      if (seen.size !== size) store.put([...seen], 'vistos')
    }
    tx.oncomplete = () => resolve(conflicts)
    tx.onabort = () => reject(new HistoryError())
  })
}
export async function withHistory(
  select?: (ticket: Ticket) => Promise<Run>,
  series = 'serie',
) {
  const db = await openHistory()
  try {
    const legacy = JSON.parse(sessionStorage.getItem('mathx.recientes') ?? '[]')
    if (!Array.isArray(legacy) || !legacy.every((id) => typeof id === 'string'))
      throw new HistoryError()
    await reserve(db, restore(), legacy, false)
    sessionStorage.removeItem('mathx.recientes')
    if (!select) return
    const collisions = new Set<string>()
    for (let attempt = 0; attempt < 32; attempt++) {
      const ticket = await nextTicket(db, series)
      const run = await select({
        ...ticket,
        recent: [...ticket.recent, ...collisions],
      })
      const conflicts = await reserve(db, run, [], true)
      if (!conflicts.length) return run
      conflicts.forEach((key) => collisions.add(key))
    }
    throw new HistoryError(
      'No se ha encontrado una selección inédita. Tu historial se conserva. Vuelve a intentarlo.',
    )
  } finally {
    db.close()
  }
}

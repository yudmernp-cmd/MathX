export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}
export async function request<T>(action: string, data?: unknown): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch('/api/classroom?action=' + action, {
      method: data === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
      ...(data === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }),
    })
    const body = await res.json().catch((error) => {
      if (error instanceof SyntaxError) return null
      throw error
    })
    if (!res.ok || body === null)
      throw new ApiError(
        typeof body?.error === 'string'
          ? body.error
          : 'No se pudo completar la solicitud al aula.',
        res.status,
      )
    return body
  } catch (error) {
    if (controller.signal.aborted)
      throw new ApiError('El aula tardó demasiado en responder.', 408)
    if (error instanceof ApiError) throw error
    throw new ApiError('No se pudo conectar con el aula.', 0)
  } finally {
    clearTimeout(timer)
  }
}

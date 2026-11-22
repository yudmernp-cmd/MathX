export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}
export async function request<T>(action: string, data?: unknown): Promise<T> {
  const res = await fetch('/api/classroom?action=' + action, {
    method: data === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    ...(data === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }),
  })
  const body = await res.json()
  if (!res.ok)
    throw new ApiError(
      body.error || 'No se pudo consultar el aula.',
      res.status,
    )
  return body
}

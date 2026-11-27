import { useId, useRef, useState, type ReactNode } from 'react'
import { UserRound } from 'lucide-react'
import { request } from './request'

const side = 96

async function cropPhoto(file: File) {
  if (file.size > 25 * 1024 * 1024)
    throw new Error('Elige una imagen de hasta 25 MB.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    try { await image.decode() } catch { throw new Error('El navegador no pudo abrir esta imagen. Prueba con una foto JPG o PNG.') }
    const crop = Math.min(image.naturalWidth, image.naturalHeight)
    if (!crop) throw new Error('La imagen está vacía.')
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = side
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('No se pudo preparar la foto.')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, side, side)
    ctx.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 0, 0, side, side)
    const rgba = ctx.getImageData(0, 0, side, side).data
    const rgb = new Uint8Array(side * side * 3)
    for (let pixel = 0; pixel < side * side; pixel++)
      rgb.set(rgba.subarray(pixel * 4, pixel * 4 + 3), pixel * 3)
    return btoa(String.fromCharCode(...rgb))
  } finally {
    URL.revokeObjectURL(url)
  }
}
export function Avatar({ photo, frame }: { photo?: string | null; frame?: string | null }) {
  const [failed, setFailed] = useState<string>()
  return <span className="avatar" data-frame={frame || undefined} aria-hidden="true">
    {photo && failed !== photo
      ? <img src={'/api/classroom?action=photo&id=' + encodeURIComponent(photo)} width={48} height={48}
          alt="" loading="lazy" onError={() => setFailed(photo)}/>
      : <UserRound size={20}/>}
  </span>
}

export function ProfilePhoto({ photo, changed, student, frame, name, highlights, children }: {
  photo: string | null; changed: (photo: string | null) => void; student: boolean
  frame?: string | null; name?: ReactNode; highlights?: ReactNode; children?: ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  async function save(file: File | null) {
    setBusy(true); setError(''); setMessage('')
    try {
      const pixels = file && await cropPhoto(file)
      const result = await request<{ photo: string | null }>('photo', { pixels })
      changed(result.photo)
      setMessage(file ? 'Foto de perfil guardada.' : 'Foto de perfil eliminada.')
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  return <section className="panel photo-editor" aria-labelledby={id}>
    <Avatar photo={photo} frame={frame}/>
    <div>
      <h2 id={id}>{name}{name && <span className="sr-only"> · </span>}<span className={name ? 'sr-only' : undefined}>Foto de perfil</span></h2>
      {highlights}
      {student && <p>Perfil visible para tu aula.</p>}
      <div className="actions">
        {children}
        <button type="button" className="secondary" disabled={busy} onClick={() => input.current?.click()}>
          {photo ? 'Cambiar foto' : 'Subir foto'}
        </button>
        <input hidden ref={input} type="file" accept="image/*" aria-label="Elegir foto de perfil" onChange={e => {
          const file = e.currentTarget.files?.[0]
          e.currentTarget.value = ''
          if (file) void save(file)
        }}/>
        {photo && <button type="button" className="back" disabled={busy} onClick={() => void save(null)}>Quitar foto</button>}
      </div>
      {(busy || message) && <p role="status">{busy ? 'Guardando foto…' : message}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  </section>
}

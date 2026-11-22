// Exercise the actual built bank. A clean checkout can also exercise the
// availability diagnostic when its optional private edition is absent.
import { preview } from 'vite'
await preview({ preview: { port: 4182, host: '127.0.0.1', strictPort: true } })

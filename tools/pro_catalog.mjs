import { mkdir, copyFile } from 'node:fs/promises'
await mkdir('server-data/pro', { recursive: true })
await copyFile('server/pro-sources.json', 'server-data/pro/catalog.json')

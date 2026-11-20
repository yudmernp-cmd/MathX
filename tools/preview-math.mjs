import { readFileSync } from 'node:fs'
import katex from 'katex'
const escape = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  )
const q = JSON.parse(readFileSync(0, 'utf8'))
const math = (s) =>
  s
    .split('$')
    .map((t, i) =>
      i % 2
        ? katex.renderToString(t, { trust: false, throwOnError: false })
        : escape(t),
    )
    .join('')
const images = (i) =>
  (q.assets || [])
    .filter((a) => a.part === i && /^[\w.-]+\.webp$/.test(a.file))
    .map(
      (a) =>
        '<figure><img src="' +
        escape(a.file) +
        '" alt="' +
        escape(a.alt) +
        '"></figure>',
    )
    .join('')
console.log(
  '<p>' +
    math(q.stem) +
    '</p>' +
    images(-1) +
    q.parts
      .map(
        (p, i) =>
          '<p><b>' +
          escape(p.label) +
          '</b> ' +
          math(p.ask) +
          ' <small>[' +
          (Number.isInteger(p.marks) ? p.marks : '?') +
          ']</small></p>' +
          images(i),
      )
      .join(''),
)

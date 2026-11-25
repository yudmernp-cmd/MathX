import { useEffect, useRef } from 'react'

// Plot one period of both functions on the same axes as the canvas resizes.
function FunctionPlot() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const paint = () => {
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      const left = 10,
        right = width - 12,
        mid = height / 2 - 5,
        amp = mid * 0.76
      const x = (t: number) => left + t * (right - left)
      const y = (v: number) => mid - v * amp
      function line(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color: string,
      ) {
        if (!ctx) return
        ctx.strokeStyle = color
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
      const palette = getComputedStyle(canvas)
      const grid = palette.getPropertyValue('--border').trim()
      const axis = palette.getPropertyValue('--control-border').trim()
      const accent = palette.getPropertyValue('--accent').trim()
      const muted = palette.getPropertyValue('--muted').trim()
      const divisions = width < 160 ? 4 : 16
      for (let i = 0; i <= divisions; i++)
        line(x(i / divisions), 4, x(i / divisions), height - 22, grid)
      for (const v of [-1, -0.5, 0, 0.5, 1])
        line(left, y(v), right, y(v), v === 0 ? axis : grid)
      for (const [fn, color] of [
        [Math.sin, accent],
        [Math.cos, muted],
      ] as const) {
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = fn === Math.sin ? 3 : 1.7
        ctx.setLineDash(fn === Math.sin ? [] : [5, 5])
        for (let i = 0; i <= 256; i++) {
          const t = i / 256
          if (i === 0) ctx.moveTo(x(t), y(fn(t * 2 * Math.PI)))
          else ctx.lineTo(x(t), y(fn(t * 2 * Math.PI)))
        }
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.font = '12px Inter, sans-serif'
      ctx.fillStyle = muted
      for (const [i, label] of ['0', 'π/2', 'π', '3π/2', '2π'].entries()) {
        if (width < 160 && i % 2) continue
        ctx.textAlign = i === 0 ? 'left' : i === 4 ? 'right' : 'center'
        ctx.fillText(label, x(i / 4), height - 3)
      }
    }
    const observer = new ResizeObserver(paint)
    observer.observe(canvas)
    paint()
    return () => observer.disconnect()
  }, [])
  return (
    <figure
      className="cover-plot"
      aria-label="Seno y coseno entre cero y dos pi"
    >
      <canvas ref={ref} aria-hidden="true" />
      <figcaption>
        <span>sen x</span>
        <span>cos x</span>
      </figcaption>
    </figure>
  )
}

export function CourseCover() {
  return (
    <section className="course-cover" aria-label="Matemáticas IB">
      <p className="course-level">Nivel Medio</p>
      <h2>
        Matemáticas <em>IB</em>
      </h2>
      <p className="course-name">Aplicaciones e Interpretación</p>
      <FunctionPlot />
    </section>
  )
}

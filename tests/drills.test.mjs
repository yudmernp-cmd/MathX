import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { tsImport } from 'tsx/esm/api'
import { topics, drills, drillKey } from '../server/drills/index.mjs'
const { acceptsDrill } = await tsImport(
  '../src/math/drills.ts',
  import.meta.url,
)
const shape = ({ instruccion, expresion }) =>
  [instruccion, expresion].join(' ').replace(/[-+]?\d+(?:\.\d+)?/g, '#')
test('cinco temas y cinco niveles, 15 preguntas directas, reparto y tipos distintos', () => {
  for (const [theme, groups] of Object.entries(topics))
    for (let level = 1; level <= 5; level++) {
      const forms = new Set(),
        exposed = new Set()
      let previous = new Set()
      for (let seed = 0; seed < 80; seed++) {
        const batch = drills(theme, level, seed)
        assert.deepEqual(batch, drills(theme, level, seed))
        assert.equal(batch.length, 15)
        assert.equal(new Set(batch.map(drillKey)).size, 15)
        assert.equal(new Set(batch.map(shape)).size, 15)
        const current = new Set(batch.map(shape))
        assert.ok([...current].filter((key) => !previous.has(key)).length >= 2)
        previous = current
        for (let i = 0; i < groups.length; i++) {
          const sub = batch.filter(
            (q) => Number(q.subtema.split('.')[1]) === i + 1,
          )
          assert.equal(
            sub.length,
            Math.floor(15 / groups.length) + Number(i < 15 % groups.length),
          )
          assert.equal(new Set(sub.map((q) => q.tipo_tarea)).size, sub.length)
          for (const q of sub)
            assert.ok(Object.hasOwn(groups[i].types, q.tipo_tarea))
        }
        for (const q of batch) {
          assert.deepEqual(
            Object.keys(q).sort(),
            [
              'tema',
              'subtema',
              'tipo_tarea',
              'dificultad',
              'instruccion',
              'expresion',
              'respuesta',
              'solucion_pasos',
            ].sort(),
          )
          assert.equal(q.tema, theme)
          assert.equal(q.dificultad, level)
          assert.doesNotMatch(
            q.instruccion + ' ' + q.expresion,
            /justifica|explica|interpreta|verifica|(?:^|\s)\([a-c]\)(?=\s)/i,
          )
          assert.ok(q.solucion_pasos.length >= 2)
          assert.ok(acceptsDrill(q, q.respuesta), JSON.stringify(q))
          assert.ok(!acceptsDrill(q, 'indefinida'))
          forms.add(shape(q))
          exposed.add(q.subtema + ':' + q.tipo_tarea)
          if (seed < 8)
            for (const s of [q.expresion, q.respuesta, ...q.solucion_pasos]) {
              if (s === q.expresion && s.startsWith('[')) continue
              katex.renderToString(s, { throwOnError: true, strict: 'error' })
            }
        }
      }
      assert.ok(forms.size > 15)
      assert.equal(
        exposed.size,
        groups.reduce((n, g) => n + Object.keys(g.types).length, 0),
      )
    }
})
test('variantes y comprobación de resultados en aritmética, análisis, geometría y estadística', () => {
  const P = { a: 33, b: 9, k: 4, n: 5, level: 3, flip: false }
  const get = (theme, i, type) => topics[theme][i].types[type](P)
  assert.equal(
    acceptsDrill(
      get('Número y Álgebra', 1, 'suma_aritmetica'),
      String([33, 42, 51, 60, 69].reduce((a, b) => a + b)),
    ),
    true,
  )
  const tangent = get('Cálculo', 2, 'tangente_normal')
  assert.ok(acceptsDrill(tangent, '72x-y=291'))
  assert.ok(!acceptsDrill(tangent, 'y=72x+291'))
  assert.ok(
    acceptsDrill(get('Cálculo', 1, 'derivar_regla_cadena'), '12(4x+33)^2'),
  )
  assert.ok(
    acceptsDrill(get('Cálculo', 3, 'integrar_potencia'), '33x^5-9x+10+C'),
  )
  assert.ok(!acceptsDrill(get('Cálculo', 3, 'integrar_potencia'), '33x^5-9x'))
  assert.ok(acceptsDrill(get('Funciones', 4, 'raices_cuadratica'), '{9;-33}'))
  assert.ok(
    acceptsDrill(
      get('Geometría y Trigonometría', 0, 'punto_medio_3d'),
      '(-29/2;7;-2)',
    ),
  )
  assert.ok(
    acceptsDrill(
      get('Geometría y Trigonometría', 3, 'radio_desde_arco'),
      '132',
    ),
  )
  assert.ok(
    acceptsDrill(
      get('Estadística y Probabilidad', 3, 'probabilidad_condicional'),
      '4/13',
    ),
  )
  assert.ok(acceptsDrill(get('Funciones', 1, 'dominio_rango'), 'y<=66/2'))
  assert.ok(!acceptsDrill(get('Funciones', 1, 'dominio_rango'), 'y<33'))
})

test('formas equivalentes de la recta de los cortes (68,0) y (0,8)', () => {
  const q = { tipo_tarea: 'ecuacion_recta', respuesta: 'y=-\\frac{2}{17}x+8' }
  for (const answer of [
    'y=8−2x/17', 'f(x) = 8 − (2x ÷ 17)', '2x + 17y = 136',
    'x/68 + y/8 = 1', 'y = −(2/17)(x−68)', '−\\dfrac{2}{17}x+8',
  ]) assert.ok(acceptsDrill(q, answer), answer)
  for (const answer of ['y=2x/17-8', 'y=8+2x/17', 'y=(8-2x)/17', '2x+17y=0', 'xy=8', '0=0'])
    assert.ok(!acceptsDrill(q, answer), answer)
})

test('intervalos, coordenadas y raíces conservan su significado al cambiar la notación', () => {
  const accepts = (respuesta, raw) => acceptsDrill({ tipo_tarea: '', respuesta }, raw)
  assert.ok(accepts('[-2,3]', '3 ≥ x ≥ −2'))
  assert.ok(accepts('[-2,3]', 'x ∈ [−2; 3]'))
  assert.ok(accepts('[1.5,3]', '1,5 ≤ x ≤ 3'))
  assert.ok(!accepts('[-2,3]', '−2 < x ≤ 3'))
  assert.ok(accepts('[2,\\infty)', '2 <= x'))
  assert.ok(accepts('(1.5,2)', '(1,5; 2)'))
  assert.ok(!accepts('(1.5,2)', '(2; 1,5)'))
  assert.ok(accepts('\\{3,7\\}', 'x = 5 ± 2'))
  assert.ok(accepts('\\{3,7\\}', 'x=7 o x=3'))
  assert.ok(!accepts('\\{3,7\\}', 'x=5±3'))
})

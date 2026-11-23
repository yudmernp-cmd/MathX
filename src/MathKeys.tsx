const keys: [string, string, string?][] = [
  ['π', 'π'],
  ['x²', '²'],
  ['x³', '³'],
  ['x¹⁰', '^10'],
  ['xⁿ', '^'],
  ['√', '√(', ')'],
  ['a/b', '(', ')/()'],
  ['×', '×'],
  ['÷', '÷'],
  ['±', '±'],
  ['≤', '≤'],
  ['≥', '≥'],
  ['≠', '≠'],
  ['∞', '∞'],
  ['°', '°'],
  [',', ','],
  ['( )', '(', ')'],
  ['[ ]', '[', ']'],
  ['sen', 'sen(', ')'],
  ['cos', 'cos(', ')'],
  ['tan', 'tan(', ')'],
]
export function MathKeys({
  target,
  change,
}: {
  target: string
  change: (v: string) => void
}) {
  function insert(left: string, right = '') {
    const el = document.getElementById(target) as
      HTMLInputElement | HTMLTextAreaElement | null
    if (!el || el.readOnly || el.disabled) return
    const start = el.selectionStart ?? el.value.length,
      end = el.selectionEnd ?? start
    const chosen = el.value.slice(start, end)
    const postfix = ['²', '³', '^10', '^', '°'].includes(left)
    const value =
      postfix && chosen
        ? '(' + chosen + ')' + left
        : left + (right ? chosen : '') + right
    const next = el.value.slice(0, start) + value + el.value.slice(end)
    if (el.maxLength >= 0 && next.length > el.maxLength) return
    change(next)
    requestAnimationFrame(() => {
      el.focus({ preventScroll: true })
      const pos = right
        ? start +
          left.length +
          chosen.length +
          (chosen && right === ')/()' ? 3 : 0)
        : start + value.length
      el.setSelectionRange(pos, pos)
    })
  }
  return (
    <details className="math-keys">
      <summary>Símbolos matemáticos</summary>
      <div role="group" aria-label="Teclado matemático">
        {keys.map(([label, left, right]) => (
          <button
            key={label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insert(left, right)}
          >
            {label}
          </button>
        ))}
      </div>
      <small>Las funciones trigonométricas usan radianes.</small>
    </details>
  )
}

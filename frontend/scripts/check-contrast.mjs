import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const cssPath = path.resolve(here, '../src/styles/themes.css')
const css = fs.readFileSync(cssPath, 'utf8')

const readBlock = (selector) => {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`Blok ${selector} tidak ditemukan`)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}

const parseVars = (text, target) => {
  for (const line of text.split('\n')) {
    const match = line.match(/--([\w-]+):\s*(.+);/)
    if (match) target.set(match[1], match[2].trim())
  }
  return target
}

const resolve = (vars, name) => {
  const value = vars.get(name)
  if (!value) throw new Error(`Token --${name} tidak ditemukan`)
  if (value.startsWith('#')) return value
  const [r, g, b] = value.split(/\s+/).map(Number)
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

const luminance = (hex) => {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
  const linear = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
  )
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

const contrast = (a, b) => {
  const first = luminance(a)
  const second = luminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

const checks = [
  ['ink pada panel', 'ink', 'panel', 4.5],
  ['muted pada panel', 'muted', 'panel', 4.5],
  ['cta-ink pada cta', 'cta-ink', 'cta', 4.5],
  ['accent-600 pada panel', 'accent-600', 'panel', 4.5],
  ['accent-600 pada accent-50', 'accent-600', 'accent-50', 4.5],
  ['ring pada panel', 'ring', 'panel', 3],
  ['sidebar-ink pada sidebar', 'sidebar-ink', 'sidebar', 4.5],
  ['sidebar-muted pada sidebar', 'sidebar-muted', 'sidebar', 4.5],
  ['sidebar-accent pada sidebar', 'sidebar-accent', 'sidebar', 4.5],
  ['sidebar-active-ink pada sidebar-active', 'sidebar-active-ink', 'sidebar-active', 4.5],
  ['chart-label pada panel', 'chart-label', 'panel', 4.5],
  ['tone-500 pada tone-50', 'tone-500', 'tone-50', 4.5],
  ['danger-ink pada danger', 'danger-ink', 'danger', 4.5],
  ['emerald-600 pada emerald-50', 'emerald-600', 'emerald-50', 4.5],
  ['amber-600 pada amber-50', 'amber-600', 'amber-50', 4.5],
  ['rose-600 pada rose-50', 'rose-600', 'rose-50', 4.5],
  ['sky-600 pada sky-50', 'sky-600', 'sky-50', 4.5]
]

const graphicChecks = [
  ['chart-accent', 'chart-accent'],
  ['chart-series-2', 'chart-series-2'],
  ['chart-series-3', 'chart-series-3'],
  ['chart-series-4', 'chart-series-4'],
  ['chart-sky', 'chart-sky']
]

const themes = [
  { id: 'light-blue', block: "[data-theme='light-blue']", dark: false },
  { id: 'dark-navy', block: "[data-theme='dark-navy']", dark: true }
]

let failed = 0
for (const theme of themes) {
  const vars = parseVars(readBlock(':root'), new Map())
  parseVars(readBlock(theme.block), vars)
  if (theme.dark) parseVars(readBlock("[data-theme^='dark']"), vars)

  console.log(`\n${theme.id}`)
  for (const [label, fg, bg, minimum] of checks) {
    const ratio = contrast(resolve(vars, fg), resolve(vars, bg))
    const pass = ratio >= minimum
    if (!pass) failed += 1
    console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: ${ratio.toFixed(2)} (min ${minimum})`)
  }
  for (const [label, token] of graphicChecks) {
    const ratio = contrast(resolve(vars, token), resolve(vars, 'panel'))
    const pass = ratio >= 3
    if (!pass) failed += 1
    console.log(`${pass ? 'PASS' : 'FAIL'} ${label} pada panel: ${ratio.toFixed(2)} (min 3)`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} pasangan warna gagal.`)
  process.exit(1)
}
console.log('\nSemua pasangan warna lolos.')

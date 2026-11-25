import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, compileTemplate } from '@vue/compiler-sfc'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../src')
const targets = ['features', 'views']

const walk = (dir) => {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const isMeaningful = (node) => node.type !== 2 || node.content.trim().length > 0

let failures = 0
for (const target of targets) {
  for (const file of walk(path.join(root, target)).filter((item) => item.endsWith('.vue'))) {
    const { descriptor } = parse(fs.readFileSync(file, 'utf8'), { filename: file })
    if (!descriptor.template) continue

    const compiled = compileTemplate({
      source: descriptor.template.content,
      filename: file,
      id: 'single-root-check'
    })

    const roots = (compiled.ast?.children ?? []).filter(isMeaningful)
    if (roots.length <= 1) continue

    failures += 1
    const kinds = roots.map((node) => {
      if (node.type === 3) return 'komentar'
      if (node.type === 1) return `<${node.tag}>`
      if (node.type === 9) return 'v-if'
      return `node-${node.type}`
    })
    console.error(`FAIL ${path.relative(root, file)}: ${roots.length} root (${kinds.join(', ')})`)
  }
}

if (failures > 0) {
  console.error(`\n${failures} halaman punya lebih dari satu root. Bungkus dengan satu elemen induk.`)
  process.exit(1)
}

console.log('Semua halaman punya satu root.')

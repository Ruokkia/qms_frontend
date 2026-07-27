import { readFileSync } from 'node:fs'

const api = readFileSync(new URL('../src/api/trace.ts', import.meta.url), 'utf8')
const list = readFileSync(new URL('../src/views/trace/components/TraceListView.vue', import.meta.url), 'utf8')

const keepsNestedUpward = api.includes('data.upward || data.root?.upward')
const listsAncestorsBeforeStart =
  list.includes("rows.push(toRow(r.upward[i], 'up'") &&
  list.includes("rows.push(toRow(r.rootNode, 'start', 0))")

if (!keepsNestedUpward || !listsAncestorsBeforeStart) {
  console.error('FAIL: 双向追溯必须读取 root.upward，并在列表中先展示上溯链再展示起点')
  process.exit(1)
}

console.log('PASS: 半成品双向追溯会在起点上方展示成品上溯链')

import { readFileSync } from 'node:fs'

const incoming = readFileSync(new URL('../src/views/incoming/index.vue', import.meta.url), 'utf8')
const trace = readFileSync(new URL('../src/views/trace/index.vue', import.meta.url), 'utf8')

if (
  incoming.includes('statistics-explainer') ||
  trace.includes('statistics-explainer') ||
  trace.includes('v-loading="kpiLoading"') ||
  trace.includes('loadKpi()')
) {
  console.error('FAIL: 统计说明和追溯数据面板仍存在')
  process.exit(1)
}

console.log('PASS: 追溯页保持简洁，统计说明和数据面板均已移除')

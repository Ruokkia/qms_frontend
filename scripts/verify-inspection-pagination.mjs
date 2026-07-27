import { readFileSync } from 'node:fs'

const incoming = readFileSync(new URL('../src/views/incoming/index.vue', import.meta.url), 'utf8')
const finishedGoods = readFileSync(new URL('../src/views/finished-goods/index.vue', import.meta.url), 'utf8')

const incomingHasConsistentPaging =
  incoming.includes('function handleSearch()') &&
  incoming.includes('query.page = 1') &&
  incoming.includes('@change="handleSearch"') &&
  incoming.includes('@size-change="handleSizeChange"')

const finishedGoodsHasSinglePagingState =
  finishedGoods.includes('v-model:current-page="filters.page"') &&
  finishedGoods.includes('v-model:page-size="filters.size"') &&
  !finishedGoods.includes('v-model:current-page="pagination.page"') &&
  !finishedGoods.includes('pageSize: 20')

if (!incomingHasConsistentPaging || !finishedGoodsHasSinglePagingState) {
  console.error('FAIL: 来料或成品列表的分页状态未与筛选、请求参数保持一致')
  process.exit(1)
}

console.log('PASS: 来料与成品列表分页状态一致')

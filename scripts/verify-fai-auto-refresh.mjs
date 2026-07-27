import { readFileSync } from 'node:fs'

const triggerList = readFileSync(new URL('../src/views/fai/components/ChangeTriggerList.vue', import.meta.url), 'utf8')
const faiPage = readFileSync(new URL('../src/views/fai/index.vue', import.meta.url), 'utf8')

const hasRefreshFlow =
  triggerList.includes('inspectionCreated') &&
  triggerList.includes("emit('inspectionCreated')") &&
  faiPage.includes('@inspection-created="onInspectionCreated"') &&
  faiPage.includes('function onInspectionCreated')

if (!hasRefreshFlow) {
  console.error('FAIL: 生成首件检验单后缺少跨组件刷新事件')
  process.exit(1)
}

console.log('PASS: 生成首件检验单后会通知并刷新执行列表')

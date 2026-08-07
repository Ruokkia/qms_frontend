import { readFileSync } from 'node:fs'

const triggerList = readFileSync(new URL('../src/views/fai/components/ChangeTriggerList.vue', import.meta.url), 'utf8')
const faiPage = readFileSync(new URL('../src/views/fai/index.vue', import.meta.url), 'utf8')
const inspectionList = readFileSync(new URL('../src/views/fai/components/InspectionList.vue', import.meta.url), 'utf8')
const historyReport = readFileSync(new URL('../src/views/fai/components/HistoryReport.vue', import.meta.url), 'utf8')

let failed = false
function check(label, ok) {
  if (ok) {
    console.log(`PASS: ${label}`)
  } else {
    console.error(`FAIL: ${label}`)
    failed = true
  }
}

// 1. 生成首件检验单后跨组件刷新事件链路
check(
  '生成首件检验单后会通知并刷新执行列表',
  triggerList.includes('inspectionCreated') &&
    triggerList.includes("emit('inspectionCreated')") &&
    faiPage.includes('@inspection-created="onInspectionCreated"')
)

// 2. 父页面监听 activeTab：切到 inspect/report 时自动调用对应子组件 load
check(
  'index.vue 通过 watch(activeTab) 在切到 inspect 时调用 inspectionListRef.load',
  faiPage.includes('watch(activeTab') &&
    faiPage.includes('inspectionListRef.value?.load()')
)
check(
  'index.vue 通过 watch(activeTab) 在切到 report 时调用 historyReportRef.load',
  faiPage.includes('historyReportRef.value?.load()')
)
check(
  'index.vue 为 HistoryReport 绑定 ref="historyReportRef"',
  faiPage.includes('<HistoryReport ref="historyReportRef"')
)

// 3. 子组件暴露 load 供父调用，且不再依赖 onMounted 单次加载
check(
  'InspectionList 暴露 load 且已移除 onMounted(load)',
  inspectionList.includes('defineExpose({ load })') &&
    !inspectionList.includes('onMounted(load)')
)
check(
  'HistoryReport 暴露 load 且已移除 onMounted(load)',
  historyReport.includes('defineExpose({ load })') &&
    !historyReport.includes('onMounted(load)')
)

// 4. onInspectionCreated 简化为仅切 tab（由 watch 驱动），避免重复请求。
//    该函数体内不应再直接调用 inspectionListRef.value?.load()
check(
  'onInspectionCreated 简化为仅切换 activeTab（不再直接调 load）',
  faiPage.includes('function onInspectionCreated') &&
    faiPage.includes("activeTab.value = 'inspect'") &&
    !/function onInspectionCreated\(\)\s*\{\s*\n\s*\/\/[^\n]*\n\s*activeTab\.value = 'inspect'\s*\n\s*inspectionListRef\.value\?\.load\(\)/.test(faiPage)
)

if (failed) {
  console.error('\nFAIL: 首件检验自动刷新校验未全部通过')
  process.exit(1)
}

console.log('\nALL PASS: 首件检验执行 / 历史报告查询 tab 切换自动刷新逻辑校验通过')


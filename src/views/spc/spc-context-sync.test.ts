import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const entrySource = readFileSync(new URL('./components/DataEntry.vue', import.meta.url), 'utf8')
const pageSource = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

describe('SPC 数据采集与分析上下文同步', () => {
  it('数据采集选择物料代码后通知父页面同步分析筛选', () => {
    expect(entrySource).toMatch(/\(e: 'context-change', context:/)
    expect(entrySource).toContain("emit('context-change'")
    expect(pageSource).toContain('@context-change="onEntryContextChange"')
  })

  it('父页面接收代码、工序和参数后更新控制图与过程能力共用状态', () => {
    expect(pageSource).toContain('function onEntryContextChange')
    expect(pageSource).toContain('chartItemCode.value = context.itemCode')
    expect(pageSource).toContain('chartProcessCode.value = context.processCode')
    expect(pageSource).toContain('chartParamId.value = context.paramId')
  })

  it('同一物料代码的迟到空上下文不会覆盖已选择的工序和参数', () => {
    expect(pageSource).toContain('const isSameItemCode = chartItemCode.value === context.itemCode')
    expect(pageSource).toMatch(/if \(context\.processCode\)[\s\S]*else if \(!isSameItemCode\)/)
    expect(pageSource).toMatch(/if \(context\.paramId != null\)[\s\S]*else if \(!isSameItemCode\)/)
  })

  it('控制图代码未变时，选择或失焦不会重置已选择的工序和参数', () => {
    expect(pageSource).toMatch(/function onChartItemSelect[\s\S]*const isSameItemCode = chartItemCode\.value === nextItemCode[\s\S]*if \(isSameItemCode\) \{\s*return/)
    expect(pageSource).toMatch(/function onChartItemBlur[\s\S]*const nextItemCode = hit\?\.itemCode \|\| code[\s\S]*if \(chartItemCode\.value === nextItemCode\) \{\s*return/)
  })

  it('自动带入工序时复用 FAI 启用参数过滤，且不会覆盖之后发生的选择', () => {
    expect(pageSource).toContain('async function loadChartFaiParams')
    expect(pageSource).toMatch(/async function onEntryContextChange[\s\S]*await loadChartFaiParams\(chartProcessCode\.value\)/)
    expect(pageSource).toContain('if (chartItemCode.value !== context.itemCode || chartProcessCode.value !== context.processCode)')
  })
})

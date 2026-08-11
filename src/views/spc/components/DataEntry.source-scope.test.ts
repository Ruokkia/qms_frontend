import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./DataEntry.vue', import.meta.url), 'utf8')

describe('SPC 批次号和条码的数据源边界', () => {
  it('录入弹窗始终使用来料或成品的联动查询', () => {
    expect(source).toMatch(/entry-dialog-source-batch[\s\S]*?:fetch-suggestions="queryBarcodeSuggestions"/)
    expect(source).toMatch(/entry-dialog-source-barcode[\s\S]*?:fetch-suggestions="queryBarcodeSuggestions"/)
    expect(source).toMatch(/@select="onSourceSelect"/)
  })

  it('顶部子组筛选仅在用户选择候选后才传入列表', () => {
    expect(source).toMatch(/v-model="subgroupBatchKeyword"/)
    expect(source).toMatch(/v-model="subgroupBarcodeKeyword"/)
    expect(source).toMatch(/@select="onSubgroupSourceSelect"/)
    expect(source).toMatch(/:batch-keyword="subgroupBatchFilter"/)
    expect(source).toMatch(/:barcode-keyword="subgroupBarcodeFilter"/)
  })

  it('顶部候选优先复用已加载的子组，避免输入时重复请求造成下拉消失', () => {
    expect(source).toMatch(/store\.subgroupList\.filter\(\(sub\) => sub\.paramId === selectedParamId\.value\)/)
  })

  it('顶部查询与录入弹窗一致，输入后防抖再返回下拉候选', () => {
    expect(source).not.toMatch(/let subgroupSuggestionTimer: ReturnType<typeof setTimeout> \| undefined/)
    expect(source).not.toMatch(/subgroupSuggestionTimer = setTimeout\(async \(\) =>/)
  })

  it('顶层查询无匹配时保留下拉提示，而不是直接收起', () => {
    expect(source).toContain('未查询到符合条件的批次号/条码')
    expect(source).toMatch(/item\.noResult/)
  })
})

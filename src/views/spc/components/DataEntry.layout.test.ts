import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./DataEntry.vue', import.meta.url), 'utf8')
const subgroupSource = readFileSync(new URL('./SubgroupList.vue', import.meta.url), 'utf8')

describe('SPC 数据采集筛选布局', () => {
  it('物料代码、工序、参数固定在第一行，批次号和条码固定在第二行', () => {
    expect(source).toMatch(/\.top-query-code\s*\{[^}]*grid-row:\s*1;/s)
    expect(source).toMatch(/\.top-query-pair\s*\{[^}]*grid-row:\s*1;/s)
    expect(source).toMatch(/\.sub-query-pair\s*\{[^}]*grid-row:\s*2;/s)
  })

  it('工序与参数、批次号与条码作为连续查询条件展示', () => {
    expect(source).toContain('class="top-query-pair top-query-process-param"')
    expect(source).toContain('class="sub-query-pair"')
    expect(source).toMatch(/\.top-query-pair\s*\{[^}]*gap:\s*12px;/s)
    expect(source).toMatch(/\.sub-query-pair\s*\{[^}]*gap:\s*12px;/s)
  })

  it('页面内容自然展开，不使用组件内部纵向滚动', () => {
    expect(source).not.toMatch(/\.entry-body\s*\{[^}]*overflow-y:\s*auto;/s)
    expect(source).not.toMatch(/\.data-entry\s*\{[^}]*height:\s*calc\(/s)
    expect(source).not.toMatch(/\.entry-top\s*\{[^}]*max-height:/s)
    expect(source).not.toMatch(/\.entry-card\s+:deep\(\.el-card__body\)\s*\{[^}]*overflow:\s*hidden;/s)
    expect(subgroupSource).not.toMatch(/\.subgroup-list\s*\{[^}]*height:\s*100%;/s)
    expect(subgroupSource).not.toMatch(/\.subgroup-list\s+:deep\(\.el-card__body\)\s*\{[^}]*overflow:\s*hidden;/s)
  })
})

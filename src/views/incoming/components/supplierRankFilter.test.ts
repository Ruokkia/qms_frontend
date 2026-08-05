import { describe, expect, it } from 'vitest'
import { filterSupplierRankItems } from './supplierRankFilter'

const items = [
  { supplierName: '华南电子', supplierCode: 'HN-001' },
  { supplierName: '华东精密', supplierCode: 'HD-002' },
] as any

describe('供应商合格率明细筛选', () => {
  it('按供应商名称或编码模糊匹配', () => {
    expect(filterSupplierRankItems(items, '电子')).toHaveLength(1)
    expect(filterSupplierRankItems(items, 'hd-')).toHaveLength(1)
  })

  it('关键字为空时保留当前区间全部供应商', () => {
    expect(filterSupplierRankItems(items, '  ')).toEqual(items)
  })
})

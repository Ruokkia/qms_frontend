import { describe, expect, it } from 'vitest'
import { buildSupplierRateRanges, getSupplierRateRange } from './supplierRankRange'

describe('supplier rank rate ranges', () => {
  it('keeps 100 percent as a separate range', () => {
    expect(getSupplierRateRange(100)).toBe('perfect')
    expect(getSupplierRateRange(99.99)).toBe('90-99')
    expect(getSupplierRateRange(89.99)).toBe('80-89')
    expect(getSupplierRateRange(59.99)).toBe('below-60')
  })

  it('deduplicates suppliers and groups them by pass rate', () => {
    const groups = buildSupplierRateRanges([
      { supplierName: '甲', supplierCode: 'A', totalBatches: 10, passRate: 100 },
      { supplierName: '甲', supplierCode: 'A', totalBatches: 99, passRate: 80 },
      { supplierName: '乙', supplierCode: 'B', totalBatches: 4, passRate: 65, unqualifiedRate: 35 },
    ])
    expect(groups.map((group) => [group.key, group.items.length])).toEqual([
      ['perfect', 1],
      ['60-69', 1],
    ])
    expect(groups.find((group) => group.key === 'perfect')?.items[0].supplierCode).toBe('A')
    expect(groups.find((group) => group.key === '60-69')?.items[0].supplierCode).toBe('B')
  })
})
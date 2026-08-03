import type { SupplierRankItem } from '@/types/incoming'

export const SUPPLIER_RATE_RANGES = [
  { key: 'perfect', label: '100%', color: '#3E7A4E' },
  { key: '90-99', label: '90%～99.99%', color: '#5E8C9F' },
  { key: '80-89', label: '80%～89.99%', color: '#B8763E' },
  { key: '70-79', label: '70%～79.99%', color: '#C68C53' },
  { key: '60-69', label: '60%～69.99%', color: '#D16E52' },
  { key: 'below-60', label: '60%以下', color: '#B84B3E' },
] as const

export type SupplierRateRangeKey = (typeof SUPPLIER_RATE_RANGES)[number]['key']

export interface SupplierRateRangeGroup {
  key: SupplierRateRangeKey
  label: string
  color: string
  items: SupplierRankItem[]
}

export function toRate(value: number | string | null | undefined): number {
  const rate = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(rate) ? Math.max(0, Math.min(100, rate)) : 0
}

export function getSupplierRateRange(rateValue: number | string | null | undefined): SupplierRateRangeKey {
  const rate = toRate(rateValue)
  if (rate >= 100) return 'perfect'
  if (rate >= 90) return '90-99'
  if (rate >= 80) return '80-89'
  if (rate >= 70) return '70-79'
  if (rate >= 60) return '60-69'
  return 'below-60'
}

export function buildSupplierRateRanges(data: SupplierRankItem[]): SupplierRateRangeGroup[] {
  const unique = new Map<string, SupplierRankItem>()
  for (const item of data) {
    const key = (item.supplierCode || item.supplierName || '').trim()
    if (key && !unique.has(key)) unique.set(key, item)
  }
  const groups = new Map<SupplierRateRangeKey, SupplierRankItem[]>()
  for (const item of unique.values()) {
    const key = getSupplierRateRange(item.passRate)
    const items = groups.get(key) || []
    items.push(item)
    groups.set(key, items)
  }
  return SUPPLIER_RATE_RANGES.map((range) => ({
    ...range,
    items: groups.get(range.key) || [],
  })).filter((range) => range.items.length > 0)
}
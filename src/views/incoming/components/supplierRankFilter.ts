import type { SupplierRankItem } from '@/types/incoming'

export function filterSupplierRankItems(items: SupplierRankItem[], keyword: string): SupplierRankItem[] {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return items
  return items.filter((item) =>
    [item.supplierName, item.supplierCode]
      .some((value) => String(value ?? '').toLowerCase().includes(normalized)),
  )
}

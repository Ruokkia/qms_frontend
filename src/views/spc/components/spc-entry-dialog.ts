export function canOpenSampleEntry(paramId: number | null | undefined): boolean {
  return typeof paramId === 'number' && paramId > 0
}

export function getSampleEntryAction(
  trigger: 'input' | 'enter',
  index: number,
  sampleCount: number,
): 'none' | 'next' | 'submit' {
  if (trigger !== 'enter') return 'none'
  return index >= sampleCount ? 'submit' : 'next'
}

export function getSpcEntryFieldMode(
  field: 'itemCode' | 'batchNo' | 'barcode' | 'process' | 'parameter',
): 'editable' | 'readonly' {
  return field === 'batchNo' || field === 'barcode' ? 'editable' : 'readonly'
}

export interface SpcSourceRecord {
  batchNo: string
  barcode: string
}

export function selectSpcSourceRecord(source: SpcSourceRecord): SpcSourceRecord {
  return { batchNo: source.batchNo, barcode: source.barcode }
}

export function isSelectedSourcePair(
  source: SpcSourceRecord | null,
  batchNo: string,
  barcode: string,
): boolean {
  return !!source && source.batchNo === batchNo.trim() && source.barcode === barcode.trim()
}

export interface SpcSubgroupSourceRecord {
  itemCode?: string
  batchNo?: string
  barcode?: string
}

interface SpcSubgroupSource {
  itemCode?: string
  materialCode?: string
  batchNo?: string
  samples?: Array<{ barcode?: string | null }>
}

export function buildSubgroupSourceOptions(
  subgroups: SpcSubgroupSource[],
): Array<{ itemCode: string; batchNo: string; barcode: string }> {
  const keys = new Set<string>()
  const options: Array<{ itemCode: string; batchNo: string; barcode: string }> = []

  for (const subgroup of subgroups) {
    const itemCode = subgroup.itemCode || subgroup.materialCode || ''
    const batchNo = subgroup.batchNo || ''
    const barcodes = (subgroup.samples || [])
      .map((sample) => sample.barcode || '')
      .filter(Boolean)
    for (const barcode of barcodes.length ? barcodes : ['']) {
      const key = `${itemCode}\u0000${batchNo}\u0000${barcode}`
      if (!keys.has(key)) {
        keys.add(key)
        options.push({ itemCode, batchNo, barcode })
      }
    }
  }
  return options
}

export function filterSubgroupSourceRecords<T extends SpcSubgroupSourceRecord>(
  records: T[],
  itemCode: string,
  batchKeyword: string,
  barcodeKeyword: string,
): T[] {
  const code = itemCode.trim()
  const batch = batchKeyword.trim().toLowerCase()
  const barcode = barcodeKeyword.trim().toLowerCase()
  return records.filter((record) =>
    record.itemCode === code &&
    (!batch || (record.batchNo || '').toLowerCase().includes(batch)) &&
    (!barcode || (record.barcode || '').toLowerCase().includes(barcode)),
  )
}

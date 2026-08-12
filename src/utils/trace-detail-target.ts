export type TraceDetailTarget =
  | { kind: 'finished'; id: number }
  | { kind: 'finished'; barcode: string }
  | { kind: 'incoming'; id: number }
  | { kind: 'incoming'; barcode: string }

/**
 * Maps a trace node's composite ID to the data-management detail it represents.
 *
 * 两种 ID 格式：
 * - `fg_123` / `mi_456`：数据库主键（buildNodeFromFg / buildNodeFromMat 生成），按主键查详情
 * - `fg:{条码}` / `mi:{条码}`：绑定表来源（buildNodeFromBinding 生成），按条码查详情；
 *   半成品节点的详情以绑定表 son_lot_no 关联成品表条码字段（prod_batch_or_sn），因此优先使用 sonLotNo
 */
export function resolveTraceDetailTarget(
  nodeId: string | number,
  nodeType: string,
  sonLotNo?: string | null,
): TraceDetailTarget | null {
  const str = String(nodeId)

  // 下划线格式：fg_123 / mi_456（数据库主键）
  const underscoreMatched = /^(fg|mi)_(\d+)$/.exec(str)
  if (underscoreMatched) {
    const [, prefix, rawId] = underscoreMatched
    const id = Number(rawId)
    if (!Number.isSafeInteger(id) || id <= 0) return null
    if (prefix === 'fg' && ['FINISHED_GOOD', 'SEMI_FINISHED'].includes(nodeType)) {
      return { kind: 'finished', id }
    }
    if (prefix === 'mi' && nodeType === 'MATERIAL') {
      return { kind: 'incoming', id }
    }
    return null
  }

  // 冒号格式：fg:{条码} / mi:{条码}（绑定表来源）
  const colonMatched = /^(fg|mi):(.+)$/.exec(str)
  if (colonMatched) {
    const [, prefix, rawBarcode] = colonMatched
    const barcode = rawBarcode.trim()
    if (!barcode) return null
    if (prefix === 'fg' && ['FINISHED_GOOD', 'SEMI_FINISHED'].includes(nodeType)) {
      // 半成品详情以绑定表 son_lot_no 关联成品表条码（prod_batch_or_sn）
      const queryBarcode = sonLotNo?.trim() || barcode
      return { kind: 'finished', barcode: queryBarcode }
    }
    if (prefix === 'mi' && nodeType === 'MATERIAL') {
      return { kind: 'incoming', barcode }
    }
    return null
  }

  return null
}

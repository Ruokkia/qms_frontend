import { describe, expect, it } from 'vitest'
import { resolveTraceDetailTarget } from './trace-detail-target'

describe('trace detail target', () => {
  it('opens finished and semi-finished nodes in the finished-goods detail dialog', () => {
    expect(resolveTraceDetailTarget('fg_123', 'FINISHED_GOOD')).toEqual({ kind: 'finished', id: 123 })
    expect(resolveTraceDetailTarget('fg_456', 'SEMI_FINISHED')).toEqual({ kind: 'finished', id: 456 })
  })

  it('opens material nodes in the incoming-inspection detail dialog', () => {
    expect(resolveTraceDetailTarget('mi_789', 'MATERIAL')).toEqual({ kind: 'incoming', id: 789 })
  })

  it('supports binding-table nodes with colon-separated barcodes', () => {
    expect(resolveTraceDetailTarget('fg:BARCODE-001', 'SEMI_FINISHED')).toEqual({ kind: 'finished', barcode: 'BARCODE-001' })
    expect(resolveTraceDetailTarget('fg:BARCODE-001', 'FINISHED_GOOD')).toEqual({ kind: 'finished', barcode: 'BARCODE-001' })
    expect(resolveTraceDetailTarget('mi:MAT-001', 'MATERIAL')).toEqual({ kind: 'incoming', barcode: 'MAT-001' })
  })

  it('prefers sonLotNo as the finished barcode for semi-finished nodes', () => {
    expect(resolveTraceDetailTarget('fg:MAT-001', 'SEMI_FINISHED', 'SON-LOT-9')).toEqual({ kind: 'finished', barcode: 'SON-LOT-9' })
    expect(resolveTraceDetailTarget('fg:MAT-001', 'SEMI_FINISHED', '   ')).toEqual({ kind: 'finished', barcode: 'MAT-001' })
    expect(resolveTraceDetailTarget('fg:MAT-001', 'SEMI_FINISHED', null)).toEqual({ kind: 'finished', barcode: 'MAT-001' })
  })

  it('does not expose a detail target for orphan or malformed trace nodes', () => {
    expect(resolveTraceDetailTarget('fg_123', 'UNKNOWN')).toBeNull()
    expect(resolveTraceDetailTarget('unknown_123', 'MATERIAL')).toBeNull()
    expect(resolveTraceDetailTarget('mi_not-a-number', 'MATERIAL')).toBeNull()
    expect(resolveTraceDetailTarget('fg:', 'SEMI_FINISHED')).toBeNull()
    expect(resolveTraceDetailTarget('mi:', 'MATERIAL')).toBeNull()
    expect(resolveTraceDetailTarget('fg:MAT-001', 'UNKNOWN')).toBeNull()
    expect(resolveTraceDetailTarget('mi:MAT-001', 'SEMI_FINISHED')).toBeNull()
  })
})

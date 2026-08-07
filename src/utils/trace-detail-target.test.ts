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

  it('does not expose a detail target for orphan or malformed trace nodes', () => {
    expect(resolveTraceDetailTarget('fg_123', 'UNKNOWN')).toBeNull()
    expect(resolveTraceDetailTarget('unknown_123', 'MATERIAL')).toBeNull()
    expect(resolveTraceDetailTarget('mi_not-a-number', 'MATERIAL')).toBeNull()
  })
})

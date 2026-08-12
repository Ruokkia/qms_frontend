import { describe, expect, it } from 'vitest'
import { createLatestRequestGate } from './latest-request'

describe('latest request gate', () => {
  it('ignores an earlier response after a newer request starts', () => {
    const gate = createLatestRequestGate()
    const earlierRequest = gate.begin()
    const latestRequest = gate.begin()

    expect(gate.isCurrent(earlierRequest)).toBe(false)
    expect(gate.isCurrent(latestRequest)).toBe(true)
  })
})

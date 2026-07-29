import { describe, expect, it } from 'vitest'
import { isBuiltInRole } from './role-policy'

describe('角色删除策略', () => {
  it('仅将 R00 识别为不可删除角色', () => {
    expect(isBuiltInRole('R00')).toBe(true)
    expect(isBuiltInRole('R01')).toBe(false)
    expect(isBuiltInRole('R07')).toBe(false)
    expect(isBuiltInRole('R08')).toBe(false)
    expect(isBuiltInRole('R12')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { isBuiltInRole, isMissingRoleError } from './role-policy'

describe('角色删除策略', () => {
  it('仅将 R00 识别为不可删除角色', () => {
    expect(isBuiltInRole('R00')).toBe(true)
    expect(isBuiltInRole('R01')).toBe(false)
    expect(isBuiltInRole('R07')).toBe(false)
    expect(isBuiltInRole('R08')).toBe(false)
    expect(isBuiltInRole('R12')).toBe(false)
  })
})

describe('已删除角色识别', () => {
  it('仅将后端的角色不存在业务错误识别为需要换角', () => {
    expect(isMissingRoleError(new Error('角色不存在'))).toBe(true)
    expect(isMissingRoleError(new Error('账号不存在'))).toBe(false)
    expect(isMissingRoleError(new Error('网络连接失败'))).toBe(false)
  })
})

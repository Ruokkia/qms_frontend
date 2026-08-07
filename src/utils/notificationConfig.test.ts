import { describe, expect, it } from 'vitest'
import { notificationMenuName, resolveNotificationRoles } from './notificationConfig'

describe('notification configuration display helpers', () => {
  it('maps notification scenarios to their owning menu', () => {
    expect(notificationMenuName('EXCEPTION_CREATED')).toBe('异常管理与整改')
    expect(notificationMenuName('ESCALATION_TRIGGERED')).toBe('供应商管理')
    expect(notificationMenuName('ACTION_OWNER_ASSIGNED')).toBe('异常管理与整改')
    expect(notificationMenuName('PLAN_OWNER_ASSIGNED')).toBe('异常管理与整改')
    expect(notificationMenuName('ESCALATION_OWNER_ASSIGNED')).toBe('供应商管理')
    expect(notificationMenuName('UNKNOWN_TYPE')).toBe('系统管理')
  })

  it('resolves configured role codes to readable role names', () => {
    expect(resolveNotificationRoles('["R02","R05"]', [
      { code: 'R02', name: '检验员' },
      { code: 'R05', name: 'SQE' },
    ])).toEqual([
      { code: 'R02', name: '检验员' },
      { code: 'R05', name: 'SQE' },
    ])
  })
})

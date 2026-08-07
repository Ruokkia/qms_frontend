import { describe, expect, it } from 'vitest'
import { auditOperationName } from './audit-operation'

describe('审计操作类型中文映射', () => {
  it('映射通用操作类型', () => {
    expect(auditOperationName('CREATE')).toBe('新增')
    expect(auditOperationName('UPDATE')).toBe('更新')
  })

  it('映射系统管理专用操作类型', () => {
    expect(auditOperationName('UPDATE_ROLE_PERMISSION')).toBe('调整角色权限')
    expect(auditOperationName('RESET_PASSWORD')).toBe('重置密码')
    expect(auditOperationName('CREATE_ROLE')).toBe('创建角色')
    expect(auditOperationName('DELETE_ROLE')).toBe('删除角色')
    expect(auditOperationName('UPDATE_NOTIFICATION_CONFIG')).toBe('更新通知配置')
  })

  it('为未识别类型提供中文兜底展示', () => {
    expect(auditOperationName('BATCH_RECALCULATE')).toBe('其他操作（BATCH_RECALCULATE）')
  })
})

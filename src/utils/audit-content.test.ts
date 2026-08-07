import { describe, expect, it } from 'vitest'
import { auditContent } from './audit-content'

describe('审计变更内容展示', () => {
  it('优先显示后端提供的业务摘要', () => {
    expect(auditContent({ operationContent: '通知配置（异常创建）：状态由“启用”调整为“停用”' }))
      .toBe('通知配置（异常创建）：状态由“启用”调整为“停用”')
  })

  it('不向用户展示历史记录的原始 JSON', () => {
    expect(auditContent({ afterData: '{"roleCodes":["R02"]}' }))
      .toBe('历史记录未提供变更摘要')
  })
})

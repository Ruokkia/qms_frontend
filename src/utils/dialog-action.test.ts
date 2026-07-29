import { describe, expect, it } from 'vitest'
import { hasRequiredReason, isDialogCancellation } from './dialog-action'

describe('弹窗取消动作识别', () => {
  it('只把取消和关闭识别为正常操作', () => {
    expect(isDialogCancellation('cancel')).toBe(true)
    expect(isDialogCancellation('close')).toBe(true)
    expect(isDialogCancellation(new Error('network error'))).toBe(false)
    expect(isDialogCancellation('confirm')).toBe(false)
  })
})

describe('操作原因校验', () => {
  it('拒绝空白原因，仅接受有实际内容的原因', () => {
    expect(hasRequiredReason('')).toBe(false)
    expect(hasRequiredReason('   ')).toBe(false)
    expect(hasRequiredReason('账号交接')).toBe(true)
  })
})

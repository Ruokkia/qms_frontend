import { describe, expect, it } from 'vitest'
import { isDialogCancellation } from './dialog-action'

describe('弹窗取消动作识别', () => {
  it('只把取消和关闭识别为正常操作', () => {
    expect(isDialogCancellation('cancel')).toBe(true)
    expect(isDialogCancellation('close')).toBe(true)
    expect(isDialogCancellation(new Error('network error'))).toBe(false)
    expect(isDialogCancellation('confirm')).toBe(false)
  })
})

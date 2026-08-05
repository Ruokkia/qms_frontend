import { describe, expect, it } from 'vitest'
import { getMissingAdminUserField } from './admin-user-validation'

describe('新建账号字段校验', () => {
  it('应返回第一个为空的字段名称', () => {
    expect(getMissingAdminUserField({ account: '', realName: '张三', roleCode: 'R01', plantCode: 'SZ' })).toBe('账号')
    expect(getMissingAdminUserField({ account: 'zhangsan', realName: '', roleCode: 'R01', plantCode: 'SZ' })).toBe('姓名')
    expect(getMissingAdminUserField({ account: 'zhangsan', realName: '张三', roleCode: '', plantCode: 'SZ' })).toBe('角色')
    expect(getMissingAdminUserField({ account: 'zhangsan', realName: '张三', roleCode: 'R01', plantCode: '' })).toBe('分公司')
  })

  it('所有必填字段都有值时应通过校验', () => {
    expect(getMissingAdminUserField({ account: 'zhangsan', realName: '张三', roleCode: 'R01', plantCode: 'SZ' })).toBeNull()
  })
})

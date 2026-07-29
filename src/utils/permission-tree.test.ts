import { describe, expect, it } from 'vitest'
import {
  buildPermissionTree,
  checkedKeysFromPermissions,
  permissionDetailsByModule,
  permissionsFromModuleActions,
  permissionSummaryByModule,
  permissionsFromCheckedKeys,
  validatePermissionEdit,
} from './permission-tree'

const modules = [
  { code: 'trace', name: '来料追溯' },
  { code: 'systemAdmin', name: '系统管理' },
]

describe('权限树转换', () => {
  it('勾选模块时至少保留查看权限', () => {
    expect(permissionsFromCheckedKeys(['trace'], modules)).toEqual(['trace:VIEW'])
  })

  it('勾选维护操作时自动补齐查看权限，保证菜单可见', () => {
    expect(permissionsFromCheckedKeys(['trace:EDIT'], modules)).toEqual(['trace:VIEW', 'trace:EDIT'])
  })

  it('将已保存的权限还原为树叶节点，用于编辑回显', () => {
    expect(checkedKeysFromPermissions(['trace:VIEW', 'trace:EDIT', 'unknown:CUSTOM'], modules)).toEqual([
      'trace:VIEW',
      'trace:EDIT',
    ])
  })

  it('为非 R00/R06 角色禁用系统管理节点', () => {
    const systemNode = buildPermissionTree(modules, 'R01').find((node) => node.id === 'systemAdmin')
    expect(systemNode?.disabled).toBe(true)
    expect(systemNode?.children.every((child) => child.disabled)).toBe(true)
  })

  it('按模块归并已授权操作并按固定顺序显示', () => {
    expect(permissionSummaryByModule(['trace:EXPORT', 'trace:VIEW', 'trace:EDIT', 'systemAdmin:APPROVE'], modules)).toEqual([
      '来料追溯：查看、维护、导出',
      '系统管理：审核',
    ])
  })

  it('没有可识别权限时不生成摘要', () => {
    expect(permissionSummaryByModule(['unknown:CUSTOM'], modules)).toEqual([])
  })

  it('按模块生成详情分块，忽略未知权限', () => {
    expect(permissionDetailsByModule(['trace:EDIT', 'unknown:CUSTOM', 'trace:VIEW'], modules)).toEqual([
      { code: 'trace', name: '来料追溯', actions: ['查看', '维护'] },
    ])
  })

  it('只为已选择的模块生成操作权限，并自动保留查看', () => {
    expect(permissionsFromModuleActions(['trace'], { trace: ['EDIT'], systemAdmin: ['APPROVE'] }, modules)).toEqual([
      'trace:VIEW',
      'trace:EDIT',
    ])
  })

  it('保存前要求至少选择一个模块并填写原因', () => {
    expect(validatePermissionEdit([], '已核对')).toBe('请至少选择一个模块')
    expect(validatePermissionEdit(['trace'], '   ')).toBe('请填写编辑原因')
    expect(validatePermissionEdit(['trace'], '岗位职责调整')).toBeNull()
  })
})

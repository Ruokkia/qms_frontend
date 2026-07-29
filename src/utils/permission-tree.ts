export type PermissionModule = {
  code: string
  name: string
}

export type PermissionTreeNode = {
  id: string
  label: string
  disabled?: boolean
  children: PermissionTreeNode[]
}

export type PermissionModuleDetail = {
  code: string
  name: string
  actions: string[]
}

const actions = [
  { code: 'VIEW', name: '查看' },
  { code: 'EDIT', name: '维护' },
  { code: 'APPROVE', name: '审核' },
  { code: 'EXPORT', name: '导出' },
]

const systemAdminRoles = new Set(['R00', 'R06'])

export function buildPermissionTree(modules: PermissionModule[], roleCode: string): PermissionTreeNode[] {
  return modules.map((module) => {
    const disabled = module.code === 'systemAdmin' && !systemAdminRoles.has(roleCode)
    return {
      id: module.code,
      label: module.name,
      disabled,
      children: actions.map((action) => ({
        id: `${module.code}:${action.code}`,
        label: action.name,
        disabled,
        children: [],
      })),
    }
  })
}

export function checkedKeysFromPermissions(permissions: string[], modules: PermissionModule[]): string[] {
  const known = new Set(modules.flatMap((module) => actions.map((action) => `${module.code}:${action.code}`)))
  return permissions.filter((permission) => known.has(permission))
}

export function permissionSummaryByModule(permissions: string[], modules: PermissionModule[]): string[] {
  return permissionDetailsByModule(permissions, modules).map((detail) => `${detail.name}：${detail.actions.join('、')}`)
}

export function permissionDetailsByModule(permissions: string[], modules: PermissionModule[]): PermissionModuleDetail[] {
  const granted = new Set(permissions)
  return modules.flatMap((module) => {
    const actionNames = actions
      .filter((action) => granted.has(`${module.code}:${action.code}`))
      .map((action) => action.name)
    return actionNames.length > 0 ? [{ code: module.code, name: module.name, actions: actionNames }] : []
  })
}

export function permissionsFromCheckedKeys(checkedKeys: string[], modules: PermissionModule[], existingPermissions: string[] = []): string[] {
  const moduleCodes = new Set(modules.map((module) => module.code))
  const known = new Set(modules.flatMap((module) => actions.map((action) => `${module.code}:${action.code}`)))
  const selected = new Set<string>()

  for (const key of checkedKeys) {
    if (moduleCodes.has(key)) {
      selected.add(`${key}:VIEW`)
      continue
    }
    if (known.has(key)) {
      const [moduleCode] = key.split(':', 1)
      selected.add(`${moduleCode}:VIEW`)
      selected.add(key)
    }
  }

  const preservedUnknown = existingPermissions.filter((permission) => !known.has(permission))
  const orderedSelected = modules.flatMap((module) =>
    actions
      .map((action) => `${module.code}:${action.code}`)
      .filter((permission) => selected.has(permission)),
  )
  return [...preservedUnknown, ...orderedSelected]
}

export function permissionsFromModuleActions(
  selectedModuleCodes: string[],
  moduleActions: Record<string, string[]>,
  modules: PermissionModule[],
  existingPermissions: string[] = [],
): string[] {
  const selectedModules = new Set(selectedModuleCodes)
  const known = new Set(modules.flatMap((module) => actions.map((action) => `${module.code}:${action.code}`)))
  const preservedUnknown = existingPermissions.filter((permission) => !known.has(permission))
  const permissions = modules.flatMap((module) => {
    if (!selectedModules.has(module.code)) return []
    const selectedActions = new Set(moduleActions[module.code] || [])
    selectedActions.add('VIEW')
    return actions
      .filter((action) => selectedActions.has(action.code))
      .map((action) => `${module.code}:${action.code}`)
  })
  return [...preservedUnknown, ...permissions]
}

export function validatePermissionEdit(selectedModuleCodes: string[], reason: string): string | null {
  if (selectedModuleCodes.length === 0) return '请至少选择一个模块'
  if (!reason.trim()) return '请填写编辑原因'
  return null
}

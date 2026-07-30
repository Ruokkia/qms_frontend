import type { ModuleKey } from '@/types'

export interface DashboardQuickAction {
  key: string
  title: string
  icon: string
  path: string
  moduleKey?: ModuleKey
}

export function filterQuickActions(
  actions: DashboardQuickAction[],
  allowedModules: ModuleKey[],
): DashboardQuickAction[] {
  const allowed = new Set(allowedModules)
  return actions.filter((action) => !action.moduleKey || allowed.has(action.moduleKey))
}

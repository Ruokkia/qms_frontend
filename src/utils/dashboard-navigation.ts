import type { ModuleKey, NavItem } from '@/types'

type NavigationGroup = {
  label: string
  items: Pick<NavItem, 'key' | 'title' | 'module'>[]
}

export function filterNavigationByModules<T extends NavigationGroup>(
  groups: T[],
  allowedModules: ModuleKey[],
): T[] {
  const allowed = new Set(allowedModules)
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.key !== 'dashboard' && allowed.has((item.module ?? item.key) as ModuleKey)),
    }))
    .filter((group) => group.items.length > 0) as T[]
}

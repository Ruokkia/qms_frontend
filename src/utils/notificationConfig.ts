export interface NotificationRole {
  code: string
  name: string
}

const menuByScenario: Record<string, string> = {
  EXCEPTION_CREATED: '异常管理与整改',
  EXCEPTION_CLOSED: '异常管理与整改',
  EXCEPTION_STATUS_CHANGED: '异常管理与整改',
  ESCALATION_TRIGGERED: '供应商管理',
  EIGHT_D_LEADER_ASSIGNED: '异常管理与整改',
  EIGHT_D_TEAM_PENDING_REVIEW: '异常管理与整改',
  EIGHT_D_TEAM_APPROVED: '异常管理与整改',
  ACTION_OWNER_ASSIGNED: '异常管理与整改',
  PLAN_OWNER_ASSIGNED: '异常管理与整改',
  ESCALATION_OWNER_ASSIGNED: '供应商管理',
}

export function notificationMenuName(scenarioCode: string): string {
  return menuByScenario[scenarioCode] || '系统管理'
}

export function resolveNotificationRoles(raw: string | undefined, roleOptions: NotificationRole[]): NotificationRole[] {
  if (!raw) return []
  try {
    const roleNames = new Map(roleOptions.map((role) => [role.code, role.name]))
    return (JSON.parse(raw) as string[]).map((code) => ({
      code,
      name: roleNames.get(code) || code,
    }))
  } catch {
    return []
  }
}

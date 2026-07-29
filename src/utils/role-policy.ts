export function isBuiltInRole(roleCode: string): boolean {
  return roleCode === 'R00'
}

export function isMissingRoleError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('角色不存在')
}

export type AdminUserRequiredFields = {
  account: unknown
  realName: unknown
  roleCode: unknown
  plantCode: unknown
}

const requiredFields: Array<[keyof AdminUserRequiredFields, string]> = [
  ['account', '账号'],
  ['realName', '姓名'],
  ['roleCode', '角色'],
  ['plantCode', '分公司'],
]

export function getMissingAdminUserField(form: AdminUserRequiredFields): string | null {
  const missing = requiredFields.find(([key]) => typeof form[key] !== 'string' || !(form[key] as string).trim())
  return missing?.[1] || null
}

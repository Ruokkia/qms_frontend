const operationNames: Record<string, string> = {
  CREATE: '新增',
  UPDATE: '更新',
  DELETE: '删除',
  SUBMIT: '提交',
  APPROVE: '审核通过',
  REJECT: '审核驳回',
  CLOSE: '关闭',
  LOGIN: '登录',
  LOGOUT: '退出登录',
  CREATE_USER: '创建账号',
  UPDATE_USER: '编辑账号',
  ENABLE_USER: '启用账号',
  DISABLE_USER: '停用账号',
  UNLOCK_USER: '解锁账号',
  RESET_PASSWORD: '重置密码',
  UPDATE_ROLE_PERMISSION: '调整角色权限',
  CREATE_ROLE: '创建角色',
  DELETE_ROLE: '删除角色',
}

export function auditOperationName(operationType: string): string {
  return operationNames[operationType] || `其他操作（${operationType}）`
}

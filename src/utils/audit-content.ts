export function auditContent(audit: { operationContent?: string; afterData?: string }): string {
  const content = audit.operationContent?.trim()
  return content || '历史记录未提供变更摘要'
}

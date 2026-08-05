export function buildTraceAuthorizationHeaders(token: string | null, plantCode?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token || ''}`,
  }
  if (plantCode) {
    headers['X-Plant-Code'] = plantCode
  }
  return headers
}

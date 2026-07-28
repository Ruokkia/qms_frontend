import { ElMessage } from 'element-plus'
import { isErrorNotified } from '@/api/request-error'

const DEDUPLICATE_WINDOW_MS = 3000
const lastReportedAt = new Map<string, number>()

export function reportRuntimeError(error: unknown, context: string, message = '系统出现异常，请刷新后重试') {
  if (isErrorNotified(error)) return

  const now = Date.now()
  const key = `${context}:${message}`
  const lastTime = lastReportedAt.get(key) || 0
  if (now - lastTime < DEDUPLICATE_WINDOW_MS) return

  lastReportedAt.set(key, now)
  ElMessage.error(message)

  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error)
  }
}

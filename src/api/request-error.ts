import axios, { type AxiosError } from 'axios'

export type RequestErrorKind = 'business' | 'network' | 'timeout' | 'unauthorized' | 'forbidden' | 'server' | 'unknown'

export class QmsRequestError extends Error {
  readonly kind: RequestErrorKind
  readonly notified: boolean
  readonly traceId?: string

  constructor(message: string, kind: RequestErrorKind, options?: { notified?: boolean; traceId?: string }) {
    super(message)
    this.name = 'QmsRequestError'
    this.kind = kind
    this.notified = options?.notified ?? false
    this.traceId = options?.traceId
  }
}

export function createRequestError(
  message: string,
  kind: RequestErrorKind,
  options?: { notified?: boolean; traceId?: string },
): QmsRequestError {
  return new QmsRequestError(message, kind, options)
}

export function isErrorNotified(error: unknown): boolean {
  return error instanceof QmsRequestError && error.notified
}

export function getErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (error instanceof QmsRequestError) return error.message || fallback
  if (!axios.isAxiosError(error)) return fallback

  const responseData = error.response?.data as { message?: unknown } | undefined
  if (typeof responseData?.message === 'string' && responseData.message.trim()) {
    return responseData.message
  }
  return getAxiosFallbackMessage(error)
}

export function normalizeRequestError(error: unknown, notified = false): QmsRequestError {
  if (error instanceof QmsRequestError) return error
  return createRequestError(getErrorMessage(error), getErrorKind(error), { notified })
}

function getErrorKind(error: unknown): RequestErrorKind {
  if (!axios.isAxiosError(error)) return 'unknown'
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'timeout'
  if (!error.response) return 'network'
  if (error.response.status === 401) return 'unauthorized'
  if (error.response.status === 403) return 'forbidden'
  if (error.response.status >= 500) return 'server'
  return 'business'
}

function getAxiosFallbackMessage(error: AxiosError): string {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return '请求超时，请稍后重试'
  }
  if (!error.response) {
    return '网络连接失败，请检查网络或确认服务已启动'
  }
  if (error.response.status === 401) return '登录状态已失效，请重新登录'
  if (error.response.status === 403) return '当前账号没有执行此操作的权限'
  if (error.response.status >= 500) return '服务暂时不可用，请稍后重试'
  return '请求失败，请检查填写内容后重试'
}

import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResult } from '@/types'
import { createRequestError, normalizeRequestError, type QmsRequestError } from './request-error'

// 统一使用相对路径 /api/v1
// 开发环境通过 Vite 代理转发至后端，生产环境由 Spring Boot 处理同源请求
const API_BASE_URL = '/api/v1'

const service: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Token 管理（直接读写 sessionStorage，避免与 store 循环依赖） ──
let isRefreshing = false
let refreshQueue: Array<{
  config: InternalAxiosRequestConfig
  resolve: (value: AxiosResponse<ApiResult>) => void
  reject: (reason?: unknown) => void
}> = []

function getToken(): string | null {
  return sessionStorage.getItem('qms_token')
}
function getRefreshToken(): string | null {
  return sessionStorage.getItem('qms_refresh_token')
}
function setTokens(token: string, refreshToken: string) {
  sessionStorage.setItem('qms_token', token)
  sessionStorage.setItem('qms_refresh_token', refreshToken)
}
function clearAuthAndRedirect() {
  sessionStorage.removeItem('qms_token')
  sessionStorage.removeItem('qms_refresh_token')
  sessionStorage.removeItem('qms_region')
  sessionStorage.removeItem('qms_user')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// 请求拦截器：携带 Authorization
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    const region = sessionStorage.getItem('qms_region')
    if (region) {
      config.headers['X-Plant-Code'] = region
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器
service.interceptors.response.use(
  ((response: AxiosResponse<ApiResult>) => {
    // 二进制资源（如模板下载）直接透传完整响应，由调用方处理 Blob
    if (response.config.responseType === 'blob') {
      return response as unknown as AxiosResponse<ApiResult>
    }
    const res = response.data
    if (res.code === 0) {
      return res as unknown as ApiResult
    }

    // 401 未认证 / 1008 Token 过期 → 静默刷新重试（refresh 请求自身除外）
    if ((res.code === 401 || res.code === 1008) && !(response.config as InternalAxiosRequestConfig & { _isRefresh?: boolean })._isRefresh) {
      return handleTokenExpired(response.config)
    }

    // 诊断埋点：便于复现偶发 500 / 业务错误时定位真实失败端点
    console.error(
      `[request] 业务错误 ${response.config.method?.toUpperCase() ?? ''} ${response.config.url ?? ''} ` +
      `code=${res.code} msg=${res.message ?? ''}`,
    )
    const error = createRequestError(res.message || '请求失败，请稍后重试', 'business', {
      notified: true,
    })
    ElMessage.error(error.message)
    return Promise.reject(error)
  }) as any,
  (error) => {
    // HTTP 层 401（兜底，后端目前统一返回 200 + code）
    if (error.response?.status === 401 && !(error.config as InternalAxiosRequestConfig & { _isRefresh?: boolean })?._isRefresh) {
      return handleTokenExpired(error.config)
    }
    // 诊断埋点：便于复现偶发 500 / 网络错误时定位真实失败端点
    const cfg = error.config || {}
    console.error(
      `[request] 响应错误 ${cfg.method?.toUpperCase() ?? ''} ${cfg.url ?? ''} ` +
      `status=${error.response?.status ?? '-'} code=${error.response?.data?.code ?? '-'}`,
    )
    const normalizedError = normalizeRequestError(error, true)
    ElMessage.error(normalizedError.message)
    return Promise.reject(normalizedError)
  },
)

// ── Token 过期处理：静默刷新 + 重试原请求 ──
async function handleTokenExpired(originalConfig: InternalAxiosRequestConfig): Promise<AxiosResponse<ApiResult> | Promise<never>> {
  const refreshToken = getRefreshToken()

  // 无 refresh token → 跳登录
  if (!refreshToken) {
    clearAuthAndRedirect()
    const error = createRequestError('登录已过期，请重新登录', 'unauthorized', { notified: true })
    ElMessage.error(error.message)
    throw error
  }

  // 已有刷新请求进行中 → 排队等待
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ config: originalConfig, resolve, reject })
    })
  }

  isRefreshing = true
  try {
    // 直接用 axios 原始实例请求 refresh（绕过 service 拦截器，避免循环）
    const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, {
      headers: { 'Content-Type': 'application/json' },
    })
    const data = refreshRes.data as ApiResult<{ token: string; refreshToken: string }>

    if (data.code === 0 && data.data) {
      setTokens(data.data.token, data.data.refreshToken)
      // 重试原请求
      const retryRes = await service(originalConfig)
      // 执行队列中等待的请求
      refreshQueue.forEach(({ config, resolve, reject }) => {
        service(config).then(resolve).catch(reject)
      })
      refreshQueue = []
      return retryRes
    }
    throw createRequestError(data.message || '登录已过期，请重新登录', 'unauthorized')
  } catch (error) {
    clearAuthAndRedirect()
    const authError: QmsRequestError = error instanceof Error && error.name === 'QmsRequestError'
      ? error as QmsRequestError
      : createRequestError('登录已过期，请重新登录', 'unauthorized')
    const notifiedError = createRequestError(authError.message, authError.kind, { notified: true })
    ElMessage.error(notifiedError.message)
    refreshQueue.forEach(({ reject }) => reject(notifiedError))
    refreshQueue = []
    throw notifiedError
  } finally {
    isRefreshing = false
  }
}

// ── 类型化请求包装（拦截器已将响应转为 ApiResult<T>） ──

export function apiGet<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
  return service.get(url, config) as unknown as Promise<ApiResult<T>>
}

export function apiPost<T = unknown, D = unknown>(url: string, data?: D | null, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
  return service.post(url, data, config) as unknown as Promise<ApiResult<T>>
}

export function apiPut<T = unknown, D = unknown>(url: string, data?: D | null, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
  return service.put(url, data, config) as unknown as Promise<ApiResult<T>>
}

export function apiDelete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
  return service.delete(url, config) as unknown as Promise<ApiResult<T>>
}

export default service

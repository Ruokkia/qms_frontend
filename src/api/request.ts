import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResult } from '@/types'

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
let refreshQueue: Array<() => void> = []

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
  (response: AxiosResponse<ApiResult>) => {
    const res = response.data
    if (res.code === 0) {
      return res as any
    }

    // 401 未认证 / 1008 Token 过期 → 静默刷新重试（refresh 请求自身除外）
    if ((res.code === 401 || res.code === 1008) && !(response.config as any)._isRefresh) {
      return handleTokenExpired(response.config)
    }

    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || 'Error'))
  },
  (error) => {
    // HTTP 层 401（兜底，后端目前统一返回 200 + code）
    if (error.response?.status === 401 && !(error.config as any)?._isRefresh) {
      return handleTokenExpired(error.config)
    }
    ElMessage.error(error.message || '网络异常')
    return Promise.reject(error)
  },
)

// ── Token 过期处理：静默刷新 + 重试原请求 ──
async function handleTokenExpired(originalConfig: any): Promise<any> {
  const refreshToken = getRefreshToken()

  // 无 refresh token → 跳登录
  if (!refreshToken) {
    clearAuthAndRedirect()
    return Promise.reject(new Error('登录已过期，请重新登录'))
  }

  // 已有刷新请求进行中 → 排队等待
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push(() => {
        service(originalConfig).then(resolve).catch(reject)
      })
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
      refreshQueue.forEach((cb) => cb())
      refreshQueue = []
      return retryRes
    } else {
      clearAuthAndRedirect()
      ElMessage.error(data.message || '登录已过期，请重新登录')
      return Promise.reject(new Error('登录已过期'))
    }
  } catch {
    clearAuthAndRedirect()
    ElMessage.error('登录已过期，请重新登录')
    return Promise.reject(new Error('登录已过期'))
  } finally {
    isRefreshing = false
  }
}

// ── 类型化请求包装（拦截器已将响应转为 ApiResult<T>） ──

export function apiGet<T = any>(url: string, config?: any): Promise<ApiResult<T>> {
  return service.get(url, config) as any
}

export function apiPost<T = any>(url: string, data?: any, config?: any): Promise<ApiResult<T>> {
  return service.post(url, data, config) as any
}

export function apiPut<T = any>(url: string, data?: any, config?: any): Promise<ApiResult<T>> {
  return service.put(url, data, config) as any
}

export function apiDelete<T = any>(url: string, config?: any): Promise<ApiResult<T>> {
  return service.delete(url, config) as any
}

export default service

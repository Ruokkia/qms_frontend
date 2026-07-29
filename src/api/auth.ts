import { apiGet, apiPost } from './request'
import type { LoginParams, LoginResponse, RefreshParams, ApiResult, UserInfo, LoginDirectoryUser } from '@/types'

/** 开发环境登录账号目录：仅包含可展示身份字段 */
export function getLoginDirectoryApi(): Promise<ApiResult<LoginDirectoryUser[]>> {
  return apiGet<LoginDirectoryUser[]>('/auth/directory')
}

/** 登录 */
export function loginApi(data: LoginParams): Promise<ApiResult<LoginResponse>> {
  return apiPost<LoginResponse>('/auth/login', data)
}

/** 刷新 Token */
export function refreshTokenApi(data: RefreshParams): Promise<ApiResult<LoginResponse>> {
  return apiPost<LoginResponse>('/auth/refresh', data)
}

/** 退出登录（通过 header 传 refreshToken 实现双向失效） */
export function logoutApi(refreshToken?: string): Promise<ApiResult<null>> {
  const headers: Record<string, string> = {}
  if (refreshToken) {
    headers['X-Refresh-Token'] = refreshToken
  }
  return apiPost<null>('/auth/logout', null, { headers })
}

/** 获取当前用户信息 */
export function getUserInfoApi(): Promise<ApiResult<UserInfo>> {
  return apiGet<UserInfo>('/auth/me')
}

export function changePasswordApi(currentPassword: string, newPassword: string, confirmPassword: string): Promise<ApiResult<null>> {
  return apiPost<null>('/auth/change-password', { currentPassword, newPassword, confirmPassword })
}

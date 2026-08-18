import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { LoginResponse, ModuleKey, PlantCode, UserInfo } from '@/types'
import { logoutApi } from '@/api/auth'

export const AREAS: { code: PlantCode; name: string }[] = [
  { code: 'SZ', name: '深圳' },
  { code: 'MZ', name: '梅州' },
]

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const token = ref('')
  const refreshToken = ref('')

  const isLogin = computed(() => !!user.value && !!token.value)
  const roleId = computed(() => user.value?.roleCode || '')
  const plantCode = computed(() => user.value?.plantCode || 'SZ')
  const allowedModules = computed<ModuleKey[]>(() => user.value?.modulePermissions || [])
  const canSwitchArea = computed(() => user.value?.canSwitchArea === true)
  const isAdmin = computed(() => user.value?.roleCode === 'R00')
  const isQualityManager = computed(() => user.value?.roleCode === 'R06')

  function hasModule(key: ModuleKey): boolean {
    // 超级管理员和质量经理均具备全模块数据范围。新模块在数据库迁移完成前
    // 可能尚未出现在当前会话缓存的 modulePermissions 中，不能因此隐藏菜单或拦截路由。
    if (user.value?.roleCode === 'R00' || user.value?.roleCode === 'R06') {
      return true
    }
    return allowedModules.value.includes(key)
  }

  function setUser(data: LoginResponse) {
    user.value = data.userInfo
    token.value = data.token
    refreshToken.value = data.refreshToken
    sessionStorage.setItem('qms_token', data.token)
    sessionStorage.setItem('qms_refresh_token', data.refreshToken)
    sessionStorage.setItem('qms_region', data.userInfo.plantCode)
    sessionStorage.setItem('qms_user', JSON.stringify(data.userInfo))
  }

  function updateToken(data: LoginResponse) {
    token.value = data.token
    refreshToken.value = data.refreshToken
    sessionStorage.setItem('qms_token', data.token)
    sessionStorage.setItem('qms_refresh_token', data.refreshToken)
  }

  function switchArea(code: PlantCode) {
    if (!user.value) return
    const area = AREAS.find((item) => item.code === code)
    if (!area) return
    user.value.plantCode = code
    user.value.plantName = area.name
    sessionStorage.setItem('qms_region', code)
    sessionStorage.setItem('qms_user', JSON.stringify(user.value))
  }

  function restore(): boolean {
    const savedToken = sessionStorage.getItem('qms_token')
    const savedRefreshToken = sessionStorage.getItem('qms_refresh_token')
    const rawUser = sessionStorage.getItem('qms_user')
    if (!savedToken || !rawUser) return false
    try {
      user.value = JSON.parse(rawUser)
      token.value = savedToken
      refreshToken.value = savedRefreshToken || ''
      return true
    } catch {
      return false
    }
  }

  async function logout() {
    try {
      await logoutApi(refreshToken.value)
    } catch {
      // The local session must be cleared even if the remote logout request fails.
    }
    clearSession()
  }

  function clearSession() {
    user.value = null
    token.value = ''
    refreshToken.value = ''
    sessionStorage.removeItem('qms_token')
    sessionStorage.removeItem('qms_refresh_token')
    sessionStorage.removeItem('qms_region')
    sessionStorage.removeItem('qms_user')
  }

  return {
    user,
    token,
    refreshToken,
    isLogin,
    roleId,
    plantCode,
    allowedModules,
    canSwitchArea,
    isAdmin,
    isQualityManager,
    hasModule,
    setUser,
    updateToken,
    switchArea,
    clearSession,
    restore,
    logout,
  }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo, PlantCode, LoginResponse, ModuleKey } from '@/types'
import { logoutApi } from '@/api/auth'

// ── 静态配置 ──────────────────────────────────────────────

/** 角色配置表（基于 sys_role + sys_user 种子数据） */
export const ROLES: Record<string, { acct: string; name: string; roleName: string; desc: string }> = {
  R00: { acct: 'qms_admin', name: '系统管理员', roleName: '超级管理员', desc: '系统账号与权限管理' },
  R01: { acct: 'sz_op01', name: '张三', roleName: '操作工', desc: '产线操作 · 来料追溯' },
  R02: { acct: 'sz_insp01', name: '李四', roleName: '检验员', desc: '来料追溯 · 首件检验 · 异常整改' },
  R03: { acct: 'sz_lead01', name: '王五', roleName: '班组长', desc: '本组全部模块数据' },
  R04: { acct: 'sz_qe01', name: '赵六', roleName: '质量工程师', desc: '5个模块全部数据' },
  R05: { acct: 'sz_sqe01', name: '钱七', roleName: 'SQE供应商质量', desc: '供应商审核 · 物料变更 · 异常整改' },
  R06: { acct: 'sz_mgr01', name: '孙八', roleName: '质量经理', desc: '深圳和梅州全部模块数据' },
}

/** 账号 → 角色编码 映射（12 个种子账号全覆盖） */
export const ACCT_MAP: Record<string, string> = {
  sz_op01: 'R01', sz_insp01: 'R02', sz_lead01: 'R03',
  sz_qe01: 'R04', sz_sqe01: 'R05', sz_mgr01: 'R06',
  mz_op01: 'R01', mz_insp01: 'R02', mz_lead01: 'R03',
  mz_qe01: 'R04', mz_sqe01: 'R05', mz_mgr01: 'R06',
}

/** 各角色可访问的模块 */
export const ROLE_PERMISSIONS: Record<string, ModuleKey[]> = {
  R00: ['systemAdmin', 'trace', 'incoming', 'exception', 'fai', 'spc', 'productionDefect', 'processTools', 'finishedGoods'],
  R01: ['trace'],
  R02: ['trace', 'incoming', 'fai', 'spc', 'exception', 'productionDefect', 'processTools', 'finishedGoods'],
  R03: ['trace', 'incoming', 'exception', 'fai', 'spc', 'productionDefect', 'processTools', 'finishedGoods'],
  R04: ['trace', 'incoming', 'exception', 'fai', 'spc', 'productionDefect', 'processTools', 'finishedGoods'],
  R05: ['incoming', 'exception', 'finishedGoods'],
  R06: ['trace', 'incoming', 'exception', 'fai', 'spc', 'productionDefect', 'processTools', 'finishedGoods'],
}

/** 分公司列表 */
export const AREAS: { code: PlantCode; name: string }[] = [
  { code: 'SZ', name: '深圳' },
  { code: 'MZ', name: '梅州' },
]

// ── Store ──────────────────────────────────────────────────

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const token = ref<string>('')
  const refreshToken = ref<string>('')

  const isLogin = computed(() => !!user.value && !!token.value)
  const roleId = computed(() => user.value?.roleCode || '')
  const plantCode = computed(() => user.value?.plantCode || 'SZ')

  /** 该用户可访问的模块列表（以 roleCode 匹配，非 userId） */
  const allowedModules = computed<ModuleKey[]>(() => {
    if (!user.value) return []
    return ROLE_PERMISSIONS[user.value.roleCode] || []
  })

  /** 是否可切换分公司（仅 R06 质量经理） */
  const canSwitchArea = computed(() => user.value?.roleCode === 'R06' || user.value?.roleCode === 'R00')

  /** 是否有某模块权限 */
  function hasModule(key: ModuleKey): boolean {
    return allowedModules.value.includes(key)
  }

  /** 设置用户信息（登录成功后调用，传入 LoginResponse） */
  function setUser(data: LoginResponse) {
    user.value = data.userInfo
    token.value = data.token
    refreshToken.value = data.refreshToken
    sessionStorage.setItem('qms_token', data.token)
    sessionStorage.setItem('qms_refresh_token', data.refreshToken)
    sessionStorage.setItem('qms_region', data.userInfo.plantCode)
    sessionStorage.setItem('qms_user', JSON.stringify(data.userInfo))
  }

  /** 更新 Token（刷新 Token 后调用） */
  function updateToken(data: LoginResponse) {
    token.value = data.token
    refreshToken.value = data.refreshToken
    sessionStorage.setItem('qms_token', data.token)
    sessionStorage.setItem('qms_refresh_token', data.refreshToken)
    // userInfo 不变，无需更新 qms_user
  }

  /** 切换分公司（仅前端 UI 状态，不涉及接口） */
  function switchArea(code: PlantCode) {
    if (!user.value) return
    const area = AREAS.find((a) => a.code === code)
    if (!area) return
    user.value.plantCode = code
    user.value.plantName = area.name
    sessionStorage.setItem('qms_region', code)
    sessionStorage.setItem('qms_user', JSON.stringify(user.value))
  }

  /** 从 sessionStorage 恢复登录态 */
  function restore(): boolean {
    const savedToken = sessionStorage.getItem('qms_token')
    const savedRefresh = sessionStorage.getItem('qms_refresh_token')
    const raw = sessionStorage.getItem('qms_user')
    if (savedToken && raw) {
      try {
        user.value = JSON.parse(raw)
        token.value = savedToken
        refreshToken.value = savedRefresh || ''
        return true
      } catch {
        return false
      }
    }
    return false
  }

  /** 退出登录（调后端接口实现双向失效，再清前端状态） */
  async function logout() {
    try {
      await logoutApi(refreshToken.value)
    } catch {
      // 接口失败仍清前端状态，不阻塞登出
    }
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
    hasModule,
    setUser,
    updateToken,
    switchArea,
    restore,
    logout,
  }
})

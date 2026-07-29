import { apiDelete, apiGet, apiPost, apiPut } from './request'
import type { AdminAudit, AdminUser, RolePermission } from '@/types'

export const getAdminUsers = () => apiGet<AdminUser[]>('/admin/users')
export const createAdminUser = (data: Record<string, unknown>) => apiPost<AdminUser>('/admin/users', data)
export const updateAdminUser = (id: number, data: Record<string, unknown>) => apiPut<AdminUser>(`/admin/users/${id}`, data)
export const changeAdminUserStatus = (id: number, enabled: boolean, reason: string) => apiPost<null>(`/admin/users/${id}/${enabled ? 'enable' : 'disable'}`, { reason })
export const unlockAdminUser = (id: number, reason: string) => apiPost<null>(`/admin/users/${id}/unlock`, { reason })
export const resetAdminUserPassword = (id: number, password: string, reason: string) => apiPost<null>(`/admin/users/${id}/reset-password`, { password, reason })
export const getRoles = () => apiGet<RolePermission[]>('/admin/roles')
export const createRole = (data: { roleName: string; description?: string; dataScope: string; permissions: string[]; reason: string }) => apiPost<RolePermission>('/admin/roles', data)
export const updateRolePermissions = (roleCode: string, data: { dataScope: string; permissions: string[]; reason: string; version: number }) => apiPut<RolePermission>(`/admin/roles/${roleCode}/permissions`, data)
export const deleteRole = (roleCode: string, reason: string) => apiDelete<null>(`/admin/roles/${roleCode}`, { data: { reason } })
export const getAdminAudit = () => apiGet<AdminAudit[]>('/admin/audit')

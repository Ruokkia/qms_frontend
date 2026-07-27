<template>
  <div class="admin-page">
    <div class="page-header">
      <div><h2>系统管理</h2><p>账号、角色权限与系统建设路线图</p></div>
      <el-tag type="danger">R00 超级管理员</el-tag>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="建设路线图" name="roadmap">
        <div class="roadmap-grid">
          <el-card><template #header><b>第一期实现</b></template><el-timeline><el-timeline-item v-for="item in phaseOne" :key="item" type="success">{{ item }}</el-timeline-item></el-timeline></el-card>
          <el-card><template #header><b>第二期待实现</b></template><el-timeline><el-timeline-item v-for="item in phaseTwo" :key="item" type="info" hollow>{{ item }}</el-timeline-item></el-timeline></el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="账号管理" name="users">
        <div class="toolbar"><el-button type="primary" @click="openCreate">新增账号</el-button><el-button @click="loadUsers">刷新</el-button></div>
        <el-table :data="users" v-loading="loadingUsers" border>
          <el-table-column prop="account" label="账号" min-width="130" /><el-table-column prop="realName" label="姓名" min-width="100" />
          <el-table-column label="角色" min-width="130"><template #default="{ row }">{{ roleName(row.roleCode) }}</template></el-table-column>
          <el-table-column prop="plantName" label="分公司" width="100" /><el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag></template></el-table-column>
          <el-table-column prop="lastLoginAt" label="最后登录" min-width="170" />
          <el-table-column label="操作" min-width="220"><template #default="{ row }"><el-button link type="primary" @click="editUser(row)">编辑</el-button><el-button link :type="row.status === 1 ? 'danger' : 'success'" @click="toggleStatus(row)">{{ row.status === 1 ? '停用' : '启用' }}</el-button><el-button link @click="unlock(row)">解锁</el-button><el-button link @click="resetPassword(row)">重置密码</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="角色权限" name="roles">
        <p class="page-tip">页面仅展示业务名称和说明；系统编码仍由程序保留，不需要管理员记忆或填写。</p>
        <el-table :data="roles" v-loading="loadingRoles" border>
          <el-table-column prop="roleName" label="角色" width="160" />
          <el-table-column label="数据范围" min-width="220"><template #default="{ row }"><b>{{ dataScopeName(row) }}</b><div class="field-description">{{ dataScopeDescription(row) }}</div></template></el-table-column>
          <el-table-column label="可执行操作" min-width="360"><template #default="{ row }"><el-tooltip v-for="permission in permissionDetails(row)" :key="permission.code" :content="permission.description" placement="top"><el-tag class="permission-tag">{{ permission.name }}</el-tag></el-tooltip></template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button link type="primary" @click="editRole(row)">配置</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="管理审计" name="audit"><el-table :data="audits" v-loading="loadingAudit" border><el-table-column prop="operationTime" label="时间" min-width="170" /><el-table-column prop="operationType" label="操作" min-width="150" /><el-table-column prop="operatorName" label="操作者" width="120" /><el-table-column prop="afterData" label="目标/摘要" min-width="180" /><el-table-column prop="reason" label="原因" min-width="160" /><el-table-column prop="ipAddress" label="IP" width="130" /></el-table></el-tab-pane>
    </el-tabs>

    <el-dialog v-model="userDialog" :title="editingId ? '编辑账号' : '新增账号'" width="520px"><el-form :model="form" label-width="90px"><el-form-item label="账号"><el-input v-model="form.account" :disabled="!!editingId" /></el-form-item><el-form-item label="姓名"><el-input v-model="form.realName" /></el-form-item><el-form-item label="角色"><el-select v-model="form.roleCode" style="width: 100%"><el-option v-for="role in roles" :key="role.roleCode" :label="role.roleName" :value="role.roleCode" /></el-select></el-form-item><el-form-item label="分公司"><el-select v-model="form.plantCode" style="width: 100%"><el-option label="深圳" value="SZ" /><el-option label="梅州" value="MZ" /></el-select></el-form-item><el-form-item v-if="!editingId" label="初始密码"><el-input v-model="form.password" show-password /></el-form-item><el-form-item label="操作原因"><el-input v-model="form.reason" type="textarea" /></el-form-item></el-form><template #footer><el-button @click="userDialog = false">取消</el-button><el-button type="primary" @click="saveUser">保存</el-button></template></el-dialog>

    <el-dialog v-model="roleDialog" title="配置角色权限" width="720px">
      <el-form label-width="110px"><el-form-item label="角色">{{ roleName(roleForm.roleCode) }}</el-form-item>
        <el-form-item label="数据范围"><el-radio-group v-model="roleForm.dataScope" class="scope-options"><el-radio label="OWN_PLANT"><b>本分公司数据</b><span>只能访问该用户所属分公司的数据</span></el-radio><el-radio label="ALL_PLANTS"><b>全部分公司数据</b><span>可切换并访问深圳、梅州的数据</span></el-radio></el-radio-group></el-form-item>
        <el-form-item label="可执行操作"><el-checkbox-group v-model="roleForm.permissions" class="permission-options"><el-checkbox v-for="item in permissionOptions" :key="item.code" :label="item.code"><b>{{ item.name }}</b><span>{{ item.description }}</span></el-checkbox></el-checkbox-group></el-form-item>
        <el-form-item label="操作原因"><el-input v-model="roleForm.reason" type="textarea" /></el-form-item>
      </el-form><template #footer><el-button @click="roleDialog = false">取消</el-button><el-button type="primary" @click="saveRole">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { changeAdminUserStatus, createAdminUser, getAdminAudit, getAdminUsers, getRoles, resetAdminUserPassword, unlockAdminUser, updateAdminUser, updateRolePermissions } from '@/api/admin'
import type { AdminAudit, AdminUser, PermissionDisplay, RolePermission } from '@/types'

const activeTab = ref('roadmap')
const users = ref<AdminUser[]>([])
const roles = ref<RolePermission[]>([])
const audits = ref<AdminAudit[]>([])
const loadingUsers = ref(false)
const loadingRoles = ref(false)
const loadingAudit = ref(false)
const userDialog = ref(false)
const roleDialog = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ account: '', realName: '', roleCode: 'R01', plantCode: 'SZ', password: '', reason: '' })
const roleForm = reactive({ roleCode: '', dataScope: 'OWN_PLANT', permissions: [] as string[], reason: '' })

const permissionOptions = [
  ['systemAdmin:VIEW', '系统管理 · 查看', '查看账号、角色和管理审计记录'], ['systemAdmin:EDIT', '系统管理 · 配置', '新增账号、重置密码和调整角色权限'],
  ['trace:VIEW', '追溯管理 · 查看', '查看追溯记录'], ['trace:EDIT', '追溯管理 · 维护', '新增或修改追溯记录'],
  ['incoming:VIEW', '来料检验 · 查看', '查看来料和物料检验记录'], ['incoming:EDIT', '来料检验 · 维护', '录入或修改来料和物料检验记录'],
  ['exception:VIEW', '异常管理 · 查看', '查看质量异常及升级信息'], ['exception:EDIT', '异常管理 · 维护', '创建或处理质量异常'], ['exception:APPROVE', '异常管理 · 审批', '审批异常处理结果'],
  ['fai:VIEW', '首件检验 · 查看', '查看首件检验记录'], ['fai:EDIT', '首件检验 · 维护', '录入或修改首件检验记录'],
  ['spc:VIEW', 'SPC · 查看', '查看过程统计分析'], ['spc:EDIT', 'SPC · 维护', '维护过程统计分析数据'],
  ['productionDefect:VIEW', '生产不良 · 查看', '查看生产不良和返修信息'], ['productionDefect:EDIT', '生产不良 · 维护', '维护生产不良和返修信息'],
  ['finishedGoods:VIEW', '成品管理 · 查看', '查看成品检验记录'], ['finishedGoods:EDIT', '成品管理 · 维护', '维护成品检验记录'],
  ['supplier:VIEW', '供应商管理 · 查看', '查看供应商信息'], ['material:VIEW', '物料管理 · 查看', '查看物料及绑定关系'], ['notification:VIEW', '通知中心 · 查看', '查看系统通知']
].map(([code, name, description]) => ({ code, name, description }))

const permissionMap = Object.fromEntries(permissionOptions.map(item => [item.code, item]))
const phaseOne = ['R00 实名超级管理员', '账号创建、启停、解锁与密码重置', '角色-模块-操作级权限', '分公司数据范围', '权限变更后会话立即失效', '敏感操作审计']
const phaseTwo = ['首次登录改密', 'MFA 多因素认证', '会话设备管理', 'LDAP/AD/SSO 对接', 'Excel 批量导入', '双人审批', '单用户例外及按钮/字段级权限']

function roleName(code: string) { return roles.value.find(role => role.roleCode === code)?.roleName || code }
function dataScopeName(role: RolePermission) { return role.dataScopeName || (role.dataScope === 'ALL_PLANTS' ? '全部分公司数据' : '本分公司数据') }
function dataScopeDescription(role: RolePermission) { return role.dataScopeDescription || (role.dataScope === 'ALL_PLANTS' ? '可切换并访问深圳、梅州的数据' : '只能访问用户所属分公司的数据') }
function permissionDetails(role: RolePermission): PermissionDisplay[] { return role.permissionDetails?.length ? role.permissionDetails : role.permissions.map(code => permissionMap[code] || { code, name: '未定义权限', description: '该权限尚未配置中文说明，请联系系统维护人员。' }) }

async function loadUsers() { loadingUsers.value = true; try { const res = await getAdminUsers(); users.value = res.data || [] } finally { loadingUsers.value = false } }
async function loadRoles() { loadingRoles.value = true; try { const res = await getRoles(); roles.value = res.data || [] } finally { loadingRoles.value = false } }
async function loadAudit() { loadingAudit.value = true; try { const res = await getAdminAudit(); audits.value = res.data || [] } finally { loadingAudit.value = false } }
function openCreate() { editingId.value = null; Object.assign(form, { account: '', realName: '', roleCode: 'R01', plantCode: 'SZ', password: '', reason: '' }); userDialog.value = true }
function editUser(user: AdminUser) { editingId.value = user.id; Object.assign(form, { account: user.account, realName: user.realName, roleCode: user.roleCode, plantCode: user.plantCode, password: '', reason: '' }); userDialog.value = true }
async function saveUser() { if (!form.reason.trim()) return ElMessage.warning('请填写操作原因'); const payload = { ...form }; if (editingId.value) await updateAdminUser(editingId.value, payload); else await createAdminUser(payload); ElMessage.success('已保存'); userDialog.value = false; loadUsers() }
async function toggleStatus(user: AdminUser) { const reason = await askReason(user.status === 1 ? '停用账号' : '启用账号'); if (reason) { await changeAdminUserStatus(user.id, user.status !== 1, reason); ElMessage.success('状态已更新'); loadUsers() } }
async function unlock(user: AdminUser) { const reason = await askReason('解锁账号'); if (reason) { await unlockAdminUser(user.id, reason); ElMessage.success('账号已解锁') } }
async function resetPassword(user: AdminUser) { const { value } = await ElMessageBox.prompt(`为 ${user.account} 设置新密码`, '重置密码', { inputType: 'password', inputPattern: /^.{6,}$/, inputErrorMessage: '密码至少 6 位' }); const reason = await askReason('重置密码'); if (reason) { await resetAdminUserPassword(user.id, value, reason); ElMessage.success('密码已重置，旧会话已失效') } }
function editRole(role: RolePermission) { Object.assign(roleForm, { roleCode: role.roleCode, dataScope: role.dataScope, permissions: [...role.permissions], reason: '' }); roleDialog.value = true }
async function saveRole() { if (!roleForm.reason.trim()) return ElMessage.warning('请填写操作原因'); await updateRolePermissions(roleForm.roleCode, { dataScope: roleForm.dataScope, permissions: roleForm.permissions, reason: roleForm.reason }); ElMessage.success('权限已更新，相关用户需重新登录'); roleDialog.value = false; loadRoles(); loadAudit() }
async function askReason(title: string): Promise<string | null> { try { const { value } = await ElMessageBox.prompt('请填写操作原因', title, { inputPattern: /\S+/, inputErrorMessage: '操作原因不能为空' }); return value } catch { return null } }
onMounted(() => { loadUsers(); loadRoles(); loadAudit() })
</script>

<style scoped>
.admin-page{padding:24px}.page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.page-header h2{margin:0;color:#1f2937}.page-header p,.page-tip{color:#6b7280;margin:8px 0 14px}.roadmap-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.toolbar{margin-bottom:14px;display:flex;gap:10px}.permission-tag{margin:2px}.field-description{margin-top:4px;color:#64748b;font-size:12px;line-height:18px}.scope-options,.permission-options{display:grid;gap:10px;width:100%}.scope-options :deep(.el-radio),.permission-options :deep(.el-checkbox){height:auto;margin-right:0;align-items:flex-start;white-space:normal}.scope-options b,.permission-options b{display:block;color:#1f2937}.scope-options span,.permission-options span{display:block;color:#64748b;font-size:12px;line-height:18px;margin-top:2px}@media(max-width:900px){.roadmap-grid{grid-template-columns:1fr}}
</style>

<template>
  <div class="admin-page">
    <header class="page-header">
      <div>
        <h1>系统管理</h1>
        <p>账号、角色权限与操作审计 · {{ auth.user?.plantName || '当前分公司' }}</p>
      </div>
    </header>

    <el-tabs v-model="activeTab" class="admin-tabs">
      <!-- 账号管理 -->
      <el-tab-pane label="账号管理" name="users">
        <div class="toolbar">
          <el-input v-model="userKeyword" clearable placeholder="账号 / 姓名" class="kw" @input="filterUsers" />
          <el-select v-model="userRoleFilter" clearable placeholder="全部角色" class="role-filter" @change="filterUsers">
            <el-option v-for="r in roleOptions" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
          <el-button type="primary" @click="openCreate">新建账号</el-button>
        </div>

        <el-table :data="visibleUsers" v-loading="usersLoading" class="data-table">
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="account" label="账号" min-width="120" />
          <el-table-column prop="realName" label="姓名" min-width="100" />
          <el-table-column label="角色" min-width="110">
            <template #default="{ row }">{{ roleName(row.roleCode) }}</template>
          </el-table-column>
          <el-table-column prop="plantName" label="分公司" min-width="100" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lastLoginAt" label="最近登录" min-width="160" show-overflow-tooltip />
          <el-table-column label="操作" width="270" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button v-if="row.status === 1" link type="warning" @click="disableUser(row)">停用</el-button>
              <el-button v-else link type="success" @click="enableUser(row)">启用</el-button>
              <el-button link type="warning" @click="unlockUser(row)">解锁</el-button>
              <el-button link type="danger" @click="resetPassword(row)">重置密码</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 角色权限 -->
      <el-tab-pane label="角色权限" name="roles">
        <el-table :data="roles" v-loading="rolesLoading" class="data-table">
          <el-table-column prop="roleCode" label="角色编码" width="110" />
          <el-table-column prop="roleName" label="角色名称" min-width="120" />
          <el-table-column label="数据范围" min-width="140">
            <template #default="{ row }">{{ row.dataScopeName || (row.dataScope === 'ALL_PLANTS' ? '全部分公司' : '本分公司') }}</template>
          </el-table-column>
          <el-table-column label="已授权操作" min-width="320">
            <template #default="{ row }">
              <el-tag v-for="permission in permissionDisplayNames(row.permissions)" :key="permission" type="info" class="permission-tag">{{ permission }}</el-tag>
              <span v-if="row.permissions.length === 0">暂无</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openRoleEdit(row)">编辑权限</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 菜单权限：系统管理属于固定的高风险菜单，授权规则由后端强制校验。 -->
      <el-tab-pane label="菜单权限" name="menus">
        <el-alert
          title="由超级管理员（R00）和质量经理（R06）为各角色配置可见菜单；系统管理菜单固定仅授予 R00、R06，且拥有全部系统管理权限。"
          type="info"
          :closable="false"
          show-icon
          class="menu-permission-tip"
        />
        <el-table :data="roles" v-loading="rolesLoading" class="data-table">
          <el-table-column prop="roleCode" label="角色编码" width="110" />
          <el-table-column prop="roleName" label="角色名称" min-width="140" />
          <el-table-column label="可见菜单" min-width="360">
            <template #default="{ row }">
              <el-tag v-for="module in visibleMenuNames(row.permissions)" :key="module" class="role-tag">{{ module }}</el-tag>
              <span v-if="visibleMenuNames(row.permissions).length === 0">暂无</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openMenuEdit(row)">配置菜单</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 审计日志 -->
      <el-tab-pane label="审计日志" name="audit">
        <el-table :data="audits" v-loading="auditLoading" class="data-table">
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="operationType" label="操作类型" min-width="120" />
          <el-table-column prop="operatorName" label="操作人" min-width="100" />
          <el-table-column prop="ipAddress" label="IP 地址" min-width="130" />
          <el-table-column prop="operationTime" label="操作时间" min-width="170" show-overflow-tooltip />
          <el-table-column prop="reason" label="原因" min-width="160" show-overflow-tooltip />
          <el-table-column prop="afterData" label="变更内容" min-width="220" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="menuDialogVisible" :title="`配置菜单 - ${editingMenuRole?.roleName || ''}`" width="620" @closed="resetMenuForm">
      <el-checkbox-group v-model="menuForm.modules" class="menu-checkboxes">
        <el-checkbox v-for="menu in menuOptions" :key="menu.code" :label="menu.code" :disabled="menu.code === 'systemAdmin' && !systemAdminRoles.includes(editingMenuRole?.roleCode || '')">
          {{ menu.name }}
        </el-checkbox>
      </el-checkbox-group>
      <p class="menu-form-note">取消某个菜单会同时取消该角色在该菜单内的操作权限；保存后该角色需要重新登录才能加载新菜单。</p>
      <template #footer>
        <el-button @click="menuDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="menuSaving" @click="saveMenuPermissions">保存</el-button>
      </template>
    </el-dialog>

    <!-- 账号新建/编辑 -->
    <el-dialog v-model="userDialogVisible" :title="editingUser ? '编辑账号' : '新建账号'" width="520" @closed="resetUserForm">
      <el-form :model="userForm" label-width="80px">
        <el-form-item label="账号">
          <el-input v-model="userForm.account" :disabled="!!editingUser" placeholder="登录账号" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="userForm.realName" placeholder="真实姓名" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.roleCode" placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in roleOptions" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="分公司">
          <el-select v-model="userForm.plantCode" placeholder="选择分公司" style="width: 100%">
            <el-option label="深圳 (SZ)" value="SZ" />
            <el-option label="梅州 (MZ)" value="MZ" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!editingUser" label="初始密码">
          <el-input v-model="userForm.password" placeholder="不填则使用默认密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="userSaving" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>

    <!-- 角色权限编辑 -->
    <el-dialog v-model="roleDialogVisible" :title="`编辑权限 - ${editingRole?.roleName || ''}`" width="520" @closed="resetRoleForm">
      <el-form label-width="90px">
        <el-form-item label="数据范围">
          <el-radio-group v-model="roleForm.dataScope">
            <el-radio label="OWN_PLANT">本分公司</el-radio>
            <el-radio label="ALL_PLANTS">全部分公司</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="操作权限">
          <el-checkbox-group v-model="roleForm.permissions">
            <el-checkbox v-for="p in permissionOptions" :key="p.code" :label="p.code">{{ p.name }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="roleSaving" @click="saveRole">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  changeAdminUserStatus,
  unlockAdminUser,
  resetAdminUserPassword,
  getRoles,
  updateRolePermissions,
  getAdminAudit,
} from '@/api/admin'
import type { AdminUser, RolePermission, AdminAudit } from '@/types'

const auth = useAuthStore()
const router = useRouter()
const activeTab = ref<'users' | 'roles' | 'audit'>('users')

const roleOptions = [
  { code: 'R00', name: '超级管理员' },
  { code: 'R01', name: '操作工' },
  { code: 'R02', name: '检验员' },
  { code: 'R03', name: '班组长' },
  { code: 'R04', name: '质量工程师' },
  { code: 'R05', name: 'SQE' },
  { code: 'R06', name: '质量经理' },
]
const actionOptions = [
  { code: 'VIEW', name: '查看' },
  { code: 'EDIT', name: '维护' },
  { code: 'APPROVE', name: '审核' },
  { code: 'EXPORT', name: '导出' },
]
const systemAdminRoles = ['R00', 'R06']
const menuOptions = [
  { code: 'systemAdmin', name: '系统管理' },
  { code: 'trace', name: '来料追溯' },
  { code: 'incoming', name: '来料数据管理' },
  { code: 'finishedGoods', name: '成品数据管理' },
  { code: 'exception', name: '异常管理与整改' },
  { code: 'fai', name: '首件检验' },
  { code: 'spc', name: 'SPC 过程能力分析' },
  { code: 'productionDefect', name: '不良信息管理' },
  { code: 'processTools', name: '过程工具' },
]
const permissionModuleOptions = [
  ...menuOptions,
  { code: 'supplier', name: '供应商管理' },
  { code: 'material', name: '物料变更' },
  { code: 'notification', name: '系统通知' },
]
const permissionOptions = permissionModuleOptions.flatMap((module) =>
  actionOptions.map((action) => ({
    code: `${module.code}:${action.code}`,
    name: `${module.name} · ${action.name}`,
  })),
)
function roleName(code: string) {
  return roleOptions.find((r) => r.code === code)?.name || code
}

// ── 账号管理 ──
const users = ref<AdminUser[]>([])
const usersLoading = ref(false)
const userKeyword = ref('')
const userRoleFilter = ref('')
const visibleUsers = computed(() =>
  users.value.filter((u) => {
    const kw = userKeyword.value.trim().toLowerCase()
    if (kw && !`${u.account} ${u.realName}`.toLowerCase().includes(kw)) return false
    if (userRoleFilter.value && u.roleCode !== userRoleFilter.value) return false
    return true
  }),
)
function filterUsers() {
  /* 由 computed 实时过滤 */
}

const userDialogVisible = ref(false)
const userSaving = ref(false)
const editingUser = ref<AdminUser | null>(null)
const userForm = reactive<Record<string, unknown>>({
  account: '',
  realName: '',
  roleCode: '',
  plantCode: '',
  password: '',
})
function resetUserForm() {
  Object.assign(userForm, { account: '', realName: '', roleCode: '', plantCode: '', password: '' })
  editingUser.value = null
}
function openCreate() {
  resetUserForm()
  userDialogVisible.value = true
}
function openEdit(row: AdminUser) {
  editingUser.value = row
  Object.assign(userForm, {
    account: row.account,
    realName: row.realName,
    roleCode: row.roleCode,
    plantCode: row.plantCode,
    password: '',
  })
  userDialogVisible.value = true
}
async function saveUser() {
  userSaving.value = true
  try {
    const payload: Record<string, unknown> = {
      account: userForm.account,
      realName: userForm.realName,
      roleCode: userForm.roleCode,
      plantCode: userForm.plantCode,
    }
    if (!editingUser.value && userForm.password) payload.password = userForm.password
    if (editingUser.value) {
      await updateAdminUser(editingUser.value.id, payload)
    } else {
      await createAdminUser(payload)
    }
    ElMessage.success('保存成功')
    userDialogVisible.value = false
    await loadUsers()
  } finally {
    userSaving.value = false
  }
}
async function enableUser(row: AdminUser) {
  const { value: reason } = await ElMessageBox.prompt('启用原因', '启用账号', { inputType: 'textarea' })
  await changeAdminUserStatus(row.id, true, reason || '')
  ElMessage.success('已启用')
  await loadUsers()
}
async function disableUser(row: AdminUser) {
  const { value: reason } = await ElMessageBox.prompt('停用原因', '停用账号', { inputType: 'textarea' })
  await changeAdminUserStatus(row.id, false, reason || '')
  ElMessage.success('已停用')
  await loadUsers()
}
async function unlockUser(row: AdminUser) {
  const { value: reason } = await ElMessageBox.prompt('解锁原因', '解锁账号', { inputType: 'textarea' })
  await unlockAdminUser(row.id, reason || '')
  ElMessage.success('已解锁')
  await loadUsers()
}
async function resetPassword(row: AdminUser) {
  const { value: password } = await ElMessageBox.prompt('请输入新密码', '重置密码', { inputType: 'password' })
  if (!password) return
  const { value: reason } = await ElMessageBox.prompt('操作原因', '重置密码', { inputType: 'textarea' })
  await resetAdminUserPassword(row.id, password, reason || '')
  ElMessage.success('密码已重置')
}
async function loadUsers() {
  usersLoading.value = true
  try {
    const res = await getAdminUsers()
    users.value = res.data || []
  } finally {
    usersLoading.value = false
  }
}

// ── 角色权限 ──
const roles = ref<RolePermission[]>([])
const rolesLoading = ref(false)
const roleDialogVisible = ref(false)
const roleSaving = ref(false)
const editingRole = ref<RolePermission | null>(null)
const roleForm = reactive<{ dataScope: string; permissions: string[] }>({ dataScope: 'OWN_PLANT', permissions: [] })
const menuDialogVisible = ref(false)
const menuSaving = ref(false)
const editingMenuRole = ref<RolePermission | null>(null)
const menuForm = reactive<{ modules: string[] }>({ modules: [] })
function visibleMenuNames(permissions: string[]) {
  const enabled = new Set(permissions.map((permission) => permission.split(':', 1)[0]))
  return menuOptions.filter((menu) => enabled.has(menu.code)).map((menu) => menu.name)
}
function permissionDisplayNames(permissions: string[]) {
  return permissions.map((permission) => {
    const [moduleCode, actionCode] = permission.split(':', 2)
    const moduleName = permissionModuleOptions.find((module) => module.code === moduleCode)?.name || moduleCode
    const actionName = actionOptions.find((action) => action.code === actionCode)?.name || actionCode
    return `${moduleName} · ${actionName}`
  })
}
function resetMenuForm() {
  editingMenuRole.value = null
  menuForm.modules = []
}
function openMenuEdit(role: RolePermission) {
  editingMenuRole.value = role
  menuForm.modules = menuOptions.filter((menu) => role.permissions.some((permission) => permission.startsWith(`${menu.code}:`))).map((menu) => menu.code)
  menuDialogVisible.value = true
}
async function saveMenuPermissions() {
  if (!editingMenuRole.value) return
  menuSaving.value = true
  try {
    const selected = new Set(menuForm.modules)
    const menuCodes = new Set(menuOptions.map((menu) => menu.code))
    const permissions = editingMenuRole.value.permissions.filter((permission) => !menuCodes.has(permission.split(':', 1)[0]) || selected.has(permission.split(':', 1)[0]))
    for (const module of selected) {
      if (!permissions.some((permission) => permission.startsWith(`${module}:`))) permissions.push(`${module}:VIEW`)
    }
    await updateRolePermissions(editingMenuRole.value.roleCode, {
      dataScope: editingMenuRole.value.dataScope,
      permissions,
      reason: '调整角色菜单权限',
      version: editingMenuRole.value.version,
    })
    if (await endSessionAfterOwnRoleUpdate(editingMenuRole.value.roleCode)) return
    ElMessage.success('菜单权限已更新，角色重新登录后生效')
    menuDialogVisible.value = false
    await loadRoles()
  } finally {
    menuSaving.value = false
  }
}
function resetRoleForm() {
  roleForm.dataScope = 'OWN_PLANT'
  roleForm.permissions = []
  editingRole.value = null
}
function openRoleEdit(row: RolePermission) {
  editingRole.value = row
  roleForm.dataScope = row.dataScope || 'OWN_PLANT'
  roleForm.permissions = [...(row.permissions || [])]
  roleDialogVisible.value = true
}
async function endSessionAfterOwnRoleUpdate(roleCode: string) {
  if (auth.roleId !== roleCode) return false
  auth.clearSession()
  ElMessage.warning('自身角色权限已更新，请重新登录后继续操作')
  await router.replace('/login')
  return true
}
async function saveRole() {
  if (!editingRole.value) return
  roleSaving.value = true
  try {
    await updateRolePermissions(editingRole.value.roleCode, {
      dataScope: roleForm.dataScope,
      permissions: roleForm.permissions,
      reason: '系统管理后台调整',
      version: editingRole.value.version,
    })
    if (await endSessionAfterOwnRoleUpdate(editingRole.value.roleCode)) return
    ElMessage.success('权限已更新')
    roleDialogVisible.value = false
    await loadRoles()
  } finally {
    roleSaving.value = false
  }
}
async function loadRoles() {
  rolesLoading.value = true
  try {
    const res = await getRoles()
    roles.value = res.data || []
  } finally {
    rolesLoading.value = false
  }
}

// ── 审计日志 ──
const audits = ref<AdminAudit[]>([])
const auditLoading = ref(false)
async function loadAudit() {
  auditLoading.value = true
  try {
    const res = await getAdminAudit()
    audits.value = res.data || []
  } finally {
    auditLoading.value = false
  }
}

onMounted(() => {
  loadUsers()
  loadRoles()
  loadAudit()
})
</script>

<style scoped>
.admin-page {
  padding: 16px 20px 28px;
}
.page-header {
  margin-bottom: 14px;
}
.page-header h1 {
  margin: 0;
  font-size: 20px;
}
.page-header p {
  margin: 4px 0 0;
  color: #909399;
  font-size: 13px;
}
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.toolbar .kw {
  width: 220px;
}
.toolbar .role-filter {
  width: 160px;
}
.data-table {
  width: 100%;
}
.menu-permission-tip {
  margin-bottom: 14px;
}
.role-tag,
.permission-tag {
  margin-right: 8px;
}
.menu-checkboxes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.menu-form-note {
  margin: 18px 0 0;
  color: #909399;
  font-size: 13px;
}
</style>

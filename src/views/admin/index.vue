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
            <el-option v-for="r in roleChoices" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
          <el-select v-model="userStatusFilter" clearable placeholder="全部状态" class="status-filter">
            <el-option label="使用中" :value="1" />
            <el-option label="已停用" :value="0" />
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
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '使用中' : '已停用' }}</el-tag>
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
        <div class="toolbar role-toolbar">
          <el-button type="primary" @click="openRoleCreate">添加角色</el-button>
        </div>
        <el-table :data="roles" v-loading="rolesLoading" class="data-table">
          <el-table-column prop="roleCode" label="角色编码" width="110" />
          <el-table-column prop="roleName" label="角色名称" min-width="120" />
          <el-table-column label="数据范围" min-width="140">
            <template #default="{ row }">{{ row.dataScopeName || (row.dataScope === 'ALL_PLANTS' ? '全部分公司' : '本分公司') }}</template>
          </el-table-column>
          <el-table-column label="已授权模块" min-width="150">
            <template #default="{ row }">
              <el-tag v-if="permissionModuleCount(row.permissions) > 0" type="info">{{ permissionModuleCount(row.permissions) }} 个模块</el-tag>
              <span v-else>暂无授权</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openPermissionDetail(row)">权限详情</el-button>
              <el-button v-if="!isSuperAdminRole(row)" link type="primary" @click="openRoleEdit(row)">编辑权限</el-button>
              <el-tag v-else type="warning" size="small">权限锁定</el-tag>
              <el-tooltip :content="isBuiltInRole(row.roleCode) ? 'R00 超级管理员角色不能删除' : '删除角色'" placement="top">
                <span>
                  <el-button link type="danger" :disabled="isBuiltInRole(row.roleCode)" @click="removeRole(row)">删除角色</el-button>
                </span>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 通知配置 -->
      <el-tab-pane label="通知配置" name="notificationConfig">
        <el-table :data="notificationConfigs" v-loading="notificationConfigLoading" class="data-table">
          <el-table-column label="所属菜单" width="180">
            <template #default="{ row }">{{ notificationMenuName(row.scenarioCode) }}</template>
          </el-table-column>
          <el-table-column prop="scenarioName" label="场景名称" width="200" />
          <el-table-column label="接收角色" min-width="180">
            <template #default="{ row }">
              <el-button v-if="notificationRoleSummary(row.roleCodes) !== '—'" link type="primary" @click="openNotificationRoleDrawer('接收角色', row.roleCodes)">
                {{ notificationRoleSummary(row.roleCodes) }}
              </el-button>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="严重追加角色" min-width="180">
            <template #default="{ row }">
              <el-button v-if="row.scenarioCode === 'EXCEPTION_CREATED' && notificationRoleSummary(row.severityExtraRoles) !== '—'" link type="primary" @click="openNotificationRoleDrawer('严重追加角色', row.severityExtraRoles)">
                {{ notificationRoleSummary(row.severityExtraRoles) }}
              </el-button>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.enabled === 1 ? 'success' : 'info'" size="small">{{ row.enabled === 1 ? '启用' : '禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button type="primary" link @click="openNotificationConfigDialog(row)">编辑</el-button>
              <el-button :type="row.enabled === 1 ? 'warning' : 'success'" link :loading="notificationConfigStatusChanging === row.id" @click="changeNotificationConfigStatus(row)">
                {{ row.enabled === 1 ? '停用' : '启用' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 审批配置 -->
      <el-tab-pane label="审批配置" name="approval">
        <div class="approval-toolbar">
          <el-radio-group v-model="approvalFlow" @change="onFlowChange">
            <el-radio-button value="8D">8D 流程</el-radio-button>
            <el-radio-button value="CAPA">CAPA 流程</el-radio-button>
          </el-radio-group>
          <el-button type="primary" @click="openConfigCreate">新增配置</el-button>
        </div>
        <p class="config-hint">配置各阶段是否需要审批及审批角色，按当前分公司隔离（{{ auth.user?.plantName || '当前分公司' }}）。</p>
        <el-table :data="approvalConfigs" v-loading="approvalLoading" class="data-table">
          <el-table-column prop="stage" label="阶段" width="100" />
          <el-table-column prop="stageName" label="阶段名称" min-width="160" />
          <el-table-column label="需要审批" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.needApproval === 1 ? 'success' : 'info'" size="small">{{ row.needApproval === 1 ? '需要' : '不需要' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="审批角色" min-width="200">
            <template #default="{ row }">{{ approverRoleLabel(row.approverRole) }}</template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="更新时间" min-width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openConfigEdit(row)">编辑</el-button>
              <el-button link type="danger" :loading="configDeleting === row.id" @click="removeConfig(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-dialog v-model="configDialogVisible" :title="editingConfig ? '编辑审批配置' : '新增审批配置'" width="520px" @closed="resetConfigForm">
          <el-form ref="configFormRef" :model="configForm" :rules="configFormRules" label-width="90px">
            <el-form-item label="流程" prop="processFlow">
              <el-input :model-value="approvalFlow" disabled />
            </el-form-item>
            <el-form-item label="阶段" prop="stage">
              <el-select v-model="configForm.stage" placeholder="选择阶段" style="width: 100%" :disabled="!!editingConfig" @change="onStageChange">
                <el-option v-for="s in currentStageOptions" :key="s.value" :label="s.label" :value="s.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="阶段名称" prop="stageName">
              <el-input v-model="configForm.stageName" placeholder="阶段名称" maxlength="50" />
            </el-form-item>
            <el-form-item label="需要审批" prop="needApproval">
              <el-switch v-model="configForm.needApproval" :active-value="1" :inactive-value="0" active-text="需要" inactive-text="不需要" />
            </el-form-item>
            <el-form-item label="审批角色" prop="approverRole">
              <el-select v-model="configForm.approverRole" multiple placeholder="选择审批角色" style="width: 100%" :disabled="configForm.needApproval !== 1">
                <el-option v-for="role in roleOptions" :key="role.code" :label="role.name" :value="role.code" />
              </el-select>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="configDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="configSaving" @click="saveConfig">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- 审计日志 -->
      <el-tab-pane label="审计日志" name="audit">
        <el-table :data="audits" v-loading="auditLoading" class="data-table">
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column label="操作类型" min-width="120">
            <template #default="{ row }">{{ auditOperationName(row.operationType) }}</template>
          </el-table-column>
          <el-table-column prop="operatorName" label="操作人" min-width="100" />
          <el-table-column prop="ipAddress" label="IP 地址" min-width="130" />
          <el-table-column prop="operationTime" label="操作时间" min-width="170" show-overflow-tooltip />
          <el-table-column prop="reason" label="原因" min-width="160" show-overflow-tooltip />
          <el-table-column prop="afterData" label="变更内容" min-width="220" show-overflow-tooltip />
        </el-table>
        <el-pagination
          v-if="auditTotal > auditPageSize"
          v-model:current-page="auditPage"
          :page-size="auditPageSize"
          :total="auditTotal"
          layout="total, prev, pager, next"
          class="audit-pagination"
          @current-change="loadAudit"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 通知配置编辑 -->
    <el-dialog v-model="notificationConfigDialogVisible" :title="'编辑通知配置 - ' + (editingNotificationConfig?.scenarioName || '')" width="560px" @closed="resetNotificationConfigForm">
      <el-form label-width="110px">
        <el-form-item label="场景名称">
          <el-input :model-value="editingNotificationConfig?.scenarioName" disabled />
        </el-form-item>
        <el-form-item label="接收角色">
          <el-checkbox-group v-model="notificationConfigForm.roleCodes">
            <el-checkbox v-for="role in roleChoices" :key="role.code" :label="role.code">{{ role.name }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item v-if="editingNotificationConfig?.scenarioCode === 'EXCEPTION_CREATED'" label="严重追加角色">
          <el-checkbox-group v-model="notificationConfigForm.severityExtraRoles">
            <el-checkbox v-for="role in roleChoices" :key="role.code" :label="role.code">{{ role.name }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="notificationConfigForm.enabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="修改原因" required>
          <el-input v-model="notificationConfigForm.reason" type="textarea" placeholder="请输入修改原因（记录到审计日志）" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="notificationConfigDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="notificationConfigSaving" @click="saveNotificationConfig">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="notificationRoleDrawerVisible" :title="notificationRoleDrawerTitle" size="360px">
      <el-empty v-if="notificationRoleDrawerRoles.length === 0" description="暂无配置角色" />
      <el-descriptions v-else :column="1" border>
        <el-descriptions-item v-for="role in notificationRoleDrawerRoles" :key="role.code" :label="role.name">
          {{ role.code }}
        </el-descriptions-item>
      </el-descriptions>
    </el-drawer>

    <!-- 账号新建/编辑 -->
    <el-dialog v-model="userDialogVisible" :title="editingUser ? '编辑账号' : '新建账号'" width="520" @closed="resetUserForm">
      <el-form ref="userFormRef" :model="userForm" :rules="userFormRules" label-width="80px">
        <el-form-item label="账号" prop="account">
          <el-input v-model="userForm.account" :disabled="!!editingUser" placeholder="登录账号" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="userForm.realName" placeholder="真实姓名" />
        </el-form-item>
        <el-form-item label="角色" prop="roleCode">
          <el-select v-model="userForm.roleCode" placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in roleChoices" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="分公司" prop="plantCode">
          <el-select v-model="userForm.plantCode" placeholder="选择分公司" style="width: 100%">
            <el-option label="深圳 (SZ)" value="SZ" />
            <el-option label="梅州 (MZ)" value="MZ" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!editingUser" label="初始密码">
          <el-input v-model="userForm.password" placeholder="不填则使用默认密码 123456" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="userSaving" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="roleReplacementVisible" title="更换角色并启用账号" width="520" @closed="resetRoleReplacement">
      <template v-if="roleReplacementUser">
        <el-alert type="warning" :closable="false" show-icon title="该账号原角色已删除，需选择现有角色后才能启用。" class="role-replacement-alert" />
        <el-form label-width="90px">
          <el-form-item label="账号">
            <span>{{ roleReplacementUser.account }}（{{ roleReplacementUser.realName }}）</span>
          </el-form-item>
          <el-form-item label="新角色" required>
            <el-select v-model="roleReplacementForm.roleCode" placeholder="请选择现有角色" style="width: 100%">
              <el-option v-for="role in roleChoices" :key="role.code" :label="role.name" :value="role.code" />
            </el-select>
          </el-form-item>
          <el-form-item label="操作原因" required>
            <el-input v-model="roleReplacementForm.reason" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="请填写更换角色并启用账号的原因" />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="roleReplacementVisible = false">取消</el-button>
        <el-button type="primary" :loading="roleReplacementSaving" @click="replaceRoleAndEnable">确认并启用</el-button>
      </template>
    </el-dialog>

    <!-- 角色权限编辑 -->
    <el-dialog v-model="roleDialogVisible" :title="roleDialogMode === 'create' ? '添加角色' : `编辑权限 - ${editingRole?.roleName || ''}`" width="760" @closed="resetRoleForm">
      <el-form label-width="90px">
        <el-form-item v-if="roleDialogMode === 'create'" label="角色名称" required>
          <el-input v-model="roleForm.roleName" maxlength="50" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item v-if="roleDialogMode === 'create'" label="角色说明">
          <el-input v-model="roleForm.description" maxlength="200" placeholder="可填写该角色的职责说明" />
        </el-form-item>
        <el-form-item label="数据范围">
          <el-radio-group v-model="roleForm.dataScope">
            <el-radio label="OWN_PLANT">本分公司</el-radio>
            <el-radio label="ALL_PLANTS">全部分公司</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="模块权限">
          <div class="permission-module-editor">
            <div v-for="module in permissionModuleOptions" :key="module.code" class="permission-module-card">
              <el-checkbox
                :model-value="isModuleSelected(module.code)"
                :disabled="isSystemAdminModuleLocked(module.code)"
                @change="toggleModuleSelection(module.code, $event)"
              >
                {{ module.name }}
              </el-checkbox>
              <el-checkbox-group
                :model-value="moduleActionSelections[module.code] || []"
                class="permission-module-actions"
                @change="updateModuleActions(module.code, $event)"
              >
                <el-checkbox
                  v-for="action in actionOptions"
                  :key="action.code"
                  :label="action.code"
                  :disabled="!isModuleSelected(module.code) || isSystemAdminModuleLocked(module.code) || action.code === 'VIEW'"
                >
                  {{ action.name }}
                </el-checkbox>
              </el-checkbox-group>
            </div>
          </div>
        </el-form-item>
        <el-form-item :label="roleDialogMode === 'create' ? '创建原因' : '编辑原因'" required>
          <el-input v-model="roleForm.reason" type="textarea" :rows="3" maxlength="200" show-word-limit :placeholder="roleDialogMode === 'create' ? '请填写创建角色的原因' : '请填写本次权限调整原因'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="roleSaving" @click="saveRole">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="permissionDetailVisible" :title="`权限详情 - ${detailRole?.roleName || ''}`" size="460px">
      <template v-if="detailRole">
        <el-descriptions :column="1" border class="permission-detail-meta">
          <el-descriptions-item label="角色编码">{{ detailRole.roleCode }}</el-descriptions-item>
          <el-descriptions-item label="数据范围">
            {{ detailRole.dataScopeName || (detailRole.dataScope === 'ALL_PLANTS' ? '全部分公司' : '本分公司') }}
          </el-descriptions-item>
        </el-descriptions>
        <el-empty v-if="permissionDetailModules.length === 0" description="暂无授权" />
        <div v-for="module in permissionDetailModules" :key="module.code" class="permission-detail-module">
          <div class="permission-detail-module-name">{{ module.name }}</div>
          <el-tag v-for="action in module.actions" :key="action" type="info" class="permission-detail-action">{{ action }}</el-tag>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { auditOperationName } from '@/utils/audit-operation'
import { auditContent } from '@/utils/audit-content'
import { hasRequiredReason, isDialogCancellation } from '@/utils/dialog-action'
import { isBuiltInRole, isMissingRoleError } from '@/utils/role-policy'
import { permissionDetailsByModule, permissionsFromModuleActions, validatePermissionEdit } from '@/utils/permission-tree'
import { getMissingAdminUserField } from '@/utils/admin-user-validation'
import { notificationMenuName, resolveNotificationRoles, type NotificationRole } from '@/utils/notificationConfig'
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  changeAdminUserStatus,
  unlockAdminUser,
  resetAdminUserPassword,
  getRoles,
  createRole as createAdminRole,
  updateRolePermissions,
  deleteRole as deleteAdminRole,
  getAdminAudit,
  getNotificationConfigs,
  updateNotificationConfig,
} from '@/api/admin'
import { getApprovalConfigListApi, saveApprovalConfigApi, deleteApprovalConfigApi } from '@/api/exception'
import type { ExceptionApprovalConfigVO } from '@/types/exception'
import type { AdminUser, RolePermission, AdminAudit, NotificationConfig, PageResult } from '@/types'

const auth = useAuthStore()
const router = useRouter()
const activeTab = ref<'users' | 'roles' | 'notificationConfig' | 'audit' | 'approval'>('users')

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
const systemAdminRoles = new Set(['R00', 'R06'])
const permissionModuleOptions = [
  { code: 'systemAdmin', name: '系统管理' },
  { code: 'trace', name: '来料追溯' },
  { code: 'incoming', name: '来料数据管理' },
  { code: 'finishedGoods', name: '成品数据管理' },
  { code: 'exception', name: '异常管理与整改' },
  { code: 'fai', name: '首件检验' },
  { code: 'spc', name: 'SPC 过程能力分析' },
  { code: 'productionDefect', name: '不良信息管理' },
  { code: 'processTools', name: '过程工具' },
  { code: 'supplier', name: '供应商管理' },
  { code: 'material', name: '物料变更' },
  { code: 'notification', name: '系统通知' },
]
function roleName(code: string) {
  return roleChoices.value.find((r) => r.code === code)?.name || code
}

// ── 账号管理 ──
const users = ref<AdminUser[]>([])
const usersLoading = ref(false)
const userKeyword = ref('')
const userRoleFilter = ref('')
const userStatusFilter = ref<number | ''>('')
const visibleUsers = computed(() =>
  users.value.filter((u) => {
    const kw = userKeyword.value.trim().toLowerCase()
    if (kw && !`${u.account} ${u.realName}`.toLowerCase().includes(kw)) return false
    if (userRoleFilter.value && u.roleCode !== userRoleFilter.value) return false
    if (userStatusFilter.value !== '' && u.status !== userStatusFilter.value) return false
    return true
  }),
)
function filterUsers() {
  /* 由 computed 实时过滤 */
}

const userDialogVisible = ref(false)
const userSaving = ref(false)
const userFormRef = ref()
const userFormRules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  roleCode: [{ required: true, message: '请选择角色', trigger: 'change' }],
  plantCode: [{ required: true, message: '请选择分公司', trigger: 'change' }],
}
const editingUser = ref<AdminUser | null>(null)
const userForm = reactive<Record<string, unknown>>({
  account: '',
  realName: '',
  roleCode: '',
  plantCode: '',
  password: '',
})
const roleReplacementVisible = ref(false)
const roleReplacementSaving = ref(false)
const roleReplacementUser = ref<AdminUser | null>(null)
const roleReplacementForm = reactive({ roleCode: '', reason: '' })
function resetUserForm() {
  Object.assign(userForm, { account: '', realName: '', roleCode: '', plantCode: '', password: '' })
  editingUser.value = null
}
function resetRoleReplacement() {
  roleReplacementUser.value = null
  roleReplacementForm.roleCode = ''
  roleReplacementForm.reason = ''
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
  const missingField = getMissingAdminUserField({ account: userForm.account, realName: userForm.realName, roleCode: userForm.roleCode, plantCode: userForm.plantCode })
  if (missingField) {
    ElMessage.warning('请填写' + missingField)
    return
  }
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
    await Promise.all([loadUsers(), refreshAudit()])
  } finally {
    userSaving.value = false
  }
}
async function promptRequiredReason(title: string, message: string): Promise<string | null> {
  try {
    const { value } = await ElMessageBox.prompt(message, title, {
      inputType: 'textarea',
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValidator: (reason) => hasRequiredReason(reason) || '请填写操作原因',
    })
    return value.trim()
  } catch (error) {
    if (isDialogCancellation(error)) return null
    throw error
  }
}
async function enableUser(row: AdminUser) {
  const reason = await promptRequiredReason('启用账号', '启用原因')
  if (!reason) return
  try {
    await changeAdminUserStatus(row.id, true, reason)
    ElMessage.success('已启用')
    await Promise.all([loadUsers(), refreshAudit()])
  } catch (error) {
    if (!isMissingRoleError(error)) throw error
    roleReplacementUser.value = row
    roleReplacementForm.roleCode = ''
    roleReplacementForm.reason = reason
    roleReplacementVisible.value = true
  }
}
async function disableUser(row: AdminUser) {
  const reason = await promptRequiredReason('停用账号', '停用原因')
  if (!reason) return
  await changeAdminUserStatus(row.id, false, reason)
  ElMessage.success('已停用')
  await Promise.all([loadUsers(), refreshAudit()])
}
async function unlockUser(row: AdminUser) {
  const reason = await promptRequiredReason('解锁账号', '解锁原因')
  if (!reason) return
  await unlockAdminUser(row.id, reason)
  ElMessage.success('已解锁')
  await Promise.all([loadUsers(), refreshAudit()])
}
async function resetPassword(row: AdminUser) {
  let password: string | null = null
  try {
    const result = await ElMessageBox.prompt('请输入至少 6 位的新密码', '重置密码', {
      inputType: 'password',
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValidator: (value) => typeof value === 'string' && value.trim().length >= 6 || '新密码至少 6 位',
    })
    password = result.value.trim()
  } catch (error) {
    if (isDialogCancellation(error)) return
    throw error
  }
  const reason = await promptRequiredReason('重置密码', '操作原因')
  if (!reason || !password) return
  await resetAdminUserPassword(row.id, password, reason)
  ElMessage.success('密码已重置')
  await refreshAudit()
}
async function replaceRoleAndEnable() {
  const user = roleReplacementUser.value
  if (!user) return
  if (!roleReplacementForm.roleCode) {
    ElMessage.warning('请选择现有角色')
    return
  }
  if (!hasRequiredReason(roleReplacementForm.reason)) {
    ElMessage.warning('请填写操作原因')
    return
  }
  roleReplacementSaving.value = true
  try {
    const reason = roleReplacementForm.reason.trim()
    await updateAdminUser(user.id, {
      account: user.account,
      realName: user.realName,
      roleCode: roleReplacementForm.roleCode,
      plantCode: user.plantCode,
      plantName: user.plantName,
      reason,
    })
    if (userRoleFilter.value === user.roleCode) userRoleFilter.value = ''
    await changeAdminUserStatus(user.id, true, reason)
    ElMessage.success('角色已更换，账号已启用')
    roleReplacementVisible.value = false
    await Promise.all([loadUsers(), refreshAudit()])
  } finally {
    roleReplacementSaving.value = false
  }
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
const roleChoices = computed(() => {
  if (roles.value.length === 0) return roleOptions
  return roles.value.map((role) => ({ code: role.roleCode, name: role.roleName }))
})
const rolesLoading = ref(false)
const roleDialogVisible = ref(false)
const roleDialogMode = ref<'create' | 'edit'>('edit')
const roleSaving = ref(false)
const editingRole = ref<RolePermission | null>(null)
const roleForm = reactive<{ roleName: string; description: string; dataScope: string; permissions: string[]; reason: string }>({
  roleName: '',
  description: '',
  dataScope: 'OWN_PLANT',
  permissions: [],
  reason: '',
})
const selectedModuleCodes = ref<string[]>([])
const moduleActionSelections = reactive<Record<string, string[]>>({})
const permissionDetailVisible = ref(false)
const detailRole = ref<RolePermission | null>(null)

const permissionDetailModules = computed(() =>
  detailRole.value ? permissionDetailsByModule(detailRole.value.permissions, permissionModuleOptions) : [],
)
function permissionModuleCount(permissions: string[]) {
  return permissionDetailsByModule(permissions, permissionModuleOptions).length
}
function isSuperAdminRole(role: RolePermission) {
  return role.roleCode === 'R00'
}
function openPermissionDetail(role: RolePermission) {
  detailRole.value = role
  permissionDetailVisible.value = true
}

function isModuleSelected(moduleCode: string) {
  return selectedModuleCodes.value.includes(moduleCode)
}
function isSystemAdminModuleLocked(moduleCode: string) {
  return moduleCode === 'systemAdmin' && !systemAdminRoles.has(editingRole.value?.roleCode || '')
}
function syncModulePermissions() {
  roleForm.permissions = permissionsFromModuleActions(
    selectedModuleCodes.value,
    moduleActionSelections,
    permissionModuleOptions,
    roleForm.permissions,
  )
}
function toggleModuleSelection(moduleCode: string, enabled: boolean) {
  if (isSystemAdminModuleLocked(moduleCode)) return
  const selected = Boolean(enabled)
  if (selected && !isModuleSelected(moduleCode)) {
    selectedModuleCodes.value.push(moduleCode)
    moduleActionSelections[moduleCode] = Array.from(new Set(['VIEW', ...(moduleActionSelections[moduleCode] || [])]))
  }
  if (!selected) {
    selectedModuleCodes.value = selectedModuleCodes.value.filter((code) => code !== moduleCode)
    moduleActionSelections[moduleCode] = []
  }
  syncModulePermissions()
}
function updateModuleActions(moduleCode: string, actions: string[]) {
  if (!isModuleSelected(moduleCode) || !Array.isArray(actions)) return
  moduleActionSelections[moduleCode] = Array.from(new Set(['VIEW', ...actions.filter((action): action is string => typeof action === 'string')]))
  syncModulePermissions()
}

function resetRoleForm() {
  roleForm.roleName = ''
  roleForm.description = ''
  roleForm.dataScope = 'OWN_PLANT'
  roleForm.permissions = []
  roleForm.reason = ''
  selectedModuleCodes.value = []
  for (const moduleCode of Object.keys(moduleActionSelections)) delete moduleActionSelections[moduleCode]
  editingRole.value = null
  roleDialogMode.value = 'edit'
}
function openRoleCreate() {
  resetRoleForm()
  roleDialogMode.value = 'create'
  roleDialogVisible.value = true
}
function openRoleEdit(row: RolePermission) {
  roleDialogMode.value = 'edit'
  editingRole.value = row
  roleForm.dataScope = row.dataScope || 'OWN_PLANT'
  roleForm.permissions = [...(row.permissions || [])]
  roleForm.reason = ''
  selectedModuleCodes.value = permissionDetailsByModule(row.permissions || [], permissionModuleOptions).map((module) => module.code)
  for (const module of permissionModuleOptions) {
    const grantedActions = (row.permissions || [])
      .filter((permission) => permission.startsWith(`${module.code}:`))
      .map((permission) => permission.split(':', 2)[1])
    moduleActionSelections[module.code] = isModuleSelected(module.code)
      ? Array.from(new Set(['VIEW', ...grantedActions]))
      : []
  }
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
  if (roleDialogMode.value === 'create' && !roleForm.roleName.trim()) {
    ElMessage.warning('请填写角色名称')
    return
  }
  if (roleDialogMode.value === 'edit' && !editingRole.value) return
  const validationMessage = validatePermissionEdit(selectedModuleCodes.value, roleForm.reason)
  if (validationMessage) {
    ElMessage.warning(validationMessage)
    return
  }
  roleSaving.value = true
  try {
    if (roleDialogMode.value === 'create') {
      await createAdminRole({
        roleName: roleForm.roleName.trim(),
        description: roleForm.description.trim(),
        dataScope: roleForm.dataScope,
        permissions: roleForm.permissions,
        reason: roleForm.reason.trim(),
      })
      ElMessage.success('角色已创建')
      roleDialogVisible.value = false
      await Promise.all([loadRoles(), refreshAudit()])
      return
    }
    if (!editingRole.value) return
    await updateRolePermissions(editingRole.value.roleCode, {
      dataScope: roleForm.dataScope,
      permissions: roleForm.permissions,
      reason: roleForm.reason.trim(),
      version: editingRole.value.version,
    })
    if (await endSessionAfterOwnRoleUpdate(editingRole.value.roleCode)) return
    ElMessage.success('权限已更新')
    roleDialogVisible.value = false
    await Promise.all([loadRoles(), refreshAudit()])
  } finally {
    roleSaving.value = false
  }
}
async function removeRole(role: RolePermission) {
  let reason = ''
  try {
    const result = await ElMessageBox.prompt(
      `删除角色“${role.roleName}”后，已停用账号仍会保留，但重新启用前必须改为现有角色。`,
      '删除角色',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '请填写删除原因',
        inputValidator: (value) => Boolean(value?.trim()) || '必须填写删除原因',
      },
    )
    reason = result.value
  } catch (error) {
    if (isDialogCancellation(error)) return
    throw error
  }
  await deleteAdminRole(role.roleCode, reason.trim())
  ElMessage.success('角色已删除')
  await Promise.all([loadRoles(), loadUsers(), refreshAudit()])
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
const auditPage = ref(1)
const auditPageSize = 10
const auditTotal = ref(0)
async function loadAudit() {
  auditLoading.value = true
  try {
    const res = await getAdminAudit({ page: auditPage.value, size: auditPageSize })
    const result = res.data as PageResult<AdminAudit>
    audits.value = (result?.list || []).map((audit) => ({ ...audit, afterData: auditContent(audit) }))
    auditTotal.value = result?.total || 0
  } finally {
    auditLoading.value = false
  }
}

// ── 通知配置 ──
const notificationConfigs = ref<NotificationConfig[]>([])
const notificationConfigLoading = ref(false)
const notificationConfigDialogVisible = ref(false)
const notificationConfigSaving = ref(false)
const notificationConfigStatusChanging = ref<number | null>(null)
const notificationRoleDrawerVisible = ref(false)
const notificationRoleDrawerTitle = ref('角色详情')
const notificationRoleDrawerRoles = ref<NotificationRole[]>([])
const editingNotificationConfig = ref<NotificationConfig | null>(null)
const notificationConfigForm = reactive({
  roleCodes: [] as string[],
  severityExtraRoles: [] as string[],
  enabled: 1,
  reason: '',
})

function notificationRoles(raw: string | undefined): NotificationRole[] {
  return resolveNotificationRoles(raw, roleChoices.value)
}

async function refreshAudit() {
  auditPage.value = 1
  await loadAudit()
}

function notificationRoleSummary(raw: string | undefined): string {
  const items = notificationRoles(raw)
  return items.length ? items.map((role) => role.name).join('、') : '—'
}

function openNotificationRoleDrawer(title: string, raw: string | undefined) {
  notificationRoleDrawerTitle.value = title
  notificationRoleDrawerRoles.value = notificationRoles(raw)
  notificationRoleDrawerVisible.value = true
}

async function loadNotificationConfigs() {
  notificationConfigLoading.value = true
  try {
    const res = await getNotificationConfigs()
    notificationConfigs.value = res.data || []
  } catch (e: any) {
    notificationConfigs.value = []
    ElMessage.error(e?.response?.data?.message || '加载通知配置失败')
  } finally {
    notificationConfigLoading.value = false
  }
}

function openNotificationConfigDialog(row: NotificationConfig) {
  editingNotificationConfig.value = row
  notificationConfigForm.roleCodes = safeParseArr(row.roleCodes)
  notificationConfigForm.severityExtraRoles = safeParseArr(row.severityExtraRoles)
  notificationConfigForm.enabled = row.enabled
  notificationConfigForm.reason = ''
  notificationConfigDialogVisible.value = true
}

function safeParseArr(raw: string | undefined): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) as string[] } catch { return [] }
}

function resetNotificationConfigForm() {
  editingNotificationConfig.value = null
  notificationConfigForm.roleCodes = []
  notificationConfigForm.severityExtraRoles = []
  notificationConfigForm.enabled = 1
  notificationConfigForm.reason = ''
}

async function saveNotificationConfig() {
  if (!editingNotificationConfig.value) return
  if (!notificationConfigForm.reason.trim()) {
    ElMessage.warning('请填写修改原因')
    return
  }
  if (notificationConfigForm.roleCodes.length === 0) {
    ElMessage.warning('至少选择一个接收角色')
    return
  }
  notificationConfigSaving.value = true
  try {
    const row = editingNotificationConfig.value
    await updateNotificationConfig(row.id, {
      roleCodes: JSON.stringify(notificationConfigForm.roleCodes),
      severityExtraRoles: row.scenarioCode === 'EXCEPTION_CREATED' ? JSON.stringify(notificationConfigForm.severityExtraRoles) : null,
      enabled: notificationConfigForm.enabled,
      version: row.version,
      reason: notificationConfigForm.reason,
    })
    ElMessage.success('通知配置已更新')
    notificationConfigDialogVisible.value = false
    await Promise.all([loadNotificationConfigs(), refreshAudit()])
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '更新失败')
  } finally {
    notificationConfigSaving.value = false
  }
}

async function changeNotificationConfigStatus(row: NotificationConfig) {
  const shouldEnable = row.enabled !== 1
  const action = shouldEnable ? '启用' : '停用'
  const reason = await promptRequiredReason(`${action}通知配置`, `${action}原因`)
  if (!reason) return
  notificationConfigStatusChanging.value = row.id
  try {
    await updateNotificationConfig(row.id, {
      roleCodes: row.roleCodes,
      severityExtraRoles: row.severityExtraRoles || null,
      enabled: shouldEnable ? 1 : 0,
      version: row.version,
      reason,
    })
    ElMessage.success(`通知配置已${action}`)
    await Promise.all([loadNotificationConfigs(), refreshAudit()])
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || `${action}失败`)
  } finally {
    notificationConfigStatusChanging.value = null
  }
}

onMounted(() => {
  loadUsers()
  loadRoles()
  loadAudit()
  loadNotificationConfigs()
  loadApprovalConfigs()
})

// ── 审批配置 ──
const STAGE_OPTIONS = {
  '8D': [
    { value: 'D0', label: 'D0 准备' },
    { value: 'D1', label: 'D1 组建团队' },
    { value: 'D2', label: 'D2 问题描述' },
    { value: 'D3', label: 'D3 临时措施' },
    { value: 'D4', label: 'D4 根因分析' },
    { value: 'D5', label: 'D5 永久措施' },
    { value: 'D6', label: 'D6 措施验证' },
    { value: 'D7', label: 'D7 预防再发' },
    { value: 'D8', label: 'D8 表彰结案' },
  ],
  CAPA: [
    { value: 'C1', label: 'C1 问题确认' },
    { value: 'C2', label: 'C2 原因分析' },
    { value: 'C3', label: 'C3 措施制定' },
    { value: 'C4', label: 'C4 验证结案' },
  ],
}
const APPROVER_ROLE_LABELS: Record<string, string> = {
  R04: '质量工程师',
  R06: '质量经理',
}
function approverRoleLabel(raw: string | undefined): string {
  if (!raw) return '—'
  return raw
    .split(',')
    .map((code) => APPROVER_ROLE_LABELS[code.trim()] || code.trim())
    .filter(Boolean)
    .join('、') || '—'
}
const approvalFlow = ref<'8D' | 'CAPA'>('8D')
const approvalConfigs = ref<ExceptionApprovalConfigVO[]>([])
const approvalLoading = ref(false)
const configDialogVisible = ref(false)
const configSaving = ref(false)
const configDeleting = ref<number | null>(null)
const configFormRef = ref()
const editingConfig = ref<ExceptionApprovalConfigVO | null>(null)
const configForm = reactive<{
  id?: number
  processFlow: string
  stage: string
  stageName: string
  needApproval: number
  approverRole: string[]
}>({
  id: undefined,
  processFlow: '8D',
  stage: '',
  stageName: '',
  needApproval: 1,
  approverRole: [],
})
const configFormRules = {
  stage: [{ required: true, message: '请选择阶段', trigger: 'change' }],
  stageName: [{ required: true, message: '请输入阶段名称', trigger: 'blur' }],
}
const currentStageOptions = computed(() => STAGE_OPTIONS[approvalFlow.value] || [])
function resetConfigForm() {
  editingConfig.value = null
  configForm.id = undefined
  configForm.stage = ''
  configForm.stageName = ''
  configForm.needApproval = 1
  configForm.approverRole = []
}
function onFlowChange() {
  resetConfigForm()
  loadApprovalConfigs()
}
function onStageChange(value: string) {
  const option = currentStageOptions.value.find((s) => s.value === value)
  configForm.stageName = option ? option.label : ''
}
function openConfigCreate() {
  resetConfigForm()
  configForm.processFlow = approvalFlow.value
  configDialogVisible.value = true
}
function openConfigEdit(row: ExceptionApprovalConfigVO) {
  editingConfig.value = row
  configForm.id = row.id
  configForm.processFlow = (row.processFlow as string) || approvalFlow.value
  configForm.stage = row.stage || ''
  configForm.stageName = row.stageName || ''
  configForm.needApproval = row.needApproval === 1 ? 1 : 0
  configForm.approverRole = row.approverRole
    ? row.approverRole.split(',').map((code) => code.trim()).filter(Boolean)
    : []
  configDialogVisible.value = true
}
async function saveConfig() {
  const payload: Record<string, unknown> = {
    processFlow: approvalFlow.value,
    stage: configForm.stage,
    stageName: configForm.stageName,
    needApproval: configForm.needApproval,
    approverRole: configForm.needApproval === 1 ? configForm.approverRole.join(',') : '',
  }
  if (editingConfig.value?.id) {
    payload.id = editingConfig.value.id
    payload.version = (editingConfig.value as any).version
  }
  configSaving.value = true
  try {
    await saveApprovalConfigApi(payload as Partial<ExceptionApprovalConfigVO>)
    ElMessage.success('保存成功')
    configDialogVisible.value = false
    await loadApprovalConfigs()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '保存失败')
  } finally {
    configSaving.value = false
  }
}
async function removeConfig(row: ExceptionApprovalConfigVO) {
  if (!row.id) return
  try {
    await ElMessageBox.confirm(`确认删除「${row.stageName || row.stage}」的审批配置？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch (error) {
    if (isDialogCancellation(error)) return
    throw error
  }
  configDeleting.value = row.id
  try {
    await deleteApprovalConfigApi(row.id)
    ElMessage.success('已删除')
    await loadApprovalConfigs()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '删除失败')
  } finally {
    configDeleting.value = null
  }
}
async function loadApprovalConfigs() {
  approvalLoading.value = true
  try {
    const res = await getApprovalConfigListApi(approvalFlow.value)
    approvalConfigs.value = res.data || []
  } catch (e: any) {
    approvalConfigs.value = []
    ElMessage.error(e?.response?.data?.message || '加载审批配置失败')
  } finally {
    approvalLoading.value = false
  }
}
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
.toolbar .status-filter {
  width: 130px;
}
.role-toolbar {
  justify-content: flex-end;
}
.data-table {
  width: 100%;
}
.permission-module-editor {
  width: 100%;
}
.permission-module-card {
  padding: 12px;
  margin-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
  border-radius: 4px;
}
.permission-module-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin: 10px 0 0 24px;
}
.permission-detail-meta {
  margin-bottom: 16px;
}
.permission-detail-module {
  padding: 14px 0;
  border-bottom: 1px solid #ebeef5;
}
.permission-detail-module-name {
  margin-bottom: 10px;
  color: #303133;
  font-weight: 600;
}
.permission-detail-action {
  margin-right: 8px;
}
.text-muted {
  color: #c0c4cc;
}
.audit-pagination {
  justify-content: flex-end;
  margin-top: 16px;
}
.approval-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}
.config-hint {
  margin: 0 0 14px;
  color: #909399;
  font-size: 13px;
}
</style>

<template>
  <div class="eight-d-panel">
    <!-- 流程类型 + 阶段审批状态概览 -->
    <div class="eight-d-head">
      <div class="head-left">
        <el-tag :type="processTypeTagType" size="small">{{ processTypeLabel }}</el-tag>
        <span v-if="form.capaCurrentStep && showCapa" class="capa-step-hint">
          CAPA 当前阶段：{{ CAPA_STEP_LABELS[form.capaCurrentStep] || form.capaCurrentStep }}
        </span>
      </div>
      <div class="head-right">
        <span class="status-label">审批状态：</span>
        <el-tag :color="STEP_STATUS_COLORS[stepStatus] || '#8C9BA8'" size="small" effect="dark">
          {{ STEP_STATUS_LABELS[stepStatus] || stepStatus || '草稿' }}
        </el-tag>
      </div>
    </div>

    <!-- 步骤条（8D 或 CAPA） -->
    <div class="eight-d-steps">
      <div
        v-for="(step, idx) in stepOrder"
        :key="step"
        class="step-item"
        :class="{ active: step === viewStep, passed: isPassed(step), pending: isPending(step) }"
        @click="selectStep(step)"
      >
        <div class="step-number">{{ step }}</div>
        <div class="step-label">{{ stepLabel(step) }}</div>
        <div v-if="stepNeedApproval(step)" class="step-approve-flag" title="需审批">审</div>
        <div v-if="idx < stepOrder.length - 1" class="step-line"></div>
      </div>
    </div>

    <!-- 当前阶段表单 -->
    <div class="eight-d-form">
      <div class="step-title">
        {{ stepLabel(viewStep) }}
        <span v-if="stepNeedApproval(viewStep)" class="need-approve-tip">（本阶段需 {{ approverRoleLabel(viewStep) }} 审批）</span>
      </div>

      <!-- D1 团队组建：负责人自建团队 + 质量部审核 -->
      <template v-if="viewStep === 'D1'">
        <!-- 团队已通过：只读展示 -->
        <template v-if="stepStatus === 'APPROVED'">
          <div class="assign-block">
            <div class="assign-title">8D 团队成员（已审核通过）</div>
            <div class="member-tags">
              <el-tag
                v-for="(m, mi) in d1MemberList"
                :key="mi"
                type="success"
                size="default"
                class="member-tag"
              >
                {{ m.realName || '-' }}
                <span v-if="m.roleCode" class="role-suffix">（{{ m.roleCode }}）</span>
              </el-tag>
              <span v-if="d1MemberList.length === 0" class="muted">-</span>
            </div>
          </div>
        </template>

        <!-- 提交待审核或驳回：只读展示 + 状态提示 -->
        <template v-else-if="stepStatus === 'SUBMITTED' || stepStatus === 'REJECTED'">
          <div class="assign-block">
            <div class="assign-title">8D 团队成员</div>
            <div class="member-tags">
              <el-tag
                v-for="(m, mi) in d1MemberList"
                :key="mi"
                :type="stepStatus === 'REJECTED' ? 'danger' : 'warning'"
                size="default"
                class="member-tag"
              >
                {{ m.realName || '-' }}
                <span v-if="m.roleCode" class="role-suffix">（{{ m.roleCode }}）</span>
              </el-tag>
              <span v-if="d1MemberList.length === 0" class="muted">-</span>
            </div>
          </div>
          <el-alert
            v-if="stepStatus === 'SUBMITTED'"
            title="团队已提交，等待质量部门审核"
            type="warning"
            :closable="false"
            show-icon
          />
          <el-alert
            v-if="stepStatus === 'REJECTED'"
            title="团队审核未通过，请负责人重新组建后再次提交"
            type="error"
            :closable="false"
            show-icon
          />
        </template>

        <!-- DRAFT 状态：负责人可编辑团队 -->
        <template v-else>
          <div class="assign-block">
            <div class="assign-title">8D 团队成员（从已有用户中选择）</div>
            <div class="member-list">
              <div
                v-for="(m, mi) in d1MemberList"
                :key="mi"
                class="member-row"
              >
                <el-select
                  v-model="m.userId"
                  filterable
                  clearable
                  placeholder="请选择团队成员"
                  size="small"
                  style="flex: 1"
                  :disabled="viewReadonly"
                  @change="(val: number | undefined) => onD1MemberChange(mi, val)"
                >
                  <el-option
                    v-for="u in userOptions"
                    :key="u.id"
                    :label="u.realName + (u.roleCode ? '（' + u.roleCode + '）' : '')"
                    :value="u.id"
                  />
                </el-select>
                <el-button
                  v-if="!viewReadonly"
                  type="danger"
                  size="small"
                  :icon="'Delete'"
                  circle
                  @click="removeD1Member(mi)"
                />
              </div>
            </div>
            <el-button
              v-if="!viewReadonly"
              size="small"
              type="primary"
              plain
              @click="addD1Member"
            >
              + 添加成员
            </el-button>
          </div>
      </template>
      </template>

      <!-- CAPA 负责人：仅纯 CAPA 流程填写（8D / BOTH 流程的 8D 阶段不在此处出现） -->
      <div v-if="props.processType === 'CAPA'" class="assign-block">
        <div class="assign-title">CAPA 负责人（逗号分隔）</div>
        <el-input
          v-model="form.capaOwner"
          type="textarea"
          :rows="3"
          :disabled="viewReadonly"
          placeholder="如：王五"
          resize="none"
        />
      </div>

      <!-- 其他阶段：内容填写 -->
      <template v-else>
        <el-input
          v-model="form[stepField(viewStep)]"
          type="textarea"
          :rows="6"
          :disabled="viewReadonly"
          :placeholder="placeholder(viewStep)"
          resize="none"
        />
      </template>

      <!-- 操作区：仅当用户停留在"真实所处阶段"时渲染操作按钮；查看历史步骤仅提示只读 -->
      <div class="step-actions" v-if="viewStep === activeStep">
        <!-- D1 团队操作 -->
        <template v-if="activeStep === 'D1'">
          <!-- DRAFT 状态：保存 + 提交团队审核 -->
          <template v-if="activeStatus === 'DRAFT' && !stepReadonly">
            <el-button type="primary" :loading="d1SubmitLoading" @click="submitD1Team">
              提交团队审核
            </el-button>
          </template>

          <!-- SUBMITTED：质量角色审核 -->
          <template v-else-if="activeStatus === 'SUBMITTED' && !stepReadonly">
            <el-button type="success" :loading="d1ReviewLoading" @click="reviewD1Team(true)">
              审核通过
            </el-button>
            <el-button type="danger" :loading="d1ReviewLoading" @click="reviewD1Team(false)">
              审核驳回
            </el-button>
          </template>

          <!-- APPROVED / REJECTED：提示 -->
          <template v-else>
            <span v-if="activeStatus === 'APPROVED'" class="muted success-text">团队审核已通过，进入 D2</span>
            <span v-else-if="activeStatus === 'REJECTED' && !stepReadonly" class="muted danger-text">团队被驳回，负责人可重新编辑并提交</span>
            <span v-else class="muted">{{ activeStatus === 'APPROVED' ? '团队审核已通过' : '' }}</span>
          </template>
        </template>

        <!-- 非 D1 阶段：保存 / 提交下一步 / 上一步 与 审批按钮 兼容展示 -->
        <template v-else>
          <!-- 待审批：展示审批操作（能审批才显示审批面板，否则仅提示） -->
          <template v-if="isActivePending">
            <template v-if="canApproveCurrentStep">
              <div class="approval-panel">
                <div class="approval-label">审批意见</div>
                <el-input
                  v-model="approvalComment"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入审批意见"
                />
                <div class="approval-actions">
                  <el-button type="success" :loading="approveLoading" @click="approve">
                    审批通过
                  </el-button>
                  <el-button type="danger" :loading="rejectLoading" @click="reject">
                    审批驳回
                  </el-button>
                </div>
              </div>
            </template>
            <span v-else class="muted">{{ approverRoleLabel(activeStep) }} 审批中…</span>
          </template>

        <!-- 非待审批：普通填写操作 -->
        <template v-else>
          <!-- 最后一步（D8 等）提交闭环后，8D 报告即结束，不再展示保存/上一步 -->
          <span v-if="isLastStepClosed" class="muted">8D 报告已完成并闭环，可前往后续阶段继续处理。</span>
          <template v-else>
            <el-button v-if="!stepReadonly" type="primary" :loading="saveLoading" @click="save">
              保存
            </el-button>
            <el-button
              v-if="!stepReadonly && activeStep !== lastStep"
              type="warning"
              :loading="nextLoading"
              @click="nextStep"
            >
              提交到下一步
            </el-button>
            <el-button v-if="!stepReadonly && activeStep !== firstStep && activeStep !== lastStep" :loading="prevLoading" @click="prevStep">
              上一步
            </el-button>
          </template>
        </template>
        </template>
      </div>

      <!-- 查看历史步骤时：仅提示只读，不渲染任何操作按钮 -->
      <div v-if="viewStep !== activeStep" class="pending-hint">
        当前查看的是历史步骤（{{ stepLabel(viewStep) }}），仅可查看，不可编辑。
      </div>
      <!-- 真实阶段处于待审批且非审批人：提示等待 -->
      <div v-if="viewStep === activeStep && isActivePending && !canApproveCurrentStep" class="pending-hint">
        当前阶段已提交，等待 {{ approverRoleLabel(activeStep) }} 审批。
      </div>
    </div>

    <!-- 8D 报告概览 -->
    <div class="eight-d-summary">
      <div class="summary-title">8D 报告概览</div>
      <div class="summary-grid">
        <div v-for="step in stepOrder" :key="step" class="summary-item">
          <div class="summary-label">{{ stepLabel(step) }}</div>
          <div class="summary-value" :class="{ empty: !summaryValue(step) }">
            {{ summaryValue(step) || '待填写' }}
          </div>
        </div>
        <div v-if="showCapa && form.capaOwner" class="summary-item">
          <div class="summary-label">CAPA 负责人</div>
          <div class="summary-value">{{ form.capaOwner }}</div>
        </div>
      </div>
    </div>

    <!-- 步骤留痕（含审批轨迹） -->
    <div class="eight-d-history">
      <div class="summary-title">8D 步骤留痕</div>
      <el-table
        :data="stepLogs"
        v-loading="stepLogsLoading"
        size="small"
        border
        empty-text="暂无留痕记录"
      >
        <el-table-column prop="step" label="步骤" width="70" />
        <el-table-column label="操作" width="110">
          <template #default="{ row }">
            <el-tag :type="operationTagType(row.operation)" size="small">
              {{ operationText(row.operation) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="内容快照" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatSnapshot(row.stepContent) }}
          </template>
        </el-table-column>
        <el-table-column label="审批状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.approvalStatus" size="small" effect="plain">
              {{ STEP_STATUS_LABELS[row.approvalStatus] || row.approvalStatus }}
            </el-tag>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="approver" label="审批人" width="90" />
        <el-table-column prop="approvalComment" label="审批意见" min-width="120" show-overflow-tooltip />
        <el-table-column prop="operator" label="操作人" width="90" />
        <el-table-column prop="plantName" label="分公司" width="80" />
        <el-table-column prop="operatedAt" label="操作时间" width="160" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
// ===== M2: 8D/CAPA 报告组件（含 D0 发起、人员指派、阶段审批） =====
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  saveEightDApi,
  nextStepEightDApi,
  getEightDHistoryApi,
  approveStageApi,
  rejectStageApi,
  submitD1TeamApi,
  reviewD1TeamApi,
  getUserOptionsApi,
  getApprovalConfigListApi,
} from '@/api/exception'
import {
  EIGHT_D_STEP_LABELS,
  EIGHT_D_STEP_ORDER,
  CAPA_STEP_LABELS,
  CAPA_STEP_ORDER,
  PROCESS_TYPE_LABELS,
  PROCESS_TYPE_COLORS,
  STEP_STATUS_LABELS,
  STEP_STATUS_COLORS,
} from '@/enums/exception'
import type { EightDReport, EightDSaveDTO, EightDStepLogVO, EightDD1TeamDTO, EightDD1ReviewDTO, ExceptionUserOptionVO, ExceptionApprovalConfigVO } from '@/types/exception'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  exceptionId: number
  eightD?: EightDReport
  processType?: string
  readonly?: boolean
  cardMode?: boolean
  /** 整改负责人姓名（来自异常单 ExceptionOrder.ownerName） */
  ownerName?: string
}>()

const emit = defineEmits<{
  (e: 'updated', value: EightDReport): void
}>()

// 当前用户角色（用于审批权限判断），从登录态读取
const authStore = useAuthStore()
const currentRole = computed<string>(() => authStore.roleId || '')

const showCapa = computed(() => props.processType === 'CAPA' || props.processType === 'BOTH')

// 步骤顺序：BOTH/CAPA 主流程仍按 8D 步骤条展示，CAPA 当前阶段另由 capaCurrentStep 展示
const stepOrder = computed(() => (showCapa.value && props.processType === 'CAPA' ? CAPA_STEP_ORDER : EIGHT_D_STEP_ORDER))

const stepStatus = ref<string>('DRAFT')
// 8D 推进步骤从 D1 起（D0 为质量部立案，仅作展示，不进入步骤链）
const currentStep = ref('D1')
// 活动步骤：后端真实所处阶段（currentStep），只读，不被用户点看步骤改变
const activeStep = ref('D1')
// 查看步骤：用户点步骤条查看的步骤（可查看历史步骤内容，仅只读）
const viewStep = ref('D1')
const currentVersion = ref<number | undefined>(undefined)
const saveLoading = ref(false)
const nextLoading = ref(false)
const prevLoading = ref(false)
const approveLoading = ref(false)
const rejectLoading = ref(false)
const approvalComment = ref('')
const d1SubmitLoading = ref(false)
const d1ReviewLoading = ref(false)

// D1 团队成员编辑态（负责人组建团队时使用）
const d1MemberList = ref<Array<{ userId?: number; realName?: string; roleCode?: string }>>([])

// 用户选项列表（下拉框选择成员）
const userOptions = ref<ExceptionUserOptionVO[]>([])
const userOptionsLoaded = ref(false)

const stepLogs = ref<EightDStepLogVO[]>([])
const stepLogsLoading = ref(false)

const form = ref<Record<string, string>>({
  d0Symptom: '',
  d0Initiator: '',
  d1Team: '',
  capaOwner: '',
  capaCurrentStep: '',
  d2ProblemDesc: '',
  d3Containment: '',
  d4RootCause: '',
  d5Corrective: '',
  d6Implementation: '',
  d7Preventive: '',
  d8Closure: '',
})

const processTypeLabel = computed(() => PROCESS_TYPE_LABELS[props.processType || ''] || props.processType || '未发起')
const processTypeTagType = computed(() => {
  const c = PROCESS_TYPE_COLORS[props.processType || '']
  return c ? '' : 'info'
})

const firstStep = computed(() => stepOrder.value[0])
const lastStep = computed(() => stepOrder.value[stepOrder.value.length - 1])

// 最后一步（如 D8）提交闭环后：8D 报告即结束，操作区不再展示保存/上一步
const isLastStepClosed = computed(
  () => activeStep.value === lastStep.value && activeStatus.value !== 'DRAFT',
)

// 后端真实所处阶段的状态（操作区以此为准，不被查看步骤影响）
const activeStatus = computed(() => stepStatus.value)

// 查看步骤在其步骤链中的下标
function stepIndex(step: string) {
  return stepOrder.value.indexOf(step)
}

// 查看步骤是否为"已通过的历史步骤"（idx 早于真实所处阶段）
function isPassedStep(step: string) {
  const idx = stepIndex(step)
  const activeIdx = stepIndex(activeStep.value)
  return idx >= 0 && activeIdx >= 0 && idx < activeIdx
}

// 查看步骤的只读性：父组件强制只读、或该步骤是历史已完成步骤、或当前活动步骤处于待审批状态
const viewReadonly = computed(
  () => props.readonly || isPassedStep(viewStep.value)
    || (viewStep.value === activeStep.value && activeStatus.value === 'PENDING_APPROVAL'),
)

// 操作区只读：仅在整体强制只读、或真实阶段处于待审批时，屏蔽保存/下一步/上一步
// 注意：历史步骤查看时不屏蔽操作区（操作区永远针对 activeStep）
const stepReadonly = computed(() => props.readonly || activeStatus.value === 'PENDING_APPROVAL')

// 真实阶段是否处于待审批（决定操作区是否展示审批按钮）
const isActivePending = computed(() => activeStatus.value === 'PENDING_APPROVAL')

// 当前步骤所需审批角色（前端仅展示提示，真实校验在后端）
const approverRoleMap = ref<Record<string, ExceptionApprovalConfigVO>>({})
const canApproveCurrentStep = computed(() => {
  if (currentRole.value === 'R00') return true
  const cfg = approverRoleMap.value[activeStep.value]
  if (!cfg || cfg.needApproval !== 1) return false
  const approverRoles = (cfg.approverRole || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
  return approverRoles.includes(currentRole.value)
})

watch(
  () => props.eightD,
  (val) => {
    if (val) {
      form.value = {
        d0Symptom: val.d0Symptom || '',
        d0Initiator: val.d0Initiator || '',
        d1Team: val.d1Team || '',
        capaOwner: val.capaOwner || '',
        capaCurrentStep: val.capaCurrentStep || '',
        d2ProblemDesc: val.d2ProblemDesc || '',
        d3Containment: val.d3Containment || '',
        d4RootCause: val.d4RootCause || '',
        d5Corrective: val.d5Corrective || '',
        d6Implementation: val.d6Implementation || '',
        d7Preventive: val.d7Preventive || '',
        d8Closure: val.d8Closure || '',
      }
      currentStep.value = val.currentStep || 'D1'
      activeStep.value = val.currentStep || 'D1'
      viewStep.value = val.currentStep || 'D1'
      stepStatus.value = val.stepStatus || 'DRAFT'
      currentVersion.value = val.version
      // 解析 D1 成员结构化列表
      if (val.d1Members) {
        try {
          d1MemberList.value = JSON.parse(val.d1Members)
        } catch {
          d1MemberList.value = []
        }
      } else {
        d1MemberList.value = []
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.exceptionId,
  (id) => {
    if (id) loadStepLogs(id)
  },
  { immediate: true },
)

async function loadUserOptions() {
  if (userOptionsLoaded.value) return
  try {
    const res = await getUserOptionsApi()
    if (res.code === 0) userOptions.value = res.data || []
    userOptionsLoaded.value = true
  } catch (e) {
    console.error('加载用户选项失败', e)
  }
}

onMounted(() => {
  loadUserOptions()
  loadApprovalConfig(props.processType || '8D')
})

watch(
  () => props.processType,
  (flow) => {
    if (flow) loadApprovalConfig(flow)
  },
)

// 加载阶段审批配置，填充 approverRoleMap（步骤条"审"标记、待审批提示、审批按钮依赖此数据）
async function loadApprovalConfig(flow: string) {
  if (!flow) return
  try {
    const res = await getApprovalConfigListApi(flow)
    if (res.code === 0) {
      const map: Record<string, ExceptionApprovalConfigVO> = {}
      for (const c of res.data || []) {
        if (c.stage) map[c.stage] = c
      }
      approverRoleMap.value = map
    }
  } catch (e) {
    console.error('加载审批配置失败', e)
  }
}

async function loadStepLogs(exceptionId: number) {
  stepLogsLoading.value = true
  try {
    const res = await getEightDHistoryApi(exceptionId)
    if (res.code === 0) {
      stepLogs.value = res.data || []
    }
  } catch (e) {
    console.error('加载 8D 留痕失败', e)
  } finally {
    stepLogsLoading.value = false
  }
}

function stepLabel(step: string) {
  return EIGHT_D_STEP_LABELS[step] || CAPA_STEP_LABELS[step] || step
}

/** 格式化留痕内容快照：JSON 数组提取 realName，普通文本直接展示 */
function formatSnapshot(content: string) {
  if (!content) return ''
  // 尝试解析 JSON（如 D1 团队列表）
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      return parsed.map((u: any) => u.realName || u.name || '').filter(Boolean).join('、')
    }
  } catch { /* 非 JSON，直接返回原文 */ }
  return content
}

function stepField(step: string) {
  const map: Record<string, string> = {
    D1: 'd1Members',
    D2: 'd2ProblemDesc',
    D3: 'd3Containment',
    D4: 'd4RootCause',
    D5: 'd5Corrective',
    D6: 'd6Implementation',
    D7: 'd7Preventive',
    D8: 'd8Closure',
    C1: 'd2ProblemDesc',
    C2: 'd3Containment',
    C3: 'd4RootCause',
    C4: 'd5Corrective',
  }
  return map[step]
}

function summaryValue(step: string) {
  if (step === 'D1') return d1MemberList.value.map((m) => m.realName).join(', ') || form.value.d1Team
  return form.value[stepField(step) || ''] || ''
}

function isPassed(step: string) {
  return isPassedStep(step)
}

function isPending(step: string) {
  return stepStatus.value === 'PENDING_APPROVAL' && step === activeStep.value
}

function stepNeedApproval(step: string) {
  return approverRoleMap.value[step]?.needApproval === 1
}

const ROLE_LABELS: Record<string, string> = {
  R00: '超级管理员',
  R01: '操作工',
  R02: '检验员',
  R03: '班组长',
  R04: '质量工程师',
  R05: 'SQE',
  R06: '质量经理',
}

function approverRoleLabel(step: string) {
  const cfg = approverRoleMap.value[step]
  if (!cfg) return ''
  const code = cfg.approverRole || ''
  // 支持 "R04,R06" 多角色
  const labels = code
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => ROLE_LABELS[c] || c)
  return labels.join('、')
}

function operationText(op: string) {
  if (op === 'SAVE') return '保存内容'
  if (op === 'NEXT_STEP') return '推进到下一步'
  if (op === 'APPROVE') return '审批'
  if (op === 'D1_TEAM_SUBMIT') return '提交团队'
  if (op === 'D1_TEAM_APPROVED') return '团队审核通过'
  if (op === 'D1_TEAM_REJECTED') return '团队审核驳回'
  return op
}

function operationTagType(op: string) {
  if (op === 'SAVE') return 'info'
  if (op === 'NEXT_STEP') return 'warning'
  if (op === 'APPROVE') return 'success'
  return ''
}

function placeholder(step: string) {
  const map: Record<string, string> = {
    D2: '请按 5W2H 描述问题',
    D3: '请输入临时遏制措施',
    D4: '请输入根本原因分析',
    D5: '请输入纠正措施',
    D6: '请输入实施与验证结果',
    D7: '请输入预防措施',
    D8: '请输入团队表彰/闭环总结',
    C1: '请填写 CAPA 改善措施',
    C2: '请提交措施供审批',
    C3: '请填写措施实施情况',
    C4: '请填写效果验证结果',
  }
  return map[step] || '请输入内容'
}

function selectStep(step: string) {
  // 仅可查看"已到达（含当前）"的步骤，禁止跳到尚未到达的未来步骤
  const idx = stepOrder.value.indexOf(step)
  const activeIdx = stepOrder.value.indexOf(activeStep.value)
  if (idx < 0 || activeIdx < 0 || idx > activeIdx) return
  viewStep.value = step
}

async function save() {
  if (stepReadonly.value) return
  saveLoading.value = true
  try {
    const payload: EightDSaveDTO = {
      currentStep: activeStep.value,
      ...form.value,
      version: currentVersion.value,
    }
    const res = await saveEightDApi(props.exceptionId, payload)
    if (res.code === 0) {
      ElMessage.success('保存成功')
      currentVersion.value = res.data.version
      stepStatus.value = res.data.stepStatus || stepStatus.value
      // 最后一步（D8 等）保存即闭环：本地标记完成，隐藏操作按钮
      if (activeStep.value === lastStep.value) {
        stepStatus.value = 'SUBMITTED'
      }
      emit('updated', res.data)
      loadStepLogs(props.exceptionId)
    }
  } catch (e) {
    console.error('保存 8D 失败', e)
  } finally {
    saveLoading.value = false
  }
}

async function nextStep() {
  if (stepReadonly.value) return
  const field = stepField(activeStep.value)
  if (field && (!form.value[field] || !form.value[field].trim())) {
    ElMessage.warning(`请先填写 ${stepLabel(activeStep.value)} 内容后再提交到下一步`)
    return
  }
  nextLoading.value = true
  try {
    const res = await nextStepEightDApi(props.exceptionId)
    if (res.code === 0) {
      stepStatus.value = res.data.stepStatus || 'SUBMITTED'
      currentStep.value = res.data.currentStep || currentStep.value
      activeStep.value = res.data.currentStep || activeStep.value
      viewStep.value = res.data.currentStep || viewStep.value
      currentVersion.value = res.data.version
      ElMessage.success(
        stepStatus.value === 'PENDING_APPROVAL' ? '已提交，等待审批' : '已提交到下一步',
      )
      emit('updated', res.data)
      loadStepLogs(props.exceptionId)
    }
  } catch (e) {
    console.error('提交下一步失败', e)
  } finally {
    nextLoading.value = false
  }
}

function prevStep() {
  if (stepReadonly.value) return
  const idx = stepOrder.value.indexOf(activeStep.value)
  if (idx > 0) {
    activeStep.value = stepOrder.value[idx - 1]
    viewStep.value = activeStep.value
  }
}

async function approve() {
  // BOTH 模式需根据阶段前缀区分：D0-D8 → 8D，C1-C4 → CAPA
  const processFlow = activeStep.value.startsWith('C') ? 'CAPA' : '8D'
  approveLoading.value = true
  try {
    const res = await approveStageApi(props.exceptionId, {
      processFlow,
      stage: activeStep.value,
      comment: approvalComment.value,
    })
    if (res.code === 0) {
      stepStatus.value = res.data.stepStatus || 'APPROVED'
      currentVersion.value = res.data.version
      if (res.data.currentStep) {
        activeStep.value = res.data.currentStep
        viewStep.value = res.data.currentStep
      }
      approvalComment.value = ''
      ElMessage.success('审批通过')
      emit('updated', res.data)
      loadStepLogs(props.exceptionId)
    } else {
      ElMessage.error(res.message || '审批通过失败，后端返回错误')
    }
  } catch (e) {
    console.error('审批通过失败', e)
    ElMessage.error('审批通过请求失败，请检查网络或联系管理员')
  } finally {
    approveLoading.value = false
  }
}

async function reject() {
  // BOTH 模式需根据阶段前缀区分：D0-D8 → 8D，C1-C4 → CAPA
  const processFlow = activeStep.value.startsWith('C') ? 'CAPA' : '8D'
  if (!approvalComment.value.trim()) {
    ElMessage.warning('请输入驳回理由后再操作')
    return
  }
  rejectLoading.value = true
  try {
    const res = await rejectStageApi(props.exceptionId, {
      processFlow,
      stage: activeStep.value,
      comment: approvalComment.value,
    })
    if (res.code === 0) {
      stepStatus.value = res.data.stepStatus || 'REJECTED'
      currentStep.value = res.data.currentStep || currentStep.value
      activeStep.value = res.data.currentStep || activeStep.value
      viewStep.value = res.data.currentStep || viewStep.value
      currentVersion.value = res.data.version
      approvalComment.value = ''
      ElMessage.success('已驳回，回退到上一阶段重新填写')
      emit('updated', res.data)
      loadStepLogs(props.exceptionId)
    } else {
      ElMessage.error(res.message || '审批驳回失败，后端返回错误')
    }
  } catch (e) {
    console.error('审批驳回失败', e)
    ElMessage.error('审批驳回请求失败，请检查网络或联系管理员')
  } finally {
    rejectLoading.value = false
  }
}

/** D1 团队提交：负责人自行组建团队后提交质量部审核 */
async function submitD1Team() {
  if (d1MemberList.value.length === 0) {
    ElMessage.warning('请至少添加一名团队成员')
    return
  }
  // 校验所有成员都已选择有效用户
  if (d1MemberList.value.some((m) => !m.userId || !m.realName)) {
    ElMessage.warning('请为每位成员从下拉框中选择有效用户')
    return
  }
  d1SubmitLoading.value = true
  try {
    // 确保 userId 为数字（el-select 可能返回字符串）
    const memberList = d1MemberList.value.map((m) => ({
      userId: typeof m.userId === 'number' ? m.userId : Number(m.userId),
      realName: m.realName || '',
      roleCode: m.roleCode || '',
    }))
    const payload: EightDD1TeamDTO = {
      memberList,
      version: currentVersion.value,
    }
    console.log('[D1提交] payload:', JSON.stringify(payload))
    const res = await submitD1TeamApi(props.exceptionId, payload)
    if (res.code === 0) {
      ElMessage.success('团队已提交，等待质量部审核')
      stepStatus.value = res.data.stepStatus || 'SUBMITTED'
      currentVersion.value = res.data.version
      emit('updated', res.data)
      loadStepLogs(props.exceptionId)
    }
  } catch (e: any) {
    console.error('提交 D1 团队失败', e)
    if (e?.response?.data) {
      console.error('后端返回:', JSON.stringify(e.response.data))
    }
  } finally {
    d1SubmitLoading.value = false
  }
}

/** D1 团队审核：质量部门通过/驳回 */
async function reviewD1Team(approved: boolean) {
  if (!approved) {
    const { value } = await ElMessageBox.prompt('请输入驳回理由', '审核驳回', {
      type: 'warning',
      inputType: 'textarea',
      confirmButtonText: '确认驳回',
    }).catch(() => ({ value: '' }))
    if (value === undefined) return
    d1ReviewLoading.value = true
    try {
      const payload: EightDD1ReviewDTO = {
        approved: false,
        reviewComment: value || '',
        version: currentVersion.value!,
      }
      const res = await reviewD1TeamApi(props.exceptionId, payload)
      if (res.code === 0) {
        ElMessage.success('已驳回，负责人可重新组建团队')
        stepStatus.value = res.data.stepStatus || 'REJECTED'
        currentVersion.value = res.data.version
        emit('updated', res.data)
        loadStepLogs(props.exceptionId)
      }
    } catch (e) {
      console.error('D1 团队驳回失败', e)
    } finally {
      d1ReviewLoading.value = false
    }
  } else {
    try {
      await ElMessageBox.confirm('确认通过 D1 团队审核？通过后团队生效，进入 D2 阶段。', '审核通过', { type: 'success' })
    } catch {
      return
    }
    d1ReviewLoading.value = true
    try {
      const payload: EightDD1ReviewDTO = { approved: true, version: currentVersion.value! }
      const res = await reviewD1TeamApi(props.exceptionId, payload)
      if (res.code === 0) {
        ElMessage.success('团队审核通过，已进入 D2')
        stepStatus.value = res.data.stepStatus || 'APPROVED'
        currentStep.value = res.data.currentStep || 'D2'
        activeStep.value = res.data.currentStep || 'D2'
        viewStep.value = res.data.currentStep || 'D2'
        currentVersion.value = res.data.version
        emit('updated', res.data)
        loadStepLogs(props.exceptionId)
      }
    } catch (e) {
      console.error('D1 团队审核通过失败', e)
    } finally {
      d1ReviewLoading.value = false
    }
  }
}

/** 添加 D1 团队成员 */
function addD1Member() {
  d1MemberList.value.push({ userId: undefined, realName: '', roleCode: '' })
}

/** 移除 D1 团队成员 */
function removeD1Member(index: number) {
  d1MemberList.value.splice(index, 1)
}

/** D1 成员下拉框选择联动：根据 userId 回填 realName / roleCode */
function onD1MemberChange(index: number, userId: number | undefined) {
  const m = d1MemberList.value[index]
  if (!m) return
  if (userId != null) {
    const u = userOptions.value.find((x) => x.id === userId)
    m.realName = u?.realName || ''
    m.roleCode = u?.roleCode || ''
  } else {
    m.realName = ''
    m.roleCode = ''
  }
}
</script>

<style scoped>
.eight-d-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.eight-d-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.head-left,
.head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.capa-step-hint {
  font-size: 12px;
  color: #5b6770;
}
.status-label {
  font-size: 13px;
  color: #5b6770;
}
.eight-d-steps {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  background: #faf9f7;
  border-radius: 6px;
  overflow-x: auto;
}
.step-item {
  flex: 1;
  min-width: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
  cursor: pointer;
  padding: 8px 0;
  border-radius: 4px;
  transition: all 0.2s;
}
.step-item:hover {
  background: rgba(27, 58, 91, 0.05);
}
.step-item.active .step-number {
  background: #1b3a5b;
  color: #fff;
  border-color: #1b3a5b;
}
.step-item.passed .step-number {
  background: #3e7a4e;
  color: #fff;
  border-color: #3e7a4e;
}
.step-item.pending .step-number {
  background: #b8763e;
  color: #fff;
  border-color: #b8763e;
}
.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid #d4cfc8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #8c9ba8;
  background: #fff;
  font-family: 'JetBrains Mono', monospace;
  position: relative;
}
.step-approve-flag {
  position: absolute;
  top: -6px;
  right: 18px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #b8763e;
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-label {
  font-size: 11px;
  color: #5b6770;
  text-align: center;
  line-height: 1.3;
  white-space: nowrap;
}
.step-line {
  position: absolute;
  top: 22px;
  right: -50%;
  width: 100%;
  height: 1px;
  background: #e3e0dc;
  z-index: 0;
}
.step-item.passed + .step-item .step-line,
.step-item.active .step-line {
  background: #3e7a4e;
}
.eight-d-form {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  padding: 16px;
}
.step-title {
  font-size: 15px;
  font-weight: 700;
  color: #1b3a5b;
  margin-bottom: 14px;
  letter-spacing: 0.2px;
}
.need-approve-tip {
  font-size: 12px;
  color: #b8763e;
  font-weight: 400;
}
.d0-initiator {
  margin-top: 10px;
}
.assign-block {
  margin-bottom: 12px;
}
.assign-title {
  font-size: 12px;
  color: #5b6770;
  margin-bottom: 6px;
}
.step-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.approval-panel {
  margin-top: 12px;
  padding: 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}
.approval-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}
.approval-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.pending-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #b8763e;
}
.eight-d-summary {
  background: #faf9f7;
  border: 1px solid #f0ede9;
  border-radius: 6px;
  padding: 16px;
}
.summary-title {
  font-size: 14px;
  font-weight: 700;
  color: #1b3a5b;
  margin-bottom: 14px;
  letter-spacing: 0.2px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.summary-item {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  padding: 12px;
}
.summary-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7a88;
  margin-bottom: 4px;
}
.summary-value {
  font-size: 13px;
  color: #2a2a2a;
  line-height: 1.5;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.summary-value.empty {
  color: #b8b3ac;
  font-style: italic;
}
.muted {
  color: #b8b3ac;
}
.eight-d-history {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  padding: 16px;
}
@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
/* D0 只读块 */
.d0-readonly-block {
  margin-bottom: 12px;
}
.d0-symptom-text {
  font-size: 13px;
  color: #2a2a2a;
  line-height: 1.6;
  padding: 8px 12px;
  background: #faf9f7;
  border-radius: 4px;
  white-space: pre-wrap;
}
/* D1 成员标签 */
.member-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.member-tag {
  margin: 0;
}
.role-suffix {
  font-size: 11px;
  color: #5b6770;
  margin-left: 4px;
}
/* D1 成员编辑列表 */
.member-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}
.member-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.success-text {
  color: #3e7a4e;
}
.danger-text {
  color: #c0392b;
}
</style>

<template>
  <div class="exception-detail-page" v-loading="loading" element-loading-text="加载中...">
    <!-- 资源不存在（404） -->
    <div v-if="notFound" class="error-state">
      <el-result icon="warning" title="异常单不存在" sub-title="该异常单可能已被删除或不存在">
        <template #extra>
          <el-button @click="goBack">返回列表</el-button>
        </template>
      </el-result>
    </div>

    <!-- 网络错误或其他加载失败 -->
    <div v-else-if="loadError" class="error-state">
      <el-result icon="error" title="加载失败" sub-title="无法获取异常单详情，请检查网络或稍后重试">
        <template #extra>
          <el-button type="primary" @click="loadDetail">重新加载</el-button>
          <el-button @click="goBack">返回列表</el-button>
        </template>
      </el-result>
    </div>

    <template v-else-if="detail">
    <!-- 顶部导航条 -->
    <header class="detail-topbar">
      <el-button :icon="ArrowLeft" text @click="goBack">返回列表</el-button>
      <div class="topbar-info">
        <span class="topbar-no">{{ detail?.exceptionNo || '-' }}</span>
        <span v-if="detail?.severity" class="topbar-tag" :style="severityStyle(detail.severity)">{{ detail.severity }}</span>
        <span v-if="detail?.status" class="topbar-tag" :style="statusStyle(detail.status)">{{ detail.status }}</span>
        <span class="topbar-tag" :style="processStyle(detail?.processType || '')">
          {{ detail?.processType ? (PROCESS_TYPE_LABELS[detail.processType] || detail.processType) : '未选择流程' }}
        </span>
       </div>
       <QualityRuleDialog />
     </header>

    <div class="detail-layout">
      <!-- 左侧面板 -->
      <aside class="detail-sidebar">
        <!-- 异常摘要卡片 -->
        <div class="summary-card">
          <div class="summary-title">
        异常摘要
        <el-button
          v-if="['来料不良','首件不良','成品不良'].includes(detail?.sourceType)"
          link
          type="primary"
          size="small"
          class="summary-detail-btn"
          @click="showProductDetail = true"
        >产品详情</el-button>
      </div>
          <div class="summary-grid">
            <div class="summary-field"><label>供应商</label><span>{{ detail?.supplierName || '-' }}</span></div>
            <div class="summary-field"><label>物料代码</label><span class="mono">{{ detail?.materialCode || '-' }}</span></div>
            <div class="summary-field"><label>异常来源</label><span>{{ detail?.sourceType || '-' }}</span></div>
            <div class="summary-field"><label>截止日期</label><span>{{ detail?.deadline || '-' }}</span></div>
            <div class="summary-field"><label>整改责任人</label><span>{{ detail?.ownerName || (detail?.capaStatus === '待发起' ? '待指派（自动触发）' : (detail?.initiatedBy || detail?.createdBy || '-')) }}</span></div>
            <div class="summary-field"><label>发起整改</label><span>{{ detail?.initiatedBy || detail?.createdBy || '-' }}</span></div>
            <div class="summary-field"><label>发起时间</label><span>{{ detail?.initiatedAt || '-' }}</span></div>
            <div class="summary-field"><label>不良数量</label><span class="mono">{{ detail?.defectQty ?? '-' }}</span></div>
         </div>

         <div v-if="['来料不良','首件不良','成品不良'].includes(detail?.sourceType)" class="summary-card rule-source-card">
           <div class="summary-title">自动判定依据</div>
           <div class="rule-decision-line">
             <span :class="detail.severity === '严重' ? 'rule-serious' : 'rule-general'">{{ detail.severity }}</span>
             <b>{{ detail.processType || '待选择流程' }}</b>
             <em>{{ detail.notificationLevel || '提醒' }}通知</em>
           </div>
           <p>{{ detail.ruleReason || '历史数据未记录自动判定依据' }}</p>
           <div class="summary-grid">
             <div class="summary-field"><label>30天重复</label><span>{{ detail.repeatCount30Days ?? '—' }} 批</span></div>
             <div class="summary-field"><label>90天重复</label><span>{{ detail.repeatCount90Days ?? '—' }} 批</span></div>
             <div class="summary-field"><label>响应截止</label><span>{{ detail.responseDeadline?.replace('T', ' ').slice(0, 16) || '—' }}</span></div>
           </div>
         </div>
          <div class="summary-desc" v-if="detail?.defectDesc">
            <label>不良描述</label>
            <p>{{ detail.defectDesc }}</p>
          </div>
        </div>

        <!-- 检验来源卡片（来料不良→供应商整改链路起点） -->
        <div v-if="detail?.sourceType === '来料不良' && detail?.materialInspection" class="summary-card inspection-source-card">
          <div class="summary-title" style="color: #b8763e">检验来源</div>
          <div class="summary-grid">
            <div class="summary-field">
              <label>检验单号</label>
              <span class="mono">{{ detail.materialInspection.recordNo || '-' }}</span>
            </div>
            <div class="summary-field">
              <label>检验结果</label>
              <span class="tag-ng">不合格</span>
            </div>
            <div class="summary-field">
              <label>不合格数量</label>
              <span class="mono" style="color: #B84B3E">{{ detail.materialInspection.unqualifiedQty ?? '-' }}</span>
            </div>
            <div class="summary-field">
              <label>处理方式</label>
              <span>{{ detail.materialInspection.handlingMethod || '-' }}</span>
            </div>
            <div class="summary-field">
              <label>检验日期</label>
              <span>{{ detail.materialInspection.inspectionDate || '-' }}</span>
            </div>
            <div class="summary-field">
              <label>供应商代码</label>
              <span class="mono">{{ detail.materialInspection.supplierCode || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- CAPA 流程步骤条 -->
        <ProcessStepper
          v-if="showCapaProcess"
          v-model:current="activeStage"
          :process-type="detail?.processType"
          :capa-status="detail?.capaStatus"
          :step-accessible="stepAccessible"
        />

        <!-- 8D 步骤导航（选中 8D 时替代步骤条） -->
        <div v-if="show8DView" class="eightd-sidebar-nav">
          <div class="nav-title">8D 步骤</div>
          <div
            v-for="step in EIGHT_D_STEP_ORDER"
            :key="step"
            class="eightd-nav-item"
            :class="{ active: activeStage === current8DStage, filled: has8DFilled(step) }"
            @click="activeStage = current8DStage"
          >
            <span class="eightd-nav-num">{{ step.slice(1) }}</span>
            <span class="eightd-nav-label">{{ EIGHT_D_STEP_LABELS[step]?.replace(/^D\d\s/, '') }}</span>
          </div>
        </div>
      </aside>

      <!-- 右侧主内容区 -->
      <main class="detail-main">
        <!-- 发起流程阶段 -->
        <div v-if="activeStage === 'initiate'" class="stage-content">
          <div class="stage-card">
            <h3 class="stage-heading">发起整改流程（立案 + 责任人指派）</h3>
            <p class="stage-desc">请手动选择整改流程类型（系统不预填推荐值），填写立案说明并指派整改责任人。8D 团队与 CAPA 负责人将在进入 D1 阶段后由负责人组建。</p>
            <div class="initiate-options">
              <div
                v-for="opt in processOptions"
                :key="opt.value"
                class="initiate-card"
                :class="{ selected: selectedProcess === opt.value, disabled: isInitiated }"
                @click="!isInitiated && (selectedProcess = opt.value)"
              >
                <div class="initiate-card-title">{{ opt.label }}</div>
                <div class="initiate-card-desc">{{ opt.desc }}</div>
              </div>
            </div>
            <div class="initiate-fields">
              <div class="initiate-field">
                <label>整改责任人（已指定则默认带入，可修改）</label>
                <el-select
                  v-model="ownerId"
                  filterable
                  clearable
                  :disabled="isInitiated"
                  :placeholder="detail?.ownerName ? '已指定：' + detail.ownerName : '请选择整改责任人'"
                  style="width: 100%"
                  @change="onOwnerChange"
                >
                  <el-option
                    v-for="u in userOptions"
                    :key="u.id"
                    :label="u.realName + (u.roleCode ? '（' + u.roleCode + '）' : '')"
                    :value="u.id"
                  />
                </el-select>
              </div>
              <div class="initiate-field">
                <label>立案说明（立案情由 / 不良现象概述）</label>
                <el-input v-model="d0Symptom" type="textarea" :rows="4" :disabled="isInitiated" placeholder="请填写质量部发起说明" />
              </div>
            </div>
            <el-button
              type="primary"
              :disabled="!selectedProcess || detail?.capaStatus !== '待发起'"
              :loading="initiateLoading"
              style="margin-top: 16px"
              @click="doInitiate"
            >
              发起流程
            </el-button>
            <span v-if="detail?.capaStatus !== '待发起'" class="stage-hint">流程已发起，当前状态：{{ detail?.capaStatus }}</span>
          </div>
        </div>

        <!-- BOTH 模式：8D 根因分析阶段（D1-D4） -->
        <div v-if="activeStage === '8d_analysis'" class="stage-content">
          <div class="stage-card capa-phase-notice">
            <h3 class="stage-heading">
              {{ hasCapa ? '8D 根因分析（D1-D4）+ CAPA 计划' : '8D 根因分析（D1-D4）' }}
            </h3>
            <p class="stage-desc" v-if="hasCapa">
              CAPA 立项已完成，8D 团队正在执行根因分析。CAPA 整改计划可在下方制定。
              完成 D4 根因分析后可进入 D5 措施方案制定。
            </p>
            <p class="stage-desc" v-else>
              8D 团队正在执行 D1-D4 根因分析，填写并保存各阶段内容后逐步推进至 D5。
            </p>
            <el-tag v-if="hasCapa && detail?.capaPhase" type="info" size="small">
              CAPA 相位：{{ CAPA_PHASE_LABELS[detail.capaPhase] || detail.capaPhase }}
            </el-tag>
          </div>
          <!-- CAPA 整改计划（BOTH 模式下可与 8D 并行制定，纯 8D 不显示） -->
          <ExceptionRectificationPlans
            v-if="hasCapa"
            :exception-id="exceptionId"
            :plans="detail?.rectificationPlans || []"
            :owner-id="detail?.ownerId"
            :owner-name="detail?.ownerName"
            :readonly="detail?.status === '已闭环'"
            @changed="loadDetail"
          />
          <!-- 8D 报告 D1-D4 -->
          <ExceptionEightD
            ref="eightDRef"
            :exception-id="exceptionId"
            :eight-d="detail?.eightD"
            :process-type="detail?.processType"
            :readonly="detail?.status === '已闭环'"
            :card-mode="true"
            :owner-name="detail?.ownerName"
            @updated="on8DUpdated"
          />
        </div>

        <!-- BOTH 模式：8D 措施制定与执行阶段（D5-D8） -->
        <div v-if="activeStage === '8d_measures'" class="stage-content">
          <div class="stage-card capa-phase-notice">
            <h3 class="stage-heading">8D 措施制定与执行（D5-D8）</h3>
            <p class="stage-desc" v-if="hasCapa">
              CAPA 整改与 8D 并行推进，8D 团队可推进 D5-D8。
            </p>
            <p class="stage-desc" v-else>
              8D 团队可推进 D5-D8 措施方案与执行，各阶段填写保存后逐步推进至 D8 团队表彰。
            </p>
            <el-tag v-if="hasCapa && detail?.capaPhase" type="info" size="small">
              CAPA 相位：{{ CAPA_PHASE_LABELS[detail.capaPhase] || detail.capaPhase }}
            </el-tag>
          </div>
          <!-- 8D 报告 D5-D8 -->
          <ExceptionEightD
            ref="eightDRef"
            :exception-id="exceptionId"
            :eight-d="detail?.eightD"
            :process-type="detail?.processType"
            :readonly="detail?.status === '已闭环'"
            :card-mode="true"
            :owner-name="detail?.ownerName"
            @updated="on8DUpdated"
          />
          <!-- CAPA 改善措施（BOTH 模式下与 8D D5-D8 并行） -->
          <ExceptionActions
            v-if="activeStage === '8d_measures'"
            :exception-id="exceptionId"
            :actions="detail?.improvementActions || []"
            :owner-id="detail?.ownerId"
            :owner-name="detail?.ownerName"
            :readonly="detail?.status === '已闭环'"
            @changed="loadDetail"
          />
        </div>

        <!-- 整改计划阶段 -->
        <div v-if="activeStage === 'plan'" class="stage-content">
          <ExceptionRectificationPlans
            :exception-id="exceptionId"
            :plans="detail?.rectificationPlans || []"
            :owner-id="detail?.ownerId"
            :owner-name="detail?.ownerName"
            :readonly="detail?.status === '已闭环'"
            @changed="loadDetail"
          />
        </div>

        <!-- 改善措施阶段 -->
        <div v-if="activeStage === 'measures'" class="stage-content">
          <!-- 纯 CAPA 模式：根因审批 / 措施审批门禁（闭环前置条件要求完成根因审批） -->
          <div v-if="isPureCapa" class="stage-card capa-phase-actions">
            <h3 class="stage-heading">CAPA 相位审批</h3>
            <p class="stage-desc">
              纯 CAPA 整改需依次完成「根因审批」「措施审批」方可闭环。当前相位：
              <el-tag type="info" size="small">{{ CAPA_PHASE_LABELS[detail?.capaPhase || ''] || detail?.capaPhase || '立项中' }}</el-tag>
            </p>
            <div class="capa-approve-btns">
              <el-button
                type="warning"
                :disabled="detail?.capaPhase !== CapaPhaseEnum.INITIATE || detail?.status === '已闭环'"
                :loading="approveRootCauseLoading"
                @click="handleApproveRootCause"
              >根因审批</el-button>
              <el-button
                type="warning"
                :disabled="detail?.capaPhase !== CapaPhaseEnum.ROOT_CAUSE_APPROVED || detail?.status === '已闭环'"
                :loading="approveMeasuresLoading"
                @click="handleApproveMeasures"
              >措施审批</el-button>
            </div>
          </div>
          <ExceptionActions
            :exception-id="exceptionId"
            :actions="detail?.improvementActions || []"
            :owner-id="detail?.ownerId"
            :owner-name="detail?.ownerName"
            :readonly="detail?.status === '已闭环'"
            @changed="loadDetail"
          />
        </div>

        <!-- 验证闭环阶段 -->
        <div v-if="activeStage === 'verify'" class="stage-content">
          <!-- 含 8D 的流程在验证阶段也可添加改善措施 -->
          <ExceptionActions
            v-if="show8DView"
            :exception-id="exceptionId"
            :actions="detail?.improvementActions || []"
            :owner-id="detail?.ownerId"
            :owner-name="detail?.ownerName"
            :readonly="detail?.status === '已闭环'"
            @changed="loadDetail"
          />
          <ExceptionVerifications
            :exception-id="exceptionId"
            :records="detail?.verificationRecords || []"
            :readonly="detail?.status === '已闭环'"
            @changed="refreshAfterVerificationChange"
          />
          <CloseChecklist
            v-if="detail?.status !== '已闭环'"
            ref="closeChecklistRef"
            :exception-id="exceptionId"
            :close-loading="closeLoading"
            @close="handleClose"
          />
          <div v-if="detail?.status === '已闭环'" class="close-done-notice">
            该异常单已于 {{ detail.closedAt || '--' }} 闭环
          </div>
        </div>

        <!-- 审核追溯阶段 -->
        <div v-if="activeStage === 'audit'" class="stage-content">
          <div class="stage-card">
            <h3 class="stage-heading">审核追溯</h3>
            <div v-if="auditLogs.length" class="audit-timeline">
              <div
                v-for="(log, idx) in auditLogs"
                :key="log.id"
                class="audit-entry"
                :class="{ 'audit-first': idx === 0 }"
              >
                <!-- 时间轴节点 -->
                <div class="audit-dot" :style="{ background: auditDotColor(log.operationType) }"></div>
                <div class="audit-line" v-if="idx < auditLogs.length - 1"></div>

                <!-- 日志内容 -->
                <div class="audit-body">
                  <div class="audit-header">
                    <span class="audit-time">{{ formatAuditTime(log.operationTime) }}</span>
                    <el-tag :type="auditTagType(log.operationType)" size="small">{{ AUDIT_OPERATION_LABELS[log.operationType] || log.operationType }}</el-tag>
                    <span class="audit-table">{{ AUDIT_TABLE_LABELS[log.tableName] || log.tableName }}</span>
                  </div>
                  <div class="audit-operator-row">
                    <span class="audit-operator">{{ log.operatorName || '系统' }}</span>
                  </div>
                  <div v-if="log.reason" class="audit-reason">{{ log.reason }}</div>
                  <div v-if="auditExtras(log).length" class="audit-extras">
                    <span v-for="(ex, ei) in auditExtras(log)" :key="ei" class="audit-extra-tag">
                      {{ ex.label }}<b>{{ ex.value }}</b>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无审计记录" />
          </div>
        </div>
      </main>
    </div>
    <!-- 产品详情弹窗 -->
    <ProductDetailDialog
      v-model="showProductDetail"
      :source-type="detail?.sourceType || ''"
      :material-inspection="detail?.materialInspection"
      :fai-inspection="detail?.faiInspection"
      :finished-goods-inspection="detail?.finishedGoodsInspection"
    />
    </template>

    <!-- detail 为 null 且未报错时（理论上不会出现，兜底） -->
    <div v-else class="error-state">
      <el-empty description="暂无数据">
        <el-button type="primary" @click="loadDetail">刷新</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getExceptionDetailApi,
  getAuditTrailApi,
  initiateProcessApi,
  getUserOptionsApi,
  closeExceptionApi,
  approveCapaRootCauseApi,
  approveCapaMeasuresApi,
} from '@/api/exception'
import {
  SEVERITY_COLORS,
  EXCEPTION_STATUS_COLORS,
  CAPA_STATUS_COLORS,
  PROCESS_TYPE_LABELS,
  PROCESS_TYPE_COLORS,
  processIncludesCapa,
  processIncludes8D,
  EIGHT_D_STEP_ORDER,
  EIGHT_D_STEP_LABELS,
  AUDIT_OPERATION_LABELS,
  AUDIT_TABLE_LABELS,
  CAPA_PHASE_LABELS,
  CapaPhaseEnum,
} from '@/enums/exception'
import type { ExceptionDetailVO, AuditLog, ExceptionUserOptionVO } from '@/types/exception'
import ProcessStepper from './components/ProcessStepper.vue'
import ExceptionActions from './components/ExceptionActions.vue'
import ExceptionVerifications from './components/ExceptionVerifications.vue'
import ExceptionEightD from './components/ExceptionEightD.vue'
import ExceptionRectificationPlans from './components/ExceptionRectificationPlans.vue'
import CloseChecklist from './components/CloseChecklist.vue'
import QualityRuleDialog from '@/components/quality/QualityRuleDialog.vue'
import ProductDetailDialog from './components/ProductDetailDialog.vue'

const route = useRoute()
const router = useRouter()
const exceptionId = computed(() => Number(route.params.id))

const loading = ref(false)
const loadError = ref(false)
const notFound = ref(false)
const detail = ref<ExceptionDetailVO | null>(null)
const auditLogs = ref<AuditLog[]>([])
const activeStage = ref('initiate')

const selectedProcess = ref('')
const d0Symptom = ref('')
const ownerId = ref<number | undefined>()
const ownerName = ref<string>('')
const userOptions = ref<ExceptionUserOptionVO[]>([])
const initiateLoading = ref(false)
const closeLoading = ref(false)
const showProductDetail = ref(false)
const eightDRef = ref<InstanceType<typeof ExceptionEightD>>()
const closeChecklistRef = ref<InstanceType<typeof CloseChecklist>>()

const processOptions = [
  { value: 'CAPA', label: 'CAPA 整改', desc: '纠正与预防措施流程，含改善措施、验证与闭环' },
  { value: '8D', label: '8D 报告', desc: '八步问题解决法，适用于复杂质量问题根因分析' },
  { value: 'BOTH', label: 'CAPA + 8D', desc: '同时进行 CAPA 整改与 8D 报告，适用于重大异常' },
]

/** 拉取人员选项（选择责任人 / 组建 8D 团队 / 指派 CAPA 负责人） */
async function loadUserOptions() {
  try {
    const res = await getUserOptionsApi()
    if (res.code === 0) userOptions.value = res.data || []
  } catch (e) {
    console.error('加载人员选项失败', e)
  }
}

/** 责任人下拉变化：同步姓名到 ownerName（冗余存储，便于后端列表展示） */
function onOwnerChange(id: number | undefined) {
  const u = userOptions.value.find((x) => x.id === id)
  ownerName.value = u ? u.realName : ''
}

/** 从 detail 数据恢复发起表单字段（页面刷新 / 重新进入时保持显示） */
function populateInitiateFormFromDetail() {
  if (!detail.value) return
  const d = detail.value
  // 责任人已指定时优先带入（质量部已在前一步指派，发起时默认使用该责任人）
  if (d.ownerId) {
    ownerId.value = d.ownerId
    ownerName.value = d.ownerName || ''
  }
  // 仅当流程已发起时恢复其余字段（待发起时流程/说明待填）
  if (d.capaStatus === '待发起' || !d.processType) return
  selectedProcess.value = d.processType || ''
  d0Symptom.value = d.eightD?.d0Symptom || ''
}

const showCapaProcess = computed(() => {
  if (!detail.value) return false
  // 只要流程已确定（非null, 非''），就显示步骤条
  // 步骤条现在支持 CAPA/8D/BOTH 三种动态步骤列表
  return !!(detail.value.processType) || detail.value.capaStatus === '待发起'
})

/** 流程是否已发起（用于控制发起表单只读状态） */
const isInitiated = computed(() => {
  return detail.value?.capaStatus !== '待发起' && !!detail.value?.processType
})

const show8DView = computed(() => {
  return !!detail.value && processIncludes8D(detail.value.processType)
})

const has8D = computed(() => !!detail.value && processIncludes8D(detail.value.processType))
const hasCapa = computed(() => !!detail.value && processIncludesCapa(detail.value.processType))
// 纯 CAPA（不含 8D）：需走根因审批/措施审批门禁
const isPureCapa = computed(() => !!detail.value && processIncludesCapa(detail.value.processType) && !processIncludes8D(detail.value.processType))

/** 含 8D 流程（8D / BOTH）sidebar nav 应该跳转到的正确 stage key */
const current8DStage = computed(() => {
  if (!detail.value) return '8d'
  // 基于 8D 当前步骤线性判断：到达 D5 即进入措施执行阶段
  const d8Step = detail.value.eightD?.currentStep || ''
  const d8StepIdx = EIGHT_D_STEP_ORDER.indexOf(d8Step)
  return d8StepIdx >= 4 ? '8d_measures' : '8d_analysis'
})

/**
 * 步骤门禁：每个 key → boolean 表示该步骤是否可进入。
 * 规则：上一阶段未产出数据时，后续步骤锁定。
 */
const stepAccessible = computed<Record<string, boolean>>(() => {
  const d = detail.value
  if (!d) return {}
  const pt = d.processType
  const is8D = processIncludes8D(pt)
  const isCapa = processIncludesCapa(pt)
  const hasPlans = (d.rectificationPlans || []).length > 0
  const hasActions = (d.improvementActions || []).length > 0
  const d8Done = d.eightD?.currentStep === 'D8'
  const closed = d.status === '已闭环'
  const initiated = d.capaStatus !== '待发起'
  const d8Step = d.eightD?.currentStep || ''
  const d8StepIdx = EIGHT_D_STEP_ORDER.indexOf(d8Step)

  const map: Record<string, boolean> = {}

  // 所有流程共用的规则
  map['initiate'] = true
  map['audit'] = closed

  if (is8D && isCapa) {
    // BOTH（8D + CAPA）：CAPA 与 8D 并行推进，无独立审批节点
    // initiate → 8d_analysis(D1-D4) → 8d_measures(D5-D8) → verify → audit
    map['8d_analysis'] = initiated
    map['8d_measures'] = d8StepIdx >= 4   // 到达 D5 即开放措施阶段（D4 完成后可推进）
    map['verify'] = d8Done                // D8 完成后开放验证闭环
  } else if (is8D) {
    // 纯 8D：无 CAPA 门禁，无根因/措施审批阶段
    // initiate → 8d_analysis(D1-D4) → 8d_measures(D5-D8) → verify → audit
    map['8d_analysis'] = initiated
    map['8d_measures'] = d8StepIdx >= 4   // 到达 D5 即开放措施阶段
    map['verify'] = d8Done                // D8 完成后开放验证闭环
  } else {
    // 纯 CAPA: initiate → plan → measures → verify → audit（审批内嵌于措施尾部，不再独立成节点）
    map['plan'] = initiated
    map['measures'] = initiated && (d.rectificationPlans || []).length > 0
    map['verify'] = hasActions
  }
  return map
})

function has8DFilled(step: string): boolean {
  if (!detail.value?.eightD) return false
  const map: Record<string, keyof typeof detail.value.eightD> = {
    D1: 'd1Team',
    D2: 'd2ProblemDesc',
    D3: 'd3Containment',
    D4: 'd4RootCause',
    D5: 'd5Corrective',
    D6: 'd6Implementation',
    D7: 'd7Preventive',
    D8: 'd8Closure',
  }
  return !!(detail.value.eightD as any)[map[step]]
}

function severityStyle(v: string) {
  const c = SEVERITY_COLORS[v] || '#8C9BA8'
  return { color: c, background: c + '18', borderColor: c + '40' }
}
function statusStyle(v: string) {
  const c = EXCEPTION_STATUS_COLORS[v] || '#8C9BA8'
  return { color: c, background: c + '18', borderColor: c + '40' }
}
function processStyle(v: string) {
  const c = PROCESS_TYPE_COLORS[v] || '#8C9BA8'
  return { color: c, background: c + '18', borderColor: c + '40' }
}

async function loadDetail() {
  if (!exceptionId.value) return
  loading.value = true
  loadError.value = false
  notFound.value = false
  try {
    const res = await getExceptionDetailApi(exceptionId.value)
    if (res.code === 0) {
      detail.value = res.data
      await loadUserOptions()
      initStage()
      loadAuditTrail()
      // 流程已发起时恢复表单字段，避免页面刷新后显示空白
      populateInitiateFormFromDetail()
    } else {
      // 区分资源不存在（404类错误）和普通业务错误
      if (res.code === 404 || res.message?.includes('不存在')) {
        notFound.value = true
      } else {
        loadError.value = true
      }
      console.error('加载异常详情失败：code=' + res.code + ' message=' + res.message)
    }
  } catch (e: any) {
    // HTTP 404 vs 网络错误
    if (e?.response?.status === 404 || e?.status === 404) {
      notFound.value = true
    } else {
      loadError.value = true
    }
    console.error('加载异常详情失败', e)
  } finally {
    loading.value = false
  }
}

/** 验证记录会影响闭环资格；详情刷新完成后必须同步重新计算前置条件。 */
async function refreshAfterVerificationChange() {
  await loadDetail()
  await nextTick()
  await closeChecklistRef.value?.refresh()
}

function initStage() {
  if (!detail.value) return
  // 若已闭环，默认定位到审计追溯
  if (detail.value.status === '已闭环') {
    activeStage.value = 'audit'
    return
  }
  // 尚未发起
  if (!detail.value.processType || detail.value.capaStatus === '待发起') {
    activeStage.value = 'initiate'
    return
  }

  const has8D = processIncludes8D(detail.value.processType)
  const hasCapa = processIncludesCapa(detail.value.processType)

  // 含 8D 流程（8D / BOTH）：CAPA 与 8D 并行推进，无独立审批节点
  if (has8D) {
    const d8Step = detail.value.eightD?.currentStep || ''
    const d8StepIdx = EIGHT_D_STEP_ORDER.indexOf(d8Step)

    if (d8Step === 'D8') activeStage.value = 'verify'
    else if (d8StepIdx >= 4) activeStage.value = '8d_measures'
    else activeStage.value = '8d_analysis'
    return
  }

  // 纯 CAPA 模式：plan → measures → verify 线性推进
  if (hasCapa) {
    if (detail.value.status === '已闭环') {
      activeStage.value = 'audit'
      return
    }
    const plans = detail.value.rectificationPlans || []
    const actions = detail.value.improvementActions || []
    if (plans.length === 0) {
      activeStage.value = 'plan'
    } else if (actions.length === 0) {
      activeStage.value = 'measures'
    } else {
      activeStage.value = 'verify'
    }
    return
  }
}

async function loadAuditTrail() {
  try {
    const res = await getAuditTrailApi(exceptionId.value)
    if (res.code === 0) auditLogs.value = res.data
  } catch (e) {
    console.error('加载审计日志失败', e)
  }
}

// ===== 审计辅助函数 =====

/** 格式化审计时间：2026-07-21 14:35:22 */
function formatAuditTime(t?: string) {
  if (!t) return '-'
  // 标准化格式
  if (t.length >= 19) return t.slice(0, 10) + ' ' + t.slice(11, 19)
  if (t.length >= 16) return t.slice(0, 10) + ' ' + t.slice(11, 16)
  return t
}

function auditDotColor(opType: string): string {
  const map: Record<string, string> = { CREATE: '#3E7A4E', UPDATE: '#3E6B95', DELETE: '#B84B3E' }
  return map[opType] || '#8C9BA8'
}

function auditTagType(opType: string): 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    CREATE: 'success', UPDATE: 'warning', DELETE: 'danger'
  }
  return map[opType] || 'info'
}

/**
 * 从 beforeData/afterData JSONB 提取关键人字段。
 * 显示如：负责人 / 验证人 / 处理人 等。
 */
function auditExtras(log: AuditLog): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = []
  const data = log.afterData || log.beforeData
  if (!data) return result

  try {
    const obj = JSON.parse(data)
    // 提取常见的人员/状态字段
    const fields: [string, string][] = [
      ['ownerName', '负责人'], ['ownerId', '负责人ID'],
      ['verifierName', '验证人'], ['verifierId', '验证人ID'],
      ['handlerId', '处理人ID'], ['handlerName', '处理人'],
      ['result', '验证结果'], ['status', '状态'],
      ['actionType', '措施类型'], ['content', '内容'],
      ['processType', '流程类型'],
      ['planName', '计划名称'], ['objective', '目标'],
    ]
    for (const [key, label] of fields) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        result.push({ label, value: String(obj[key]) })
      }
    }
  } catch {
    // JSON 解析失败则忽略
  }
  return result.slice(0, 6)
}

async function doInitiate() {
  if (!selectedProcess.value) return
  initiateLoading.value = true
  try {
    const res = await initiateProcessApi(exceptionId.value, {
      processType: selectedProcess.value,
      ownerId: ownerId.value,
      ownerName: ownerName.value || undefined,
      d0Symptom: d0Symptom.value || undefined,
    })
    if (res.code === 0) {
      ElMessage.success('整改流程已发起')
      detail.value = { ...detail.value!, ...res.data }
      initStage()
    }
  } catch (e) {
    console.error('发起流程失败', e)
  } finally {
    initiateLoading.value = false
  }
}

async function handleClose(closeReason: string) {
  try {
    await ElMessageBox.confirm('确认闭环该异常单？闭环后无法修改整改数据。', '确认闭环', { type: 'warning' })
  } catch {
    return
  }
  closeLoading.value = true
  try {
    const res = await closeExceptionApi(exceptionId.value, { closeReason })
    if (res.code === 0) {
      ElMessage.success('异常单已闭环')
      loadDetail()
    }
  } catch (e) {
    console.error('闭环失败', e)
  } finally {
    closeLoading.value = false
  }
}

// ===== 纯 CAPA 相位审批（根因审批 / 措施审批） =====
const approveRootCauseLoading = ref(false)
const approveMeasuresLoading = ref(false)

async function handleApproveRootCause() {
  let comment = ''
  try {
    const { value } = await ElMessageBox.prompt('请输入根因审批意见', 'CAPA 根因审批', {
      inputType: 'textarea',
      confirmButtonText: '通过',
      cancelButtonText: '取消',
    })
    comment = value || ''
  } catch {
    return
  }
  approveRootCauseLoading.value = true
  try {
    const res = await approveCapaRootCauseApi(exceptionId.value, comment)
    if (res.code === 0) {
      ElMessage.success('根因审批通过')
      await loadDetail()
    }
  } catch (e) {
    console.error('根因审批失败', e)
  } finally {
    approveRootCauseLoading.value = false
  }
}

async function handleApproveMeasures() {
  let comment = ''
  try {
    const { value } = await ElMessageBox.prompt('请输入措施审批意见', 'CAPA 措施审批', {
      inputType: 'textarea',
      confirmButtonText: '通过',
      cancelButtonText: '取消',
    })
    comment = value || ''
  } catch {
    return
  }
  approveMeasuresLoading.value = true
  try {
    const res = await approveCapaMeasuresApi(exceptionId.value, comment)
    if (res.code === 0) {
      ElMessage.success('措施审批通过')
      await loadDetail()
    }
  } catch (e) {
    console.error('措施审批失败', e)
  } finally {
    approveMeasuresLoading.value = false
  }
}

function on8DUpdated(eightD: any) {
  if (detail.value) {
    detail.value.eightD = eightD
    // 根据当前状态引导用户到合适的阶段
    if (detail.value.status !== '已闭环') {
      // D4 完成后，BOTH 模式引导到 CAPA 根因审批
      // D8 完成后：引导到验证闭环阶段
      if (eightD?.currentStep === 'D8') {
        ElMessage.success('8D 报告全部完成，请前往验证闭环阶段确认整改效果')
        setTimeout(() => { activeStage.value = 'verify'; loadDetail() }, 800)
      }
    }
  }
}

function goBack() {
  router.push('/exception')
}

onMounted(loadDetail)
watch(exceptionId, loadDetail)
</script>

<style scoped>
.exception-detail-page {
  padding: 16px 24px 48px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #2a2a2a;
}
.detail-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 14px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e3e0dc;
}
.topbar-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.topbar-no {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  color: #1b3a5b;
}
.topbar-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid;
}
.detail-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.detail-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 16px;
}
.detail-main {
  flex: 1;
  min-width: 0;
}

/* 摘要卡片 */
.summary-card {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  padding: 16px;
}
.summary-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5b;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e3e0dc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.summary-detail-btn {
  font-size: 12px;
  padding: 0 4px;
  height: auto;
}
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
}
.summary-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.summary-field label {
  font-size: 11px;
  color: #8c9ba8;
}
.summary-field span {
  font-size: 12px;
  color: #2a2a2a;
  word-break: break-all;
}
.summary-field .mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}
.summary-desc {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f0ede9;
}
.summary-desc label {
  font-size: 11px;
  color: #8c9ba8;
}
.summary-desc p {
  font-size: 12px;
  color: #2a2a2a;
  line-height: 1.5;
  margin: 4px 0 0;
}

/* 8D 侧边导航 */
.eightd-sidebar-nav {
  background: #faf9f7;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  padding: 12px;
}
.nav-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5b;
  margin-bottom: 10px;
}
.eightd-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 2px;
}
.eightd-nav-item:hover {
  background: rgba(27, 58, 91, 0.05);
}
.eightd-nav-item.active {
  background: rgba(27, 58, 91, 0.08);
}
.eightd-nav-item.filled::after {
  content: '✓';
  margin-left: auto;
  font-size: 11px;
  color: #3e7a4e;
  font-weight: 700;
}
.eightd-nav-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e3e0dc;
  color: #5b6770;
  font-size: 11px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.eightd-nav-item.active .eightd-nav-num {
  background: #1b3a5b;
  color: #fff;
}
.eightd-nav-label {
  font-size: 12px;
  color: #5b6770;
}

/* 阶段内容区 */
.stage-content {
  animation: fadeIn 0.2s ease;
}
.stage-card {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 8px;
  padding: 24px;
}
.stage-heading {
  font-size: 18px;
  font-weight: 700;
  color: #1b3a5b;
  margin: 0 0 6px;
  letter-spacing: 0.3px;
}
.stage-desc {
  font-size: 13px;
  color: #6b7a88;
  line-height: 1.6;
  margin: 0 0 20px;
}

/* BOTH 模式：CAPA 点头通知 */
.capa-phase-notice {
  background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%);
  border-left: 4px solid #4682b4;
  margin-bottom: 16px;
}
.capa-phase-notice .stage-desc {
  margin-bottom: 12px;
}

/* CAPA 审批表单 */
.capa-approval-form {
  margin-top: 8px;
}
.capa-approval-field {
  margin-bottom: 16px;
}
.capa-approval-field label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1b3a5b;
  margin-bottom: 6px;
}
.stage-hint {
  display: inline-block;
  margin-left: 12px;
  font-size: 13px;
  font-weight: 500;
  color: #b8763e;
}

/* 发起流程选项卡片 */
.initiate-options {
  display: flex;
  gap: 14px;
  margin-bottom: 22px;
}
.initiate-card {
  flex: 1;
  background: #faf9f7;
  border: 2px solid #e3e0dc;
  border-radius: 8px;
  padding: 18px 16px;
  cursor: pointer;
  transition: all 0.25s ease;
}
.initiate-card:hover {
  border-color: #b8763e;
  background: #fefbf7;
}
.initiate-card.selected {
  border-color: #1b3a5b;
  background: rgba(27, 58, 91, 0.06);
  box-shadow: 0 1px 6px rgba(27, 58, 91, 0.08);
}
.initiate-card.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
.initiate-card.disabled:hover {
  border-color: #e0e0e0;
  background: #f9f9f9;
}
.initiate-card-title {
  font-size: 15px;
  font-weight: 700;
  color: #1b3a5b;
  margin-bottom: 8px;
  letter-spacing: 0.2px;
}
.initiate-card-desc {
  font-size: 12px;
  color: #6b7a88;
  line-height: 1.55;
}

/* 发起流程表单字段 */
.initiate-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.initiate-field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #3a4c5e;
  margin-bottom: 6px;
  line-height: 1.5;
}

/* 闭环面板 */
.close-panel {
  margin-top: 16px;
  padding: 16px;
  background: #faf9f7;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
}
.close-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #1b3a5b;
  margin-bottom: 10px;
}

/* 已闭环提示 */
.close-done-notice {
  margin-top: 16px;
  padding: 12px 16px;
  background: #f2f8f2;
  border: 1px solid #c5dcc5;
  border-radius: 6px;
  font-size: 13px;
  color: #3e7a4e;
  font-weight: 500;
}

/* 检验来源卡片 */
.inspection-source-card {
  border-color: #f0d9c6;
}
.tag-ng {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: #b84b3e;
  background: #b84b3e18;
  border: 1px solid #b84b3e40;
  border-radius: 2px;
  padding: 1px 6px;
}

/* 审计时间线 - 增强可视化 */
.audit-timeline {
  position: relative;
  padding-left: 0;
}
.audit-entry {
  position: relative;
  display: flex;
  gap: 14px;
  padding-bottom: 20px;
  padding-left: 0;
}
.audit-entry:last-child {
  padding-bottom: 0;
}
.audit-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
  z-index: 1;
  box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
}
.audit-line {
  position: absolute;
  left: 4.5px;
  top: 18px;
  bottom: 0;
  width: 1px;
  background: #e3e0dc;
}
.audit-body {
  flex: 1;
  min-width: 0;
}
.audit-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.audit-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #8c9ba8;
}
.audit-operator-row {
  font-size: 13px;
  margin-bottom: 2px;
}
.audit-operator-row .audit-operator {
  font-weight: 600;
  color: #1b3a5b;
}
.audit-table {
  font-size: 11px;
  color: #8c9ba8;
}
.audit-reason {
  margin-top: 2px;
  color: #5b6770;
  font-size: 12px;
  line-height: 1.4;
}
.audit-extras {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.audit-extra-tag {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  background: #f5f3f0;
  border-radius: 3px;
  color: #5b6770;
}
.audit-extra-tag b {
  color: #1b3a5b;
  margin-left: 4px;
}
.audit-first .audit-dot {
  box-shadow: 0 0 0 4px rgba(27, 58, 91, 0.15);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 加载失败 / 空数据状态 */
.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 48px;
}

@media (max-width: 900px) {
  .detail-layout {
    flex-direction: column;
  }
  .detail-sidebar {
    width: 100%;
    position: static;
  }
  .initiate-options {
    flex-direction: column;
  }
}
.rule-source-card{border-left:3px solid #b8763e}.rule-decision-line{display:flex;align-items:center;gap:8px;margin:10px 0}.rule-decision-line span{padding:3px 8px;border:1px solid;border-radius:3px;font-size:11px;font-weight:700}.rule-decision-line .rule-serious{border-color:#e6aaa4;background:#fff3f1;color:#b84b3e}.rule-decision-line .rule-general{border-color:#c4d6e3;background:#f3f8fb;color:#4c708b}.rule-decision-line b{color:#17374e;font-family:JetBrains Mono,monospace}.rule-decision-line em{margin-left:auto;color:#b45d28;font-size:11px;font-style:normal}.rule-source-card>p{margin:0 0 12px;color:#536c7e;font-size:12px;line-height:1.6}
</style>

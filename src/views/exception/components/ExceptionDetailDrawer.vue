<template>
  <el-drawer v-model="visible" title="异常单详情" size="640" @closed="onClose">
    <div v-if="detail" v-loading="loading" class="detail-body">
      <!-- 头部 -->
      <div class="detail-header">
        <div>
          <div class="detail-no">{{ detail.exceptionNo }}</div>
          <div class="detail-meta">
            {{ detail.createdAt?.slice(0, 16) }} · 创建人：{{ detail.createdBy }}
          </div>
        </div>
        <div class="detail-tags">
          <span class="status-badge" :style="statusStyle(detail.status)">{{ detail.status }}</span>
          <span class="status-badge" :style="capaStyle(detail.capaStatus)">{{ detail.capaStatus || '待发起' }}</span>
          <span v-if="detail.processType" class="status-badge" :style="processStyle(detail.processType)">
            {{ PROCESS_TYPE_LABELS[detail.processType] }}
          </span>
        </div>
      </div>

      <!-- 选择整改流程面板（仅「待发起」且未选择时显示，解决待发起不可交互问题） -->
      <div v-if="showInitiatePanel" class="initiate-panel">
        <div class="initiate-title">请选择整改流程</div>
        <div class="initiate-desc">该异常单尚未发起整改，请选择适用的流程以进入对应处理界面。</div>
        <div class="initiate-btns">
          <el-button type="primary" :loading="initLoading === 'CAPA'" @click="initiate('CAPA')">
            发起 CAPA（改善措施 + 验证）
          </el-button>
          <el-button type="warning" :loading="initLoading === '8D'" @click="initiate('8D')">
            发起 8D（八步报告）
          </el-button>
          <el-button type="success" :loading="initLoading === 'BOTH'" @click="initiate('BOTH')">
            CAPA + 8D 都要
          </el-button>
        </div>
      </div>

      <!-- 标签页 -->
      <el-tabs v-model="activeTab" type="border-card" class="detail-tabs">
        <el-tab-pane label="异常信息" name="info">
          <div class="detail-section">
            <div class="section-title">基本信息</div>
            <div class="detail-grid">
              <div><span class="detail-label">供应商</span><div class="detail-value">{{ detail.supplierName || '-' }}</div></div>
              <div><span class="detail-label">物料代码</span><div class="detail-value font-mono">{{ detail.materialCode || '-' }}</div></div>
              <div><span class="detail-label">严重等级</span><div class="detail-value">{{ detail.severity }}</div></div>
              <div><span class="detail-label">异常来源</span><div class="detail-value">{{ detail.sourceType }}</div></div>
              <div><span class="detail-label">不良数量</span><div class="detail-value">{{ detail.defectQty }} / {{ detail.totalQty }}</div></div>
              <div><span class="detail-label">截止日期</span><div class="detail-value">{{ detail.deadline || '-' }}</div></div>
              <div><span class="detail-label">审核人</span><div class="detail-value">{{ detail.reviewerName || '-' }}</div></div>
              <div><span class="detail-label">通知数</span><div class="detail-value">{{ detail.notificationCount || 0 }}</div></div>
            </div>
            <div class="detail-desc">
              <span class="detail-label">不良描述</span>
              <div class="detail-value" style="color: #B84B3E; margin-top: 6px">{{ detail.defectDesc }}</div>
            </div>
            <div v-if="detail.remark" class="detail-desc">
              <span class="detail-label">备注</span>
              <div class="detail-value" style="margin-top: 6px">{{ detail.remark }}</div>
            </div>
          </div>

          <div v-if="detail.materialInspection" class="detail-section">
            <div class="section-title">关联来料检验</div>
            <div class="detail-grid">
              <div><span class="detail-label">记录编号</span><div class="detail-value font-mono">{{ detail.materialInspection.recordNo }}</div></div>
              <div><span class="detail-label">检验结果</span><div class="detail-value">{{ detail.materialInspection.inspectionResult }}</div></div>
              <div><span class="detail-label">批次号</span><div class="detail-value font-mono">{{ detail.materialInspection.materialBatchNo }}</div></div>
              <div><span class="detail-label">检验日期</span><div class="detail-value">{{ detail.materialInspection.inspectionDate }}</div></div>
            </div>
          </div>

          <div v-if="detail.status !== '已闭环'" class="detail-section close-panel">
            <div class="section-title">线上闭环</div>
            <el-input v-model="closeReason" placeholder="输入闭环原因 / 总结" type="textarea" :rows="2" />
            <el-button type="primary" :disabled="!canClose" :loading="closeLoading" @click="doClose">提交闭环</el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane v-if="showCapaTab" label="CAPA 整改" name="capa">
          <div v-if="detail.capaStatus === '待发起'" class="capa-tip">
            该异常尚未正式发起整改流程，可先在「异常信息」页发起 CAPA / BOTH，或直接在下方录入改善措施与验证记录。
          </div>
          <ExceptionActions
            :exception-id="detail.id"
            :actions="detail.improvementActions || []"
            :readonly="detail.status === '已闭环'"
            @changed="onChanged"
          />
          <ExceptionVerifications
            :exception-id="detail.id"
            :records="detail.verificationRecords || []"
            :readonly="detail.status === '已闭环'"
            @changed="onChanged"
          />
        </el-tab-pane>

        <el-tab-pane v-if="show8DTab" label="8D 报告" name="eightD">
          <ExceptionEightD
            :exception-id="detail.id"
            :eight-d="detail.eightD"
            :readonly="detail.status === '已闭环'"
            @updated="onChanged"
          />
        </el-tab-pane>

        <el-tab-pane v-if="showCapaTab" label="整改计划" name="plan">
          <div v-if="detail.capaStatus === '待发起'" class="capa-tip">
            该异常尚未正式发起整改流程，可先录入整改计划与改善措施，或到「异常信息」页发起 CAPA / BOTH。
          </div>
          <ExceptionRectificationPlans
            :exception-id="detail.id"
            :plans="detail.rectificationPlans || []"
            :readonly="detail.status === '已闭环'"
            @changed="onChanged"
          />
        </el-tab-pane>

        <el-tab-pane label="审核追溯" name="audit">
          <el-timeline v-if="auditLogs.length">
            <el-timeline-item
              v-for="log in auditLogs"
              :key="log.id"
              :timestamp="(log.operationTime || '').slice(0, 19)"
              placement="top"
              :color="AUDIT_OPERATION_COLORS[log.operationType] || '#8C9BA8'"
            >
              <div class="audit-item">
                <div class="audit-head">
                  <span class="audit-op" :style="{ color: AUDIT_OPERATION_COLORS[log.operationType] || '#8C9BA8' }">
                    {{ AUDIT_OPERATION_LABELS[log.operationType] || log.operationType }}
                  </span>
                  <span class="audit-table">{{ AUDIT_TABLE_LABELS[log.tableName] || log.tableName }}</span>
                  <span class="audit-reason">{{ log.reason }}</span>
                </div>
                <div class="audit-meta">操作人：{{ log.operatorName || '-' }} · 分公司：{{ log.plantCode || '-' }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无审计记录" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
// ===== M2: 异常单详情抽屉 =====
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { closeExceptionApi, getExceptionDetailApi, getAuditTrailApi, initiateProcessApi } from '@/api/exception'
import {
  EXCEPTION_STATUS_COLORS,
  CAPA_STATUS_COLORS,
  PROCESS_TYPE_LABELS,
  PROCESS_TYPE_COLORS,
  processIncludesCapa,
  processIncludes8D,
  AUDIT_OPERATION_LABELS,
  AUDIT_OPERATION_COLORS,
  AUDIT_TABLE_LABELS,
} from '@/enums/exception'
import type { ExceptionDetailVO, AuditLog } from '@/types/exception'
import ExceptionActions from './ExceptionActions.vue'
import ExceptionVerifications from './ExceptionVerifications.vue'
import ExceptionEightD from './ExceptionEightD.vue'
import ExceptionRectificationPlans from './ExceptionRectificationPlans.vue'

const props = defineProps<{
  modelValue: boolean
  exceptionId?: number
  /** 打开时默认定位的标签：'capa' | 'eightD' | 'info'（若目标标签不可见则回退 'info'） */
  initialTab?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'changed'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const loading = ref(false)
const detail = ref<ExceptionDetailVO | null>(null)
const activeTab = ref('info')
const closeReason = ref('')
const closeLoading = ref(false)
const initLoading = ref('')
const auditLogs = ref<AuditLog[]>([])

/** 是否展示「选择整改流程」面板：仅 capaStatus=待发起 且 未选流程类型 */
const showInitiatePanel = computed(
  () => !!detail.value && detail.value.capaStatus === '待发起' && !detail.value.processType,
)

/**
 * CAPA 整改标签可见（可达性优化：待发起也露出入口，方便先录措施）：
 * - 明确选了 CAPA/BOTH
 * - 待发起（尚未选流程，允许先录入）
 * - 历史数据（未选类型但已进入整改）
 */
const showCapaTab = computed(
  () =>
    !!detail.value &&
    (processIncludesCapa(detail.value.processType) ||
      detail.value.capaStatus === '待发起' ||
      (!detail.value.processType && detail.value.capaStatus !== '待发起')),
)

/** 8D 报告标签可见：明确选了 8D/BOTH */
const show8DTab = computed(() => !!detail.value && processIncludes8D(detail.value.processType))

const canClose = computed(() => {
  if (!detail.value) return false
  let ok = true
  // CAPA 路径：需 ≥1 条改善措施 DONE + ≥1 条验证通过
  if (showCapaTab.value) {
    const hasDoneAction = detail.value.improvementActions?.some((a) => a.status === 'DONE')
    const hasPassVerify = detail.value.verificationRecords?.some((v) => v.result === '通过')
    if (!hasDoneAction || !hasPassVerify) ok = false
  }
  // 8D 路径：需推进至 D8
  if (processIncludes8D(detail.value.processType)) {
    if (detail.value.eightD?.currentStep !== 'D8') ok = false
  }
  return ok && closeReason.value.trim().length > 0
})

/** 发起整改流程（选择 CAPA / 8D / BOTH） */
async function initiate(type: string) {
  if (!detail.value) return
  initLoading.value = type
  try {
    const res = await initiateProcessApi(detail.value.id, type)
    if (res.code === 0) {
      ElMessage.success(`已发起${PROCESS_TYPE_LABELS[type]}流程`)
      await loadDetail()
      activeTab.value = processIncludes8D(type) && !processIncludesCapa(type) ? 'eightD' : 'capa'
      emit('changed')
    }
  } catch (e) {
    console.error('发起流程失败', e)
  } finally {
    initLoading.value = ''
  }
}

async function loadDetail() {
  if (!props.exceptionId) return
  loading.value = true
  try {
    const res = await getExceptionDetailApi(props.exceptionId)
    if (res.code === 0) {
      detail.value = res.data
      applyInitialTab()
      await loadAuditTrail()
    }
  } catch (e) {
    console.error('加载异常详情失败', e)
  } finally {
    loading.value = false
  }
}

async function doClose() {
  if (!detail.value) return
  closeLoading.value = true
  try {
    const res = await closeExceptionApi(detail.value.id, { closeReason: closeReason.value })
    if (res.code === 0) {
      ElMessage.success('闭环成功')
      closeReason.value = ''
      emit('changed')
      visible.value = false
    }
  } catch (e) {
    console.error('闭环失败', e)
  } finally {
    closeLoading.value = false
  }
}

/** 按 initialTab 定位标签（目标标签不可见时回退到「异常信息」） */
function applyInitialTab() {
  const t = props.initialTab
  if (!t || t === 'info') return
  if (t === 'capa' && showCapaTab.value) activeTab.value = 'capa'
  else if (t === 'eightD' && show8DTab.value) activeTab.value = 'eightD'
  else if (t === 'plan' && showCapaTab.value) activeTab.value = 'plan'
  else if (t === 'audit') activeTab.value = 'audit'
  else activeTab.value = 'info'
}

/** 加载审核追溯时间线（聚合该异常单全链路的审计日志） */
async function loadAuditTrail() {
  if (!props.exceptionId) return
  try {
    const res = await getAuditTrailApi(props.exceptionId)
    if (res.code === 0) auditLogs.value = res.data
  } catch (e) {
    console.error('加载审计追溯失败', e)
  }
}

function onChanged() {
  loadDetail()
  emit('changed')
}

function onClose() {
  activeTab.value = 'info'
  closeReason.value = ''
  detail.value = null
}

function statusStyle(v: string) {
  const c = EXCEPTION_STATUS_COLORS[v] || '#8C9BA8'
  return { color: c, background: c + '18', borderColor: c + '40' }
}
function capaStyle(v?: string) {
  const c = CAPA_STATUS_COLORS[v || '待发起'] || '#8C9BA8'
  return { color: c, background: c + '18', borderColor: c + '40' }
}
function processStyle(v?: string) {
  const c = PROCESS_TYPE_COLORS[v || 'CAPA'] || '#1B3A5B'
  return { color: c, background: c + '18', borderColor: c + '40' }
}

watch(
  () => props.exceptionId,
  (id) => {
    if (id && props.modelValue) loadDetail()
  },
  { immediate: true },
)

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.exceptionId) loadDetail()
  },
)
</script>

<style scoped>
.detail-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 16px;
}
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0ede9;
}
.detail-no {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  color: #1b3a5b;
}
.detail-meta {
  font-size: 12px;
  color: #8c9ba8;
  margin-top: 4px;
}
.detail-tags {
  display: flex;
  gap: 8px;
}
.detail-tabs :deep(.el-tabs__content) {
  padding: 16px;
  background: #fff;
  border: 1px solid #e3e0dc;
  border-top: none;
}
.detail-section {
  background: #faf9f7;
  border: 1px solid #f0ede9;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5b;
  margin-bottom: 12px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.detail-label {
  font-size: 11px;
  color: #8c9ba8;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}
.detail-value {
  font-size: 13px;
  color: #2a2a2a;
}
.font-mono {
  font-family: 'JetBrains Mono', monospace;
}
.detail-desc {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #f0ede9;
}
.status-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid;
  white-space: nowrap;
}
.close-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.close-panel :deep(.el-button) {
  align-self: flex-start;
}
.initiate-panel {
  background: #f3f7fb;
  border: 1px solid #cfe0ee;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}
.initiate-title {
  font-size: 14px;
  font-weight: 700;
  color: #1b3a5b;
  margin-bottom: 4px;
}
.initiate-desc {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 12px;
}
.initiate-btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.capa-tip {
  background: #fbf3e8;
  border: 1px solid #ecd9bf;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  color: #97632a;
  margin-bottom: 12px;
  line-height: 1.5;
}
.audit-item {
  background: #faf9f7;
  border: 1px solid #f0ede9;
  border-radius: 6px;
  padding: 10px 12px;
}
.audit-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.audit-op {
  font-size: 12px;
  font-weight: 700;
}
.audit-table {
  font-size: 12px;
  color: #1b3a5b;
  background: #eef2f7;
  border: 1px solid #dde5ee;
  border-radius: 2px;
  padding: 1px 6px;
}
.audit-reason {
  font-size: 12px;
  color: #2a2a2a;
}
.audit-meta {
  font-size: 11px;
  color: #8c9ba8;
  margin-top: 6px;
}
</style>

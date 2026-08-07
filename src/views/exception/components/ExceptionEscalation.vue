<template>
  <div class="escalation-panel">
    <div class="panel-header">
      <span class="panel-title">供应商升级管理</span>
      <div class="panel-actions">
        <span class="check-config-label">窗口</span>
        <el-input-number v-model="checkForm.daysWindow" :min="1" :max="365" :controls="false" size="small" class="check-number" />
        <span class="check-config-label">天 / 阈值</span>
        <el-input-number v-model="checkForm.minRepeatCount" :min="1" :max="99" :controls="false" size="small" class="check-number" />
        <span class="check-config-label">次</span>
        <el-button type="warning" size="small" :loading="checkLoading" @click="checkEscalation">
          检查升级
        </el-button>
        <el-button type="primary" size="small" @click="openForm()">发起升级</el-button>
      </div>
    </div>

    <div class="panel-filter">
      <el-radio-group v-model="filterStatus" size="small" @change="loadList">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="PENDING_REVIEW">待审核</el-radio-button>
        <el-radio-button value="ACTIVE">进行中</el-radio-button>
        <el-radio-button value="REJECTED">已驳回</el-radio-button>
        <el-radio-button value="CLOSED">已关闭</el-radio-button>
      </el-radio-group>
    </div>

    <el-table :data="list" size="small" stripe v-loading="loading" class="escalation-table">
      <el-table-column type="index" label="序号" width="55" align="center" />
      <el-table-column label="供应商 / 物料" min-width="145"><template #default="{ row }"><b>{{ row.supplierName || row.supplierCode || '未命名供应商' }}</b><small>{{ row.materialCode || '—' }}</small></template></el-table-column>
      <el-table-column prop="escalationReason" label="升级原因" min-width="160" show-overflow-tooltip />
      <el-table-column prop="escalationAction" label="升级动作" width="100" />
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <span class="status-tag" :style="{ color: statusColor(row.status), background: statusColor(row.status) + '18', borderColor: statusColor(row.status) + '40' }">
            {{ statusLabel(row.status) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="发起时间" width="150">
        <template #default="{ row }">{{ row.createdAt?.slice(0, 16) }}</template>
      </el-table-column>
      <el-table-column prop="closedAt" label="关闭时间" width="150">
        <template #default="{ row }">{{ row.closedAt?.slice(0, 16) || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openWorkflow(row)">查看/处理</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="query.page"
      v-model:page-size="query.size"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      size="small"
      @change="loadList"
    />

    <!-- 发起升级弹窗 -->
    <el-dialog v-model="dialogVisible" title="发起供应商升级" width="520">
      <el-form :model="form" label-width="100px">
        <el-form-item label="供应商ID">
          <el-input
            v-model="form.supplierId"
            :disabled="supplierLocked"
            type="text"
            maxlength="64"
            placeholder="请输入供应商ID（支持字母、编号等，如 abc、S-001）"
          />
        </el-form-item>
        <el-form-item label="物料编码">
          <el-input v-model="form.materialCode" placeholder="从升级检查创建时会自动带入" />
        </el-form-item>
        <el-form-item label="升级原因">
          <el-input v-model="form.escalationReason" type="textarea" :rows="3" placeholder="例如：90天内同类不良≥3次" />
        </el-form-item>
        <el-form-item label="升级动作">
          <el-select v-model="form.escalationAction" placeholder="请选择" style="width: 100%">
            <el-option label="加密审核" value="加密审核" />
            <el-option label="暂停供货" value="暂停供货" />
            <el-option label="专项CAPA" value="专项CAPA" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联异常单">
          <el-input v-model="form.relatedExceptionIds" placeholder="多个异常单ID用逗号分隔" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submit">确定</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="workflowVisible" size="620px" title="供应商升级闭环">
      <template v-if="workflowRow">
        <div class="workflow-head"><b>{{ workflowRow.supplierName || workflowRow.supplierCode }}</b><span>{{ stageLabel(workflowRow.processStage) }}</span></div>
        <el-steps :active="stageIndex(workflowRow.processStage)" finish-status="success" align-center>
          <el-step title="发起" /><el-step title="审核" /><el-step title="措施" /><el-step title="执行" /><el-step title="验证" /><el-step title="关闭" />
        </el-steps>
        <el-divider />
        <div class="timeline-card"><b>发起升级</b><p>{{ workflowRow.escalationReason }}</p><small>{{ workflowRow.createdBy }} · {{ workflowRow.createdAt?.slice(0, 16) }}</small></div>
        <div v-if="workflowRow.reviewedAt" class="timeline-card"><b>质量经理审核</b><p>{{ workflowRow.reviewOpinion }}</p><small>{{ workflowRow.reviewedBy }} · {{ workflowRow.reviewedAt?.slice(0, 16) }}</small></div>
        <div v-if="workflowRow.actionPlan" class="timeline-card"><b>升级措施</b><p>{{ workflowRow.actionPlan }}</p><small>责任人：{{ workflowRow.ownerName }}，填写人：{{ workflowRow.planFilledBy || '-' }}，期限：{{ workflowRow.dueDate || '-' }}</small></div>
        <div v-if="workflowRow.executionRecord" class="timeline-card"><b>执行跟踪</b><p>{{ workflowRow.executionRecord }}</p><small>{{ workflowRow.executedBy }} · {{ workflowRow.executedAt?.slice(0, 16) }}</small></div>
        <div v-if="workflowRow.verifiedAt" class="timeline-card"><b>效果验证：{{ workflowRow.verificationResult === 'PASS' ? '通过' : '不通过' }}</b><p>{{ workflowRow.verificationEvidence }}</p><small>{{ workflowRow.verifiedBy }} · {{ workflowRow.verifiedAt?.slice(0, 16) }}</small></div>
        <div v-if="workflowRow.closedAt" class="timeline-card"><b>关闭审批</b><p>{{ workflowRow.closeReason }}</p><small>{{ workflowRow.closedBy }} · {{ workflowRow.closedAt?.slice(0, 16) }}</small></div>
        <el-form v-if="workflowRow.processStage === 'PLAN'" :model="workflowForm" label-width="92px" class="workflow-form"><el-form-item label="升级措施"><el-input v-model="workflowForm.actionPlan" type="textarea" /></el-form-item><el-form-item label="责任人"><el-input v-model="workflowForm.ownerName" /></el-form-item><el-form-item label="填写人"><el-input :model-value="workflowRow.planFilledBy || '提交后自动绑定当前账号'" disabled /></el-form-item><el-form-item label="完成期限"><el-date-picker v-model="workflowForm.dueDate" value-format="YYYY-MM-DD" /></el-form-item><el-button type="primary" @click="submitPlan">提交措施</el-button></el-form>
        <el-form v-else-if="workflowRow.processStage === 'EXECUTION'" :model="workflowForm" class="workflow-form"><el-form-item label="执行记录"><el-input v-model="workflowForm.executionRecord" type="textarea" /></el-form-item><el-button type="primary" @click="submitExecution">提交执行记录</el-button></el-form>
        <el-form v-else-if="workflowRow.processStage === 'VERIFICATION'" :model="workflowForm" class="workflow-form"><el-form-item label="验证结论"><el-radio-group v-model="workflowForm.result"><el-radio value="PASS">通过</el-radio><el-radio value="FAIL">不通过</el-radio></el-radio-group></el-form-item><el-form-item label="验证依据"><el-input v-model="workflowForm.evidence" type="textarea" /></el-form-item><el-button type="primary" @click="submitVerification">提交验证</el-button></el-form>
        <el-form v-else-if="workflowRow.processStage === 'PENDING_CLOSE_APPROVAL'" :model="workflowForm" class="workflow-form"><el-form-item label="审批意见"><el-input v-model="workflowForm.reason" type="textarea" /></el-form-item><el-button type="success" @click="submitClose">审批关闭</el-button></el-form>
        <div v-else-if="workflowRow.processStage === 'PENDING_REVIEW'" class="workflow-tip">质量经理审核后才可进入制定措施。<el-button link type="primary" @click="openReview(workflowRow, 'APPROVE')">审核通过</el-button><el-button link type="danger" @click="openReview(workflowRow, 'REJECT')">驳回</el-button></div>
      </template>
    </el-drawer>

    <el-dialog v-model="reviewVisible" :title="reviewDecision === 'APPROVE' ? '通过升级审核' : '驳回升级审核'" width="480">
      <div v-if="reviewRow" class="review-context">
        <b>{{ reviewRow.supplierName || reviewRow.supplierCode }}</b>
        <span>{{ reviewRow.escalationReason }}</span>
        <p>建议措施：{{ reviewRow.escalationAction }}</p>
      </div>
      <el-input v-model="reviewOpinion" type="textarea" :rows="4" placeholder="请输入审核意见和执行要求" />
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button :type="reviewDecision === 'APPROVE' ? 'primary' : 'danger'" :loading="reviewLoading" @click="submitReview">确认</el-button>
      </template>
    </el-dialog>

    <!-- 触发升级结果弹窗 -->
    <el-dialog v-model="checkResultVisible" title="升级检查结果" width="560">
      <div v-if="checkResult" class="check-result-body">
        <p class="check-summary">已检查 {{ checkResult.totalChecked }} 家供应商，触发 {{ checkResult.triggeredSuppliers?.length || 0 }} 家</p>
        <el-table :data="checkResult.triggeredSuppliers || []" size="small" stripe>
          <el-table-column prop="supplierName" label="供应商" min-width="120" />
          <el-table-column prop="materialCode" label="物料" min-width="110" />
          <el-table-column prop="defectDesc" label="最近不良描述" min-width="120" />
          <el-table-column prop="repeatCount" label="重复次数" width="90" align="center" />
          <el-table-column label="操作" width="90" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="quickCreate(row)">升级</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// ===== M2: 供应商升级管理组件 =====
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getEscalationListApi,
  createEscalationApi,
  checkEscalationApi,
  reviewEscalationApi,
  submitEscalationPlanApi, submitEscalationExecutionApi, submitEscalationVerificationApi, closeEscalationApi,
} from '@/api/escalation'
import { EscalationStatusEnum } from '@/enums/exception'
import type { Escalation, EscalationCheckResultVO, TriggeredSupplier } from '@/types/escalation'
import { useAuthStore } from '@/stores/auth'

const loading = ref(false)
const checkLoading = ref(false)
const submitLoading = ref(false)
const list = ref<Escalation[]>([])
const total = ref(0)
const filterStatus = ref('')
const query = reactive({ page: 1, size: 10 })
const checkForm = reactive({ daysWindow: 90, minRepeatCount: 3 })

const dialogVisible = ref(false)
const checkResultVisible = ref(false)
const checkResult = ref<EscalationCheckResultVO | null>(null)
const reviewVisible = ref(false)
const reviewLoading = ref(false)
const reviewRow = ref<Escalation | null>(null)
const reviewDecision = ref<'APPROVE' | 'REJECT'>('APPROVE')
const reviewOpinion = ref('')
const workflowVisible = ref(false)
const workflowRow = ref<Escalation | null>(null)
const workflowForm = reactive({ actionPlan: '', ownerName: '', dueDate: '', executionRecord: '', result: 'PASS' as 'PASS' | 'FAIL', evidence: '', reason: '' })

const auth = useAuthStore()

const form = reactive({
  supplierId: '' as string,
  materialCode: '',
  escalationReason: '',
  escalationAction: '加密审核',
  relatedExceptionIds: '',
  remark: '',
})
const supplierLocked = ref(false)

async function loadList() {
  loading.value = true
  try {
    const res = await getEscalationListApi({
      page: query.page,
      size: query.size,
      status: filterStatus.value,
    })
    if (res.code === 0) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch (e) {
    console.error('加载升级列表失败', e)
  } finally {
    loading.value = false
  }
}

async function checkEscalation() {
  checkLoading.value = true
  try {
    const res = await checkEscalationApi({
      daysWindow: checkForm.daysWindow,
      minRepeatCount: checkForm.minRepeatCount,
    })
    if (res.code === 0) {
      checkResult.value = res.data
      checkResultVisible.value = true
      ElMessage.success('升级检查完成')
    }
  } catch (e) {
    console.error('升级检查失败', e)
  } finally {
    checkLoading.value = false
  }
}

function openForm() {
  supplierLocked.value = false
  form.supplierId = ''
  form.materialCode = ''
  form.escalationReason = ''
  form.escalationAction = '加密审核'
  form.relatedExceptionIds = ''
  form.remark = ''
  dialogVisible.value = true
}

function quickCreate(row: TriggeredSupplier) {
  if (!row.supplierId) {
    ElMessage.warning('该来料记录尚未匹配供应商主数据，请使用自动升级任务处理')
    return
  }
  form.supplierId = String(row.supplierId)
  supplierLocked.value = true
  form.materialCode = row.materialCode || ''
  form.escalationReason = `${row.defectDesc} 在 ${row.windowDays} 天内重复发生 ${row.repeatCount} 次`
  form.escalationAction = '加密审核'
  form.relatedExceptionIds = row.relatedExceptionIds.join(',')
  checkResultVisible.value = false
  dialogVisible.value = true
}

async function submit() {
  if (!form.supplierId) {
    ElMessage.warning('请输入供应商ID')
    return
  }
  if (!form.escalationReason.trim()) {
    ElMessage.warning('请输入升级原因')
    return
  }
  submitLoading.value = true
  try {
    const res = await createEscalationApi({
      supplierId: form.supplierId,
      materialCode: form.materialCode,
      escalationReason: form.escalationReason,
      escalationAction: form.escalationAction,
      relatedExceptionIds: form.relatedExceptionIds,
      remark: form.remark,
    })
    if (res.code === 0) {
      ElMessage.success('升级发起成功')
      dialogVisible.value = false
      loadList()
    }
  } catch (e) {
    console.error('发起升级失败', e)
  } finally {
    submitLoading.value = false
  }
}

function openWorkflow(row: Escalation) {
  workflowRow.value = row
  // 责任人默认绑定当前登录用户（已指定则保持原值）
  workflowForm.ownerName = row.ownerName || auth.user?.realName || auth.user?.account || ''
  workflowVisible.value = true
}
function stageLabel(stage?: string) { return ({ PENDING_REVIEW: '待审核', PLAN: '制定措施', EXECUTION: '执行跟踪', VERIFICATION: '效果验证', PENDING_CLOSE_APPROVAL: '待关闭审批', CLOSED: '已关闭', REJECTED: '已驳回' } as Record<string, string>)[stage || ''] || '待审核' }
function stageIndex(stage?: string) { return ({ PENDING_REVIEW: 1, PLAN: 2, EXECUTION: 3, VERIFICATION: 4, PENDING_CLOSE_APPROVAL: 5, CLOSED: 6 } as Record<string, number>)[stage || ''] || 1 }
async function refreshWorkflow(call: Promise<any>, text: string) { const res = await call; if (res.code === 0) { workflowRow.value = res.data; ElMessage.success(text); loadList() } }
async function submitPlan() { if (!workflowRow.value || !workflowForm.actionPlan || !workflowForm.ownerName) { return ElMessage.warning('请填写措施和责任人'); } await refreshWorkflow(submitEscalationPlanApi(workflowRow.value.id, workflowForm), '升级措施已提交') }
async function submitExecution() { if (!workflowRow.value || !workflowForm.executionRecord) { return ElMessage.warning('请填写执行记录'); } await refreshWorkflow(submitEscalationExecutionApi(workflowRow.value.id, { executionRecord: workflowForm.executionRecord }), '执行记录已提交') }
async function submitVerification() { if (!workflowRow.value || !workflowForm.evidence) { return ElMessage.warning('请填写验证依据'); } await refreshWorkflow(submitEscalationVerificationApi(workflowRow.value.id, { result: workflowForm.result, evidence: workflowForm.evidence }), '验证结果已提交') }
async function submitClose() { if (!workflowRow.value || !workflowForm.reason) { return ElMessage.warning('请填写审批意见'); } await refreshWorkflow(closeEscalationApi(workflowRow.value.id, { reason: workflowForm.reason }), '升级单已关闭') }

function statusColor(v: string) {
  if (v === 'PENDING_REVIEW') return '#B8763E'
  if (v === 'REJECTED') return '#B84B3E'
  return v === EscalationStatusEnum.ACTIVE ? '#3E6B95' : '#3E7A4E'
}

function statusLabel(v: string) {
  return ({ PENDING_REVIEW: '待审核', ACTIVE: '进行中', REJECTED: '已驳回', CLOSED: '已关闭' } as Record<string, string>)[v] || v
}

function openReview(row: Escalation, decision: 'APPROVE' | 'REJECT') {
  reviewRow.value = row
  reviewDecision.value = decision
  reviewOpinion.value = ''
  reviewVisible.value = true
}

async function submitReview() {
  if (!reviewRow.value || !reviewOpinion.value.trim()) {
    ElMessage.warning('请输入审核意见')
    return
  }
  reviewLoading.value = true
  try {
    const res = await reviewEscalationApi(reviewRow.value.id, {
      decision: reviewDecision.value,
      opinion: reviewOpinion.value.trim(),
    })
    if (res.code === 0) {
      // 抽屉仍持有审核前的对象；审核接口返回的是已进入下一阶段的最新升级单。
      // 立即同步它，才能将“审核通过/驳回”操作区切换为“制定措施”表单。
      workflowRow.value = res.data
      ElMessage.success('升级审核已完成')
      reviewVisible.value = false
      loadList()
    }
  } finally {
    reviewLoading.value = false
  }
}

onMounted(loadList)
</script>

<style scoped>
.escalation-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5b;
}
.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.check-config-label { color: #657b8d; font-size: 12px; white-space: nowrap; }
.check-number { width: 64px; }
.panel-filter {
  display: flex;
  justify-content: flex-end;
}
.status-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid;
}
.check-result-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.check-summary {
  margin: 0;
  font-size: 13px;
  color: #5b6770;
}
.escalation-table b,.escalation-table small{display:block}.escalation-table small{margin-top:3px;color:#8192a3;font-size:11px}.review-context{margin-bottom:14px;padding:13px;border-left:3px solid #b8763e;background:#f7f9fa}.review-context b,.review-context span{display:block}.review-context span{margin-top:5px;color:#657b8d;font-size:12px}.review-context p{margin:8px 0 0;color:#9a5624;font-size:12px}
.workflow-head{display:flex;justify-content:space-between;margin-bottom:22px}.workflow-head span{color:#b8763e}.timeline-card{margin:12px 0;padding:12px;border-left:3px solid #5d87ad;background:#f7f9fb}.timeline-card p{margin:6px 0;color:#455b6f}.timeline-card small{color:#8091a0}.workflow-form{margin-top:22px;padding:16px;background:#f6f9fb}.workflow-tip{margin-top:18px;color:#697b89}
</style>

<template>
  <div class="exception-page">
    <header class="page-header">
      <div>
        <h1>异常管理与整改</h1>
        <p>异常处置工作台 · {{ auth.user?.plantName || '当前分公司' }}</p>
      </div>
      <div class="header-actions">
        <QualityRuleDialog />
        <el-button type="success" @click="openCreate">新建异常单</el-button>
        <el-button :loading="checkLoading" @click="checkEscalation">检查升级</el-button>
        <el-button type="primary" @click="escalationVisible = true">升级管理</el-button>
      </div>
    </header>

    <el-alert type="info" :closable="false" show-icon style="margin-bottom: 14px">
      <template #title>操作权限说明</template>
      整改录入由检验员、质量工程师、SQE、质量经理及超级管理员执行；异常闭环和供应商升级审核仅由质量经理或超级管理员审批。当前账号：{{ auth.user?.roleName || '未登录' }}。
    </el-alert>

    <section class="priority-band" v-loading="statsLoading">
      <div class="priority-stat danger"><span>超期未闭环</span><b>{{ stats?.overdueCount ?? 0 }}</b></div>
      <div class="priority-stat warning"><span>严重待整改</span><b>{{ seriousPendingCount }}</b></div>
      <div class="priority-stat info"><span>待验证</span><b>{{ stats?.pendingVerifyCount ?? 0 }}</b></div>
      <div class="priority-message"><span>今日优先</span><strong>{{ priorityMessage }}</strong></div>
    </section>

    <section class="workbar">
      <el-input v-model="keyword" clearable placeholder="异常单号 / 供应商 / 不良描述" class="keyword" @input="activeQuick = 'all'; query.page = 1" />
      <div class="quick-tabs">
        <button v-for="item in quickFilters" :key="item.key" :class="{ active: activeQuick === item.key }" @click="activeQuick = item.key; query.page = 1">
          {{ item.label }} <b>{{ item.count }}</b>
        </button>
      </div>
      <el-select v-model="query.status" clearable placeholder="全部状态" @change="query.page = 1">
        <el-option label="待整改" value="待整改" />
        <el-option label="整改中" value="整改中" />
        <el-option label="待验证" value="待验证" />
        <el-option label="已闭环" value="已闭环" />
      </el-select>
      <el-select v-model="query.sourceType" clearable placeholder="全部来源" @change="query.page = 1"><el-option v-for="item in sourceOptions" :key="item" :label="item" :value="item" /></el-select>
      <el-select v-model="query.processType" clearable placeholder="全部流程" @change="query.page = 1"><el-option label="CAPA 整改" value="CAPA" /><el-option label="8D 报告" value="8D" /><el-option label="CAPA + 8D" value="BOTH" /></el-select>
    </section>

    <div class="workbench-grid">
      <section class="worklist-card">
        <div class="section-head"><div><h2>待处理异常</h2><p>按当前风险优先级排序，点击“立即处理”进入整改流程。</p></div><el-pagination v-model:current-page="query.page" v-model:page-size="query.size" :total="visibleList.length" :page-sizes="pageSizeOptions" layout="total, sizes, prev, pager, next" size="small" @size-change="onSizeChange" /></div>
        <el-table :data="pagedList" v-loading="listLoading" class="worklist-table">
          <el-table-column label="优先级" width="78" align="center"><template #default="{ row }"><span class="severity" :class="row.severity === '严重' ? 'serious' : 'general'">{{ row.severity }}</span></template></el-table-column>
          <el-table-column label="自动判定" width="100" align="center"><template #default="{ row }"><b class="process-label">{{ row.processType || '待选择' }}</b><button class="reason-link" @click.stop="showDecision(row)">查看依据</button></template></el-table-column>
          <el-table-column prop="exceptionNo" label="异常单号" min-width="145"><template #default="{ row }"><span class="mono">{{ row.exceptionNo }}</span></template></el-table-column>
          <el-table-column label="供应商 / 物料" min-width="150"><template #default="{ row }"><b>{{ row.supplierName || '未关联供应商' }}</b><small>{{ row.materialCode || '—' }}</small></template></el-table-column>
          <el-table-column prop="defectDesc" label="不良描述" min-width="150" show-overflow-tooltip />
          <el-table-column label="当前阶段" width="130"><template #default="{ row }"><span class="stage-text">{{ stageLabel(row) }}</span></template></el-table-column>
          <el-table-column label="责任人" width="100"><template #default="{ row }"><span class="owner-text">{{ row.createdBy || '待分配' }}</span></template></el-table-column>
          <el-table-column label="截止日期" width="112"><template #default="{ row }"><span :class="deadlineClass(row)">{{ deadlineText(row) }}</span></template></el-table-column>
          <el-table-column label="操作" width="105" fixed="right"><template #default="{ row }"><el-button link type="success" @click.stop="goDetail(row)">{{ isUrgent(row) ? '立即处理' : '处理' }}</el-button></template></el-table-column>
        </el-table>
      </section>

      <aside class="risk-sidebar">
        <section class="side-card"><h2>风险聚焦</h2><div class="side-label"><span>不良描述</span><span>异常数量 / 占比</span></div><div v-for="item in riskItems" :key="item.name" class="risk-row">
  <el-tooltip :content="item.name" placement="top" :disabled="!isRiskNameTruncated(item.name)">
    <span class="risk-name"><span v-if="riskTag(item.name)" class="risk-tag" :class="riskTag(item.name)?.cls">{{ riskTag(item.name)?.label }}</span>{{ riskDisplayName(item.name) }}</span>
  </el-tooltip>
  <div class="risk-meter"><i :style="{ width: `${riskWidth(item.count)}%` }"></i></div><b>{{ item.count }}</b><em>{{ item.ratio }}%</em>
</div><el-empty v-if="!riskItems.length" description="暂无分析数据" :image-size="44" /></section>
        <section class="side-card"><h2>供应商升级</h2><div v-for="item in supplierAlerts" :key="item.supplierId" class="supplier-alert"><div><b>{{ item.supplierName }}</b><small>重复异常：{{ item.occurrenceCount }} 次 · {{ item.topDefectDesc || '待分析' }}</small></div><el-button link type="success" @click="goSupplier(item.supplierId)">查看</el-button></div><el-empty v-if="!supplierAlerts.length" description="暂无升级关注供应商" :image-size="44" /></section>
        <section class="closure-card"><div><span>本月闭环率</span><b>{{ stats?.closureRate ?? 0 }}%</b></div><span>目标 85%</span><div class="closure-track"><i :style="{ width: `${Math.min(stats?.closureRate ?? 0, 100)}%` }"></i><em></em></div></section>
      </aside>
    </div>

    <el-dialog v-model="decisionVisible" title="自动判定依据" width="620">
      <div v-if="decisionRow" class="decision-dialog">
        <div class="decision-summary">
          <span class="severity" :class="decisionRow.severity === '严重' ? 'serious' : 'general'">{{ decisionRow.severity }}</span>
          <strong>{{ decisionRow.processType || '待选择流程' }}</strong>
          <em>{{ decisionRow.notificationLevel || '提醒' }}通知</em>
        </div>
        <section><strong>实际命中原因</strong><p>{{ decisionRow.ruleReason || '历史数据未记录自动判定依据' }}</p></section>
        <div class="decision-metrics">
          <div><span>30天重复</span><b>{{ decisionRow.repeatCount30Days ?? '—' }} 批</b></div>
          <div><span>90天重复</span><b>{{ decisionRow.repeatCount90Days ?? '—' }} 批</b></div>
          <div><span>处理方式</span><b>{{ decisionRow.handlingMethod || '待确认' }}</b></div>
        </div>
        <section><strong>系统动作</strong><p>自动发起 {{ decisionRow.processType || '整改' }}，首次响应截止 {{ formatDateTime(decisionRow.responseDeadline) }}，整改截止 {{ decisionRow.deadline || '待设置' }}。</p></section>
        <p class="decision-source">质量判断只读取来料检验入库审核表，不使用关键物料绑定清单。</p>
      </div>
    </el-dialog>
    <el-dialog v-model="escalationVisible" title="供应商升级管理" width="980" destroy-on-close><ExceptionEscalation /></el-dialog>
    <!-- 新建异常单 -->
    <el-dialog v-model="createVisible" title="新建异常单" width="600" @closed="resetCreateForm">
      <el-form ref="createFormRef" :model="createForm" :rules="createFormRules" label-width="100px">
        <el-form-item label="来源类型" prop="sourceType">
          <el-select v-model="createForm.sourceType" placeholder="选择来源类型" style="width: 100%">
            <el-option v-for="s in SOURCE_TYPE_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="严重等级" prop="severity">
          <el-select v-model="createForm.severity" placeholder="选择严重等级" style="width: 100%">
            <el-option v-for="s in SEVERITY_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="供应商名称" prop="supplierName">
          <el-input v-model="createForm.supplierName" placeholder="选填，如来自供应商" maxlength="100" />
        </el-form-item>
        <el-form-item label="物料编码" prop="materialCode">
          <el-input v-model="createForm.materialCode" placeholder="选填" maxlength="50" />
        </el-form-item>
        <el-form-item label="不良描述" prop="defectDesc">
          <el-input v-model="createForm.defectDesc" type="textarea" :rows="3" placeholder="请输入不良现象的详细描述" maxlength="500" />
        </el-form-item>
        <el-form-item label="不良数量" prop="defectQty">
          <el-input-number v-model="createForm.defectQty" :min="0" :step="1" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="总数量" prop="totalQty">
          <el-input-number v-model="createForm.totalQty" :min="0" :step="1" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="整改截止" prop="deadline">
          <el-date-picker v-model="createForm.deadline" type="date" placeholder="选填" style="width: 100%" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="createForm.remark" type="textarea" :rows="2" placeholder="选填" maxlength="300" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSaving" @click="submitCreate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { getExceptionAnalysisApi, getExceptionListApi, getExceptionStatsApi, getSupplierExceptionSummaryApi, checkEscalationApi, createExceptionApi } from '@/api/exception'
import type { ExceptionAnalysisItem, ExceptionOrder, ExceptionStats, SupplierExceptionSummary } from '@/types/exception'
import ExceptionEscalation from './components/ExceptionEscalation.vue'
import QualityRuleDialog from '@/components/quality/QualityRuleDialog.vue'

const auth = useAuthStore()
const router = useRouter()
const stats = ref<ExceptionStats | null>(null)
const statsLoading = ref(false)
const listLoading = ref(false)
const checkLoading = ref(false)
const escalationVisible = ref(false)
const decisionVisible = ref(false)
const decisionRow = ref<ExceptionOrder | null>(null)
const pageList = ref<ExceptionOrder[]>([])
const pageTotal = ref(0)
const analysisItems = ref<ExceptionAnalysisItem[]>([])

// ── 新建异常单 ──
const SOURCE_TYPE_OPTIONS = [
  { value: '来料不良', label: '来料不良' },
  { value: '首件不良', label: '首件不良' },
  { value: '成品不良', label: '成品不良' },
  { value: '客诉', label: '客诉' },
  { value: '过程异常', label: '过程异常' },
  { value: '其他', label: '其他' },
]
const SEVERITY_OPTIONS = [
  { value: '严重', label: '严重' },
  { value: '一般', label: '一般' },
]
const createVisible = ref(false)
const createSaving = ref(false)
const createFormRef = ref()
const createForm = reactive({
  sourceType: '' as string,
  severity: '' as string,
  supplierName: '',
  materialCode: '',
  defectDesc: '',
  defectQty: 0 as number,
  totalQty: 0 as number,
  deadline: '' as string,
  remark: '',
})
const createFormRules = {
  sourceType: [{ required: true, message: '请选择来源类型', trigger: 'change' }],
  severity: [{ required: true, message: '请选择严重等级', trigger: 'change' }],
  defectDesc: [{ required: true, message: '请输入不良描述', trigger: 'blur' }],
}
const suppliers = ref<SupplierExceptionSummary[]>([])
const keyword = ref('')
const activeQuick = ref<'all' | 'overdue' | 'serious' | 'verify'>('all')
const PAGE_SIZE_KEY = 'qms:exception:pageSize'
const pageSizeOptions = [10, 20, 50, 100] as const
function loadSavedPageSize(): number {
  const saved = Number(localStorage.getItem(PAGE_SIZE_KEY))
  return (pageSizeOptions as readonly number[]).includes(saved) ? saved : 20
}
const query = reactive({ page: 1, size: loadSavedPageSize(), status: '', sourceType: '', processType: '' })
const sourceOptions = ['来料不良', '首件不良', '成品不良', '客诉', '过程异常', '其他']

const seriousPendingCount = computed(() => pageList.value.filter(x => x.severity === '严重' && x.status !== '已闭环').length)
const quickFilters = computed(() => [{ key: 'all' as const, label: '全部', count: stats.value?.totalExceptions ?? 0 }, { key: 'overdue' as const, label: '超期', count: stats.value?.overdueCount ?? 0 }, { key: 'serious' as const, label: '严重', count: seriousPendingCount.value }, { key: 'verify' as const, label: '待验证', count: stats.value?.pendingVerifyCount ?? 0 }])
const priorityMessage = computed(() => stats.value?.overdueCount ? `${stats.value.overdueCount} 项异常已超期，请优先处理。` : '当前没有超期异常，继续跟踪待验证项。')
const riskItems = computed(() => analysisItems.value.slice(0, 3))
const supplierAlerts = computed(() => suppliers.value.slice(0, 2))
const visibleList = computed(() => pageList.value.filter(row => {
  if (query.status && row.status !== query.status) { return false }
  if (query.sourceType && row.sourceType !== query.sourceType) { return false }
  if (query.processType && row.processType !== query.processType) { return false }
  const text = `${row.exceptionNo} ${row.supplierName || ''} ${row.defectDesc || ''}`.toLowerCase()
  if (keyword.value && !text.includes(keyword.value.toLowerCase())) { return false }
  if (activeQuick.value === 'overdue') { return daysUntil(row.deadline) < 0 && row.status !== '已闭环' }
  if (activeQuick.value === 'serious') { return row.severity === '严重' && row.status !== '已闭环' }
  return activeQuick.value !== 'verify' || row.status === '待验证'
}))

function daysUntil(deadline?: string) { if (!deadline) { return 999; } const now = new Date(); now.setHours(0,0,0,0); return Math.round((new Date(`${deadline}T00:00:00`).getTime() - now.getTime()) / 86400000) }
function deadlineText(row: ExceptionOrder) { const d = daysUntil(row.deadline); if (!row.deadline) { return '未设置'; } if (d < 0) { return `已超期${Math.abs(d)}天`; } if (d === 0) { return '今天'; } return `剩余${d}天` }
function deadlineClass(row: ExceptionOrder) { const d = daysUntil(row.deadline); if (d < 0) { return 'deadline overdue'; } if (d <= 1) { return 'deadline near'; } return 'deadline' }
function isUrgent(row: ExceptionOrder) { return daysUntil(row.deadline) <= 0 || row.severity === '严重' }
function stageLabel(row: ExceptionOrder) { const pt = row.processType; if (pt === 'CAPA') { return 'CAPA 整改中'; } if (pt === '8D') { return row.capaStatus === '进行中' ? '8D 整改中' : '8D 报告'; } if (pt === 'BOTH') { const s = row.capaStatus; if (s === '待发起') { return 'CAPA+8D 待发起'; } if (s === '已完成') { return 'CAPA+8D 已完成'; } return 'CAPA+8D 整改中'; } return row.status || '待发起' }
function riskWidth(count: number) { const max = riskItems.value[0]?.count || 1; return Math.max(8, Math.round(count / max * 100)) }
// 风险聚焦不良描述：超长截断 + 特殊来源可读化
const RISK_NAME_MAX = 16
function isRiskNameTruncated(name?: string) { return !!name && name.length > RISK_NAME_MAX }
function riskDisplayName(name?: string) {
  if (!name) { return '待分析' }
  const tag = riskTag(name)
  const core = tag ? tag.core : name
  return core.length > RISK_NAME_MAX ? `${core.slice(0, RISK_NAME_MAX)}…` : core
}
// 自动生成的特殊来源单归并为可读分类标签；返回 null 表示普通不良描述
function riskTag(name?: string): { label: string; cls: string; core: string } | null {
  if (!name) { return null }
  if (name.includes('首件检验不合格')) { return { label: '首件', cls: 'tag-fai', core: '首件检验不合格' } }
  if (name.includes('成品入库检验不合格')) { return { label: '成品', cls: 'tag-fg', core: '成品入库检验不合格' } }
  if (/8D[?？]*\d+/.test(name)) { return { label: '8D', cls: 'tag-8d', core: '8D 异常报告' } }
  return null
}
function goDetail(row: ExceptionOrder) { router.push(`/exception/${row.id}`) }
function showDecision(row: ExceptionOrder) { decisionRow.value = row; decisionVisible.value = true }
function formatDateTime(value?: string) { return value ? value.replace('T', ' ').slice(0, 16) : '待设置' }
function goSupplier(supplierId: number) { router.push({ path: '/exception', query: { supplierId: String(supplierId), escalation: '1' } }) }

// ── 新建异常单 ──
function resetCreateForm() {
  createForm.sourceType = ''
  createForm.severity = ''
  createForm.supplierName = ''
  createForm.materialCode = ''
  createForm.defectDesc = ''
  createForm.defectQty = 0
  createForm.totalQty = 0
  createForm.deadline = ''
  createForm.remark = ''
  createFormRef.value?.clearValidate?.()
}
function openCreate() {
  resetCreateForm()
  createVisible.value = true
}
async function submitCreate() {
  try {
    await createFormRef.value.validate()
  } catch (e) {
    return
  }
  const payload: Partial<ExceptionOrder> = {
    sourceType: createForm.sourceType,
    severity: createForm.severity,
    supplierName: createForm.supplierName || undefined,
    materialCode: createForm.materialCode || undefined,
    defectDesc: createForm.defectDesc,
    defectQty: createForm.defectQty || undefined,
    totalQty: createForm.totalQty || undefined,
    deadline: createForm.deadline || undefined,
    remark: createForm.remark || undefined,
  }
  createSaving.value = true
  try {
    await createExceptionApi(payload)
    ElMessage.success('异常单创建成功')
    createVisible.value = false
    await loadList()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '创建失败')
  } finally {
    createSaving.value = false
  }
}
async function loadStats() { statsLoading.value = true; try { const r = await getExceptionStatsApi(); if (r.code === 0) { stats.value = r.data; } } finally { statsLoading.value = false } }
async function loadList() { listLoading.value = true; try { const r = await getExceptionListApi({ ...query, page: 1, size: 100 }); if (r.code === 0) { pageList.value = r.data.list; pageTotal.value = r.data.total } } finally { listLoading.value = false } }
function onSizeChange(size: number) {
  query.size = size
  query.page = 1
  localStorage.setItem(PAGE_SIZE_KEY, String(size))
}
// 前端分页：全量数据过滤后再按页切片（不再依赖服务端分页）
const pagedList = computed(() => {
  const start = (query.page - 1) * query.size
  return visibleList.value.slice(start, start + query.size)
})
async function loadSideData() { const [analysis, summary] = await Promise.all([getExceptionAnalysisApi('defectDesc'), getSupplierExceptionSummaryApi({ minCount: 1 })]); if (analysis.code === 0) { analysisItems.value = analysis.data.items; } if (summary.code === 0) { suppliers.value = summary.data; } }
async function checkEscalation() { checkLoading.value = true; try { const r = await checkEscalationApi({ daysWindow: 90, minRepeatCount: 3 }); if (r.code === 0) ElMessage.success(r.data.triggeredSuppliers?.length ? `发现 ${r.data.triggeredSuppliers.length} 个升级关注项` : '未发现新的升级关注项') } finally { checkLoading.value = false } }
onMounted(async () => { await Promise.all([loadStats(), loadList(), loadSideData()]) })
</script>

<style scoped>
.exception-page{max-width:1440px;margin:0 auto;padding:24px 32px 48px;color:#22384b;background:#f3f6f8}.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}.page-header h1{margin:0;color:#123047;font-size:27px;letter-spacing:-.03em}.page-header p{margin:6px 0 0;color:#718397;font-size:13px}.header-actions{display:flex;gap:10px}.priority-band{display:grid;grid-template-columns:repeat(3,1fr) 1.8fr;overflow:hidden;border-radius:8px;background:#123047;color:#fff}.priority-stat,.priority-message{min-height:88px;padding:17px 26px;border-right:1px solid rgba(255,255,255,.22);display:flex;align-items:center;gap:14px}.priority-stat span,.priority-message span{font-size:14px;color:#c8d7e5}.priority-stat b{font-family:JetBrains Mono,monospace;font-size:43px;line-height:1}.danger b{color:#ff5c50}.warning b{color:#ffae3d}.info b{color:#72b7ff}.priority-message{border-right:0}.priority-message strong{font-size:17px}.workbar{display:flex;align-items:center;gap:10px;margin:14px 0;padding:10px 14px;border:1px solid #dce4ea;border-radius:8px;background:#fff;overflow-x:auto}.keyword{flex:0 0 220px;width:220px}.quick-tabs{display:flex;flex-shrink:0;overflow:hidden;border:1px solid #dce4ea;border-radius:6px}.quick-tabs button{padding:9px 14px;border:0;border-right:1px solid #dce4ea;background:#fff;color:#536b80;cursor:pointer;white-space:nowrap}.quick-tabs button:last-child{border:0}.quick-tabs button.active{background:#123047;color:#fff}.quick-tabs b{margin-left:4px}.workbar :deep(.el-select){flex:0 0 auto;width:128px}.workbench-grid{display:grid;grid-template-columns:minmax(0,72fr) minmax(300px,28fr);gap:14px}.worklist-card,.side-card,.closure-card{border:1px solid #dce4ea;border-radius:8px;background:#fff}.section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid #dce4ea}.section-head h2,.side-card h2{margin:0;color:#123047;font-size:17px}.section-head p{margin:5px 0 0;color:#718397;font-size:12px}.worklist-table{width:100%}.worklist-table :deep(.el-table__row td:first-child){border-left:3px solid transparent}.worklist-table :deep(.el-table__row:has(.overdue) td:first-child){border-left-color:#b84b3e}.worklist-table :deep(.el-table__row:has(.near) td:first-child){border-left-color:#d78a2c}.mono{font-family:JetBrains Mono,monospace;color:#123047}.worklist-table b,.worklist-table small{display:block}.worklist-table b{font-size:13px}.worklist-table small{margin-top:3px;color:#8495a5;font-size:11px}.severity,.stage-tag{display:inline-block;border:1px solid;border-radius:4px;padding:2px 7px;font-size:12px}.severity.serious{border-color:#efafa9;color:#b84b3e;background:#fff5f3}.severity.general{border-color:#c7d7e5;color:#527492;background:#f4f8fc}.stage-tag{border-color:#d2dfe9;color:#4b6983;background:#f5f8fa}
.stage-text{color:#4a6882;font-size:12px;font-weight:500;white-space:nowrap}
.owner-text{color:#8495a5;font-size:12px}.deadline{font-size:12px;color:#607a90}.deadline.overdue{font-weight:700;color:#b84b3e}.deadline.near{font-weight:700;color:#d07820}.risk-sidebar{display:flex;flex-direction:column;gap:14px}.side-card{padding:17px}.side-label{display:flex;justify-content:space-between;margin:16px 0 8px;color:#8192a3;font-size:11px}.risk-row{display:grid;grid-template-columns:78px 1fr 25px 38px;align-items:center;gap:8px;padding:9px 0;border-top:1px solid #edf1f4;font-size:12px}.risk-row b{font-family:JetBrains Mono,monospace}.risk-row em{color:#607a90;font-style:normal;text-align:right}.risk-meter{height:12px;overflow:hidden;background:#edf2f6;border-radius:2px}.risk-meter i{display:block;height:100%;background:linear-gradient(90deg,#c9692d,#b84b3e)}.supplier-alert{display:flex;justify-content:space-between;gap:8px;padding:13px 0;border-top:1px solid #edf1f4}.supplier-alert b,.supplier-alert small{display:block}.supplier-alert b{font-size:13px}.supplier-alert small{margin-top:5px;color:#718397;font-size:11px;line-height:1.45}.closure-card{display:grid;grid-template-columns:1fr auto;gap:12px;padding:17px}.closure-card span{color:#718397;font-size:12px}.closure-card b{display:block;margin-top:5px;color:#2466ae;font-family:JetBrains Mono,monospace;font-size:27px}.closure-track{grid-column:1/-1;position:relative;height:10px;border-radius:6px;background:#e5edf2}.closure-track i{display:block;height:100%;border-radius:6px;background:#2466ae}.closure-track em{position:absolute;top:-5px;bottom:-5px;left:85%;border-left:1px dashed #123047}@media(max-width:1100px){.priority-band{grid-template-columns:repeat(3,1fr)}.priority-message{grid-column:1/-1;border-top:1px solid rgba(255,255,255,.22)}.workbar{flex-wrap:wrap}.workbench-grid{grid-template-columns:1fr}.risk-sidebar{display:grid;grid-template-columns:repeat(3,1fr);align-items:start}}@media(max-width:760px){.exception-page{padding:18px}.page-header{align-items:flex-start;flex-direction:column;gap:12px}.priority-band{grid-template-columns:1fr}.priority-stat,.priority-message{border-right:0;border-bottom:1px solid rgba(255,255,255,.22)}.risk-sidebar{grid-template-columns:1fr}.workbar{align-items:stretch}.keyword{width:100%}}
.process-label{color:#17374e;font-family:JetBrains Mono,monospace;font-size:12px}.reason-link{display:block;margin:3px auto 0;padding:0;border:0;background:none;color:#b65d28;font-size:11px;cursor:pointer}.reason-link:hover{text-decoration:underline}.decision-dialog{display:flex;flex-direction:column;gap:16px}.decision-summary{display:flex;align-items:center;gap:10px;padding:14px;background:#f4f7f9}.decision-summary strong{color:#123047;font-size:18px}.decision-summary em{margin-left:auto;color:#b45d28;font-size:12px;font-style:normal}.decision-dialog section label{display:block;margin-bottom:6px;color:#758898;font-size:11px}.decision-dialog section p{margin:0;color:#344f63;font-size:13px;line-height:1.65}.decision-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.decision-metrics div{padding:12px;border:1px solid #dce4ea}.decision-metrics span,.decision-metrics b{display:block}.decision-metrics span{color:#7d8f9f;font-size:11px}.decision-metrics b{margin-top:5px;color:#17374e;font-size:13px}.decision-source{margin:0;padding-top:12px;border-top:1px solid #e3e9ed;color:#7a8c9b;font-size:11px}@media(max-width:760px){.header-actions{flex-wrap:wrap}.decision-metrics{grid-template-columns:1fr}}
.risk-name{display:inline-flex;align-items:center;gap:6px;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.risk-tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;line-height:16px;font-weight:600;flex:0 0 auto}.risk-tag.tag-fai{background:#eaf2ff;color:#2f6fed}.risk-tag.tag-8d{background:#fff1e6;color:#d9671a}.risk-tag.tag-fg{background:#eafaf0;color:#1a8d4c}
</style>

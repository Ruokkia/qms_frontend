<template>
  <div class="incoming-page">
    <!-- 题头 -->
    <header class="page-header">
      <div class="header-left">
        <h1 class="header-title">来料数据管理</h1>
        <p class="header-sub">
          IQC 检验数据看板 · 供应商合格率排名 · 高频不良追踪 · {{ auth.user?.plantName }}分公司
        </p>
      </div>
      <div class="header-actions">
        <QualityRuleDialog />
        <el-button type="primary" size="default" @click="openCreate">新增</el-button>
        <el-button type="warning" size="default" :loading="reconcileLoading" @click="openReconcile">
          手动对账
        </el-button>
        <el-button type="primary" size="default" @click="openImport">批量导入</el-button>
        <span class="module-tag">M1</span>
      </div>
    </header>

    <!-- KPI 横条 -->
    <section class="kpi-strip" v-loading="statsLoading">
      <div class="kpi-cell" v-for="k in kpiCells" :key="k.label">
        <div class="kpi-value" :style="{ color: k.color }">{{ k.value ?? '—' }}</div>
        <div class="kpi-label">{{ k.label }}</div>
      </div>
    </section>
    <!-- 图表区 -->
    <section class="chart-grid">
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">重点供应商合格率趋势</span>
          <div style="display:flex; gap:8px; align-items:center">
            <el-select v-model="trendTopN" size="small" style="width:90px" @change="loadKeySupplierTrend">
              <el-option :value="5" label="Top 5" />
              <el-option :value="10" label="Top 10" />
              <el-option :value="20" label="Top 20" />
            </el-select>
            <el-input-number
              v-model="trendDays"
              :min="1"
              :max="trendUnit === 'day' ? 31 : 12"
              size="small"
              style="width:100px"
              @change="loadKeySupplierTrend"
            />
            <el-select v-model="trendUnit" size="small" style="width:72px" @change="onTrendUnitChange">
              <el-option value="day" label="天" />
              <el-option value="month" label="月" />
            </el-select>
          </div>
        </div>
        <div style="color:#909399; font-size:11px; margin:-4px 0 4px 2px">默认 Top 5 · 近30天</div>
        <TrendChart :trend="keySupplierTrend" :loading="keyTrendLoading" />
      </div>
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">供应商合格率排名</span>
          <div style="display:flex; gap:8px; align-items:center">
            <el-input-number
              v-model="rankDays"
              :min="1"
              :max="rankUnit === 'day' ? 31 : 12"
              size="small"
              style="width:100px"
              @change="loadSupplierRank"
            />
            <el-select v-model="rankUnit" size="small" style="width:72px" @change="onRankUnitChange">
              <el-option value="day" label="天" />
              <el-option value="month" label="月" />
            </el-select>
          </div>
        </div>
        <div style="color:#909399; font-size:11px; margin:-4px 0 4px 2px">默认近30天 · 按合格率区间分布，点击区间查看明细</div>
        <SupplierRankChart :data="supplierRankData" :loading="rankLoading" @range-click="openSupplierRange" />
      </div>
    </section>

    <!-- 筛选 + 高频不良 -->
    <section class="filter-row">
      <div class="filter-group">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          size="default"
          class="filter-date"
          @change="handleSearch"
        />
        <el-select
          v-model="query.reviewStatus"
          placeholder="审核状态"
          clearable
          size="default"
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="待审核" value="待审核" />
          <el-option label="已审核" value="已审核" />
          <el-option label="驳回" value="驳回" />
        </el-select>
        <el-select
          v-model="query.inspectionResult"
          placeholder="检验结果"
          clearable
          size="default"
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="合格" value="合格" />
          <el-option label="不合格" value="不合格" />
        </el-select>
        <el-input
          v-model="query.keyword"
          placeholder="批次号 / 物料 / 供应商"
          clearable
          size="default"
          class="filter-input"
          @keyup.enter="handleSearch"
        />
        <button class="query-btn" @click="handleSearch">查询</button>
        <button class="reset-btn" @click="resetFilter">重置</button>
      </div>
      <div class="top-defects">
        <span class="defect-label">高频不良 TOP3</span>
        <span
          v-for="(d, i) in topDefects"
          :key="i"
          class="defect-chip"
          :style="{ background: defectChipColors[i] + '18', color: defectChipColors[i], borderColor: defectChipColors[i] + '40' }"
        >
          {{ d.defectDesc }} · {{ d.count }}
        </span>
      </div>
    </section>

    <!-- 来料批次列表 -->
    <section class="table-card">
      <div class="card-header">
        <span class="card-title">来料检验记录</span>
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.size"
          :total="pageTotal"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          size="small"
          @current-change="loadList"
          @size-change="handleSizeChange"
        />
      </div>
      <el-table
        :data="pageList"
        v-loading="listLoading"
        stripe
        class="incoming-table"
        :row-class-name="rowClassName"
      >
        <el-table-column label="物料/批次" min-width="160">
          <template #default="{ row }">
            <div class="cell-main">{{ row.materialName || '-' }}</div>
            <div class="cell-sub">{{ row.materialBatchNo || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="物料条码" min-width="140">
          <template #default="{ row }">
            <span style="font-family:'JetBrains Mono',monospace; font-size:12px">{{ row.materialBarcode || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="供应商" min-width="130">
          <template #default="{ row }">
            <div class="cell-main">{{ row.supplierName || '-' }}</div>
            <div class="cell-sub">{{ row.supplierCode || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="检验结果" width="90" align="center">
          <template #default="{ row }">
            <span class="status-dot" :style="{ background: resultColor(row.inspectionResult) }"></span>
            {{ row.inspectionResult }}
          </template>
        </el-table-column>
        <el-table-column prop="inspectionDate" label="检验日期" width="105" align="center" />
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <button class="text-btn" @click="openDetail(row.id)">详情</button>
            <button class="text-btn text-btn-trace" @click="openTrace(row)">&#36861;&#28335;</button>
            <button class="text-btn" style="margin-left:4px" @click="openEdit(row.id)">编辑</button>
            <button class="text-btn text-btn-danger" style="margin-left:4px" @click="deleteRecord(row.id)">删除</button>
            <button
              v-if="row.inspectionResult === '不合格'"
              class="text-btn text-btn-accent"
              style="margin-left: 4px"
              @click="openRectification(row)"
            >
              整改
            </button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <!-- 详情弹窗（含新增/编辑/查看，全部字段展示） -->
    <IncomingDetailDialog
      v-model="detailVisible"
      :detail="detail"
      :mode="detailMode"
      @saved="onDetailSaved"
    />

    <!-- 对账弹窗 -->

    <!-- 供应商合格率区间明细 -->
    <el-dialog
      v-model="supplierRangeDialogVisible"
      :title="`合格率区间：${selectedSupplierRange}`"
      width="860px"
      destroy-on-close
    >
      <el-table :data="selectedSupplierRangeItems" stripe max-height="460">
        <el-table-column prop="supplierName" label="供应商" min-width="160" />
        <el-table-column prop="supplierCode" label="供应商编码" min-width="130" />
        <el-table-column prop="totalBatches" label="总批次" width="90" align="right" />
        <el-table-column prop="qualifiedBatches" label="合格批次" width="90" align="right" />
        <el-table-column prop="unqualifiedBatches" label="不合格批次" width="100" align="right" />
        <el-table-column label="合格率" width="100" align="right">
          <template #default="{ row }">{{ Number(row.passRate ?? 0).toFixed(2) }}%</template>
        </el-table-column>
        <el-table-column label="不合格率" width="100" align="right">
          <template #default="{ row }">{{ Number(row.unqualifiedRate ?? (100 - Number(row.passRate ?? 0))).toFixed(2) }}%</template>
        </el-table-column>
      </el-table>
    </el-dialog>
    <el-dialog v-model="reconcileVisible" title="手动对账" width="480">
      <div class="reconcile-body">
        <p class="reconcile-tip">扫描未关联异常单的不合格记录，自动创建异常单并发送通知。</p>
        <el-form label-width="90px">
          <el-form-item label="对账起始">
            <el-date-picker v-model="reconcileRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-form>
        <div v-if="reconcileResult" class="reconcile-result">
          <div class="result-item">
            <span class="result-label">扫描记录</span>
            <span class="result-value">{{ reconcileResult.scannedCount }}</span>
          </div>
          <div class="result-item">
            <span class="result-label">新建异常单</span>
            <span class="result-value">{{ reconcileResult.createdCount }}</span>
          </div>
          <div v-if="reconcileResult.createdExceptionIds?.length" class="result-ids">
            <span class="result-label">异常单ID</span>
            <span class="result-value">{{ reconcileResult.createdExceptionIds.join(', ') }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="reconcileVisible = false">关闭</el-button>
        <el-button type="primary" :loading="reconcileLoading" @click="doReconcile">开始扫描</el-button>
      </template>
    </el-dialog>

    <!-- 导入弹窗（Excel 上传 + 预览确认 + 失败明细） -->
    <ImportDialog v-model="importVisible" @success="onImported" />
  </div>
</template>

<script setup lang="ts">
// ===== M1: 来料数据管理 =====
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  getMaterialInspectionListApi,
  getMaterialInspectionStatsApi,
  getKeySupplierTrendApi,
  getSupplierRankApi,
  getMaterialInspectionDetailApi,
  createMaterialInspectionApi,
  updateMaterialInspectionApi,
  deleteMaterialInspectionApi,
  reconcileMaterialInspectionApi,
} from '@/api/incoming'
import {
  getExceptionBySourceIdApi,
  createExceptionFromInspectionApi,
} from '@/api/exception'
import type {
  MaterialInspection,
  MaterialInspectionStats,
  MaterialInspectionReconcileResultVO,
  KeySupplierTrend,
  SupplierRankItem,
} from '@/types/incoming'
import TrendChart from './components/TrendChart.vue'
import SupplierRankChart from './components/SupplierRankChart.vue'
import IncomingDetailDialog from './components/IncomingDetailDialog.vue'
import ImportDialog from './components/ImportDialog.vue'
import QualityRuleDialog from '@/components/quality/QualityRuleDialog.vue'
import { getErrorMessage, isErrorNotified } from '@/api/request-error'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()


function openTrace(row: MaterialInspection) {
  if (!row.materialBarcode) {
    ElMessage.warning('该来料记录无物料条码，无法追溯')
    return
  }
  router.push({ path: '/trace', query: { code: row.materialBarcode, direction: 'full' } })
}
// ── KPI 看板 ────────────────────────────────────────────────
const statsLoading = ref(false)
const stats = ref<MaterialInspectionStats | null>(null)

const kpiCells = computed(() => {
  const d = stats.value
  return [
    { label: '总批次', value: d?.totalBatches, color: '#1B3A5B' },
    { label: '合格率', value: d ? `${d.qualifiedRate}%` : null, color: '#3E7A4E' },
    { label: '合格批', value: d?.qualifiedBatches, color: '#3E6B95' },
    { label: '不合格批', value: d?.unqualifiedBatches, color: '#B84B3E' },
    { label: '待审核', value: d?.pendingReviewCount, color: '#B8763E' },
    { label: '急料', value: d?.urgentCount, color: '#B8763E' },
  ]
})

const topDefects = computed(() => stats.value?.topDefectDesc.slice(0, 3) || [])
const defectChipColors = ['#B84B3E', '#B8763E', '#3E6B95']

async function loadStats() {
  statsLoading.value = true
  try {
    const res = await getMaterialInspectionStatsApi()
    if (res.code === 0) stats.value = res.data
  } catch (e) {
    console.error('加载来料看板失败', e)
  } finally {
    statsLoading.value = false
  }
}

// ── 重点供应商趋势 ──────────────────────
function computeDateRange(n: number, unit: string): [string, string] {
  const end = new Date()
  const start = new Date()
  if (unit === 'day') {
    start.setDate(end.getDate() - (n - 1))
  } else {
    start.setMonth(end.getMonth() - n)
  }
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return [fmt(start), fmt(end)]
}

function onTrendUnitChange() {
  trendDays.value = trendUnit.value === 'day' ? 30 : 12
  loadKeySupplierTrend()
}

function onRankUnitChange() {
  rankDays.value = rankUnit.value === 'day' ? 30 : 12
  loadSupplierRank()
}

const keyTrendLoading = ref(false)
const keySupplierTrend = ref<KeySupplierTrend | null>(null)
const trendTopN = ref(5)
const trendDays = ref(30)
const trendUnit = ref('day')

async function loadKeySupplierTrend() {
  keyTrendLoading.value = true
  try {
    const [startDate, endDate] = computeDateRange(trendDays.value, trendUnit.value)
    const res = await getKeySupplierTrendApi(trendTopN.value, startDate, endDate)
    if (res.code === 0) keySupplierTrend.value = res.data
  } catch (e) {
    console.error('加载重点供应商趋势失败', e)
  } finally {
    keyTrendLoading.value = false
  }
}

// ── 供应商合格率排名（独立接口） ──────────────────────
const rankLoading = ref(false)
const supplierRankData = ref<SupplierRankItem[]>([])
const supplierRangeDialogVisible = ref(false)
const selectedSupplierRange = ref('')
const selectedSupplierRangeItems = ref<SupplierRankItem[]>([])
const rankDays = ref(30)
const rankUnit = ref('day')

function openSupplierRange(payload: { range: string; items: SupplierRankItem[] }) {
  selectedSupplierRange.value = payload.range
  selectedSupplierRangeItems.value = payload.items.slice().sort((a, b) => Number(a.passRate ?? 0) - Number(b.passRate ?? 0))
  supplierRangeDialogVisible.value = true
}

async function loadSupplierRank() {
  rankLoading.value = true
  try {
    const [startDate, endDate] = computeDateRange(rankDays.value, rankUnit.value)
    const res = await getSupplierRankApi(startDate, endDate)
    if (res.code === 0) supplierRankData.value = res.data || []
  } catch (e) {
    console.error('加载供应商排名失败', e)
  } finally {
    rankLoading.value = false
  }
}

// ── 筛选与列表 ──────────────────────────────────────────────
const dateRange = ref<[string, string] | null>(null)
const query = reactive({
  page: 1,
  size: 10,
  keyword: '',
  reviewStatus: '',
  inspectionResult: '',
})

const listLoading = ref(false)
const pageList = ref<MaterialInspection[]>([])
const pageTotal = ref(0)


async function loadList() {
  listLoading.value = true
  try {
    const params: any = {
      page: query.page,
      size: query.size,
      keyword: query.keyword,
      reviewStatus: query.reviewStatus,
      inspectionResult: query.inspectionResult,
    }
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await getMaterialInspectionListApi(params)
    if (res.code === 0) {
      const records = res.data.list || []
      pageList.value = records
      pageTotal.value = res.data.total
    }
  } catch (e) {
    console.error('加载来料列表失败', e)
  } finally {
    listLoading.value = false
  }
}

function resetFilter() {
  query.page = 1
  query.size = 10
  query.keyword = ''
  query.reviewStatus = ''
  query.inspectionResult = ''
  dateRange.value = null
  loadList()
}

function handleSearch() {
  query.page = 1
  loadList()
}

function handleSizeChange(size: number) {
  query.size = size
  query.page = 1
  loadList()
}

function resultColor(result: string) {
  return result === '合格' ? '#3E7A4E' : '#B84B3E'
}
function reviewStyle(status: string) {
  if (status === '已审核') return { color: '#3E7A4E', background: '#3E7A4E18', borderColor: '#3E7A4E40' }
  if (status === '待审核') return { color: '#B8763E', background: '#B8763E18', borderColor: '#B8763E40' }
  return { color: '#B84B3E', background: '#B84B3E18', borderColor: '#B84B3E40' }
}
function rowClassName({ row }: { row: MaterialInspection }) {
  return row.inspectionResult === '不合格' ? 'unqualified-row' : ''
}

// ── 整改入口 ────────────────────────────────────────────────
async function openRectification(row: MaterialInspection) {
  try {
    // 1. 先查询是否已有异常单
    const existing = await getExceptionBySourceIdApi(row.id)
    if (existing.code === 0 && existing.data != null) {
      // 已有异常单，直接跳转
      router.push('/exception/' + existing.data)
      return
    }
    // 2. 无异常单，自动创建
    const created = await createExceptionFromInspectionApi(row.id)
    if (created.code === 0) {
      ElMessage.success('整改单已创建，跳转至整改详情')
      router.push('/exception/' + created.data.id)
    }
  } catch (e: any) {
    // 后端 Conflict 已有的兜底
    const msg = getErrorMessage(e, '')
    if (msg.includes('已关联异常单') || msg.includes('BAD_REQUEST')) {
      const existing = await getExceptionBySourceIdApi(row.id)
      if (existing.code === 0 && existing.data != null) {
        router.push('/exception/' + existing.data)
        return
      }
    }
    if (!isErrorNotified(e)) ElMessage.error(`操作失败：${msg || '请稍后重试'}`)
    console.error('整改入口失败', e)
  }
}


// ── 详情弹窗（查看/新增/编辑）─────────────────────────────────
const detailVisible = ref(false)
const detail = ref<MaterialInspection | null>(null)
const detailMode = ref<'create' | 'view'>('view')

async function openDetail(id: number) {
  try {
    const res = await getMaterialInspectionDetailApi(id)
    if (res.code === 0) {
      detail.value = res.data
      detailMode.value = 'view'
      detailVisible.value = true
    }
  } catch (e) {
    console.error('加载详情失败', e)
  }
}

function openCreate() {
  detail.value = null
  detailMode.value = 'create'
  detailVisible.value = true
}

async function openEdit(id: number) {
  try {
    const res = await getMaterialInspectionDetailApi(id)
    if (res.code === 0) {
      detail.value = res.data
      detailMode.value = 'view'
      detailVisible.value = true
      // IncomingDetailDialog 内部切换到编辑模式
    }
  } catch (e) {
    console.error('加载编辑数据失败', e)
  }
}

async function onDetailSaved(data: Partial<MaterialInspection>) {
  savingDetail.value = true
  try {
    if (detailMode.value === 'create' || !data.id) {
      // 新增：不传 id
      const { id, ...createData } = data as any
      const res = await createMaterialInspectionApi(createData)
      if (res.code === 0) {
        ElMessage.success('新增成功')
        detailVisible.value = false
        loadStats()
        loadList()
        loadSupplierRank()
      }
    } else {
      // 更新
      const res = await updateMaterialInspectionApi(data.id!, data)
      if (res.code === 0) {
        ElMessage.success('更新成功')
        detailVisible.value = false
        loadStats()
        loadList()
        loadSupplierRank()
      }
    }
  } catch (e: any) {
    if (!isErrorNotified(e)) ElMessage.error(`保存失败：${getErrorMessage(e)}`)
    console.error('保存物料检验记录失败', e)
  } finally {
    savingDetail.value = false
  }
}

async function deleteRecord(id: number) {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const res = await deleteMaterialInspectionApi(id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      loadStats()
      loadList()
      loadSupplierRank()
    }
  } catch (e: any) {
    if (e === 'cancel') return
    if (!isErrorNotified(e)) ElMessage.error(`删除失败：${getErrorMessage(e)}`)
  }
}

const savingDetail = ref(false)

// ── 对账 ────────────────────────────────────────────────────
const reconcileVisible = ref(false)
const reconcileLoading = ref(false)
const reconcileRange = ref<[string, string] | null>(null)
const reconcileResult = ref<MaterialInspectionReconcileResultVO | null>(null)

function openReconcile() {
  reconcileRange.value = null
  reconcileResult.value = null
  reconcileVisible.value = true
}

async function doReconcile() {
  reconcileLoading.value = true
  try {
    const params: any = {}
    if (reconcileRange.value) {
      params.startDate = reconcileRange.value[0]
      params.endDate = reconcileRange.value[1]
    }
    const res = await reconcileMaterialInspectionApi(params)
    if (res.code === 0) {
      reconcileResult.value = res.data
      ElMessage.success(`对账完成，新建 ${res.data.createdCount} 个异常单`)
      loadStats()
      loadList()
      loadSupplierRank()
    }
  } catch (e) {
    console.error('对账失败', e)
  } finally {
    reconcileLoading.value = false
  }
}

// ── 导入（Excel 上传，复用 ImportDialog）────────────────────
const importVisible = ref(false)

function openImport() {
  importVisible.value = true
}

// 导入成功后的列表与看板联动刷新
function onImported() {
  loadStats()
  loadList()
  loadSupplierRank()
}

// ── 分公司切换刷新 ───────────────────────────────────────────
watch(
  () => route.query,
  () => {
    loadStats()
    loadList()
    loadKeySupplierTrend()
    loadSupplierRank()
  },
)

loadStats()
loadList()
loadKeySupplierTrend()
loadSupplierRank()
</script>

<style scoped>
.incoming-page {
  padding: 24px 32px 48px;
  max-width: 1440px;
  margin: 0 auto;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #2a2a2a;
}

/* ── 题头 ── */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 24px;
  border-bottom: 1px solid #e3e0dc;
  padding-bottom: 16px;
}
.header-title {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin: 0 0 6px;
  color: #1b3a5b;
}
.header-sub {
  font-size: 12px;
  color: #8c9ba8;
  margin: 0;
  letter-spacing: 0.3px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.module-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: #b8763e;
  border: 1px solid #b8763e;
  border-radius: 3px;
  padding: 2px 6px;
}

/* ── KPI 横条 ── */
.kpi-strip {
  display: flex;
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  margin-bottom: 20px;
  overflow: hidden;
}
.kpi-cell {
  flex: 1;
  padding: 16px 12px;
  border-right: 1px solid #f0ede9;
  text-align: center;
  transition: background 0.2s;
}
.kpi-cell:hover {
  background: #fafbfc;
}
.kpi-cell:last-child {
  border-right: none;
}
.kpi-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}
.kpi-label {
  font-size: 11px;
  color: #8c9ba8;
  margin-top: 4px;
  letter-spacing: 0.5px;
}

/* ── 图表区 ── */
.chart-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.chart-card {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  padding: 16px 20px 20px;
  min-height: 340px;
  display: flex;
  flex-direction: column;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1b3a5b;
}
.card-hint {
  font-size: 11px;
  color: #8c9ba8;
}

/* ── 筛选行 ── */
.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.filter-date {
  width: 240px;
}
.filter-select {
  width: 130px;
}
.filter-input {
  width: 200px;
}
.query-btn {
  background: #1b3a5b;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.query-btn:hover {
  background: #142a42;
}
.reset-btn {
  background: transparent;
  color: #5b6770;
  border: 1px solid #d4cfc8;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
}
.reset-btn:hover {
  border-color: #b8763e;
  color: #b8763e;
}
.top-defects {
  display: flex;
  align-items: center;
  gap: 8px;
}
.defect-label {
  font-size: 12px;
  color: #8c9ba8;
}
.defect-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 2px;
  border: 1px solid;
  white-space: nowrap;
}

/* ── 表格卡片 ── */
.table-card {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  padding: 16px 20px 20px;
}
.incoming-table :deep(.cell-main) {
  font-size: 13px;
  color: #2a2a2a;
}
.incoming-table :deep(.cell-sub) {
  font-size: 11px;
  color: #8b8680;
  margin-top: 2px;
  font-family: 'JetBrains Mono', monospace;
}
.incoming-table :deep(.unqualified-row) {
  background: #fff8f7;
}
.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 5px;
}
.status-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid;
}
.text-btn {
  background: transparent;
  border: 1px solid #d4cfc8;
  color: #1b3a5b;
  border-radius: 3px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
}
.text-btn:hover {
  background: #1b3a5b;
  color: #fff;
  border-color: #1b3a5b;
}
.text-btn-accent {
  color: #b84b3e;
  border-color: #e0c5c0;
}
.text-btn-accent:hover {
  background: #b84b3e;
  color: #fff;
  border-color: #b84b3e;
}
.text-btn-danger {
  color: #e04a3e;
  border-color: #e0c5c0;
}
.text-btn-trace {
  color: #27844f;
  border-color: #94d5aa;
}
.text-btn-trace:hover {
  background: #27844f;
  border-color: #27844f;
  color: #fff;
}
.text-btn-danger:hover {
  background: #e04a3e;
  color: #fff;
  border-color: #e04a3e;
}

/* ── 对账/导入结果 ── */
.reconcile-body, .import-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.reconcile-tip, .import-tip {
  margin: 0;
  font-size: 13px;
  color: #5b6770;
  line-height: 1.5;
}
.reconcile-result, .import-result {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.result-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}
.result-ids {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.result-label {
  color: #8c9ba8;
}
.result-value {
  font-weight: 600;
  color: #1b3a5b;
  font-family: 'JetBrains Mono', monospace;
}

@media (max-width: 1024px) {
  .incoming-page { padding: 16px; }
  .chart-grid { grid-template-columns: 1fr; }
  .kpi-strip { flex-wrap: wrap; }
  .kpi-cell { flex: 1 1 33%; border-bottom: 1px solid #f0ede9; }
  .filter-row { flex-direction: column; align-items: flex-start; }
  .header-actions { flex-wrap: wrap; }
}
</style>

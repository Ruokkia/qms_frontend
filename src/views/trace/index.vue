<template>
  <div class="trace-page">
    <!-- 模块题头：单行克制，不堆砌卡片 -->
    <header class="trace-header">
      <div class="header-left">
        <h1 class="header-title">全链路追溯</h1>
        <p class="header-sub">
          父子ID递归 · 层级上限 {{ TRACE_MAX_LEVEL }} · 正向/反向穿透 · {{ auth.user?.plantName }}分公司
        </p>
      </div>
      <div class="header-right">
        <button class="sample-btn" @click="openSampleData">示例数据</button>
        <button class="entry-btn" @click="entryVisible = true">维护关联</button>
        <span class="header-tag">M0</span>
      </div>
    </header>

    <!-- 追溯查询区：坐标轴式横向条 -->
    <section class="query-card">
      <div class="query-row">
        <div class="query-input-wrap">
          <span class="query-prefix">追溯</span>
          <input
            v-model="inputValue"
            class="query-input"
            placeholder="输入整机SN / 物料码 / 批次号，回车追溯"
            @keyup.enter="doQuery"
          />
        </div>
        <div class="direction-seg">
          <button
            v-for="d in directions"
            :key="d.value"
            class="seg-btn"
            :class="{ active: direction === d.value }"
            @click="setDirection(d.value)"
          >
            {{ d.label }}
          </button>
        </div>
        <button class="query-btn" :disabled="loading" @click="doQuery">
          <span v-if="loading" class="spin"></span>
          {{ loading ? '追溯中' : '追溯查询' }}
        </button>
      </div>

      <!-- 快捷查询 -->
      <div class="quick-row">
        <span class="quick-label">快捷</span>
        <button
          v-for="q in quickItems"
          :key="q"
          class="quick-btn"
          @click="quickQuery(q)"
        >
          {{ q }}
        </button>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="error-banner">
        <span class="error-icon">!</span>
        <span>{{ errorMsg }}</span>
      </div>
    </section>

    <!-- 统计 + 视图切换 -->
    <section v-if="treeResult" class="result-bar">
      <div class="stat-group">
        <span class="stat-item">节点 <strong>{{ treeResult.stats.totalNodes }}</strong></span>
        <span class="stat-item">层级 <strong>{{ treeResult.stats.maxDepth }}</strong><span class="stat-cap">/{{ treeResult.stats.levelCap }}</span></span>
        <span class="stat-item">批次 <strong>{{ treeResult.stats.batchCount }}</strong></span>
        <span class="stat-item">供应商 <strong>{{ treeResult.stats.supplierCount }}</strong></span>
        <span class="stat-dir">{{ directionLabel }}</span>
      </div>
      <div class="view-seg">
        <button class="seg-btn" :class="{ active: viewMode === 'list' }" @click="switchView('list')">列表视图</button>
        <button class="seg-btn" :class="{ active: viewMode === 'tree' }" @click="switchView('tree')">树状图</button>
        <template v-if="viewMode === 'tree'">
          <button class="seg-btn ghost" @click="expandAll">全展开</button>
          <button class="seg-btn ghost" @click="collapseAll">全折叠</button>
        </template>
      </div>
    </section>

    <!-- 结果区 -->
    <section class="result-area">
      <template v-if="treeResult">
        <TraceListView
          v-if="viewMode === 'list'"
          :result="treeResult"
          @view-detail="openDetail"
        />
        <TraceTreeView
          v-else
          :result="treeResult"
          :expand-depth="treeExpandDepth"
          :direction="direction"
          @view-detail="openDetail"
        />
      </template>
      <div v-else-if="!errorMsg" class="empty-state">
        <div class="empty-icon">◯</div>
        <p class="empty-text">输入编码，启动全链路穿透追溯</p>
        <p class="empty-hint">支持整机SN、物料码、来料批次号</p>
      </div>
    </section>

    <!-- 节点详情抽屉 -->
    <TraceNodeDetail
      v-model:visible="detailVisible"
      :node-id="detailNodeId"
    />
    <el-drawer v-model="entryVisible" title="维护追溯关联" size="420px">
      <el-form label-position="top">
        <p class="relation-hint">成品、半成品和来料节点由各自的检验主数据自动同步；此处仅维护已有节点之间的父子关系。</p>
        <el-form-item label="父节点 ID"><el-input v-model="relation.parentNodeId" placeholder="产品或半成品节点 ID"/></el-form-item>
        <el-form-item label="子节点 ID"><el-input v-model="relation.childNodeId" placeholder="半成品或物料节点 ID"/></el-form-item>
        <el-form-item label="数量"><el-input v-model="relation.quantity" placeholder="可选"/></el-form-item>
        <el-button @click="saveRelation">保存关系</el-button>
      </el-form>
    </el-drawer>
    <el-dialog v-model="sampleVisible" title="来料追溯示例数据" width="min(1180px, 94vw)" class="sample-dialog">
      <p class="sample-note">数据直接读取当前追溯库，便于验收节点、绑定关系与批次覆盖范围。</p>
      <el-tabs v-model="sampleTab" class="sample-tabs">
        <el-tab-pane label="节点表（trace_node）" name="nodes">
          <el-table :data="sampleNodes" max-height="430" stripe border v-loading="sampleLoading">
            <el-table-column prop="id" label="ID" width="68" />
            <el-table-column prop="nodeType" label="类型" width="130"><template #default="{ row }"><el-tag size="small" :type="nodeTagType(row.nodeType)">{{ nodeTypeText(row.nodeType) }}</el-tag></template></el-table-column>
            <el-table-column prop="barcode" label="唯一条码" min-width="180" />
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column prop="materialCode" label="物料代码" min-width="130"><template #default="{ row }">{{ row.materialCode || '—' }}</template></el-table-column>
            <el-table-column prop="materialBatchNo" label="物料批号" min-width="145"><template #default="{ row }">{{ row.materialBatchNo || '—' }}</template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="关系表（trace_relation）" name="relations">
          <el-table :data="sampleRelations" max-height="430" stripe border v-loading="sampleLoading">
            <el-table-column prop="id" label="ID" width="68" />
            <el-table-column label="父节点（产品/半成品）" min-width="240"><template #default="{ row }"><b>{{ row.parentBarcode }}</b><br /><span class="table-muted">{{ row.parentName }} · #{{ row.parentNodeId }}</span></template></el-table-column>
            <el-table-column label="子节点（半成品/物料）" min-width="240"><template #default="{ row }"><b>{{ row.childBarcode }}</b><br /><span class="table-muted">{{ row.childName }} · #{{ row.childNodeId }}</span></template></el-table-column>
            <el-table-column prop="quantity" label="数量" width="92"><template #default="{ row }">{{ row.quantity ?? '—' }}</template></el-table-column>
            <el-table-column prop="workOrderNo" label="工单" min-width="120"><template #default="{ row }">{{ row.workOrderNo || '—' }}</template></el-table-column>
            <el-table-column prop="processName" label="工序" min-width="120"><template #default="{ row }">{{ row.processName || '—' }}</template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="物料批次表（汇总视图）" name="batches">
          <el-table :data="sampleBatches" max-height="430" stripe border v-loading="sampleLoading">
            <el-table-column prop="batchNo" label="物料批号" min-width="190" />
            <el-table-column prop="materialCount" label="该批物料种类" width="130" />
            <el-table-column prop="barcodes" label="物料条码" min-width="360" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// ===== M0: 全链路追溯 =====
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { traceQueryApi } from '@/api/trace'
import { getErrorMessage } from '@/api/request-error'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import {
  TraceDirectionEnum,
  TRACE_DIRECTION_LABELS,
  TRACE_MAX_LEVEL,
} from '@/enums/trace'
import type { TraceTreeResult } from '@/types/trace'
import TraceListView from './components/TraceListView.vue'
import TraceTreeView from './components/TraceTreeView.vue'
import TraceNodeDetail from './components/TraceNodeDetail.vue'

const incomingTraceBase = '/api/v2/incoming-trace'

const auth = useAuthStore()
const route = useRoute()
const entryVisible = ref(false)
const sampleVisible = ref(false)
const sampleLoading = ref(false)
const sampleTab = ref('nodes')
const sampleNodes = ref<any[]>([])
const sampleRelations = ref<any[]>([])
const sampleBatches = computed(() => {
  const buckets = new Map<string, any[]>()
  sampleNodes.value.filter((node) => node.nodeType === 'MATERIAL' && node.materialBatchNo).forEach((node) => {
    const items = buckets.get(node.materialBatchNo) || []
    items.push(node)
    buckets.set(node.materialBatchNo, items)
  })
  return [...buckets.entries()].map(([batchNo, items]) => ({ batchNo, materialCount: items.length, barcodes: items.map((item) => item.barcode).join('、') }))
})
function nodeTypeText(type: string) { return ({ FINISHED_GOOD: '成品', SEMI_FINISHED: '半成品', MATERIAL: '物料' } as Record<string, string>)[type] || type }
function nodeTagType(type: string) { return ({ FINISHED_GOOD: 'primary', SEMI_FINISHED: 'success', MATERIAL: 'warning' } as Record<string, any>)[type] || 'info' }
async function openSampleData() {
  sampleVisible.value = true
  sampleLoading.value = true
  try {
    const headers = { Authorization: `Bearer ${sessionStorage.getItem('qms_token') || ''}` }
    const [nodes, relations] = await Promise.all([
      axios.get(`${incomingTraceBase}/nodes`, { headers }),
      axios.get(`${incomingTraceBase}/relations`, { headers }),
    ])
    sampleNodes.value = nodes.data.data || []
    sampleRelations.value = relations.data.data || []
  } catch (e: any) {
    ElMessage.error(getErrorMessage(e, '示例数据加载失败，请确认后端已启动'))
  } finally { sampleLoading.value = false }
}
const relation = ref({ parentNodeId: '', childNodeId: '', quantity: '' })
async function saveRelation() {
  try { await axios.post(`${incomingTraceBase}/relations`, relation.value, { headers: { Authorization: `Bearer ${sessionStorage.getItem('qms_token') || ''}` } }); ElMessage.success('关系已保存'); relation.value = { parentNodeId: '', childNodeId: '', quantity: '' } }
  catch (e: any) { ElMessage.error(getErrorMessage(e, '关系保存失败，请检查节点 ID 和是否形成环路')) }
}

// ── 追溯查询 ────────────────────────────────────────────────
const direction = ref<TraceDirectionEnum>(TraceDirectionEnum.FULL)
const inputValue = ref('')
const loading = ref(false)
const errorMsg = ref('')
const treeResult = ref<TraceTreeResult | null>(null)
const viewMode = ref<'list' | 'tree'>('tree')
const treeExpandDepth = ref(-1)

const directions = computed(() =>
  (Object.values(TraceDirectionEnum) as TraceDirectionEnum[]).map((v) => ({
    value: v,
    label: TRACE_DIRECTION_LABELS[v],
  })),
)

const directionLabel = computed(() => TRACE_DIRECTION_LABELS[direction.value])

const quickItems = ref<string[]>([])

async function loadQuickItems() {
  try {
    const { data } = await axios.get(`${incomingTraceBase}/nodes`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('qms_token') || ''}` },
    })
    quickItems.value = (data.data || [])
      .filter((node: any) => ['FINISHED_GOOD', 'SEMI_FINISHED', 'MATERIAL'].includes(node.nodeType))
      .map((node: any) => node.barcode)
      .filter((barcode: string, index: number, values: string[]) => barcode && values.indexOf(barcode) === index)
      .slice(0, 6)
  } catch {
    quickItems.value = []
  }
}

onMounted(loadQuickItems)

function setDirection(d: TraceDirectionEnum) {
  direction.value = d
  errorMsg.value = ''
  treeResult.value = null
  if (inputValue.value.trim()) doQuery()
}

async function doQuery() {
  const code = inputValue.value.trim()
  if (!code) {
    errorMsg.value = '请输入追溯编码'
    return
  }
  loading.value = true
  errorMsg.value = ''
  treeResult.value = null
  try {
    const res = await traceQueryApi(direction.value, { nodeCode: code })
    if (res.code === 0 && res.data) {
      treeResult.value = res.data
    } else {
      errorMsg.value = res.message || '追溯查询失败'
    }
  } catch (e: any) {
    errorMsg.value = getErrorMessage(e, '追溯查询失败')
  } finally {
    loading.value = false
  }
}

function quickQuery(code: string) {
  inputValue.value = code
  doQuery()
}

function switchView(mode: 'list' | 'tree') {
  viewMode.value = mode
}

function expandAll() {
  treeExpandDepth.value = -1
}
function collapseAll() {
  treeExpandDepth.value = 0
}

// ── 节点详情 ────────────────────────────────────────────────
const detailVisible = ref(false)
const detailNodeId = ref<number | null>(null)

function openDetail(id: number) {
  detailNodeId.value = id
  detailVisible.value = true
}

// ── 地区切换刷新 ────────────────────────────────────────────
watch(
  () => route.query,
  () => {
    const routeCode = typeof route.query.code === 'string' ? route.query.code : ''
    if (routeCode) inputValue.value = routeCode
    if (inputValue.value) doQuery()
  },
)

const initialCode = typeof route.query.code === 'string' ? route.query.code : ''
if (initialCode) inputValue.value = initialCode
if (inputValue.value) doQuery()
</script>

<style scoped>
.trace-page {
  padding: 24px 32px 48px;
  max-width: 1440px;
  margin: 0 auto;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #2a2a2a;
}

/* ── 题头 ── */
.trace-header {
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
.header-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: #b8763e;
  border: 1px solid #b8763e;
  border-radius: 3px;
  padding: 2px 6px;
}
.entry-btn { border:0; background:#1b3a5b; color:#fff; border-radius:4px; padding:7px 12px; margin-right:10px; font-weight:600; cursor:pointer; }
.relation-hint { margin: 0 0 18px; color: #697782; line-height: 1.65; font-size: 13px; }
.sample-btn { border:1px solid #b8763e; background:#fffaf5; color:#9b5c24; border-radius:4px; padding:6px 12px; margin-right:10px; font-weight:600; cursor:pointer; }
.sample-btn:hover { background:#faf0e5; }
.sample-note { margin:0 0 14px; color:#697782; font-size:13px; }
.table-muted { color:#89949c; font-size:12px; }

/* ── 查询卡片 ── */
.query-card {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  padding: 20px 24px;
  margin-bottom: 16px;
}
.query-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.query-input-wrap {
  display: flex;
  align-items: center;
  border: 1px solid #d4cfc8;
  border-radius: 4px;
  overflow: hidden;
  flex: 1;
  min-width: 280px;
  background: #faf9f7;
}
.query-input-wrap:focus-within {
  border-color: #1b3a5b;
  background: #fff;
}
.query-prefix {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #b8763e;
  padding: 0 12px;
  border-right: 1px solid #e3e0dc;
  align-self: stretch;
  display: flex;
  align-items: center;
  font-weight: 600;
}
.query-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 10px 12px;
  font-size: 14px;
  background: transparent;
  font-family: 'JetBrains Mono', monospace;
  color: #2a2a2a;
}
.query-input::placeholder {
  color: #b8b3ac;
  font-family: 'PingFang SC', sans-serif;
}

.direction-seg {
  display: flex;
  border: 1px solid #d4cfc8;
  border-radius: 4px;
  overflow: hidden;
}
.seg-btn {
  border: none;
  background: #faf9f7;
  color: #5b6770;
  padding: 9px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  border-right: 1px solid #e3e0dc;
}
.seg-btn:last-child {
  border-right: none;
}
.seg-btn:hover {
  background: #f0ede9;
  color: #1b3a5b;
}
.seg-btn.active {
  background: #1b3a5b;
  color: #fff;
}
.seg-btn.ghost {
  background: transparent;
  color: #8c9ba8;
  border: 1px solid #d4cfc8;
  border-radius: 4px;
  margin-left: 6px;
}

.query-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #b8763e;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.query-btn:hover:not(:disabled) {
  background: #a06832;
}
.query-btn:disabled {
  background: #c9a98a;
  cursor: not-allowed;
}
.spin {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.quick-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.quick-label {
  font-size: 11px;
  color: #b8b3ac;
  margin-right: 4px;
}
.quick-btn {
  border: 1px dashed #d4cfc8;
  background: transparent;
  color: #5b7a99;
  padding: 3px 10px;
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  transition: all 0.15s;
}
.quick-btn:hover {
  border-color: #b8763e;
  color: #b8763e;
  background: #faf5ef;
}

.error-banner {
  margin-top: 12px;
  background: #fdf2f0;
  border: 1px solid #e8c5bf;
  border-left: 3px solid #b84b3e;
  border-radius: 4px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #8a3528;
}
.error-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #b84b3e;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

/* ── 统计 + 视图切换条 ── */
.result-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 6px 6px 0 0;
  border-bottom: none;
  padding: 12px 24px;
  flex-wrap: wrap;
  gap: 12px;
}
.stat-group {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.stat-item {
  font-size: 12px;
  color: #8c9ba8;
}
.stat-item strong {
  font-family: 'JetBrains Mono', monospace;
  color: #1b3a5b;
  font-size: 14px;
  font-weight: 700;
  margin-left: 2px;
}
.stat-cap {
  color: #b8b3ac;
  font-size: 11px;
  margin-left: 1px;
}
.stat-dir {
  font-size: 11px;
  color: #b8763e;
  border: 1px solid #e3d4c2;
  background: #faf5ef;
  border-radius: 3px;
  padding: 2px 8px;
}
.view-seg {
  display: flex;
  align-items: center;
}

/* ── 结果区 ── */
.result-area {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 0 0 6px 6px;
  min-height: 400px;
}

.empty-state {
  padding: 80px 0;
  text-align: center;
}
.empty-icon {
  font-size: 40px;
  color: #d4cfc8;
  margin-bottom: 16px;
}
.empty-text {
  font-size: 15px;
  color: #5b6770;
  margin: 0 0 6px;
}
.empty-hint {
  font-size: 12px;
  color: #b8b3ac;
  margin: 0;
}

@media (max-width: 1024px) {
  .trace-page { padding: 16px; }
}
</style>

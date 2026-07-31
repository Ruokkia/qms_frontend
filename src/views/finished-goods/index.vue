<template>
  <div class="finished-goods-dashboard">
    <!-- 标题栏 -->
    <div class="page-header">
      <div class="header-title">
        <h2>成品数据管理</h2>
        <span class="breadcrumb">M1 来料与成品质量管控 / 成品入库检验审核</span>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="default" @click="openCreate">新增</el-button>
        <span class="module-tag">M1</span>
      </div>
    </div>

    <!-- 筛选行 -->
    <div class="filter-bar">
      <div class="filter-row">
        <el-input
          v-model="filters.keyword"
          placeholder="报告编号 / 产品名称 / 物料编码"
          clearable
          style="width: 280px"
          @keyup.enter="search"
          @clear="search"
        />
        <el-select v-model="filters.category" placeholder="产品分类" clearable style="width: 120px" @change="search">
          <el-option label="成品" value="成品" />
          <el-option label="半成品" value="半成品" />
        </el-select>
        <el-select v-model="filters.inspectionResult" placeholder="检验结果" clearable style="width: 120px" @change="search">
          <el-option label="合格" value="合格" />
          <el-option label="不合格" value="不合格" />
        </el-select>
        <el-select v-model="filters.qcReview" placeholder="品管审核" clearable style="width: 120px" @change="search">
          <el-option label="待审核" value="待审核" />
          <el-option label="已审核" value="已审核" />
          <el-option label="驳回" value="驳回" />
        </el-select>
        <el-select v-model="filters.mgrApproval" placeholder="管代批准" clearable style="width: 120px" @change="search">
          <el-option label="待审核" value="待审核" />
          <el-option label="已审核" value="已审核" />
          <el-option label="驳回" value="驳回" />
        </el-select>
        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 240px"
          @change="search"
        />
        <el-button type="default" @click="search">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </div>

    <!-- 数据表 -->
    <div class="table-card">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        size="default"
        style="width: 100%"
        :default-sort="{ prop: 'id', order: 'descending' }"
      >
        <el-table-column prop="productName" label="产品名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="category" label="产品分类" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.category === '半成品' ? 'warning' : 'primary'">
              {{ row.category || '成品' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="modelSpec" label="型号规格" width="120" show-overflow-tooltip />
        <el-table-column prop="prodBatchOrSn" label="生产批号/产品编号" width="150" show-overflow-tooltip />
        <el-table-column prop="inspectionResult" label="检验结果" width="100" align="center">
          <template #default="{ row }">
            <span class="status-badge" :style="resultStyle(row.inspectionResult)">{{ row.inspectionResult || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="expiryDate" label="过期日期" width="110" align="center" />
        <el-table-column label="操作" width="280" align="center" fixed="right">
          <template #default="{ row }">
            <button class="text-btn" @click="openDetail(row.id)">详情</button>
            <button class="text-btn" style="margin-left:4px" @click="openEdit(row.id)">编辑</button>
            <button class="text-btn text-btn-trace" style="margin-left:4px" @click="openTrace(row)">&#36861;&#28335;</button>
            <button class="text-btn text-btn-danger" style="margin-left:4px" @click="deleteRecord(row.id)">删除</button>
            <button class="text-btn text-btn-bind" style="margin-left:4px" @click="openBind(row)">绑定子类</button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="onSizeChange"
          @current-change="onPageChange"
        />
      </div>
    </div>

    <!-- 详情弹窗 -->
    <FinishedGoodsDetailDialog
      v-model="detailVisible"
      :detail="detail"
      :edit-mode="detailEditMode"
      @saved="onDetailSaved"
    />

    <!-- 绑定子项弹窗（新架构：写入 critical_material_binding） -->
    <el-dialog v-model="bindVisible" title="绑定子项" width="640px" :close-on-click-modal="false" destroy-on-close>
      <div v-if="bindFg" class="bind-body">
        <!-- 当前产品信息 -->
        <div class="bind-card">
          <div class="bind-card-title">当前产品：{{ bindFg.productName || '-' }} <span class="font-mono" style="color:#8492a6">{{ bindFg.prodBatchOrSn }}</span></div>
        </div>

        <!-- 子类分类选择 -->
        <div class="bind-card" style="margin-top:12px">
          <div class="bind-card-title">子类分类</div>
          <el-radio-group v-model="bindCategory" @change="onCategoryChange" style="margin-top:4px">
            <el-radio label="半成品">半成品</el-radio>
            <el-radio label="物料">物料</el-radio>
          </el-radio-group>
        </div>

        <!-- 搜索框（条码 + 名称双框，均可为空，都填则 AND 模糊查询） -->
        <div class="bind-card" style="margin-top:12px">
          <div style="color:#909399; font-size:12px; margin-bottom:6px">模糊搜索，选填（至少填一项）</div>
          <div style="display:flex; gap:8px; align-items:center">
            <el-input v-model="bindBarcodeKeyword" placeholder="条码" clearable @keyup.enter="doSearchChildren" style="flex:1" />
            <el-input v-model="bindNameKeyword" placeholder="名称" clearable @keyup.enter="doSearchChildren" style="flex:1" />
            <el-button type="primary" :loading="queryingChildren" @click="doSearchChildren">搜索</el-button>
          </div>
        </div>

        <!-- 搜索结果列表 -->
        <div class="bind-card" style="margin-top:12px" v-if="childrenResults.length > 0 || hasSearched">
          <el-table :data="childrenResults" highlight-current-row @current-change="onChildSelect" size="small" style="width:100%">
            <el-table-column prop="barcode" label="条码" width="160" />
            <el-table-column prop="name" label="名称" min-width="120" />
            <el-table-column prop="specModel" label="规格型号" width="120" />
            <el-table-column label="检验结果" width="80" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.inspectionResult" :type="row.inspectionResult === '合格' ? 'success' : 'danger'" size="small">{{ row.inspectionResult }}</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrap" style="margin-top:8px">
            <el-pagination
              v-model:current-page="childrenPage"
              :page-size="10"
              :total="childrenTotal"
              layout="total, prev, pager, next"
              @current-change="doSearchChildren"
            />
          </div>
        </div>

        <!-- 已选子项信息 -->
        <div v-if="selectedChild" class="bind-card bind-card-success" style="margin-top:12px">
          <div class="bind-card-title">已选子项</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="条码"><span class="font-mono">{{ selectedChild.barcode }}</span></el-descriptions-item>
            <el-descriptions-item label="名称">{{ selectedChild.name }}</el-descriptions-item>
            <el-descriptions-item label="规格型号">{{ selectedChild.specModel || '-' }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ bindCategory }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 绑定结果 -->
        <div v-if="bindResultMsg" class="bind-card" :class="bindSuccess ? 'bind-card-success' : 'bind-card-warn'" style="margin-top:12px">
          <p class="bind-msg">{{ bindResultMsg }}</p>
        </div>
      </div>

      <template #footer>
        <el-button @click="bindVisible = false; bindResultMsg = null">关闭</el-button>
        <el-button
          v-if="selectedChild && !bindSuccess"
          type="primary"
          :loading="binding"
          @click="doBind"
        >
          确认绑定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import {
  getFinishedGoodsListApi,
  getFinishedGoodsDetailApi,
  createFinishedGoodsApi,
  updateFinishedGoodsApi,
  deleteFinishedGoodsApi,
} from '@/api/finishedGoods'
import { getMaterialInspectionListApi, searchChildrenApi, createBindingApi } from '@/api/incoming'
import type { SearchChildrenItem } from '@/api/incoming'
import { getErrorMessage, isErrorNotified } from '@/api/request-error'
import type { FinishedGoodsInspection, FinishedGoodsListParams } from '@/types/finishedGoods'
import type { MaterialInspection, MaterialInspectionListParams } from '@/types/incoming'
import FinishedGoodsDetailDialog from './components/FinishedGoodsDetailDialog.vue'

// ── 筛选 ──────────────────────────────────────────────────────
const filters = reactive<FinishedGoodsListParams & { dateRange?: [string, string] | null }>({
  keyword: '',
  category: '',
  inspectionResult: '',
  qcReview: '',
  mgrApproval: '',
  startDate: '',
  endDate: '',
  dateRange: null,
  page: 1,
  size: 10,
})
const router = useRouter()

async function search() {
  filters.page = 1
  await loadList()
}

function resetFilters() {
  filters.keyword = ''
  filters.category = ''
  filters.inspectionResult = ''
  filters.qcReview = ''
  filters.mgrApproval = ''
  filters.startDate = ''
  filters.endDate = ''
  filters.dateRange = null
  filters.page = 1
  filters.size = 10
  loadList()
}

function onSizeChange(size: number) {
  filters.size = size
  filters.page = 1
  loadList()
}

function onPageChange(page: number) {
  filters.page = page
  loadList()
}

// ── 列表 ──────────────────────────────────────────────────────
const tableData = ref<FinishedGoodsInspection[]>([])
const loading = ref(false)
const total = ref(0)

async function loadList() {
  loading.value = true
  try {
    const p: FinishedGoodsListParams = {
      keyword: filters.keyword || undefined,
      category: filters.category || undefined,
      inspectionResult: filters.inspectionResult || undefined,
      qcReview: filters.qcReview || undefined,
      mgrApproval: filters.mgrApproval || undefined,
      startDate: filters.dateRange?.[0] || undefined,
      endDate: filters.dateRange?.[1] || undefined,
      page: filters.page!,
      size: filters.size!,
    }
    const res = await getFinishedGoodsListApi(p)
    if (res.code === 0 && res.data) {
      tableData.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (e) {
    console.error('加载列表失败', e)
  } finally {
    loading.value = false
  }
}

// ── 详情弹窗（查看/新增/编辑）─────────────────────────────────
const detailVisible = ref(false)
const detail = ref<FinishedGoodsInspection | null>(null)
const detailEditMode = ref(false)

function openTrace(row: FinishedGoodsInspection) {
  if (!row.prodBatchOrSn) {
    ElMessage.warning('该成品记录无产品批号/SN，无法追溯')
    return
  }
  router.push({ path: '/trace', query: { code: row.prodBatchOrSn, direction: 'full' } })
}
async function openDetail(id: number) {
  try {
    const res = await getFinishedGoodsDetailApi(id)
    if (res.code === 0) {
      detail.value = res.data
      detailEditMode.value = false
      detailVisible.value = true
    }
  } catch (e) {
    console.error('加载详情失败', e)
  }
}

function openCreate() {
  detail.value = null
  detailEditMode.value = true
  detailVisible.value = true
}

async function openEdit(id: number) {
  try {
    const res = await getFinishedGoodsDetailApi(id)
    if (res.code === 0) {
      detail.value = res.data
      detailEditMode.value = true
      detailVisible.value = true
    }
  } catch (e) {
    console.error('加载编辑数据失败', e)
  }
}

async function onDetailSaved(data: Partial<FinishedGoodsInspection>) {
  try {
    if (!data.id) {
      const res = await createFinishedGoodsApi(data)
      if (res.code === 0) {
        ElMessage.success('新增成功')
        detailVisible.value = false
        loadList()
      }
    } else {
      const res = await updateFinishedGoodsApi(data.id, data)
      if (res.code === 0) {
        ElMessage.success('更新成功')
        detailVisible.value = false
        loadList()
      }
    }
  } catch (e: any) {
    if (!isErrorNotified(e)) ElMessage.error(`保存失败：${getErrorMessage(e)}`)
    console.error('保存成品检验记录失败', e)
  }
}

// ── 删除 ──────────────────────────────────────────────────────
async function deleteRecord(id: number) {
  try {
    await ElMessageBox.confirm('确定要删除这条成品检验记录吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const res = await deleteFinishedGoodsApi(id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      loadList()
    }
  } catch (e: any) {
    if (e === 'cancel') return
    if (!isErrorNotified(e)) ElMessage.error(`删除失败：${getErrorMessage(e)}`)
  }
}

// ── 绑定子项（新架构：写入 critical_material_binding） ────────
const bindVisible = ref(false)
const bindFg = ref<FinishedGoodsInspection | null>(null)
const bindCategory = ref<'半成品' | '物料'>('物料')
const bindBarcodeKeyword = ref('')
const bindNameKeyword = ref('')
const bindResultMsg = ref<string | null>(null)
const bindSuccess = ref(false)
const queryingChildren = ref(false)
const binding = ref(false)
const childrenResults = ref<SearchChildrenItem[]>([])
const childrenTotal = ref(0)
const childrenPage = ref(1)
const hasSearched = ref(false)
const selectedChild = ref<SearchChildrenItem | null>(null)

function openBind(row: FinishedGoodsInspection) {
  bindFg.value = row
  bindCategory.value = '物料'
  bindBarcodeKeyword.value = ''
  bindNameKeyword.value = ''
  childrenResults.value = []
  childrenTotal.value = 0
  childrenPage.value = 1
  hasSearched.value = false
  selectedChild.value = null
  bindResultMsg.value = null
  bindSuccess.value = false
  bindVisible.value = true
}

function onCategoryChange() {
  childrenResults.value = []
  childrenTotal.value = 0
  childrenPage.value = 1
  hasSearched.value = false
  selectedChild.value = null
  bindResultMsg.value = null
  bindSuccess.value = false
}

async function doSearchChildren() {
  const bk = bindBarcodeKeyword.value.trim()
  const nk = bindNameKeyword.value.trim()
  if (!bk && !nk) return
  queryingChildren.value = true
  hasSearched.value = true
  try {
    const res = await searchChildrenApi({
      category: bindCategory.value,
      barcodeKeyword: bk || undefined,
      nameKeyword: nk || undefined,
      page: childrenPage.value,
      size: 10,
    })
    if (res.code === 0 && res.data) {
      childrenResults.value = res.data.list || []
      childrenTotal.value = res.data.total || 0
    } else {
      childrenResults.value = []
      childrenTotal.value = 0
    }
  } catch (e: any) {
    if (!isErrorNotified(e)) ElMessage.error(`查询失败：${getErrorMessage(e)}`)
  } finally {
    queryingChildren.value = false
  }
}

function onChildSelect(row: SearchChildrenItem | null) {
  selectedChild.value = row
  bindResultMsg.value = null
  bindSuccess.value = false
}

async function doBind() {
  if (!bindFg.value || !selectedChild.value) return
  binding.value = true
  try {
    const res = await createBindingApi({
      category: bindCategory.value,
      productBarcode: bindFg.value.prodBatchOrSn || '',
      productName: bindFg.value.productName,
      productMaterialNo: bindFg.value.materialCode,
      materialBarcode: selectedChild.value.barcode,
      materialCode: selectedChild.value.materialCode,
      materialName: selectedChild.value.name,
      specModel: selectedChild.value.specModel,
    })
    if (res.code === 0) {
      bindSuccess.value = true
      bindResultMsg.value = '绑定成功！'
      ElMessage.success('绑定成功！')
    }
  } catch (e: any) {
    if (!isErrorNotified(e)) {
      bindSuccess.value = false
      bindResultMsg.value = `绑定失败：${getErrorMessage(e)}`
    }
  } finally {
    binding.value = false
  }
}

// ── 样式工具 ──────────────────────────────────────────────────
function resultColor(result: string) {
  return result === '合格' ? '#3E7A4E' : '#B84B3E'
}
function resultStyle(result: string) {
  const c = resultColor(result)
  return { color: c, background: c + '18', borderColor: c + '40' }
}
function reviewStyle(status: string) {
  if (status === '已审核') return { color: '#3E7A4E', background: '#3E7A4E18', borderColor: '#3E7A4E40' }
  if (status === '驳回') return { color: '#B84B3E', background: '#B84B3E18', borderColor: '#B84B3E40' }
  return { color: '#b8763e', background: '#b8763e18', borderColor: '#b8763e40' }
}

onMounted(() => loadList())
</script>

<style scoped>
.finished-goods-dashboard {
  padding: 20px 24px;
  height: 100%;
  overflow-y: auto;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
}
.header-title h2 {
  margin: 0 0 4px;
  font-size: 22px;
  color: #1b3a5b;
}
.breadcrumb {
  font-size: 12px;
  color: #8c9ba8;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.module-tag {
  font-size: 11px;
  background: #1b3a5b;
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 1px;
}

/* 筛选栏 */
.filter-bar {
  margin-bottom: 14px;
}
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

/* 表格 */
.table-card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #f0ede9;
  padding: 16px;
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

/* 状态徽标 */
.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid;
}

/* 文本按钮 */
.text-btn {
  background: none;
  border: none;
  color: #1b3a5b;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 4px;
}
.text-btn:hover {
  color: #b8763e;
  text-decoration: underline;
}
.text-btn-danger {
  color: #B84B3E;
}
.text-btn-danger:hover {
  color: #d64a3e;
}
.text-btn-bind {
  color: #5b7a99;
}
.text-btn-trace { color: #27844f; }
.text-btn-trace:hover { color: #176b3a; }
.text-btn-bind:hover {
  color: #b8763e;
}

/* 绑定弹窗 */
.bind-body {
  display: flex;
  flex-direction: column;
}
.bind-card {
  background: #faf9f7;
  border: 1px solid #f0ede9;
  border-radius: 8px;
  padding: 14px;
}
.bind-card-success {
  background: #f0f8f2;
  border-color: #c8e0cc;
}
.bind-card-warn {
  background: #fff8f0;
  border-color: #f0d9c6;
}
.bind-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5b;
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 3px solid #b8763e;
}
.bind-input-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}
.bind-mat-info {
  margin-top: 4px;
}
.bind-msg {
  margin: 0 0 10px;
  font-size: 14px;
  color: #2a2a2a;
}
.font-mono {
  font-family: 'JetBrains Mono', monospace;
}
</style>

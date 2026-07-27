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
        <el-table-column prop="id" label="ID" width="70" align="center" sortable="custom" />
        <el-table-column prop="reportNo" label="报告编号" width="160" show-overflow-tooltip />
        <el-table-column prop="productName" label="产品名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="modelSpec" label="型号规格" width="120" show-overflow-tooltip />
        <el-table-column prop="prodBatchOrSn" label="生产批号/产品编号" width="150" show-overflow-tooltip />
        <el-table-column prop="inspectionResult" label="检验结果" width="100" align="center">
          <template #default="{ row }">
            <span class="status-badge" :style="resultStyle(row.inspectionResult)">{{ row.inspectionResult || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="qcReview" label="品管审核" width="90" align="center">
          <template #default="{ row }">
            <span class="status-badge" :style="reviewStyle(row.qcReview)">{{ row.qcReview || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="mgrApproval" label="管代批准" width="90" align="center">
          <template #default="{ row }">
            <span class="status-badge" :style="reviewStyle(row.mgrApproval)">{{ row.mgrApproval || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="productionOrderNo" label="生产订单号" width="140" show-overflow-tooltip />
        <el-table-column prop="inspectorName" label="检验名字" width="100" />
        <el-table-column prop="qualifiedQty" label="合格数量" width="100" align="right" />
        <el-table-column prop="unqualifiedQty" label="不合格数量" width="100" align="right" />
        <el-table-column prop="createdAt" label="创建时间" width="160" />
        <el-table-column label="操作" width="280" align="center" fixed="right">
          <template #default="{ row }">
            <button class="text-btn" @click="openDetail(row.id)">详情</button>
            <button class="text-btn" style="margin-left:4px" @click="openEdit(row.id)">编辑</button>
            <button class="text-btn text-btn-danger" style="margin-left:4px" @click="deleteRecord(row.id)">删除</button>
            <button class="text-btn text-btn-bind" style="margin-left:4px" @click="openBind(row)">绑定来料</button>
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

    <!-- 绑定来料弹窗 -->
    <el-dialog v-model="bindVisible" title="绑定来料追溯" width="520px" :close-on-click-modal="false" destroy-on-close>
      <div v-if="bindFg" class="bind-body">
        <!-- 当前成品信息 -->
        <div class="bind-card">
          <div class="bind-card-title">当前成品记录</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="ID">{{ bindFg.id }}</el-descriptions-item>
            <el-descriptions-item label="产品名称">{{ bindFg.productName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="生产批号/产品编号" :span="2">
              <span class="font-mono">{{ bindFg.prodBatchOrSn || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="报告编号">{{ bindFg.reportNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="物料编码">{{ bindFg.materialCode || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 选择来料 -->
        <div class="bind-card" style="margin-top:14px">
          <div class="bind-card-title">选择来料记录</div>
          <div class="bind-input-row">
            <el-input-number
              v-model="bindInput.matId"
              :min="1"
              placeholder="来料检验记录 ID"
              style="width: 200px"
              controls-position="right"
            />
            <el-button type="primary" size="default" :loading="queryingMat" @click="queryMaterial">
              查询来料
            </el-button>
          </div>

          <!-- 来料信息展示 -->
          <div v-if="bindMat" class="bind-mat-info">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="物料批号">
                <span class="font-mono">{{ bindMat.materialBatchNo || '-' }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="物料名称">{{ bindMat.materialName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="物料编码">{{ bindMat.materialCode || '-' }}</el-descriptions-item>
              <el-descriptions-item label="供应商">{{ bindMat.supplierName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="检验结果">
                <el-tag
                  :type="bindMat.inspectionResult === '合格' ? 'success' : bindMat.inspectionResult === '不合格' ? 'danger' : 'info'"
                  size="small"
                >{{ bindMat.inspectionResult || '-' }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="送检数量">{{ bindMat.submittedQty ?? '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- 绑定结果 -->
        <div v-if="bindResult" class="bind-card" :class="bindResult.bound ? 'bind-card-success' : 'bind-card-warn'" style="margin-top:14px">
          <div class="bind-card-title">{{ bindResult.bound ? '绑定成功' : '提示' }}</div>
          <p class="bind-msg">{{ bindResult.message }}</p>
          <div v-if="bindResult.bound">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="成品节点 ID">{{ bindResult.finishedGoodsNodeId }}</el-descriptions-item>
              <el-descriptions-item label="来料节点 ID">{{ bindResult.materialNodeId }}</el-descriptions-item>
              <el-descriptions-item label="成品批号">{{ bindResult.finishedGoodsSn }}</el-descriptions-item>
              <el-descriptions-item label="物料批号">{{ bindResult.materialBatchNo }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="bindVisible = false; bindResult = null">关闭</el-button>
        <el-button
          v-if="bindMat && !bindResult?.bound"
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
import {
  getFinishedGoodsListApi,
  getFinishedGoodsDetailApi,
  createFinishedGoodsApi,
  updateFinishedGoodsApi,
  deleteFinishedGoodsApi,
} from '@/api/finishedGoods'
import { bindMaterialToFinishedGoodsApi } from '@/api/trace'
import { getMaterialInspectionDetailApi } from '@/api/incoming'
import type { FinishedGoodsInspection, FinishedGoodsListParams } from '@/types/finishedGoods'
import type { MaterialInspection } from '@/types/incoming'
import FinishedGoodsDetailDialog from './components/FinishedGoodsDetailDialog.vue'

// ── 筛选 ──────────────────────────────────────────────────────
const filters = reactive<FinishedGoodsListParams & { dateRange?: [string, string] | null }>({
  keyword: '',
  inspectionResult: '',
  qcReview: '',
  mgrApproval: '',
  startDate: '',
  endDate: '',
  dateRange: null,
  page: 1,
  size: 20,
})

async function search() {
  filters.page = 1
  await loadList()
}

function resetFilters() {
  filters.keyword = ''
  filters.inspectionResult = ''
  filters.qcReview = ''
  filters.mgrApproval = ''
  filters.startDate = ''
  filters.endDate = ''
  filters.dateRange = null
  filters.page = 1
  filters.size = 20
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
    ElMessage.error('保存失败：' + (e?.message || '未知错误'))
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
    ElMessage.error('删除失败：' + (e?.message || '未知错误'))
  }
}

// ── 绑定来料追溯 ──────────────────────────────────────────────
const bindVisible = ref(false)
const bindFg = ref<FinishedGoodsInspection | null>(null)
const bindMat = ref<MaterialInspection | null>(null)
const bindInput = reactive({ matId: null as number | null })
const bindResult = ref<{ bound: boolean; message: string; finishedGoodsNodeId?: number; finishedGoodsSn?: string; materialNodeId?: number; materialBatchNo?: string } | null>(null)
const queryingMat = ref(false)
const binding = ref(false)

function openBind(row: FinishedGoodsInspection) {
  bindFg.value = row
  bindMat.value = null
  bindInput.matId = null
  bindResult.value = null
  bindVisible.value = true
}

async function queryMaterial() {
  if (!bindInput.matId) return
  queryingMat.value = true
  bindMat.value = null
  try {
    const res = await getMaterialInspectionDetailApi(bindInput.matId)
    if (res.code === 0 && res.data) {
      bindMat.value = res.data
    } else {
      ElMessage.error('未找到该来料记录')
    }
  } catch (e: any) {
    ElMessage.error('查询失败：' + (e?.message || '未知错误'))
  } finally {
    queryingMat.value = false
  }
}

async function doBind() {
  if (!bindFg.value || !bindInput.matId) return
  binding.value = true
  try {
    const res = await bindMaterialToFinishedGoodsApi(bindInput.matId, bindFg.value.id)
    if (res.code === 0) {
      bindResult.value = res.data
      if (res.data.bound) {
        ElMessage.success('绑定成功！')
      } else {
        ElMessage.warning(res.data.message)
      }
    }
  } catch (e: any) {
    ElMessage.error('绑定失败：' + (e?.message || '未知错误'))
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

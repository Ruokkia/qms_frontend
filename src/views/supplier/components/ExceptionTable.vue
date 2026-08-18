<template>
  <div class="exception-table-wrap" v-loading="loading">
    <!-- 不良汇总卡片 -->
    <section class="summary-strip">
      <div class="summary-cell">
        <div class="summary-value">{{ summary?.occurrenceCount ?? 0 }}</div>
        <div class="summary-label">来料不良发生次数</div>
      </div>
      <div class="summary-cell">
        <div class="summary-value">{{ summary?.latestOccurrenceAt || '—' }}</div>
        <div class="summary-label">最近发生时间</div>
      </div>
      <div class="summary-cell">
        <div class="summary-value summary-defect">{{ summary?.topDefectDesc || '—' }}</div>
        <div class="summary-label">最高频不良描述</div>
      </div>
    </section>

    <div class="table-toolbar">
      <span class="toolbar-title">来料异常单明细</span>
      <span class="toolbar-count">共 {{ total }} 条</span>
    </div>
    <el-table :data="rows" border stripe size="default" :max-height="460">
      <el-table-column prop="exceptionNo" label="异常单号" min-width="160" />
      <el-table-column prop="sourceType" label="来源" min-width="100" />
      <el-table-column prop="defectDesc" label="不良描述" min-width="180" show-overflow-tooltip />
      <el-table-column prop="materialCode" label="物料编码" min-width="120" />
      <el-table-column prop="severity" label="严重等级" min-width="90" />
      <el-table-column prop="status" label="状态" min-width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" min-width="160" />
    </el-table>
    <div class="table-pager">
      <el-pagination
        background
        layout="prev, pager, next, sizes"
        :total="total"
        :page-size="size"
        :current-page="page"
        :page-sizes="[10, 20, 50]"
        @current-change="onPage"
        @size-change="onSize"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { getSupplierExceptionsApi, getSupplierExceptionSummaryApi, type Supplier } from '@/api/supplier'
import type { ExceptionOrder, SupplierExceptionSummary } from '@/types/exception'

const props = defineProps<{ supplier: Supplier }>()

const rows = ref<ExceptionOrder[]>([])
const total = ref(0)
const summary = ref<SupplierExceptionSummary | null>(null)
const page = ref(1)
const size = ref(20)
const loading = ref(false)

function statusTagType(status?: string): 'success' | 'warning' | 'info' | 'danger' {
  if (status === '已闭环') return 'success'
  if (status === '整改中') return 'warning'
  if (status === '待验证') return 'info'
  if (status === '待整改') return 'danger'
  return 'info'
}

async function load() {
  loading.value = true
  try {
    const [listRes, sumRes] = await Promise.all([
      getSupplierExceptionsApi({
        page: page.value,
        size: size.value,
        supplierId: props.supplier.id,
        sourceType: '来料不良',
      }),
      getSupplierExceptionSummaryApi({ supplierId: props.supplier.id }),
    ])
    if (listRes.code === 0 && listRes.data) {
      rows.value = listRes.data.list
      total.value = listRes.data.total
    }
    if (sumRes.code === 0 && sumRes.data) {
      summary.value = sumRes.data[0] || null
    }
  } finally {
    loading.value = false
  }
}

function onPage(p: number) {
  page.value = p
  load()
}
function onSize(s: number) {
  size.value = s
  page.value = 1
  load()
}

watch(() => props.supplier.id, () => {
  page.value = 1
  load()
})

onMounted(load)
</script>

<style scoped>
.exception-table-wrap {
  padding-top: 4px;
}
.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.summary-cell {
  background: linear-gradient(135deg, #eff6ff 0%, #f5f7fa 100%);
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px 16px;
}
.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: #1d4ed8;
}
.summary-defect {
  font-size: 15px;
  color: #ef4444;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.summary-label {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}
.table-toolbar {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}
.toolbar-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}
.toolbar-count {
  font-size: 13px;
  color: #6b7280;
}
.table-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>

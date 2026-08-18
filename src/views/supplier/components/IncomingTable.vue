<template>
  <div class="incoming-table-wrap" v-loading="loading">
    <div class="table-toolbar">
      <span class="toolbar-title">来料检验记录</span>
      <span class="toolbar-count">共 {{ total }} 条</span>
    </div>
    <el-table :data="rows" border stripe size="default" :max-height="520">
      <el-table-column prop="recordNo" label="记录编号" min-width="150" />
      <el-table-column prop="materialName" label="物料名称" min-width="140" show-overflow-tooltip />
      <el-table-column prop="materialCode" label="物料编码" min-width="120" />
      <el-table-column prop="materialBatchNo" label="批号" min-width="140" show-overflow-tooltip />
      <el-table-column prop="inspectionDate" label="检验日期" min-width="120" />
      <el-table-column prop="inspectionResult" label="结果" min-width="90">
        <template #default="{ row }">
          <el-tag :type="row.inspectionResult === '合格' ? 'success' : row.inspectionResult === '不合格' ? 'danger' : 'info'" size="small">
            {{ row.inspectionResult || '—' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="unqualifiedQty" label="不良数" min-width="90" align="right" />
      <el-table-column prop="reviewStatus" label="审核状态" min-width="100" />
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
import { getSupplierIncomingApi, type Supplier } from '@/api/supplier'
import type { MaterialInspection } from '@/types/incoming'

const props = defineProps<{ supplier: Supplier }>()

const rows = ref<MaterialInspection[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const loading = ref(false)

async function load() {
  if (!props.supplier.supplierCode) {
    rows.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const res = await getSupplierIncomingApi({
      page: page.value,
      size: size.value,
      supplierCode: props.supplier.supplierCode,
    })
    if (res.code === 0 && res.data) {
      rows.value = res.data.list
      total.value = res.data.total
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
.incoming-table-wrap {
  padding-top: 4px;
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

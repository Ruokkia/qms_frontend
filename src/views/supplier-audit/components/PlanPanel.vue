<template>
  <div class="plan-panel">
    <div class="toolbar">
      <el-button type="primary" :loading="generating" @click="generateAnnual">
        一键生成年度计划
      </el-button>
      <el-divider direction="vertical" />
      <el-select v-model="auditType" placeholder="类型" clearable style="width: 120px" @change="loadPlans">
        <el-option label="年度" value="年度" />
        <el-option label="专项" value="专项" />
        <el-option label="临时" value="临时" />
      </el-select>
      <el-select v-model="status" placeholder="状态" clearable style="width: 120px" @change="loadPlans">
        <el-option label="草稿" value="草稿" />
        <el-option label="已排期" value="已排期" />
        <el-option label="已完成" value="已完成" />
      </el-select>
      <el-input
        v-model="keyword"
        placeholder="供应商编码/名称"
        clearable
        style="width: 200px"
        @keyup.enter="loadPlans"
        @clear="loadPlans"
      />
      <el-button @click="loadPlans">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="supplierCode" label="供应商编码" width="140" />
      <el-table-column prop="supplierName" label="供应商名称" min-width="160" />
      <el-table-column prop="auditType" label="类型" width="90" />
      <el-table-column prop="frequency" label="频次" width="120" />
      <el-table-column prop="plannedDate" label="计划日期" width="130" />
      <el-table-column prop="auditor" label="审核人" width="100" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="size"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      @current-change="loadPlans"
      @size-change="loadPlans"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createPlanApi,
  listPlansApi,
  type SupplierAuditPlan,
} from '@/api/supplier-audit'
import { getSupplierListApi, type Supplier } from '@/api/supplier'

const emit = defineEmits<{ (e: 'created'): void }>()

const loading = ref(false)
const generating = ref(false)
const rows = ref<SupplierAuditPlan[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const auditType = ref('')
const status = ref('')
const keyword = ref('')

function statusType(s?: string) {
  if (s === '已完成') return 'success'
  if (s === '已排期') return 'warning'
  return 'info'
}

async function loadPlans() {
  loading.value = true
  try {
    const res = await listPlansApi({
      page: page.value,
      size: size.value,
      auditType: auditType.value || undefined,
      status: status.value || undefined,
      keyword: keyword.value || undefined,
    })
    if (res.code === 0 && res.data) {
      rows.value = res.data.list
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

async function generateAnnual() {
  generating.value = true
  try {
    const supRes = await getSupplierListApi({ page: 1, size: 200 })
    const suppliers: Supplier[] = supRes.data?.list ?? []
    if (!suppliers.length) {
      ElMessage.warning('当前分公司暂无供应商')
      return
    }
    const res = await createPlanApi({ auditType: '年度', planYear: new Date().getFullYear() })
    if (res.code === 0) {
      ElMessage.success(`已生成 ${res.data?.length ?? 0} 条年度审核计划`)
      emit('created')
      loadPlans()
    }
  } finally {
    generating.value = false
  }
}

onMounted(loadPlans)
</script>

<style scoped>
.plan-panel { padding: 8px 0; }
.toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.el-pagination { margin-top: 12px; justify-content: flex-end; }
</style>

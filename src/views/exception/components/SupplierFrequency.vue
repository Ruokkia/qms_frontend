<template>
  <div class="supplier-freq">
    <div class="card-header">
      <div class="card-title-row">
        <span class="card-title">供应商来料不良频次</span>
        <span class="card-hint">高频问题供应商 → 自动触发升级评审</span>
      </div>
      <div class="filter-inline">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          size="small"
          style="width: 220px"
          @change="loadData"
        />
        <el-input-number
          v-model="minCount"
          :min="1"
          :max="99"
          size="small"
          controls-position="right"
          style="width: 120px"
          @change="loadData"
        >
          <template #prefix>≥</template>
        </el-input-number>
        <el-button type="primary" size="small" :loading="loading" @click="loadData">
          查询
        </el-button>
      </div>
    </div>

    <el-table
      :data="list"
      v-loading="loading"
      stripe
      class="freq-table"
      empty-text="该筛选条件下暂无供应商不良记录"
    >
      <el-table-column type="index" label="排名" width="64" align="center" />
      <el-table-column label="供应商" min-width="160">
        <template #default="{ row }">
          <div class="cell-main">{{ row.supplierName }}</div>
          <div class="cell-sub">{{ row.supplierCode }}</div>
        </template>
      </el-table-column>
      <el-table-column label="不良频次" width="120" align="center">
        <template #default="{ row }">
          <span class="freq-badge" :class="{ hot: row.occurrenceCount >= 3 }">
            {{ row.occurrenceCount }}
            <small>次</small>
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="topDefectDesc" label="主要不良描述" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="defect-text">{{ row.topDefectDesc || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="最近发生" width="150">
        <template #default="{ row }">{{ row.latestOccurrenceAt?.slice(0, 16) || '—' }}</template>
      </el-table-column>
      <el-table-column label="关联异常单" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.relatedExceptionIds?.length" class="link-count">
            {{ row.relatedExceptionIds.length }} 单
          </span>
          <span v-else class="link-count none">—</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{ row }">
          <button class="text-btn" :disabled="!row.relatedExceptionIds?.length" @click="drillDown(row)">
            下钻
          </button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSupplierExceptionSummaryApi } from '@/api/exception'
import type { SupplierExceptionSummary } from '@/types/exception'

const router = useRouter()

const loading = ref(false)
const list = ref<SupplierExceptionSummary[]>([])
const dateRange = ref<[string, string] | null>(null)
const minCount = ref(1)

async function loadData() {
  loading.value = true
  try {
    const params: any = { minCount: minCount.value }
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await getSupplierExceptionSummaryApi(params)
    if (res.code === 0) list.value = res.data || []
  } catch (e) {
    console.error('加载供应商频次失败', e)
  } finally {
    loading.value = false
  }
}

function drillDown(row: SupplierExceptionSummary) {
  router.push({
    path: '/exception',
    query: { supplierId: row.supplierId, sourceType: '来料不良' },
  })
}

onMounted(loadData)
</script>

<style scoped>
.supplier-freq {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.card-title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1b3a5b;
}
.card-hint {
  font-size: 11px;
  color: #b8763e;
  letter-spacing: 0.3px;
}
.filter-inline {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.cell-main {
  font-size: 13px;
  color: #2a2a2a;
}
.cell-sub {
  font-size: 11px;
  color: #b8b3ac;
  margin-top: 2px;
  font-family: 'JetBrains Mono', monospace;
}
.freq-badge {
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  color: #3e6b95;
  background: rgba(62, 107, 149, 0.1);
  border-radius: 4px;
  padding: 2px 10px;
}
.freq-badge small {
  font-size: 11px;
  font-weight: 400;
  margin-left: 2px;
}
.freq-badge.hot {
  color: #b84b3e;
  background: rgba(184, 75, 62, 0.12);
}
.defect-text {
  font-size: 13px;
  color: #4a4a4a;
}
.link-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #1b3a5b;
  font-weight: 600;
}
.link-count.none {
  color: #b8b3ac;
  font-weight: 400;
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
.text-btn:hover:not(:disabled) {
  background: #1b3a5b;
  color: #fff;
  border-color: #1b3a5b;
}
.text-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.freq-table :deep(.el-table__row) {
  transition: background 0.15s;
}
.freq-table :deep(.el-table__row:hover) {
  background: #faf8f5;
}
</style>

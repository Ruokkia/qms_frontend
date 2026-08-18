<template>
  <div class="supplier-list-wrap">
    <!-- 工具条：关键词搜索 + 总数 -->
    <div class="list-toolbar">
      <el-input
        v-model="keyword"
        placeholder="按供应商编号 / 名称搜索"
        clearable
        size="default"
        style="width: 260px"
        @input="onKeywordInput"
        @clear="reload(1)"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <span class="toolbar-count">共 {{ total }} 家供应商</span>
    </div>

    <!-- 供应商列表表格 -->
    <el-table
      :data="rows"
      border
      stripe
      size="default"
      highlight-current-row
      :max-height="420"
      v-loading="loading"
      :current-row-key="String(selectedId)"
      @row-click="onRowClick"
      style="cursor: pointer"
    >
      <el-table-column prop="supplierCode" label="供应商编号" min-width="140" />
      <el-table-column prop="supplierName" label="供应商名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="riskLevel" label="风险等级" min-width="100">
        <template #default="{ row }">
          <el-tag :type="riskTagType(row.riskLevel)" size="small" effect="light">
            {{ row.riskLevel || '未评级' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" min-width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === '停用' ? 'info' : 'success'" size="small">
            {{ row.status || '未知' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="contactPerson" label="联系人" min-width="110" show-overflow-tooltip />
      <el-table-column label="操作" min-width="90" fixed="right">
        <template #default="{ row }">
          <el-button
            type="primary"
            link
            size="small"
            @click.stop="onRowClick(row)"
          >
            {{ row.id === selectedId ? '查看中' : '查看档案' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="list-pager">
      <el-pagination
        background
        layout="total, prev, pager, next, sizes"
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
import { ref, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getSupplierListApi, type Supplier } from '@/api/supplier'

const props = defineProps<{ selectedId?: number }>()
const emit = defineEmits<{ (e: 'select', supplier: Supplier): void }>()

const rows = ref<Supplier[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const keyword = ref('')
const loading = ref(false)
let keywordTimer: number | undefined

function riskTagType(level?: string): 'danger' | 'warning' | 'success' | 'info' {
  if (level === '高') return 'danger'
  if (level === '中') return 'warning'
  if (level === '低') return 'success'
  return 'info'
}

async function load() {
  loading.value = true
  try {
    const res = await getSupplierListApi({
      page: page.value,
      size: size.value,
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

function reload(p = 1) {
  page.value = p
  load()
}

function onKeywordInput() {
  if (keywordTimer) window.clearTimeout(keywordTimer)
  keywordTimer = window.setTimeout(() => reload(1), 350)
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

function onRowClick(row: Supplier) {
  emit('select', row)
}

onMounted(load)
</script>

<style scoped>
.supplier-list-wrap {
  padding-top: 4px;
}
.list-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.toolbar-count {
  font-size: 13px;
  color: #6b7280;
}
.list-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>

<template>
  <el-dialog
    :model-value="modelValue"
    title="选择源头记录"
    width="760px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @open="onOpen"
  >
    <div class="flex items-center gap-2 mb-3">
      <el-input
        v-model="keyword"
        placeholder="搜索物料编码 / 名称 / 批号 / 供应商"
        clearable
        class="flex-1"
        @keyup.enter="doSearch"
        @clear="doSearch"
      />
      <el-button type="primary" @click="doSearch">搜索</el-button>
    </div>
    <el-table
      :data="rows"
      v-loading="loading"
      border
      height="360"
      highlight-current-row
      @current-change="onCurrentChange"
    >
      <el-table-column prop="materialCode" label="物料编码" min-width="120" />
      <el-table-column prop="materialName" label="物料名称" min-width="140" show-overflow-tooltip />
      <el-table-column prop="batchNo" label="批号/序列号" min-width="120" show-overflow-tooltip />
      <el-table-column prop="supplierName" label="供应商" min-width="120" show-overflow-tooltip />
      <el-table-column prop="workOrderNo" label="工单/订单号" min-width="120" show-overflow-tooltip />
    </el-table>
    <div class="flex justify-end mt-3">
      <el-pagination
        layout="prev, pager, next, total"
        :total="total"
        :page-size="size"
        :current-page="page"
        @current-change="(p: number) => { page = p; load() }"
      />
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!current" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getSourceOptionsApi } from '@/api/exception'
import type { ExceptionSourceOptionVO } from '@/types/exception'

const props = defineProps<{ modelValue: boolean; sourceType: string }>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  select: [ExceptionSourceOptionVO]
}>()

const keyword = ref('')
const rows = ref<ExceptionSourceOptionVO[]>([])
const current = ref<ExceptionSourceOptionVO | null>(null)
const loading = ref(false)
const page = ref(1)
const size = ref(20)
const total = ref(0)

function onOpen() {
  keyword.value = ''
  page.value = 1
  current.value = null
  load()
}

function doSearch() {
  page.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await getSourceOptionsApi({
      sourceType: props.sourceType,
      keyword: keyword.value || undefined,
      page: page.value,
      size: size.value,
    })
    rows.value = res.data?.list ?? []
    total.value = res.data?.total ?? 0
  } finally {
    loading.value = false
  }
}

function onCurrentChange(row: ExceptionSourceOptionVO | null) {
  current.value = row
}

function confirm() {
  if (current.value) {
    emit('select', current.value)
    emit('update:modelValue', false)
  }
}
</script>

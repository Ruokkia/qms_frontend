<template>
  <div class="inspect-list">
    <div class="toolbar">
      <el-form :inline="true" class="search-form">
        <el-form-item label="首件编号">
          <el-input v-model="filters.faiNo" placeholder="编号/模糊" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input v-model="filters.batchNo" placeholder="精确" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="物料名称">
          <el-input v-model="filters.materialName" placeholder="模糊" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="判定结果">
          <el-select v-model="filters.inspectionResult" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="r in results" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="load">查询</el-button>
          <el-button :icon="RefreshLeft" @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="store.inspectionList" v-loading="store.loading" border stripe height="440">
      <el-table-column type="index" label="#" width="50" />
      <el-table-column prop="faiNo" label="首件编号" width="190" />
      <el-table-column prop="materialName" label="物料名称" min-width="140" />
      <el-table-column prop="materialCode" label="物料代码" width="120" />
      <el-table-column prop="batchNo" label="批次号" width="130" />
      <el-table-column prop="processName" label="工序" width="90" />
      <el-table-column label="判定结果" width="100">
        <template #default="{ row }">
          <el-tag :type="resultTag(row.inspectionResult)" effect="light">{{ row.inspectionResult }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="签名状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.signatureStatus === '已签' ? 'success' : 'info'" effect="plain">
            {{ row.signatureStatus }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link :icon="Edit" @click="emit('inspect', row.id)">检验录入</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { Search, RefreshLeft, Edit } from '@element-plus/icons-vue'
import { useFaiStore } from '@/stores/fai'
import type { FaiQuery } from '@/types/fai'

const props = defineProps<{ _unused?: never }>()
const emit = defineEmits<{ inspect: [id: number] }>()

const store = useFaiStore()
const results = ['待判定', '合格', '不合格']

const filters = reactive<FaiQuery>({
  faiNo: '',
  batchNo: '',
  materialName: '',
  inspectionResult: '',
})

function resultTag(r: string) {
  if (r === '合格') return 'success'
  if (r === '不合格') return 'danger'
  return 'warning'
}

async function load() {
  await store.fetchInspections({ ...filters })
}

function reset() {
  filters.faiNo = ''
  filters.batchNo = ''
  filters.materialName = ''
  filters.inspectionResult = ''
  load()
}

onMounted(load)

defineExpose({ load })

</script>

<style scoped>
.toolbar {
  margin-bottom: 14px;
}
.search-form :deep(.el-form-item) {
  margin-bottom: 8px;
}
</style>

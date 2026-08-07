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
        <el-form-item :label="nameLabel">
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
      <el-table-column :label="nameLabel" prop="itemName" min-width="140">
        <template #default="{ row }">
          {{ row.itemName || row.materialName || '-' }}
        </template>
      </el-table-column>
      <el-table-column :label="codeLabel" prop="itemCode" width="130">
        <template #default="{ row }">
          {{ row.itemCode || row.materialCode || '-' }}
        </template>
      </el-table-column>
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
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link :icon="Edit" @click="emit('inspect', row.id)">检验录入</el-button>
          <el-button
            v-if="canCollect(row)"
            type="success"
            link
            :icon="DataLine"
            @click="goCollect(row)"
          >去采集</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, inject, watch, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, RefreshLeft, Edit, DataLine } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useFaiStore } from '@/stores/fai'
import { useAuthStore } from '@/stores/auth'
import type { FaiQuery } from '@/types/fai'
import type { ItemType } from '@/stores/itemType'

const props = defineProps<{ _unused?: never }>()
const emit = defineEmits<{ inspect: [id: number] }>()

const store = useFaiStore()
const auth = useAuthStore()
const router = useRouter()
const results = ['待判定', '合格', '不合格']

// 合格且已签 + 当前用户具备 SPC 模块权限，才显示「去采集」入口
function canCollect(row: any): boolean {
  return row.inspectionResult === '合格' && row.signatureStatus === '已签' && auth.hasModule('spc')
}

// 跳转 SPC 数据采集，携带分类/代码/批次/工序，避免用户重新检索
function goCollect(row: any) {
  const code = row.itemCode || row.materialCode || ''
  if (!code) {
    ElMessage.warning('该单据无有效产品/物料代码，无法跳转采集')
    return
  }
  router.push({
    path: '/spc',
    query: {
      tab: 'entry',
      faiRecordId: String(row.id),
      itemType: faiItemType.value,
      itemCode: code,
      batchNo: row.batchNo || '',
      barcode: row.itemBarcode || '',
      processName: row.processName || '',
    },
  })
}

// 强制二选一且持久化，恒为 PRODUCT/MATERIAL，不存在空值兜底分支
const faiItemType = inject<Ref<ItemType>>('faiItemType', ref<ItemType>('PRODUCT'))

// 名称/代码列标签随分类精确切换，避免产品被误标为「物料名称」
const typeLabel = computed(() => (faiItemType.value === 'PRODUCT' ? '产品' : '物料'))
const nameLabel = computed(() => `${typeLabel.value}名称`)
const codeLabel = computed(() => `${typeLabel.value}代码`)

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
  await store.fetchInspections({ ...filters, itemType: faiItemType.value })
}

function reset() {
  filters.faiNo = ''
  filters.batchNo = ''
  filters.materialName = ''
  filters.inspectionResult = ''
  load()
}

// 分类选择器切换时，按 itemType 过滤并刷新列表（不重置其它查询条件）
watch(() => faiItemType.value, () => load())

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

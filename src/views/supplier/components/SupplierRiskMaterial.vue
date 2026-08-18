<template>
  <div class="risk-material">
    <div class="toolbar" v-if="canEdit">
      <el-select v-model="selMaterial" filterable placeholder="选择高风险物料关联" style="width:280px">
        <el-option v-for="m in allMaterials" :key="m.id" :label="m.materialName + '（' + m.materialCode + '）'"
          :value="m.id" :disabled="linkedIds.has(m.id)" />
      </el-select>
      <el-button type="primary" :disabled="!selMaterial" @click="link">关联</el-button>
    </div>

    <el-alert v-if="list.length === 0" type="info" :closable="false" title="该供应商暂无关联的高风险物料" />

    <el-table v-else :data="list" border stripe>
      <el-table-column prop="materialCode" label="物料编码" width="120" />
      <el-table-column prop="materialName" label="物料名称" min-width="140" />
      <el-table-column label="风险等级" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.riskLevel === '高' ? 'danger' : 'warning'" effect="light">{{ row.riskLevel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="额外资料要求" min-width="320">
        <template #default="{ row }">
          <div class="req">{{ row.extraRequirement || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" v-if="canEdit">
        <template #default="{ row }">
          <el-button link type="danger" @click="unlink(row)">取消</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listHighRiskMaterialsApi,
  listSupplierHighRiskApi,
  linkHighRiskApi,
  unlinkHighRiskApi,
  type HighRiskMaterial,
  type SupplierHighRiskMaterial,
} from '@/api/supplier-high-risk'

const props = defineProps<{ supplierId?: number; canEdit?: boolean }>()

const allMaterials = ref<HighRiskMaterial[]>([])
const list = ref<SupplierHighRiskMaterial[]>([])
const selMaterial = ref<number | undefined>(undefined)

const linkedIds = computed(() => new Set(list.value.map((l) => l.materialId)))

async function load() {
  if (!props.supplierId) {
    list.value = []
    return
  }
  const [m, l] = await Promise.all([
    listHighRiskMaterialsApi(),
    listSupplierHighRiskApi(props.supplierId),
  ])
  allMaterials.value = m.data || []
  list.value = l.data || []
}

async function link() {
  if (!selMaterial.value || !props.supplierId) return
  await linkHighRiskApi({ supplierId: props.supplierId, materialId: selMaterial.value })
  ElMessage.success('已关联')
  selMaterial.value = undefined
  await load()
}

async function unlink(row: SupplierHighRiskMaterial) {
  await ElMessageBox.confirm(`取消关联「${row.materialName}」？`, '提示', { type: 'warning' })
  await unlinkHighRiskApi(row.id)
  ElMessage.success('已取消')
  await load()
}

watch(() => props.supplierId, load)
onMounted(load)
</script>

<style scoped>
.toolbar {
  margin-bottom: 12px;
}
.req {
  white-space: pre-line;
  line-height: 1.6;
}
</style>

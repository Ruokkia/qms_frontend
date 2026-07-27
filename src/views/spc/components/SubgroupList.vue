<template>
  <el-card shadow="never" class="subgroup-list">
    <template #header>
      <div class="head">
        <span class="title">子组历史</span>
        <el-button size="small" text @click="load">刷新</el-button>
      </div>
    </template>
    <el-table :data="list" height="430" size="small" empty-text="暂无子组数据" v-loading="loading">
      <el-table-column prop="subgroupNo" label="子组编号" show-overflow-tooltip />
      <el-table-column label="均值" width="84">
        <template #default="{ row }"><span class="num">{{ fmt(row.meanValue) }}</span></template>
      </el-table-column>
      <el-table-column label="极差R" width="84">
        <template #default="{ row }"><span class="num">{{ fmt(row.rangeValue) }}</span></template>
      </el-table-column>
      <el-table-column prop="sourceType" label="来源" width="80" />
      <el-table-column label="操作" width="70" fixed="right">
        <template #default="{ row }">
          <el-popconfirm title="确认删除该子组及明细？" @confirm="onDelete(row)">
            <template #reference>
              <el-button link type="danger" size="small">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useSpcStore } from '@/stores/spc'

const props = defineProps<{ paramId: number | null }>()
const emit = defineEmits<{ (e: 'deleted'): void }>()
const store = useSpcStore()
const list = ref<any[]>([])
const loading = ref(false)

function fmt(v: number | null | undefined): string {
  return v == null ? '—' : Number(v).toFixed(3)
}

async function load() {
  if (!props.paramId) {
    list.value = []
    return
  }
  loading.value = true
  try {
    list.value = await store.fetchSubgroups(props.paramId)
  } finally {
    loading.value = false
  }
}

async function onDelete(row: any) {
  await store.deleteSubgroup(row.id)
  ElMessage.success('子组已删除')
  await load()
  emit('deleted')
}

defineExpose({ load })

watch(() => props.paramId, load)
onMounted(load)
</script>

<style scoped>
.subgroup-list { border: 1px solid #ECE7E1; }
.head { display: flex; align-items: center; justify-content: space-between; }
.title { font-weight: 600; color: #1B3A5B; }
.num { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #5B7A99; }
</style>

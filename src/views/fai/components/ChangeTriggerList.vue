<template>
  <div class="trigger-list">
    <div class="toolbar">
      <el-form :inline="true" class="search-form">
        <el-form-item label="变更类型">
          <el-select v-model="filters.triggerType" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="t in triggerTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="物料代码">
          <el-input v-model="filters.materialCode" placeholder="模糊匹配" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input v-model="filters.batchNo" placeholder="精确" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="s in statuses" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="load">查询</el-button>
          <el-button :icon="RefreshLeft" @click="reset">重置</el-button>
          <el-button type="warning" :icon="Plus" @click="showForm = true">新增变更触发</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="store.changeTriggerList" v-loading="store.loading" border stripe height="460">
      <el-table-column type="index" label="#" width="50" />
      <el-table-column prop="triggerType" label="变更类型" width="110" />
      <el-table-column prop="workOrderNo" label="工单号" width="130" />
      <el-table-column prop="materialCode" label="物料代码" width="120" />
      <el-table-column prop="materialName" label="物料名称" min-width="140" />
      <el-table-column prop="batchNo" label="批次号" width="130" />
      <el-table-column prop="processName" label="工序" width="90" />
      <el-table-column prop="triggerReason" label="触发原因" min-width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)" effect="light">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === '待检验'"
            type="success"
            link
            :icon="Finished"
            @click="generate(row)"
          >生成首件检验</el-button>
          <el-tag v-else type="info" effect="plain" size="small">已建单</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <ChangeTriggerForm v-model="showForm" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, RefreshLeft, Plus, Finished } from '@element-plus/icons-vue'
import { useFaiStore } from '@/stores/fai'
import { useAuthStore } from '@/stores/auth'
import ChangeTriggerForm from './ChangeTriggerForm.vue'
import type { FaiChangeTrigger } from '@/types/fai'

const emit = defineEmits<{
  inspectionCreated: []
}>()

const store = useFaiStore()
const auth = useAuthStore()
const showForm = ref(false)

const triggerTypes = ['换模具', '升级系统', '换批次', '换设备', '材料批次']
const statuses = ['待检验', '已检验', '关闭']

const filters = reactive<{
  triggerType: string
  materialCode: string
  batchNo: string
  status: string
}>({
  triggerType: '',
  materialCode: '',
  batchNo: '',
  status: '',
})

function statusTag(status: string) {
  if (status === '待检验') return 'warning'
  if (status === '已检验') return 'primary'
  return 'info'
}

async function load() {
  await store.fetchChangeTriggers({ ...filters })
}

function reset() {
  filters.triggerType = ''
  filters.materialCode = ''
  filters.batchNo = ''
  filters.status = ''
  load()
}

async function generate(row: FaiChangeTrigger) {
  try {
    await store.createInspection(row.id)
    ElMessage.success('首件检验单已生成，请在「首件检验执行」中录入')
    await load()
    emit('inspectionCreated')
  } catch {
    // 错误已由拦截器提示
  }
}

function onSaved() {
  showForm.value = false
  load()
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  margin-bottom: 14px;
}
.search-form :deep(.el-form-item) {
  margin-bottom: 8px;
}
</style>

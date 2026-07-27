<template>
  <div class="page-container">
    <div class="page-card">
      <!-- 题头 -->
      <header class="page-header">
        <div class="header-left">
          <h1 class="header-title">首件检验管理</h1>
          <p class="header-sub">FAI 变更触发 · 检验执行 · 标准维护 · 历史报告 · {{ auth.user?.plantName }}分公司</p>
        </div>
        <span class="module-tag">M3</span>
      </header>

      <el-tabs v-model="activeTab" class="fai-tabs">
        <el-tab-pane label="变更触发管理" name="trigger">
          <ChangeTriggerList @saved="onTriggerSaved" @inspection-created="onInspectionCreated" />
        </el-tab-pane>

        <el-tab-pane label="首件检验执行" name="inspect">
          <InspectionList ref="inspectionListRef" @inspect="openInspect" />
        </el-tab-pane>

        <el-tab-pane label="检验标准维护" name="standard">
          <StandardMaintenance />
        </el-tab-pane>

        <el-tab-pane label="历史报告查询" name="report">
          <HistoryReport />
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 检验录入抽屉 -->
    <InspectionForm
      v-model="inspectVisible"
      :inspection-id="currentInspectId"
      @updated="onInspectUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ChangeTriggerList from './components/ChangeTriggerList.vue'
import InspectionList from './components/InspectionList.vue'
import InspectionForm from './components/InspectionForm.vue'
import HistoryReport from './components/HistoryReport.vue'
import StandardMaintenance from './components/StandardMaintenance.vue'

const auth = useAuthStore()
const activeTab = ref('trigger')
const inspectVisible = ref(false)
const currentInspectId = ref<number | null>(null)
const inspectionListRef = ref<InstanceType<typeof InspectionList>>()

function onTriggerSaved() {
  // 触发记录新建后，若停留在触发页无需额外操作
}

async function onInspectionCreated() {
  activeTab.value = 'inspect'
  await nextTick()
  inspectionListRef.value?.load()
}

function openInspect(id: number) {
  currentInspectId.value = id
  inspectVisible.value = true
}

function onInspectUpdated() {
  // 抽屉内完成提交/签名后，刷新列表保持状态同步
  inspectionListRef.value?.load()
}
</script>

<style scoped>
/* ── 题头 ── */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #edf0f4;
}
.header-title {
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 4px;
  color: #1b3a5b;
}
.header-sub {
  font-size: 12px;
  color: #8c9ba8;
  margin: 0;
}
.module-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #fff;
  background: #1b3a5b;
  padding: 2px 8px;
  border-radius: 3px;
  letter-spacing: 0.5px;
}
.page-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 20px;
}
.fai-tabs :deep(.el-tabs__header) {
  margin-bottom: 18px;
}
.fai-tabs :deep(.el-tabs__item) {
  font-weight: 600;
  color: #5b7a99;
}
.fai-tabs :deep(.el-tabs__item.is-active) {
  color: #1b3a5b;
}
.fai-tabs :deep(.el-tabs__active-bar) {
  background-color: #b8763e;
}
</style>

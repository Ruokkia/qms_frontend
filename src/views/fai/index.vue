<template>
  <div class="page-container">
    <div class="page-card">
      <!-- 题头 -->
      <header class="page-header">
        <div class="header-left">
          <h1 class="header-title">首件检验管理</h1>
          <p class="header-sub">FAI 变更触发 · 检验执行 · 标准维护 · 历史报告 · {{ auth.user?.plantName }}分公司</p>
        </div>
      </header>

      <!-- 全局分类选择器：强制二选一，切换 tab 时保持选中，并持久化继承上次选择 -->
      <div class="fai-item-type">
        <span class="fai-item-type__label">分类</span>
        <el-radio-group :model-value="faiItemType" @update:model-value="onItemTypeChange">
          <el-radio-button value="PRODUCT">产品</el-radio-button>
          <el-radio-button value="MATERIAL">物料</el-radio-button>
        </el-radio-group>
      </div>

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
          <HistoryReport ref="historyReportRef" />
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
import { computed, nextTick, provide, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useItemTypeStore, type ItemType } from '@/stores/itemType'
import ChangeTriggerList from './components/ChangeTriggerList.vue'
import InspectionList from './components/InspectionList.vue'
import InspectionForm from './components/InspectionForm.vue'
import HistoryReport from './components/HistoryReport.vue'
import StandardMaintenance from './components/StandardMaintenance.vue'

const auth = useAuthStore()
const activeTab = ref('trigger')
// 全局分类（产品/物料）来自共享 store：与 SPC 同源、localStorage 持久化，
// 进入页面即继承上一次选择，不存在空值分支，从根上消除产品/物料混合展示。
const itemTypeStore = useItemTypeStore()
const { itemType: faiItemType } = storeToRefs(itemTypeStore)
provide('faiItemType', faiItemType)
// 当前分类中文名，供子组件与本页动态文案使用
provide('faiItemTypeLabel', computed(() => itemTypeStore.labelOf()))

function onItemTypeChange(val: string | number | boolean | undefined) {
  itemTypeStore.setItemType(val as ItemType)
}
const inspectVisible = ref(false)
const currentInspectId = ref<number | null>(null)
const inspectionListRef = ref<InstanceType<typeof InspectionList>>()
const historyReportRef = ref<InstanceType<typeof HistoryReport>>()

// 切换至「首件检验执行 / 历史报告查询」时，自动拉取并渲染最新数据，
// 消除对手动刷新的强制依赖。await nextTick 兼容 lazy/eager 两种渲染模式下的 ref 就绪。
watch(activeTab, async (tab) => {
  await nextTick()
  if (tab === 'inspect') inspectionListRef.value?.load()
  else if (tab === 'report') historyReportRef.value?.load()
})

function onTriggerSaved() {
  // 触发记录新建后，若停留在触发页无需额外操作
}

function onInspectionCreated() {
  // 仅切换 tab，由 watch(activeTab) 统一驱动列表加载，避免重复请求
  activeTab.value = 'inspect'
}

function openInspect(id: number) {
  currentInspectId.value = id
  inspectVisible.value = true
}

function onInspectUpdated() {
  // 抽屉内完成提交/签名后，刷新当前可见列表保持状态同步
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
.page-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 20px;
}
.fai-tabs :deep(.el-tabs__header) {
  margin-bottom: 18px;
}
.fai-item-type {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.fai-item-type__label {
  font-size: 13px;
  font-weight: 500;
  color: #5b7a99;
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

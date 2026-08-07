<template>
  <div class="page-container">
    <div class="page-card">
      <!-- 题头（标题左对齐 + 分类靠右） -->
      <header class="page-header">
        <div class="header-left">
          <h1 class="header-title">首件检验管理</h1>
          <span class="header-plant">{{ auth.user?.plantName }}分公司</span>
        </div>
        <div class="fai-item-type-inline">
          <span class="fai-item-type__label">分类</span>
          <el-radio-group :model-value="faiItemType" @update:model-value="onItemTypeChange" size="small">
            <el-radio-button value="PRODUCT">产品</el-radio-button>
            <el-radio-button value="MATERIAL">物料</el-radio-button>
          </el-radio-group>
        </div>
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
import { computed, nextTick, onMounted, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
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
provide('activeTab', activeTab)
// 全局分类（产品/物料）来自共享 store：与 SPC 同源、localStorage 持久化，
// 进入页面即继承上一次选择，不存在空值分支，从根上消除产品/物料混合展示。
const itemTypeStore = useItemTypeStore()
const { itemType: faiItemType } = storeToRefs(itemTypeStore)
provide('faiItemType', faiItemType)
// 当前分类中文名，供子组件与本页动态文案使用
provide('faiItemTypeLabel', computed(() => itemTypeStore.labelOf()))

// 支持从 query 跳转：预选 tab 与分类，并可携带待建标准的代码/名称
const route = useRoute()

interface PendingStandardCreate {
  itemType?: ItemType
  itemCode: string
  itemName: string
  processName?: string
}
const pendingStandardCreate = ref<PendingStandardCreate | null>(null)
provide('pendingStandardCreate', pendingStandardCreate)

// 标准维护保存成功后回写的信号（供变更触发自动回填工序并切回 trigger）
interface StandardSavedResult {
  itemCode: string
  processCode: string
  processName: string
}
const standardSavedResult = ref<StandardSavedResult | null>(null)
provide('standardSavedResult', standardSavedResult)
watch(standardSavedResult, (val) => {
  if (val) {
    // 标准已保存 → 切回「变更触发」并清空信号（ChangeTriggerForm 会消费回填工序）
    activeTab.value = 'trigger'
    standardSavedResult.value = null
  }
})

onMounted(() => {
  const q = route.query
  if (q.itemType === 'PRODUCT' || q.itemType === 'MATERIAL') {
    itemTypeStore.setItemType(q.itemType as ItemType)
  }
  const validTabs = ['trigger', 'inspect', 'standard', 'report']
  if (q.tab && validTabs.includes(q.tab as string)) {
    activeTab.value = q.tab as string
  }
  // 变更触发「去检验标准维护新建」携带代码/名称 → 待 StandardMaintenance 消费后自动打开新建弹窗
  if (q.itemCode) {
    pendingStandardCreate.value = {
      itemCode: q.itemCode as string,
      itemName: (q.itemName as string) || '',
    }
  }
})

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
/* ── 题头（标题左对齐 + 分类靠右） ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf0f4;
}
.header-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.header-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1b3a5b;
}
.header-plant {
  font-size: 12px;
  color: #8c9ba8;
}
/* ── 分类选择器（顶栏右侧） ── */
.fai-item-type-inline {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.fai-item-type__label {
  font-size: 12px;
  font-weight: 500;
  color: #5b7a99;
}
/* ── 页卡 / Tab ── */
.page-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 20px;
}
.fai-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
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

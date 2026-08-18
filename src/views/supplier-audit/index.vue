<template>
  <div class="supplier-audit-page">
    <header class="page-header">
      <div class="header-left">
        <h1 class="header-title">供应商现场审核</h1>
        <p class="header-sub">计划 · 执行 · 整改闭环 · 报告，全流程可追溯 · {{ auth.user?.plantName }}分公司</p>
      </div>
    </header>

    <el-tabs v-model="activeTab" class="audit-tabs">
      <el-tab-pane label="审核计划" name="plan">
        <PlanPanel @created="onCreated" />
      </el-tab-pane>
      <el-tab-pane label="审核执行" name="record">
        <RecordPanel :default-supplier-id="defaultSupplierId" @created="onCreated" />
      </el-tab-pane>
      <el-tab-pane label="整改跟踪" name="rectify">
        <RectificationPanel />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import PlanPanel from './components/PlanPanel.vue'
import RecordPanel from './components/RecordPanel.vue'
import RectificationPanel from './components/RectificationPanel.vue'

const auth = useAuthStore()
const route = useRoute()
const activeTab = ref<'plan' | 'record' | 'rectify'>('plan')

// 从供应商档案跳转携带 supplierId 时，自动预选并切到审核执行
const defaultSupplierId = computed(() => {
  const v = route.query.supplierId
  return v ? Number(v) : undefined
})
if (defaultSupplierId.value) {
  activeTab.value = 'record'
}

function onCreated() {
  // 计划/记录变更后可联动其它区刷新；此处暂无需处理
}
</script>

<style scoped>
.supplier-audit-page { padding: 4px 8px 24px; }
.page-header { margin-bottom: 16px; }
.header-title { font-size: 20px; font-weight: 600; color: #1f2937; margin: 0; }
.header-sub { margin: 4px 0 0; font-size: 13px; color: #6b7280; }
.audit-tabs { background: #fff; border-radius: 12px; padding: 8px 16px 16px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06); }
</style>

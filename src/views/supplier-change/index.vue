<template>
  <div class="supplier-change-page">
    <header class="page-header">
      <div class="header-left">
        <h1 class="header-title">供应商物料变更管理</h1>
        <p class="header-sub">
          变更申请 · 质量 / 采购 / 研发联合审批 · 首批加严检验，全流程受控可追溯
          <span v-if="auth.user?.plantName" class="header-plant">（{{ auth.user.plantName }}分公司）</span>
        </p>
      </div>
    </header>

    <el-tabs v-model="activeTab" class="change-tabs">
      <el-tab-pane label="变更单列表" name="all">
        <ChangeList mode="all" />
      </el-tab-pane>
      <el-tab-pane label="我的审批" name="mine">
        <ChangeList mode="mine" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ChangeList from './components/ChangeList.vue'

const auth = useAuthStore()
const activeTab = ref('all')
</script>

<style scoped>
.supplier-change-page {
  padding: 20px 24px;
}
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
}
.header-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #163c5b;
}
.header-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: #71808a;
}
.header-plant {
  color: #25728a;
}
.change-tabs {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  padding: 0 16px 16px;
}
</style>

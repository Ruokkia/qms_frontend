<template>
  <div class="page-container">
    <div class="page-card">
      <h2 class="page-title">我的工作台</h2>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="用户">{{ auth.user?.realName }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ auth.user?.roleName }}</el-descriptions-item>
        <el-descriptions-item label="账号">{{ auth.user?.account }}</el-descriptions-item>
        <el-descriptions-item label="分公司">{{ auth.user?.plantName }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <div class="page-card">
      <h3 class="section-title">可访问模块</h3>
      <div class="module-grid">
        <div
          v-for="mod in accessibleModules"
          :key="mod.key"
          class="module-card"
          @click="router.push(mod.path)"
        >
          <el-icon :size="28" :color="'#2f81f7'">
            <component :is="mod.icon" />
          </el-icon>
          <span class="module-name">{{ mod.title }}</span>
        </div>
      </div>
    </div>

    <div class="page-card">
      <h3 class="section-title">系统说明</h3>
      <el-alert
        type="info"
        :closable="false"
        show-icon
      >
        <template #title>
          当前为前端 Mock 数据演示环境。后端 API 就绪后，注释 main.ts 中的 setupMock() 调用即可切换至真实接口。
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { NAV_GROUPS } from '@/config/nav'
import type { ModuleKey } from '@/types'

const auth = useAuthStore()
const router = useRouter()

const accessibleModules = computed(() => {
  const modules: { key: string; title: string; icon: string; path: string }[] = []
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.roles.includes(auth.roleId) && item.key !== 'dashboard') {
        modules.push({ key: item.key, title: item.title, icon: item.icon, path: item.path })
      }
    }
  }
  return modules
})
</script>

<style scoped>
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}
.module-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.module-card:hover {
  border-color: #2f81f7;
  box-shadow: 0 2px 12px rgba(47, 129, 247, 0.15);
}
.module-name {
  font-size: 13px;
  color: #606266;
}
</style>

<template>
  <div class="dashboard">
    <header class="welcome">
      <div>
        <p class="welcome-date">{{ today }}</p>
        <h1 class="welcome-title">{{ greeting }}，{{ displayName }}</h1>
      </div>
      <div class="welcome-meta">
        <strong>{{ auth.user?.plantName }} · {{ auth.user?.roleName }}</strong>
        <span v-if="auth.user?.lastLoginAt">上次登录：{{ auth.user.lastLoginAt }}</span>
      </div>
    </header>

    <main v-if="!roleEmpty" class="navigation-panel" aria-label="功能导航">
      <div class="navigation-head">
        <div class="navigation-title-wrap">
          <h2 class="navigation-title">功能导航</h2>
          <span class="navigation-tip">按业务场景集中展示</span>
        </div>
        <el-input
          v-model="keyword"
          class="module-search"
          placeholder="搜索功能、模块或关键字"
          clearable
          :prefix-icon="Search"
        />
      </div>

      <div v-if="filteredGroups.length" class="group-grid">
        <section
          v-for="group in filteredGroups"
          :key="group.label"
          class="module-group"
        >
          <h3 class="group-title">{{ group.label }}</h3>
          <div class="module-grid">
            <button
              v-for="item in group.items"
              :key="item.key"
              class="module-entry"
              type="button"
              @click="router.push(item.path)"
            >
              <span class="module-icon">
                <el-icon :size="16"><component :is="item.icon" /></el-icon>
              </span>
              <span class="module-name">{{ item.title }}</span>
            </button>
          </div>
        </section>
      </div>

      <el-empty
        v-else-if="searchEmpty"
        :description="`未找到与“${keyword}”匹配的模块`"
        :image-size="80"
      />
    </main>

    <el-empty v-else class="role-empty" description="当前角色暂无可用模块" />

    <section v-if="quickActions.length" class="quick-panel" aria-label="常用操作">
      <h2 class="quick-title">常用操作</h2>
      <div class="quick-list">
        <button
          v-for="action in quickActions"
          :key="action.key"
          class="quick-action"
          type="button"
          @click="router.push(action.path)"
        >
          <el-icon :size="16"><component :is="action.icon" /></el-icon>
          {{ action.title }}
        </button>
      </div>
    </section>

    <el-alert
      v-if="showMock"
      class="mock-alert"
      type="info"
      :closable="true"
      show-icon
      title="当前为前端 Mock 数据演示环境"
      @close="showMock = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { NAV_GROUPS } from '@/config/nav'
import { filterNavigationByModules } from '@/utils/dashboard-navigation'
import { filterQuickActions, type DashboardQuickAction } from '@/utils/dashboard-quick-actions'

const auth = useAuthStore()
const router = useRouter()

const displayName = computed(() => auth.user?.realName || auth.user?.account || '')

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const today = computed(() => {
  const date = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 · 星期${week}`
})

const QUICK_ACTIONS: DashboardQuickAction[] = [
  { key: 'fai', title: '录入首件', icon: 'EditPen', path: '/fai', moduleKey: 'fai' },
  { key: 'exception', title: '上报异常', icon: 'Warning', path: '/exception', moduleKey: 'exception' },
  { key: 'trace', title: '查询追溯', icon: 'Search', path: '/trace', moduleKey: 'trace' },
  { key: 'notifications', title: '消息中心', icon: 'Bell', path: '/notifications' },
]

const quickActions = computed(() => filterQuickActions(QUICK_ACTIONS, auth.allowedModules))

const visibleGroups = computed(() => filterNavigationByModules(NAV_GROUPS, auth.allowedModules))

const roleEmpty = computed(() => visibleGroups.value.length === 0)
const keyword = ref('')

const filteredGroups = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  if (!normalizedKeyword) return visibleGroups.value
  return visibleGroups.value
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.title.toLowerCase().includes(normalizedKeyword)),
    }))
    .filter((group) => group.items.length > 0)
})

const searchEmpty = computed(() => !roleEmpty.value && filteredGroups.value.length === 0)
const showMock = ref(true)
</script>

<style scoped>
.dashboard {
  --brand: #2f81f7;
  --brand-soft: #edf5ff;
  --text-main: #1e293b;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 24px 20px;
  color: var(--text-main);
}

.welcome {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.welcome-date {
  margin: 0 0 6px;
  color: var(--text-secondary);
  font-size: 13px;
}

.welcome-title {
  margin: 0;
  font-size: 24px;
  font-weight: 650;
  letter-spacing: -0.4px;
  line-height: 1.25;
}

.welcome-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
  text-align: right;
}

.welcome-meta strong {
  color: #334155;
  font-weight: 600;
}

.navigation-panel,
.quick-panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.navigation-panel {
  padding: 18px;
}

.navigation-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.navigation-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.navigation-title,
.quick-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.navigation-tip {
  color: #94a3b8;
  font-size: 13px;
}

.module-search {
  width: 276px;
  flex: 0 0 auto;
}

.group-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.module-group {
  overflow: hidden;
  border: 1px solid #e7edf4;
  border-radius: 10px;
}

.group-title {
  margin: 0;
  padding: 9px 12px;
  border-left: 3px solid var(--brand);
  border-bottom: 1px solid #edf2f7;
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 7px;
}

.module-entry,
.quick-action {
  border: 1px solid transparent;
  cursor: pointer;
  font: inherit;
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.module-entry {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 7px;
  padding: 7px;
  border-radius: 7px;
  background: transparent;
  color: #334155;
  text-align: left;
}

.module-icon {
  display: inline-flex;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--brand-soft);
  color: var(--brand);
}

.module-name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-entry:hover,
.module-entry:focus-visible {
  border-color: #bfdbfe;
  outline: none;
  background: var(--brand-soft);
  color: #1769d1;
}

.module-entry:active,
.quick-action:active {
  background: #dbeafe;
}

.quick-panel {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 16px;
  padding: 14px 18px;
}

.quick-title {
  flex: 0 0 auto;
}

.quick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.quick-action {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  border-color: var(--border);
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  font-size: 13px;
}

.quick-action:first-child {
  border-color: #bfdbfe;
  background: var(--brand-soft);
  color: #1769d1;
}

.quick-action:hover,
.quick-action:focus-visible {
  border-color: #93c5fd;
  outline: none;
  box-shadow: 0 3px 10px rgba(47, 129, 247, 0.12);
}

.mock-alert,
.role-empty {
  margin-top: 16px;
}

@media (max-width: 960px) {
  .group-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .dashboard { padding: 20px 14px 16px; }
  .welcome,
  .navigation-head,
  .quick-panel { align-items: stretch; flex-direction: column; }
  .welcome-meta { align-items: flex-start; text-align: left; }
  .navigation-title-wrap { justify-content: space-between; }
  .module-search { width: 100%; }
  .group-grid { grid-template-columns: 1fr; }
  .quick-panel { gap: 12px; }
}
</style>

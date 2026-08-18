<template>
  <div class="layout-wrapper">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-logo">
        <span class="logo-icon">Q</span>
        <span v-if="!isCollapsed" class="logo-text">康立 QMS</span>
      </div>
      <nav class="sidebar-nav">
        <template v-for="group in visibleNavGroups" :key="group.label">
          <div v-if="!isCollapsed" class="nav-group-label">{{ group.label }}</div>
          <div
            v-for="item in group.items"
            :key="item.key"
            class="nav-item"
            :class="{ active: isActive(item) }"
            @click="router.push(item.path)"
          >
            <el-icon :size="18">
              <component :is="item.icon" />
            </el-icon>
            <span v-if="!isCollapsed" class="nav-text">{{ item.title }}</span>
          </div>
        </template>
      </nav>
    </aside>

    <!-- 右侧主区域 -->
    <div class="layout-main">
      <!-- 顶栏 -->
      <header class="topbar">
        <div class="topbar-left">
          <el-icon class="collapse-btn" :size="20" @click="isCollapsed = !isCollapsed">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
        </div>
        <div class="topbar-right">
          <span class="topbar-status">
            <span class="status-dot online"></span>
            <span>在线</span>
          </span>
          <el-divider direction="vertical" />
          <NotificationCenter />
          <el-divider direction="vertical" />
          <div class="topbar-user">
            <el-avatar :size="32" class="user-avatar">
              {{ auth.user?.realName?.charAt(0) || '?' }}
            </el-avatar>
            <div class="user-info">
              <div class="user-name">{{ auth.user?.realName }}</div>
              <div class="user-role">{{ auth.user?.roleName }}</div>
            </div>
          </div>
          <el-select
            v-model="currentArea"
            size="small"
            style="width: 100px"
            :disabled="!auth.canSwitchArea"
            @change="onAreaChange"
          >
            <el-option label="深圳" value="SZ" />
            <el-option label="梅州" value="MZ" />
          </el-select>
          <el-button size="small" @click="passwordDialogVisible = true">修改密码</el-button>
          <el-button size="small" @click="onLogout">退出登录</el-button>
        </div>
      </header>

      <el-dialog v-model="passwordDialogVisible" title="修改密码" width="420px" :close-on-click-modal="false">
        <el-form label-width="88px">
          <el-form-item label="当前密码"><el-input v-model="passwordForm.currentPassword" type="password" show-password /></el-form-item>
          <el-form-item label="新密码"><el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="至少 6 位" /></el-form-item>
          <el-form-item label="确认新密码"><el-input v-model="passwordForm.confirmPassword" type="password" show-password /></el-form-item>
        </el-form>
        <template #footer><el-button @click="passwordDialogVisible = false">取消</el-button><el-button type="primary" :loading="changingPassword" @click="onChangePassword">保存</el-button></template>
      </el-dialog>

      <!-- 内容区 -->
      <main class="layout-content">
        <router-view v-slot="{ Component }">
          <component :is="Component" :key="`${route.fullPath}:${auth.plantCode}`" />
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Fold, Expand } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { NAV_GROUPS } from '@/config/nav'
import NotificationCenter from '@/components/NotificationCenter.vue'
import type { PlantCode } from '@/types'
import { changePasswordApi } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const isCollapsed = ref(false)
const currentArea = ref<PlantCode>(auth.plantCode)
const passwordDialogVisible = ref(false)
const changingPassword = ref(false)
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

const visibleNavGroups = computed(() => {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => item.key === 'dashboard' || auth.hasModule((item.module ?? item.key) as any)),
  })).filter((g) => g.items.length > 0)
})

/** 导航高亮只按路由路径判断；同一权限模块下的多个子菜单不得同时高亮。 */
function isActive(item: { key: string; path: string }): boolean {
  const itemPath = item.path.split('?')[0]
  if (route.path === itemPath) return true
  return itemPath !== '/' && route.path.startsWith(itemPath + '/')
}

function onAreaChange(val: PlantCode) {
  auth.switchArea(val)
  ElMessage.success(`已切换至${val === 'SZ' ? '深圳' : '梅州'}分公司`)
  // 刷新当前页面数据
  // 当前路由组件以地区为 key，地区改变后会自动重新挂载并重新请求数据。
}

async function onLogout() {
  await auth.logout()
  ElMessage.success('已退出登录')
  await router.push('/login')
}

async function onChangePassword() {
  if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) return ElMessage.warning('请填写全部密码字段')
  if (passwordForm.newPassword.length < 6) return ElMessage.warning('新密码至少 6 位')
  if (passwordForm.newPassword !== passwordForm.confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
  if (passwordForm.currentPassword === passwordForm.newPassword) return ElMessage.warning('新密码不能与当前密码相同')
  changingPassword.value = true
  try {
    await changePasswordApi(passwordForm.currentPassword, passwordForm.newPassword, passwordForm.confirmPassword)
    auth.clearSession(); passwordDialogVisible.value = false
    Object.assign(passwordForm, { currentPassword: '', newPassword: '', confirmPassword: '' })
    ElMessage.success('密码已修改，请重新登录'); await router.push('/login')
  } finally { changingPassword.value = false }
}
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ── 侧边栏 ── */
.sidebar {
  width: 220px;
  background: #001529;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  flex-shrink: 0;
}
.sidebar.collapsed {
  width: 64px;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid #1f2937;
  overflow: hidden;
}
.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #2f81f7;
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
}
.sidebar-nav::-webkit-scrollbar {
  width: 7px;
}
.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
}
.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background-color: rgba(148, 163, 184, 0.62);
}
.nav-group-label {
  padding: 12px 20px 4px;
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.nav-item:hover {
  background: #1f2937;
  color: #fff;
}
.nav-item.active {
  background: #2f81f7;
  color: #fff;
}
.nav-text {
  font-size: 14px;
}

/* ── 顶栏 ── */
.topbar {
  height: 56px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}
.topbar-left {
  display: flex;
  align-items: center;
}
.collapse-btn {
  cursor: pointer;
  color: #606266;
}
.collapse-btn:hover {
  color: #2f81f7;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.topbar-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #606266;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-dot.online {
  background: #52c41a;
}
.topbar-user {
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-avatar {
  background: #2f81f7;
  color: #fff;
  font-weight: 600;
}
.user-info {
  display: flex;
  flex-direction: column;
}
.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  line-height: 1.4;
}
.user-role {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

/* ── 内容区 ── */
.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.layout-content {
  flex: 1;
  overflow-y: auto;
  background: #f5f7fa;
}
</style>

<template>
  <div class="notification-center">
    <el-popover
      v-model:visible="visible"
      placement="bottom-end"
      :width="360"
      trigger="click"
      popper-class="notification-popover"
      @show="loadList"
    >
      <template #reference>
        <div class="bell-wrap">
          <el-badge :value="unreadCount" :max="99" :hidden="unreadCount === 0">
            <el-icon :size="20"><Bell /></el-icon>
          </el-badge>
        </div>
      </template>

      <div class="notification-panel">
        <div class="notification-header">
          <span class="notification-title">通知中心</span>
          <div class="notification-actions">
            <el-button link type="primary" size="small" @click="markAllRead">全部已读</el-button>
            <el-button link type="primary" size="small" @click="goToMore">查看全部</el-button>
            <el-button link type="info" size="small" @click="refresh">刷新</el-button>
          </div>
        </div>

        <div v-loading="loading" class="notification-list">
          <div
            v-for="item in list"
            :key="item.id"
            class="notification-item"
            :class="{ unread: item.isRead === 0 }"
            @click="handleClick(item)"
          >
            <div class="notification-dot" :style="{ background: typeColor(item.type) }"></div>
            <div class="notification-body">
              <div class="notification-item-title">
                <span>{{ item.title }}</span>
                <span class="notification-time">{{ formatTime(item.createdAt) }}</span>
              </div>
              <div class="notification-item-content">{{ item.content }}</div>
            </div>
            <el-button
              v-if="item.isRead === 0"
              link
              type="primary"
              size="small"
              class="notification-read-btn"
              @click.stop="markRead(item)"
            >
              已读
            </el-button>
          </div>

          <el-empty v-if="!loading && list.length === 0" description="暂无通知" :image-size="60" />
        </div>

      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
// ===== M2: 通知中心组件 =====
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import { Bell } from '@element-plus/icons-vue'
import {
  getNotificationListApi,
  getNotificationUnreadCountApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from '@/api/notification'
import type { Notification } from '@/types/notification'
import { NOTIFICATION_TYPE_COLORS } from '@/enums/notification'
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
  onNotification,
} from '@/utils/notificationSocket'

const router = useRouter()

const visible = ref(false)
const loading = ref(false)
const list = ref<Notification[]>([])
const total = ref(0)
const unreadCount = ref(0)

let pollTimer: number | null = null

async function loadUnread() {
  try {
    const res = await getNotificationUnreadCountApi()
    if (res.code === 0) unreadCount.value = res.data.total || 0
  } catch (e) {
    console.error('加载未读通知数失败', e)
  }
}

async function loadList() {
  loading.value = true
  try {
    const res = await getNotificationListApi({ page: 1, size: 8 })
    if (res.code === 0) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch (e) {
    console.error('加载通知列表失败', e)
  } finally {
    loading.value = false
  }
}

function refresh() {
  loadList()
  loadUnread()
}

async function markRead(item: Notification) {
  try {
    const res = await markNotificationReadApi(item.id)
    if (res.code === 0) {
      item.isRead = 1
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      ElMessage.success('已标记为已读')
    }
  } catch (e) {
    console.error('标记已读失败', e)
  }
}

async function markAllRead() {
  try {
    const res = await markAllNotificationsReadApi()
    if (res.code === 0) {
      list.value.forEach((item) => (item.isRead = 1))
      unreadCount.value = 0
      ElMessage.success('全部已读')
    }
  } catch (e) {
    console.error('全部已读失败', e)
  }
}

const EXCEPTION_BIZ_TYPES = ['EXCEPTION_ORDER']

function handleClick(item: Notification) {
  if (item.isRead === 0) markRead(item)
  if (item.businessId) {
    if (EXCEPTION_BIZ_TYPES.includes(item.businessType!)) {
      router.push(`/exception/${item.businessId}`)
    } else if (item.businessType === 'ESCALATION') {
      router.push(`/exception?escalation=${item.businessId}`)
    }
  }
  visible.value = false
}

function goToMore() {
  visible.value = false
  router.push('/notifications')
}

function typeColor(type: string) {
  return NOTIFICATION_TYPE_COLORS[type] || '#8C9BA8'
}

function formatTime(time?: string) {
  if (!time) return ''
  return time.slice(0, 16).replace('T', ' ')
}

/** 实时通知到达：弹窗提示 + 未读数 +1，并预置到列表（去重） */
function handleRealtimeNotification(payload: Notification) {
  unreadCount.value = Math.max(0, unreadCount.value) + 1
  if (!list.value.some((it) => it.id === payload.id)) {
    list.value = [payload, ...list.value].slice(0, 8)
    total.value = total.value + 1
  }
  ElNotification({
    title: payload.title || '新通知',
    message: payload.content || '',
    type: 'info',
    duration: 4500,
    customClass: 'qms-realtime-notify',
    // 点击弹窗跳转业务详情
    onClick: () => {
      if (payload.businessId) handleClick(payload)
    },
  })
}

onMounted(() => {
  loadUnread()
  window.addEventListener('notification-read', loadUnread)
  // 每 60 秒轮询未读数（实时推送的补充兜底）
  pollTimer = window.setInterval(loadUnread, 60000)
  // D10：建立实时通知 WebSocket 连接
  connectNotificationSocket()
  onNotification((payload) => handleRealtimeNotification(payload as Notification))
})

onUnmounted(() => {
  if (pollTimer) window.clearInterval(pollTimer)
  window.removeEventListener('notification-read', loadUnread)
  // 登出/布局卸载时断开 WS，避免悬挂连接
  disconnectNotificationSocket()
})
</script>

<style scoped>
.notification-center {
  display: inline-flex;
  align-items: center;
}
.bell-wrap {
  padding: 6px;
  cursor: pointer;
  color: #606266;
  border-radius: 4px;
  transition: all 0.2s;
}
.bell-wrap:hover {
  color: #2f81f7;
  background: #f0f5ff;
}
.notification-panel {
  max-height: 420px;
  display: flex;
  flex-direction: column;
}
.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f0ede9;
}
.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: #1b3a5b;
}
.notification-actions {
  display: flex;
  gap: 4px;
}
.notification-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
  min-height: 120px;
}
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f8f8f8;
}
.notification-item:hover {
  background: #f5f7fa;
}
.notification-item.unread {
  background: #f0f7ff;
}
.notification-item.unread:hover {
  background: #e6f1ff;
}
.notification-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}
.notification-body {
  flex: 1;
  min-width: 0;
}
.notification-item-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #2a2a2a;
  margin-bottom: 4px;
}
.notification-time {
  font-size: 11px;
  color: #8c9ba8;
  font-weight: 400;
  white-space: nowrap;
}
.notification-item-content {
  font-size: 12px;
  color: #5b6770;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.notification-read-btn {
  flex-shrink: 0;
  padding: 0;
  margin-top: -2px;
}
</style>

<style>
.notification-popover {
  padding: 0 !important;
}
</style>

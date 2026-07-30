<template>
  <main class="message-center">
    <section class="message-hero">
      <div>
        <p class="eyebrow">MESSAGE CENTER</p>
        <div class="hero-title-row">
          <h1>全部消息</h1>
          <span v-if="unreadTotal" class="unread-pill">{{ unreadTotal }} 条未读</span>
        </div>
        <p class="hero-subtitle">集中查看与你有关的质量异常、状态变更与供应商升级提醒。</p>
      </div>
      <div class="hero-actions">
        <el-button :icon="Refresh" plain @click="loadNotifications">刷新</el-button>
        <el-button type="primary" :icon="Check" :disabled="unreadTotal === 0" @click="markAllRead">
          全部标为已读
        </el-button>
      </div>
    </section>

    <section class="message-workspace">
      <aside class="message-list-panel">
        <div class="list-toolbar">
          <el-radio-group v-model="readFilter" size="small" @change="handleFilterChange">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="unread">未读</el-radio-button>
            <el-radio-button label="read">已读</el-radio-button>
          </el-radio-group>
          <span class="list-total">共 {{ total }} 条</span>
        </div>

        <div v-loading="loading" class="message-list">
          <button
            v-for="item in notifications"
            :key="item.id"
            class="message-row"
            :class="{ active: selectedId === item.id, unread: item.isRead === 0 }"
            type="button"
            @click="selectNotification(item)"
          >
            <span class="message-indicator" :style="{ backgroundColor: typeColor(item.type) }"></span>
            <span class="message-summary">
              <span class="message-title-line">
                <span class="message-title">{{ item.title }}</span>
                <span v-if="item.isRead === 0" class="unread-dot"></span>
              </span>
              <span class="message-content">{{ item.content }}</span>
              <span class="message-meta">
                <el-tag size="small" effect="plain" :style="tagStyle(item.type)">{{ typeLabel(item.type) }}</el-tag>
                <time>{{ formatTime(item.createdAt) }}</time>
              </span>
            </span>
          </button>

          <el-empty v-if="!loading && notifications.length === 0" description="暂无消息" :image-size="76" />
        </div>

        <div class="pagination-wrap">
          <el-config-provider :locale="notificationPaginationLocale">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="size"
              background
              layout="total, sizes, prev, pager, next"
              :total="total"
              :page-sizes="[10, 20, 50]"
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
            />
          </el-config-provider>
        </div>
      </aside>

      <article v-if="selectedNotification" class="message-detail-panel">
        <div class="detail-topline">
          <span class="detail-label">消息详情</span>
          <el-tag effect="light" :style="tagStyle(selectedNotification.type)">
            {{ typeLabel(selectedNotification.type) }}
          </el-tag>
        </div>
        <h2>{{ selectedNotification.title }}</h2>
        <div class="detail-meta">
          <span>{{ selectedNotification.isRead === 0 ? '未读消息' : '已读消息' }}</span>
          <span class="meta-separator"></span>
          <time>{{ formatTime(selectedNotification.createdAt) }}</time>
        </div>
        <div class="detail-content">{{ selectedNotification.content }}</div>
        <div v-if="selectedNotification.businessType && selectedNotification.businessId" class="detail-footer">
          <span>该消息关联了业务记录</span>
          <el-button link type="primary" :icon="ArrowRight" @click="goToBusiness(selectedNotification)">
            查看关联业务
          </el-button>
        </div>
      </article>

      <article v-else class="message-detail-empty">
        <el-empty description="从左侧选择一条消息查看详情" :image-size="100" />
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, Check, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getNotificationListApi,
  getNotificationUnreadCountApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '@/api/notification'
import { NOTIFICATION_TYPE_COLORS, NOTIFICATION_TYPE_LABELS } from '@/enums/notification'
import type { Notification } from '@/types/notification'
import {
  buildNotificationListQuery,
  type NotificationReadFilter,
} from '@/utils/notification-query'
import { notificationPaginationLocale } from '@/utils/notification-pagination-locale'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const notifications = ref<Notification[]>([])
const total = ref(0)
const unreadTotal = ref(0)
const page = ref(readPositiveInteger(route.query.page, 1))
const size = ref(readPositiveInteger(route.query.size, 10))
const readFilter = ref<NotificationReadFilter>(readFilterFromQuery(route.query.read))
const selectedId = ref<number | null>(readPositiveInteger(route.query.id, 0) || null)

const selectedNotification = computed(
  () => notifications.value.find((item) => item.id === selectedId.value) ?? null,
)

function readPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function readFilterFromQuery(value: unknown): NotificationReadFilter {
  return value === 'unread' || value === 'read' ? value : 'all'
}

async function loadNotifications() {
  loading.value = true
  try {
    const res = await getNotificationListApi(buildNotificationListQuery(page.value, size.value, readFilter.value))
    if (res.code !== 0) return

    notifications.value = res.data.list
    total.value = res.data.total
    const persistedId = readPositiveInteger(route.query.id, 0)
    const selected = notifications.value.find((item) => item.id === persistedId)
    selectedId.value = selected?.id ?? notifications.value[0]?.id ?? null
    updateRouteQuery()
  } finally {
    loading.value = false
  }
}

async function loadUnreadCount() {
  const res = await getNotificationUnreadCountApi()
  if (res.code === 0) unreadTotal.value = res.data.total || 0
}

async function selectNotification(item: Notification) {
  selectedId.value = item.id
  updateRouteQuery()
  if (item.isRead === 0) {
    const res = await markNotificationReadApi(item.id)
    if (res.code === 0) {
      item.isRead = 1
      unreadTotal.value = Math.max(0, unreadTotal.value - 1)
      window.dispatchEvent(new Event('notification-read'))
    }
  }
}

async function markAllRead() {
  const res = await markAllNotificationsReadApi()
  if (res.code !== 0) return

  notifications.value.forEach((item) => (item.isRead = 1))
  unreadTotal.value = 0
  window.dispatchEvent(new Event('notification-read'))
  ElMessage.success('全部消息已标为已读')
}

function handleFilterChange() {
  page.value = 1
  loadNotifications()
}

function handlePageChange() {
  loadNotifications()
}

function handleSizeChange() {
  page.value = 1
  loadNotifications()
}

function updateRouteQuery() {
  const query: Record<string, string> = {
    page: String(page.value),
    size: String(size.value),
  }
  if (readFilter.value !== 'all') query.read = readFilter.value
  if (selectedId.value) query.id = String(selectedId.value)
  router.replace({ query })
}

function goToBusiness(item: Notification) {
  if (item.businessType === 'EXCEPTION_ORDER' && item.businessId) {
    router.push(`/exception?detail=${item.businessId}`)
  } else if (item.businessType === 'ESCALATION' && item.businessId) {
    router.push(`/exception?escalation=${item.businessId}`)
  }
}

function typeColor(type: string) {
  return NOTIFICATION_TYPE_COLORS[type] || '#8C9BA8'
}

function typeLabel(type: string) {
  return NOTIFICATION_TYPE_LABELS[type] || '系统通知'
}

function tagStyle(type: string) {
  const color = typeColor(type)
  return { color, borderColor: `${color}55`, backgroundColor: `${color}0d` }
}

function formatTime(time?: string) {
  return time ? time.slice(0, 16).replace('T', ' ') : '-'
}

onMounted(async () => {
  await Promise.all([loadNotifications(), loadUnreadCount()])
})
</script>

<style scoped>
.message-center {
  min-height: 100%;
  padding: 24px;
  background: linear-gradient(135deg, #f7f9fc 0%, #f3f7fb 55%, #edf4fa 100%);
}

.message-hero,
.message-workspace {
  max-width: 1440px;
  margin: 0 auto;
}

.message-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 0 4px 22px;
}

.eyebrow {
  margin: 0 0 7px;
  color: #708aa2;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.hero-title-row { display: flex; align-items: center; gap: 12px; }
.hero-title-row h1 { margin: 0; color: #18324b; font-size: 26px; line-height: 1.2; }
.hero-subtitle { margin: 9px 0 0; color: #718395; font-size: 13px; }
.unread-pill { padding: 4px 9px; border-radius: 99px; color: #c14d44; background: #fff0ef; font-size: 12px; font-weight: 600; }
.hero-actions { display: flex; gap: 10px; flex-shrink: 0; }

.message-workspace {
  display: grid;
  grid-template-columns: minmax(340px, 0.9fr) minmax(430px, 1.4fr);
  min-height: 620px;
  overflow: hidden;
  border: 1px solid #e5ebf1;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 16px 38px rgba(38, 70, 102, 0.08);
}

.message-list-panel { display: flex; min-width: 0; flex-direction: column; border-right: 1px solid #e9eef3; }
.list-toolbar { display: flex; align-items: center; justify-content: space-between; min-height: 64px; padding: 0 18px; border-bottom: 1px solid #edf1f5; }
.list-total { color: #8c9ba8; font-size: 12px; }
.message-list { flex: 1; min-height: 0; overflow-y: auto; }
.message-row { display: flex; width: 100%; gap: 11px; padding: 15px 17px; border: 0; border-bottom: 1px solid #f0f3f6; color: inherit; background: transparent; text-align: left; cursor: pointer; transition: background 0.18s ease, box-shadow 0.18s ease; }
.message-row:hover { background: #f7faff; }
.message-row.active { background: linear-gradient(90deg, #eef6ff 0%, #f7fbff 100%); box-shadow: inset 3px 0 #2f81f7; }
.message-row.unread .message-title { color: #1b3a5b; font-weight: 700; }
.message-indicator { width: 7px; height: 7px; margin-top: 6px; flex: none; border-radius: 50%; }
.message-summary { display: grid; min-width: 0; gap: 6px; flex: 1; }
.message-title-line { display: flex; align-items: center; gap: 7px; min-width: 0; }
.message-title { overflow: hidden; color: #34495e; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.unread-dot { width: 6px; height: 6px; flex: none; border-radius: 50%; background: #2f81f7; }
.message-content { overflow: hidden; color: #778897; font-size: 12px; line-height: 1.45; text-overflow: ellipsis; white-space: nowrap; }
.message-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #9aabb8; font-size: 11px; }
.message-meta time { white-space: nowrap; }
.pagination-wrap { display: flex; justify-content: center; padding: 14px 8px; border-top: 1px solid #edf1f5; }

.message-detail-panel, .message-detail-empty { min-width: 0; padding: 40px 46px; background: linear-gradient(140deg, #ffffff, #fbfdff); }
.message-detail-panel { display: flex; flex-direction: column; }
.detail-topline { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.detail-label { color: #8293a3; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; }
.message-detail-panel h2 { max-width: 760px; margin: 19px 0 12px; color: #193853; font-size: 23px; line-height: 1.42; }
.detail-meta { display: flex; align-items: center; gap: 10px; color: #91a0ae; font-size: 12px; }
.meta-separator { width: 3px; height: 3px; border-radius: 50%; background: #b7c3ce; }
.detail-content { max-width: 800px; margin-top: 35px; padding: 24px 0; border-top: 1px solid #e8eef3; color: #405366; font-size: 14px; line-height: 2; white-space: pre-wrap; }
.detail-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: auto; padding-top: 25px; border-top: 1px solid #e8eef3; color: #8b9aa7; font-size: 12px; }
.message-detail-empty { display: flex; align-items: center; justify-content: center; }

@media (max-width: 960px) {
  .message-center { padding: 16px; }
  .message-hero { align-items: flex-start; flex-direction: column; }
  .message-workspace { grid-template-columns: 1fr; }
  .message-list-panel { border-right: 0; }
  .message-detail-panel, .message-detail-empty { min-height: 360px; padding: 28px 24px; border-top: 1px solid #e9eef3; }
}

@media (max-width: 560px) {
  .message-hero { gap: 16px; }
  .hero-actions { width: 100%; }
  .hero-actions .el-button { flex: 1; }
  .list-toolbar { gap: 12px; padding: 0 12px; }
  .message-row { padding: 14px 12px; }
  .pagination-wrap :deep(.el-pagination__total), .pagination-wrap :deep(.el-pagination__sizes) { display: none; }
}
</style>

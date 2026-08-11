/**
 * M2-3 通知底座类型定义
 *
 * 严格对齐 qms-backend NotificationController + Notification 实体。
 */

import type { PageParams } from '@/types'

/** 通知实体（对齐 qms.notification 表） */
export interface Notification {
  id: number
  userId: number
  userName?: string
  type: string
  title: string
  content: string
  businessType?: string
  businessId?: number
  isRead: number
  readAt?: string
  level?: string
  extraData?: string
  extraDataMap?: Record<string, any>
  expireAt?: string
  plantCode?: string
  plantName?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

/** 通知列表查询参数 */
export interface NotificationListParams extends PageParams {
  isRead?: number
  businessType?: string
  businessId?: number
  level?: string
  startTime?: string
  endTime?: string
}

/** 未读通知数响应 */
export interface NotificationUnreadCountVO {
  total: number
  byType: { type: string; count: number }[]
}

/** 创建通知请求（管理员/内部） */
export interface NotificationCreateDTO {
  userId: number
  type: string
  title: string
  content: string
  businessType?: string
  businessId?: number
}

/**
 * M2-3 通知底座 API 封装
 *
 * 路径前缀：/api/v1/notifications
 * 严格对齐 NotificationController 接口契约。
 */
import { apiGet, apiPost } from './request'
import type { ApiResult, PageResult } from '@/types'
import type {
  Notification,
  NotificationListParams,
  NotificationUnreadCountVO,
  NotificationCreateDTO,
} from '@/types/notification'

const BASE = '/notifications'

/** 查询当前用户通知列表 */
export function getNotificationListApi(
  params: NotificationListParams,
): Promise<ApiResult<PageResult<Notification>>> {
  return apiGet<PageResult<Notification>>(BASE, { params })
}

/** 未读通知数 */
export function getNotificationUnreadCountApi(): Promise<ApiResult<NotificationUnreadCountVO>> {
  return apiGet<NotificationUnreadCountVO>(`${BASE}/unread-count`)
}

/** 标记单条通知已读 */
export function markNotificationReadApi(id: number): Promise<ApiResult<void>> {
  return apiPost<void>(`${BASE}/${id}/read`)
}

/** 标记全部通知已读 */
export function markAllNotificationsReadApi(): Promise<ApiResult<void>> {
  return apiPost<void>(`${BASE}/read-all`)
}

/** 创建通知（管理员/内部） */
export function createNotificationApi(data: NotificationCreateDTO): Promise<ApiResult<Notification>> {
  return apiPost<Notification>(BASE, data)
}

/** 校验业务资源是否存在（跳转前检查） */
export function checkBusinessExistsApi(
  businessType: string,
  businessId: number,
): Promise<ApiResult<boolean>> {
  return apiGet<boolean>(`${BASE}/check`, { params: { businessType, businessId } })
}

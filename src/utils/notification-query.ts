import type { NotificationListParams } from '@/types/notification'

export type NotificationReadFilter = 'all' | 'unread' | 'read'

const READ_FILTER_VALUE: Record<NotificationReadFilter, number | undefined> = {
  all: undefined,
  unread: 0,
  read: 1,
}

export interface NotificationListQueryOptions {
  page: number
  size: number
  filter: NotificationReadFilter
  level?: string
  businessType?: string
  startTime?: string
  endTime?: string
}

export function buildNotificationListQuery(opts: NotificationListQueryOptions): NotificationListParams {
  const isRead = READ_FILTER_VALUE[opts.filter]
  const params: NotificationListParams = { page: opts.page, size: opts.size }
  if (isRead !== undefined) params.isRead = isRead
  if (opts.level) params.level = opts.level
  if (opts.businessType) params.businessType = opts.businessType
  if (opts.startTime) params.startTime = opts.startTime
  if (opts.endTime) params.endTime = opts.endTime
  return params
}

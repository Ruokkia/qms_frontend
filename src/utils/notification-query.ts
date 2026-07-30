import type { NotificationListParams } from '@/types/notification'

export type NotificationReadFilter = 'all' | 'unread' | 'read'

const READ_FILTER_VALUE: Record<NotificationReadFilter, number | undefined> = {
  all: undefined,
  unread: 0,
  read: 1,
}

export function buildNotificationListQuery(
  page: number,
  size: number,
  filter: NotificationReadFilter,
): NotificationListParams {
  const isRead = READ_FILTER_VALUE[filter]
  return isRead === undefined ? { page, size } : { page, size, isRead }
}

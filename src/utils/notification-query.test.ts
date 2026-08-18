import { describe, expect, it } from 'vitest'
import { buildNotificationListQuery } from './notification-query'

describe('通知中心分页查询参数', () => {
  it('保留当前页码与每页条数，并仅在选择已读状态时传递筛选条件', () => {
    expect(buildNotificationListQuery({ page: 3, size: 20, filter: 'unread' })).toEqual({
      page: 3,
      size: 20,
      isRead: 0,
    })

    expect(buildNotificationListQuery({ page: 1, size: 10, filter: 'all' })).toEqual({
      page: 1,
      size: 10,
    })
  })
})

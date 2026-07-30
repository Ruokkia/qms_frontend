import { describe, expect, it } from 'vitest'
import { notificationPaginationLocale } from './notification-pagination-locale'

describe('通知中心分页文案', () => {
  it('使用中文的总数与每页条数文案', () => {
    expect(notificationPaginationLocale.el.pagination.total).toBe('共 {total} 条')
    expect(notificationPaginationLocale.el.pagination.pagesize).toBe('条/页')
  })
})

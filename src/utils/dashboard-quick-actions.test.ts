import { describe, expect, it } from 'vitest'
import { filterQuickActions, type DashboardQuickAction } from './dashboard-quick-actions'

describe('工作台常用操作', () => {
  const actions: DashboardQuickAction[] = [
    { key: 'fai', title: '录入首件', icon: 'EditPen', path: '/fai', moduleKey: 'fai' },
    { key: 'notifications', title: '消息中心', icon: 'Bell', path: '/notifications' },
  ]

  it('消息中心不依赖业务模块权限，所有已登录用户均可使用', () => {
    expect(filterQuickActions(actions, [])).toEqual([actions[1]])
  })

  it('保留已授权的业务快捷入口，并同时展示消息中心', () => {
    expect(filterQuickActions(actions, ['fai'])).toEqual(actions)
  })
})

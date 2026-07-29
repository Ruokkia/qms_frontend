import { describe, expect, it } from 'vitest'
import type { NavItem } from '@/types'
import { filterNavigationByModules } from './dashboard-navigation'

describe('工作台功能导航权限过滤', () => {
  const groups: { label: string; items: Pick<NavItem, 'key' | 'title'>[] }[] = [
    {
      label: '质量管理',
      items: [
        { key: 'trace', title: '来料追溯' },
        { key: 'fai', title: '首件检验' },
      ],
    },
  ]

  it('只展示后端已授权的模块，不受旧角色静态配置影响', () => {
    expect(filterNavigationByModules(groups, ['trace'])).toEqual([
      {
        label: '质量管理',
        items: [{ key: 'trace', title: '来料追溯' }],
      },
    ])
  })

  it('没有模块权限时不展示任何功能导航组', () => {
    expect(filterNavigationByModules(groups, [])).toEqual([])
  })
})

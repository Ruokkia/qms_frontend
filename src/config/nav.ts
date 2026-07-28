import type { NavItem } from '@/types'

/**
 * 侧边栏导航配置
 * roles 为空数组表示所有角色可见
 */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: '工作台',
    items: [
      {
        key: 'dashboard',
        title: '我的工作台',
        icon: 'DataBoard',
        path: '/dashboard',
        roles: ['R00', 'R01', 'R02', 'R03', 'R04', 'R05', 'R06'],
      },
    ],
  },
  { label: '系统管理', items: [{ key: 'systemAdmin', title: '系统管理', icon: 'Setting', path: '/admin', roles: ['R00', 'R06'] }] },
  {
    label: '过程数据采集',
    items: [
      {
        key: 'fai',
        title: '首件检验',
        icon: 'CircleCheck',
        path: '/fai',
        roles: ['R00', 'R02', 'R03', 'R04', 'R06'],
      },
      {
        key: 'spc',
        title: 'SPC过程能力分析',
        icon: 'TrendCharts',
        path: '/spc',
        roles: ['R00', 'R02', 'R03', 'R04', 'R06'],
      },
      {
        key: 'productionDefect',
        title: '不良信息管理',
        icon: 'Histogram',
        path: '/production-defect',
        roles: ['R00', 'R02', 'R03', 'R04', 'R06'],
      },
    ],
  },
  {
    label: '供应商质量管控',
    items: [
      {
        key: 'incoming',
        title: '来料数据管理',
        icon: 'Box',
        path: '/incoming',
        roles: ['R00', 'R02', 'R03', 'R04', 'R05', 'R06'],
      },
      {
        key: 'finishedGoods',
        title: '成品数据管理',
        icon: 'Goods',
        path: '/finished-goods',
        roles: ['R00', 'R02', 'R03', 'R04', 'R05', 'R06'],
      },
      {
        key: 'trace',
        title: '来料追溯',
        icon: 'Search',
        path: '/trace',
        roles: ['R00', 'R01', 'R02', 'R03', 'R04', 'R06'],
      },
      {
        key: 'exception',
        title: '异常管理与整改',
        icon: 'Warning',
        path: '/exception',
        roles: ['R00', 'R02', 'R03', 'R04', 'R05', 'R06'],
      },
    ],
  },
  {
    label: '过程工具',
    items: [
      {
        key: 'processTools',
        title: '过程工具',
        icon: 'SetUp',
        path: '/process-tools',
        roles: ['R00', 'R02', 'R03', 'R04', 'R06'],
      },
    ],
  },
]

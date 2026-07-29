import type { NavItem } from '@/types'

/** 侧边栏导航元数据；实际可见性由后端返回的模块权限决定。 */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: '工作台',
    items: [
      {
        key: 'dashboard',
        title: '我的工作台',
        icon: 'DataBoard',
        path: '/dashboard',
      },
    ],
  },
  { label: '系统管理', items: [{ key: 'systemAdmin', title: '系统管理', icon: 'Setting', path: '/admin' }] },
  {
    label: '过程数据采集',
    items: [
      {
        key: 'fai',
        title: '首件检验',
        icon: 'CircleCheck',
        path: '/fai',
      },
      {
        key: 'spc',
        title: 'SPC过程能力分析',
        icon: 'TrendCharts',
        path: '/spc',
      },
      {
        key: 'productionDefect',
        title: '不良信息管理',
        icon: 'Histogram',
        path: '/production-defect',
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
      },
      {
        key: 'finishedGoods',
        title: '成品数据管理',
        icon: 'Goods',
        path: '/finished-goods',
      },
      {
        key: 'trace',
        title: '来料追溯',
        icon: 'Search',
        path: '/trace',
      },
      {
        key: 'exception',
        title: '异常管理与整改',
        icon: 'Warning',
        path: '/exception',
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
      },
    ],
  },
]

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
    label: '供应商基础管理',
    items: [
      { key: 'supplierBase', title: '绩效与评审', icon: 'TrendCharts', path: '/supplier', module: 'supplier' },
      {
        key: 'supplierArchive',
        title: '供应商档案管理',
        icon: 'OfficeBuilding',
        path: '/supplier-archive',
        module: 'supplier',
      },
      {
        key: 'supplierAudit',
        title: '供应商现场审核',
        icon: 'Stamp',
        path: '/supplier-audit',
        module: 'supplier',
      },
      {
        key: 'supplierMaterialChange',
        title: '供应商物料变更管理',
        icon: 'Refresh',
        path: '/supplier-change',
      },
    ],
  },
  {
    label: '工装管理',
    items: [
      { key: 'tooling', title: '工装台账管理', icon: 'Collection', path: '/tooling' },
      { key: 'toolingMaintenance', title: '工装维修和保养', icon: 'Tools', path: '/tooling-maintenance' },
    ],
  },
  {
    label: '售后管理',
    items: [
      { key: 'afterSales', title: '工单与客户满意度', icon: 'Service', path: '/after-sales' },
    ],
  },
  { label: '计量管理', items: [{ key: 'measurement', title: '计量器具管理', icon: 'ScaleToOriginal', path: '/measurement' }] },
  { label: '体系管理', items: [{ key: 'qualitySystem', title: '体系合规管理', icon: 'Management', path: '/quality-system' }] },
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

/**
 * 通知业务类型常量 — 统一管理跳转映射。
 *
 * 后续扩展 M3 首件检验、M4 SPC 等模块时，只需在此文件中新增映射即可。
 */

/** 业务类型 → 路由前缀 */
export const BIZ_TYPE_ROUTE: Record<string, string> = {
  EXCEPTION_ORDER: '/exception',
  ESCALATION: '/escalation',
}

/** 业务类型中文标签（用于通知卡片展示） */
export const BIZ_TYPE_LABEL: Record<string, string> = {
  EXCEPTION_ORDER: '异常单',
  ESCALATION: '供应商升级',
}

/** 业务类型列表（用于筛选下拉） */
export const BIZ_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'EXCEPTION_ORDER', label: '异常单' },
  { value: 'ESCALATION', label: '供应商升级' },
]

/** 通知等级常量 */
export const NOTIFICATION_LEVELS: { value: string; label: string; color: string }[] = [
  { value: '严重', label: '严重', color: '#F56C6C' },
  { value: '警告', label: '警告', color: '#E6A23C' },
  { value: '提醒', label: '提醒', color: '#409EFF' },
]

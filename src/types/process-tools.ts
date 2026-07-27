/**
 * M6 过程工具模块类型定义
 * 仅覆盖前端独立模板（FMEA 风险跟踪 / 鱼骨图分析），不与后端接口耦合。
 */

/* ───────────────────────── FMEA ───────────────────────── */

/** FMEA 分析条目状态 */
export type FmeaItemStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'OVERDUE'

/** FMEA 动作优先级（AIAG-VDA Action Priority） */
export type FmeaActionPriority = 'H' | 'M' | 'L'

/** FMEA 风险项（一行失效模式分析） */
export interface FmeaItem {
  id: number
  /** 工序（自由文本，模板阶段不绑定枚举） */
  process: string
  /** 故障模式 */
  failureMode: string
  /** 潜在影响 */
  potentialEffect: string
  /** 潜在原因 */
  potentialCause: string
  /** 现行控制（探测手段） */
  currentControl: string
  /** 严重度 1~10 */
  severity: number
  /** 频度 1~10 */
  occurrence: number
  /** 探测度 1~10 */
  detection: number
  /** 风险优先级数 = S × O × D（前端实时预览，保存以服务端为准） */
  rpn: number
  /** 建议措施 */
  recommendedAction: string
  /** 责任人工号/姓名 */
  owner: string
  /** 计划完成日期 */
  dueDate: string
  /** 状态 */
  status: FmeaItemStatus
}

/** FMEA 看板统计 */
export interface FmeaDashboard {
  totalItems: number
  openItems: number
  closedItems: number
  overdueItems: number
  /** 完成率 0~1 */
  completionRate: number
  /** 风险分布（按 RPN 区间或 AP） */
  riskDistribution: { label: string; value: number }[]
  /** 按月完成数趋势 */
  trend: { month: string; completed: number }[]
}

/* ───────────────────────── 鱼骨图 ───────────────────────── */

/** 鱼骨图节点分类（人机料法环测 + 根节点 + 通用原因） */
export type FishboneCategory =
  | 'ROOT'
  | 'MAN'
  | 'MACHINE'
  | 'MATERIAL'
  | 'METHOD'
  | 'ENVIRONMENT'
  | 'MEASUREMENT'
  | 'CAUSE'

/** 鱼骨图节点 */
export interface FishboneNode {
  id: number
  /** 父节点 id，ROOT 节点为 null */
  parentId: number | null
  /** 分类 */
  category: FishboneCategory
  /** 名称 / 原因描述 */
  name: string
  /** 是否确认根因 */
  isConfirmedRootCause: boolean
  /** 排序 */
  sortOrder: number
}

/** 鱼骨图分析 */
export interface FishboneAnalysis {
  id: number
  /** 标题 */
  title: string
  /** 问题描述 */
  problemDesc: string
  /** 状态 DRAFT / CONFIRMED */
  status: 'DRAFT' | 'CONFIRMED'
  nodes: FishboneNode[]
}

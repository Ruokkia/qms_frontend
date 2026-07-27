/**
 * M0 追溯模块枚举定义
 *
 * 来源：qms-backend/docs/api/m0-m1-m2-api.md 第一篇 m0-2/m0-3
 * 与后端 Java Enum 严格一致，前端禁止硬编码枚举值。
 */

/** 追溯节点类型（node_type，三端统一） */
export enum NodeTypeEnum {
  /** 整机SN */
  SN = 'SN',
  /** 部件 */
  PART = '部件',
  /** 关键物料 */
  CRITICAL = '关键物料',
  /** 非关键物料 */
  NON_CRITICAL = '非关键物料',
  /** 来料批次 */
  BATCH = '来料批次',
  /** 生产批次 */
  PRODUCTION = '生产批次',
  /** V2: 成品 */
  FINISHED_GOOD = 'FINISHED_GOOD',
  /** V2: 半成品 */
  SEMI_FINISHED = 'SEMI_FINISHED',
  /** V2: 物料 */
  MATERIAL = 'MATERIAL',
}

/** 节点类型 → 显示标签 */
export const NODE_TYPE_LABELS: Record<NodeTypeEnum | string, string> = {
  [NodeTypeEnum.SN]: '整机',
  [NodeTypeEnum.PART]: '部件',
  [NodeTypeEnum.CRITICAL]: '关键物料',
  [NodeTypeEnum.NON_CRITICAL]: '非关键物料',
  [NodeTypeEnum.BATCH]: '来料批次',
  [NodeTypeEnum.PRODUCTION]: '生产批次',
  [NodeTypeEnum.FINISHED_GOOD]: '成品',
  [NodeTypeEnum.SEMI_FINISHED]: '半成品',
  [NodeTypeEnum.MATERIAL]: '物料',
}

/** 节点类型 → 签名色（墨蓝/赭石体系，非 Element 默认蓝紫） */
export const NODE_TYPE_COLORS: Record<NodeTypeEnum | string, string> = {
  [NodeTypeEnum.SN]: '#1B3A5B',          // 墨蓝（深主色，整机为根节点最重）
  [NodeTypeEnum.PART]: '#3E6B95',        // 钢蓝（部件，主色浅一档）
  [NodeTypeEnum.CRITICAL]: '#B8763E',    // 赭石（关键物料，强调色）
  [NodeTypeEnum.NON_CRITICAL]: '#8C9BA8', // 青灰（非关键，弱化）
  [NodeTypeEnum.BATCH]: '#6B8E9E',       // 雾蓝（来料批次）
  [NodeTypeEnum.PRODUCTION]: '#5B7A99',  // 灰蓝（生产批次）
  [NodeTypeEnum.FINISHED_GOOD]: '#1B3A5B',  // 墨蓝（成品，根节点色调）
  [NodeTypeEnum.SEMI_FINISHED]: '#3E6B95',  // 钢蓝（半成品，中间层）
  [NodeTypeEnum.MATERIAL]: '#B8763E',        // 赭石（物料，强调色）
}

/** IQC 检验状态（iqc_status，三端统一） */
export enum IqcStatusEnum {
  PENDING = '待检',
  IN_PROGRESS = '在检',
  DONE = '已检',
  ABNORMAL = '异常',
}

/** IQC 状态 → 状态色（合格苔绿/异常赭红/待检灰蓝，降低饱和度） */
export const IQC_STATUS_COLORS: Record<string, string> = {
  [IqcStatusEnum.PENDING]: '#5B7A99',       // 灰蓝
  [IqcStatusEnum.IN_PROGRESS]: '#B8763E',   // 赭石（进行中，提醒）
  [IqcStatusEnum.DONE]: '#3E7A4E',          // 苔绿
  [IqcStatusEnum.ABNORMAL]: '#B84B3E',      // 赭红（异常，最高警示）
}

/** 检验结果 */
export enum InspectionResultEnum {
  PASS = '合格',
  FAIL = '不合格',
}

/** 追溯方向 */
export enum TraceDirectionEnum {
  /** 向下追溯（成品→来料） */
  FORWARD = 'forward',
  /** 向上追溯（来料→成品/客户） */
  BACKWARD = 'backward',
  /** 双向全链路 */
  FULL = 'full',
  /** 同一来料批次影响范围 */
  BATCH_IMPACT = 'batchImpact',
}

/** 追溯方向 → 显示标签 */
export const TRACE_DIRECTION_LABELS: Record<TraceDirectionEnum, string> = {
  [TraceDirectionEnum.FORWARD]: '向下追溯（到物料）',
  [TraceDirectionEnum.BACKWARD]: '向上追溯（到客户）',
  [TraceDirectionEnum.FULL]: '全链路（双向）',
  [TraceDirectionEnum.BATCH_IMPACT]: '批次影响范围',
}

/** 追溯层级上限（固化基线，DB CHECK + 应用层控制） */
export const TRACE_MAX_LEVEL = 8

/**
 * M2 异常与整改枚举定义
 *
 * 来源：qms-backend 实体字段 + QMS-代码规范文档
 * 与后端 Java 字段值严格一致，前端禁止硬编码枚举值。
 */

/** 异常来源类型 */
export enum ExceptionSourceTypeEnum {
  INCOMING_DEFECT = '来料不良',
  FAI_DEFECT = '首件不良',
  PROCESS_DEFECT = '制程不良',
  AUDIT_ISSUE = '审核问题',
  CUSTOMER_COMPLAINT = '客户投诉',
  REPEAT_ISSUE = '重复问题',
}

/** 严重等级 */
export enum SeverityEnum {
  SERIOUS = '严重',
  GENERAL = '一般',
}

/** 异常单状态 */
export enum ExceptionStatusEnum {
  PENDING = '待整改',
  IN_PROGRESS = '整改中',
  PENDING_VERIFY = '待验证',
  CLOSED = '已闭环',
}

/** 改善措施类型 */
export enum ActionTypeEnum {
  TEMPORARY = '临时措施',
  CORRECTIVE = '纠正措施',
  PREVENTIVE = '预防措施',
}

/** 改善措施状态 */
export enum ActionStatusEnum {
  PENDING = 'PENDING',
  DONE = 'DONE',
}

/** 验证方式 */
export enum VerifyTypeEnum {
  SUPPLIER_PROOF = '供应商自证',
  INTERNAL_CONFIRM = '内部确认',
  CONTINUOUS_BATCH = '连续N批',
}

/** 验证结果 */
export enum VerifyResultEnum {
  PASS = '通过',
  FAIL = '不通过',
}

/** 升级动作 */
export enum EscalationActionEnum {
  STRICT_AUDIT = '加密审核',
  SUSPEND_ORDER = '暂停供货',
  SPECIAL_CAPA = '专项CAPA',
}

/** 升级状态 */
export enum EscalationStatusEnum {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

/** 严重等级 → 状态色 */
export const SEVERITY_COLORS: Record<string, string> = {
  [SeverityEnum.SERIOUS]: '#B84B3E',
  [SeverityEnum.GENERAL]: '#8C9BA8',
}

/** 异常状态 → 状态色 */
export const EXCEPTION_STATUS_COLORS: Record<string, string> = {
  [ExceptionStatusEnum.PENDING]: '#B84B3E',
  [ExceptionStatusEnum.IN_PROGRESS]: '#B8763E',
  [ExceptionStatusEnum.PENDING_VERIFY]: '#3E6B95',
  [ExceptionStatusEnum.CLOSED]: '#3E7A4E',
}

/** 改善措施类型 → 状态色 */
export const ACTION_TYPE_COLORS: Record<string, string> = {
  [ActionTypeEnum.TEMPORARY]: '#8C9BA8',
  [ActionTypeEnum.CORRECTIVE]: '#3E6B95',
  [ActionTypeEnum.PREVENTIVE]: '#B8763E',
}

/** 改善措施状态 → 状态色 */
export const ACTION_STATUS_COLORS: Record<string, string> = {
  [ActionStatusEnum.PENDING]: '#B8763E',
  [ActionStatusEnum.DONE]: '#3E7A4E',
}

/** 验证结果 → 状态色 */
export const VERIFY_RESULT_COLORS: Record<string, string> = {
  [VerifyResultEnum.PASS]: '#3E7A4E',
  [VerifyResultEnum.FAIL]: '#B84B3E',
}

/** CAPA/8D 状态 */
export enum CapaStatusEnum {
  NOT_STARTED = '待发起',
  IN_PROGRESS = '进行中',
  COMPLETED = '已完成',
}

/** 8D 步骤。D0 为质量部发起立案，不在推进步骤链内（仅作立案信息展示），故不在 EightDStepEnum 的步骤流转中使用 */
export enum EightDStepEnum {
  D0 = 'D0',
  D1 = 'D1',
  D2 = 'D2',
  D3 = 'D3',
  D4 = 'D4',
  D5 = 'D5',
  D6 = 'D6',
  D7 = 'D7',
  D8 = 'D8',
}

/** CAPA 阶段（C1 措施制定 → C2 措施审批 → C3 措施实施 → C4 效果验证） */
export enum CapaStepEnum {
  C1 = 'C1',
  C2 = 'C2',
  C3 = 'C3',
  C4 = 'C4',
}

/** CAPA 状态 → 状态色 */
export const CAPA_STATUS_COLORS: Record<string, string> = {
  [CapaStatusEnum.NOT_STARTED]: '#8C9BA8',
  [CapaStatusEnum.IN_PROGRESS]: '#B8763E',
  [CapaStatusEnum.COMPLETED]: '#3E7A4E',
}

/** 阶段审批状态 */
export enum StepStatusEnum {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** 阶段审批状态 → 中文标签 */
export const STEP_STATUS_LABELS: Record<string, string> = {
  [StepStatusEnum.DRAFT]: '草稿',
  [StepStatusEnum.SUBMITTED]: '已提交',
  [StepStatusEnum.PENDING_APPROVAL]: '待审批',
  [StepStatusEnum.APPROVED]: '已通过',
  [StepStatusEnum.REJECTED]: '已驳回',
}

/** 阶段审批状态 → 状态色 */
export const STEP_STATUS_COLORS: Record<string, string> = {
  [StepStatusEnum.DRAFT]: '#8C9BA8',
  [StepStatusEnum.SUBMITTED]: '#3E6B95',
  [StepStatusEnum.PENDING_APPROVAL]: '#B8763E',
  [StepStatusEnum.APPROVED]: '#3E7A4E',
  [StepStatusEnum.REJECTED]: '#B84B3E',
}

/** 整改流程类型 */
export enum ProcessTypeEnum {
  CAPA = 'CAPA',
  EIGHT_D = '8D',
  BOTH = 'BOTH',
}

/** 整改流程类型 → 中文标签 */
export const PROCESS_TYPE_LABELS: Record<string, string> = {
  [ProcessTypeEnum.CAPA]: 'CAPA 整改',
  [ProcessTypeEnum.EIGHT_D]: '8D 报告',
  [ProcessTypeEnum.BOTH]: 'CAPA + 8D',
}

/** 整改流程类型 → 状态色 */
export const PROCESS_TYPE_COLORS: Record<string, string> = {
  [ProcessTypeEnum.CAPA]: '#3E7A4E',
  [ProcessTypeEnum.EIGHT_D]: '#B8763E',
  [ProcessTypeEnum.BOTH]: '#1B3A5B',
}

/** 是否包含 CAPA（改善措施 + 验证） */
export function processIncludesCapa(type?: string): boolean {
  return type === ProcessTypeEnum.CAPA || type === ProcessTypeEnum.BOTH
}

/** 是否包含 8D 报告 */
export function processIncludes8D(type?: string): boolean {
  return type === ProcessTypeEnum.EIGHT_D || type === ProcessTypeEnum.BOTH
}

/**
 * CAPA 治理相位（BOTH 模式专用）。
 * 与后端 exception_order.capa_phase 字段值严格一致。
 *
 * 编排：
 *   INITIATE              → CAPA 立项，8D D1-D4 自由推进
 *   ROOT_CAUSE_APPROVED   → 根因审批通过，8D D5 准入
 *   MEASURES_APPROVED     → 措施审批通过，8D D6-D8 准入
 *   CLOSED                → 已闭环
 */
export enum CapaPhaseEnum {
  INITIATE = 'INITIATE',
  ROOT_CAUSE_APPROVED = 'ROOT_CAUSE_APPROVED',
  MEASURES_APPROVED = 'MEASURES_APPROVED',
  CLOSED = 'CLOSED',
}

/** CAPA 相位 → 中文标签 */
export const CAPA_PHASE_LABELS: Record<string, string> = {
  [CapaPhaseEnum.INITIATE]: '立项中',
  [CapaPhaseEnum.ROOT_CAUSE_APPROVED]: '根因已审批',
  [CapaPhaseEnum.MEASURES_APPROVED]: '措施已审批',
  [CapaPhaseEnum.CLOSED]: '已闭环',
}

/** 8D 步骤标签 */
export const EIGHT_D_STEP_LABELS: Record<string, string> = {
  [EightDStepEnum.D0]: 'D0 发起立案',
  [EightDStepEnum.D1]: 'D1 团队成立',
  [EightDStepEnum.D2]: 'D2 问题描述',
  [EightDStepEnum.D3]: 'D3 临时遏制',
  [EightDStepEnum.D4]: 'D4 根本原因',
  [EightDStepEnum.D5]: 'D5 纠正措施',
  [EightDStepEnum.D6]: 'D6 实施验证',
  [EightDStepEnum.D7]: 'D7 预防措施',
  [EightDStepEnum.D8]: 'D8 团队表彰',
}

/**
 * 8D 推进步骤顺序（D1-D8）。
 * D0 质量部发起立案不进入步骤链，仅作为立案信息展示区（见 detail.vue / ExceptionEightD.vue）。
 */
export const EIGHT_D_STEP_ORDER: string[] = [
  EightDStepEnum.D1,
  EightDStepEnum.D2,
  EightDStepEnum.D3,
  EightDStepEnum.D4,
  EightDStepEnum.D5,
  EightDStepEnum.D6,
  EightDStepEnum.D7,
  EightDStepEnum.D8,
]

/** CAPA 阶段标签 */
export const CAPA_STEP_LABELS: Record<string, string> = {
  [CapaStepEnum.C1]: 'C1 措施制定',
  [CapaStepEnum.C2]: 'C2 措施审批',
  [CapaStepEnum.C3]: 'C3 措施实施',
  [CapaStepEnum.C4]: 'C4 效果验证',
}

/** CAPA 阶段顺序 */
export const CAPA_STEP_ORDER: string[] = [
  CapaStepEnum.C1,
  CapaStepEnum.C2,
  CapaStepEnum.C3,
  CapaStepEnum.C4,
]

/** 多维度分析维度 */
export enum AnalysisDimensionEnum {
  DEFECT_DESC = 'defectDesc',
  SUPPLIER = 'supplier',
  MATERIAL = 'material',
  TIME = 'time',
}

/** 分析维度 → 显示标签 */
export const ANALYSIS_DIMENSION_LABELS: Record<AnalysisDimensionEnum, string> = {
  [AnalysisDimensionEnum.DEFECT_DESC]: '按不良描述',
  [AnalysisDimensionEnum.SUPPLIER]: '按供应商',
  [AnalysisDimensionEnum.MATERIAL]: '按物料',
  [AnalysisDimensionEnum.TIME]: '按时间趋势',
}

/** 整改计划状态 */
export enum RectificationPlanStatusEnum {
  PENDING = '待执行',
  IN_PROGRESS = '执行中',
  DONE = '已完成',
}

/** 整改计划状态 → 状态色 */
export const RECTIFICATION_PLAN_STATUS_COLORS: Record<string, string> = {
  [RectificationPlanStatusEnum.PENDING]: '#B8763E',
  [RectificationPlanStatusEnum.IN_PROGRESS]: '#3E6B95',
  [RectificationPlanStatusEnum.DONE]: '#3E7A4E',
}

/** 审计操作类型 → 中文标签 */
export const AUDIT_OPERATION_LABELS: Record<string, string> = {
  CREATE: '新增',
  UPDATE: '更新',
  DELETE: '删除',
}

/** 审计操作类型 → 状态色 */
export const AUDIT_OPERATION_COLORS: Record<string, string> = {
  CREATE: '#3E7A4E',
  UPDATE: '#3E6B95',
  DELETE: '#B84B3E',
}

/** 审计表名 → 中文 */
export const AUDIT_TABLE_LABELS: Record<string, string> = {
  exception_order: '异常单',
  improvement_action: '改善措施',
  verification_record: '验证记录',
  exception_8d: '8D 报告',
  rectification_plan: '整改计划',
}

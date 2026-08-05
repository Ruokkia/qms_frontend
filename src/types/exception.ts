/**
 * M2 异常与整改类型定义
 *
 * 严格对齐 qms-backend ExceptionController + 关联实体。
 * 字段命名与后端 camelCase 一致；不做前端自创字段。
 */
import type { PageParams } from '@/types'

/** 异常单实体（对齐 qms.exception_order 表） */
export interface ExceptionOrder {
  id: number
  exceptionNo: string
  sourceType: string
  sourceId?: number
  severity: string
  status: string
  supplierId?: number
  supplierName?: string
  workOrderId?: number
  materialCode?: string
  defectDesc?: string
  defectQty?: number
  totalQty?: number
  handlerId?: number
  reviewerId?: number
  deadline?: string
  responseDeadline?: string
  ruleReason?: string
  notificationLevel?: string
  repeatCount30Days?: number
  repeatCount90Days?: number
  problemFingerprint?: string
  handlingMethod?: string
  closedAt?: string
  capaStatus?: string
  processType?: string
  remark?: string
  signatureUser?: string
  signatureTime?: string
  signatureReason?: string
  plantCode?: string
  plantName?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}


/** 改善措施实体（对齐 qms.improvement_action 表） */
export interface ImprovementAction {
  id: number
  exceptionId: number
  actionType: string
  content: string
  ownerId?: number
  ownerName?: string
  dueDate?: string
  status: string
  completedAt?: string
  remark?: string
  plantCode?: string
  plantName?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

/** 验证记录实体（对齐 qms.verification_record 表） */
export interface VerificationRecord {
  id: number
  exceptionId: number
  verifyType: string
  result: string
  verifierId?: number
  verifierName?: string
  verifyDate?: string
  evidence?: string
  remark?: string
  signatureUser?: string
  signatureTime?: string
  signatureReason?: string
  plantCode?: string
  plantName?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

/** 供应商升级记录实体（对齐 qms.escalation 表） */
export interface Escalation {
  id: number
  supplierId: number
  escalationReason: string
  relatedExceptionIds?: string
  escalationAction: string
  status: string
  closedAt?: string
  remark?: string
  signatureUser?: string
  signatureTime?: string
  signatureReason?: string
  plantCode?: string
  plantName?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

/** 8D/CAPA 报告实体（对齐 qms.exception_8d 表） */
export interface EightDReport {
  id?: number
  exceptionId?: number
  exceptionNo?: string
  currentStep: string
  d1Team?: string
  d2ProblemDesc?: string
  d3Containment?: string
  d4RootCause?: string
  d5Corrective?: string
  d6Implementation?: string
  d7Preventive?: string
  d8Closure?: string
  version?: number
  plantCode?: string
  plantName?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

/** 8D 保存/更新请求 */
export interface EightDSaveDTO {
  currentStep: string
  d1Team?: string
  d2ProblemDesc?: string
  d3Containment?: string
  d4RootCause?: string
  d5Corrective?: string
  d6Implementation?: string
  d7Preventive?: string
  d8Closure?: string
  version?: number
}

/** 异常单详情（含改善措施 + 验证记录 + 8D + 关联来料） */
export interface ExceptionDetailVO extends ExceptionOrder {
  reviewerName?: string
  improvementActions: ImprovementAction[]
  verificationRecords: VerificationRecord[]
  rectificationPlans: RectificationPlan[]
  eightD?: EightDReport
  notificationCount?: number
  materialInspection?: import('@/types/incoming').MaterialInspection
}

/** 供应商来料不良频次汇总项 */
export interface SupplierExceptionSummary {
  supplierId: number
  supplierName: string
  supplierCode: string
  occurrenceCount: number
  relatedExceptionIds: number[]
  latestOccurrenceAt?: string
  topDefectDesc?: string
}


/** 分组统计项 */
export interface BreakdownItem {
  name: string
  count: number
}

/** 异常整改 KPI 看板统计 */
export interface ExceptionStats {
  totalExceptions: number
  pendingCount: number
  inProgressCount: number
  pendingVerifyCount: number
  closedCount: number
  closureRate: number
  severityBreakdown: BreakdownItem[]
  sourceBreakdown: BreakdownItem[]
  overdueCount: number
  escalationCount: number
}

/** 多维度分析项 */
export interface ExceptionAnalysisItem {
  name: string
  count: number
  ratio: number
}

/** 多维度分析结果 */
export interface ExceptionAnalysisVO {
  dimension: string
  items: ExceptionAnalysisItem[]
}

export interface QualityRuleItem {
  title: string
  condition: string
  result: string
  systemAction: string
}

export interface QualityRuleCatalog {
  version: string
  dataSource: string
  repeatKey: string
  severityRules: QualityRuleItem[]
  notificationRules: QualityRuleItem[]
  escalationRules: QualityRuleItem[]
  handlingMethods: string[]
  generalMeasures: string[]
  severeMeasures: string[]
}

/** 升级触发供应商 */
export interface TriggeredSupplier {
  supplierId?: number
  supplierName: string
  supplierCode?: string
  materialCode?: string
  defectDesc: string
  repeatCount: number
  windowDays: number
  shouldEscalate: boolean
  relatedExceptionIds: number[]
}

/** 批量升级检查结果 */
export interface EscalationCheckResultVO {
  totalChecked: number
  triggeredSuppliers: TriggeredSupplier[]
}

/** 异常单列表查询参数 */
export interface ExceptionListParams extends PageParams {
  severity?: string
  status?: string
  supplierId?: number
  sourceType?: string
  processType?: string
  capaStatus?: string
  startDate?: string
  endDate?: string
}

/** 异常闭环请求 */
export interface ExceptionCloseDTO {
  closeReason: string
}

/** 审计日志实体（对齐 qms.audit_log 表） */
export interface AuditLog {
  id: number
  tableName: string
  recordId?: number
  operationType: string
  beforeData?: string
  afterData?: string
  operatorId?: number
  operatorName?: string
  plantCode?: string
  ipAddress?: string
  operationTime?: string
  reason?: string
}

/** 整改计划实体（对齐 qms.rectification_plan 表，与改善措施区分的独立对象） */
export interface RectificationPlan {
  id?: number
  exceptionId: number
  planNo?: string
  planName: string
  objective?: string
  ownerId?: number
  ownerName?: string
  planStartDate?: string
  planEndDate?: string
  status: string
  remark?: string
  plantCode?: string
  plantName?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

/** 闭环前置检查单项 */
export interface CloseCheckItem {
  item: string
  status: 'PASS' | 'FAIL' | 'NA'
  detail: string
}

/** 闭环前置条件检查结果 */
export interface CloseReadinessVO {
  canClose: boolean
  checks: CloseCheckItem[]
}

/** 8D 步骤留痕（对齐 qms.exception_8d_step_log 表） */
export interface EightDStepLogVO {
  id?: number
  exceptionId?: number
  step: string
  stepContent?: string
  operation: 'SAVE' | 'NEXT_STEP'
  operator?: string
  operatedAt?: string
  plantCode?: string
  plantName?: string
  operationDesc?: string
}

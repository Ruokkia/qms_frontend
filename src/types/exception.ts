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
  materialBatchNo?: string
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
  /** CAPA 治理相位（BOTH 模式）：INITIATE / ROOT_CAUSE_APPROVED / MEASURES_APPROVED / CLOSED */
  capaPhase?: string
  remark?: string
  /** 整改责任人 ID（自动触发时留空，发起整改时由相关部门从已有人员中选择填写） */
  ownerId?: number
  /** 整改责任人姓名（与发起操作人 initiatedBy 区分） */
  ownerName?: string
  /** 发起整改流程的责任人姓名（点击「发起整改」的人，与 createdBy/updatedBy 区分） */
  initiatedBy?: string
  /** 发起整改流程的时间 */
  initiatedAt?: string
  signatureUser?: string
  signatureTime?: string
  signatureReason?: string
  plantCode?: string
  plantName?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
  /** 客诉：客户名称（来源类型=客诉时必填） */
  customerName?: string
  /** 客诉：客诉单号 */
  complaintNo?: string
  /** 过程异常：工序（下拉选固化工序库） */
  processStep?: string
  /** 过程异常：产线 */
  productionLine?: string
}


/** 异常单「选择源头记录」聚合查询返回项（对齐 ExceptionSourceOptionVO） */
export interface ExceptionSourceOptionVO {
  id: number
  sourceType?: string
  materialCode?: string
  materialName?: string
  batchNo?: string
  supplierName?: string
  workOrderNo?: string
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
  /** D0 质量部发起说明（立案情由 / 不良现象概述） */
  d0Symptom?: string
  /** D0 发起责任人（质量部发起者姓名） */
  d0Initiator?: string
  /** D0 发起时间 */
  d0InitiateTime?: string
  d1Team?: string
  /** D1 成员结构化列表（JSON 数组字符串，运行时由后端返回） */
  d1Members?: string
  /** CAPA 负责人姓名列表（JSON 数组，与 8D 团队对称指派） */
  capaOwner?: string
  /** 当前阶段审批状态：DRAFT/SUBMITTED/PENDING_APPROVAL/APPROVED/REJECTED */
  stepStatus?: string
  /** CAPA 流程当前阶段：C1-C4（选 CAPA 或 BOTH 时维护） */
  capaCurrentStep?: string
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
  d0Symptom?: string
  d0Initiator?: string
  d0InitiateTime?: string
  d1Team?: string
  capaOwner?: string
  capaCurrentStep?: string
  d2ProblemDesc?: string
  d3Containment?: string
  d4RootCause?: string
  d5Corrective?: string
  d6Implementation?: string
  d7Preventive?: string
  d8Closure?: string
  version?: number
}

/** 异常单发起整改流程请求（D0 立案 + 指定负责人） */
export interface ExceptionInitiateDTO {
  processType: string
  /** 整改责任人 ID（相关部门从已有人员中选择填写） */
  ownerId?: number
  /** 整改责任人姓名 */
  ownerName?: string
  /** D1 团队（负责人组建团队后提交质量部审核时使用，JSON 数组字符串） */
  d1Team?: string
  d0Symptom?: string
  d0Initiator?: string
  /** CAPA 负责人姓名列表（JSON 数组字符串，选 CAPA / BOTH 时维护） */
  capaOwner?: string
}

/** D1 团队成员项 */
export interface D1MemberItem {
  userId?: number
  realName?: string
  roleCode?: string
  /** CAPA 负责人姓名列表（JSON 数组字符串，选 CAPA / BOTH 时维护） */
  capaOwner?: string
}

/** D1 团队提交请求（负责人自行组建团队后提交质量部审核） */
export interface EightDD1TeamDTO {
  memberList: D1MemberItem[]
  capaOwner?: string
  version?: number
}

/** D1 团队审核请求（质量部门审核团队构成） */
export interface EightDD1ReviewDTO {
  approved: boolean
  reviewComment?: string
  version: number
}

/** 人员选项（责任人 / 8D 团队 / CAPA 负责人选择） */
export interface ExceptionUserOptionVO {
  id: number
  realName: string
  roleCode?: string
  plantCode?: string
}

/** 阶段审批请求（通过 / 驳回） */
export interface StageApprovalDTO {
  processFlow: string
  stage: string
  comment?: string
}

/** 阶段级审批配置 VO */
export interface ExceptionApprovalConfigVO {
  id?: number
  processFlow?: string
  stage?: string
  stageName?: string
  needApproval?: number
  approverRole?: string
  isDefault?: number
  plantCode?: string
  plantName?: string
  updatedAt?: string
}

/** 异常单详情（含改善措施 + 验证记录 + 8D + 关联来料/成品/首件） */
export interface ExceptionDetailVO extends ExceptionOrder {
  reviewerName?: string
  improvementActions: ImprovementAction[]
  verificationRecords: VerificationRecord[]
  rectificationPlans: RectificationPlan[]
  eightD?: EightDReport
  notificationCount?: number
  materialInspection?: import('@/types/incoming').MaterialInspection
  faiInspection?: import('@/types/fai').FaiInspectionRecord
  finishedGoodsInspection?: import('@/types/finishedGoods').FinishedGoodsInspection
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

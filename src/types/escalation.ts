/**
 * M2-5 供应商升级类型定义
 *
 * 严格对齐 qms-backend EscalationController + Escalation 实体。
 */

import type { PageParams } from '@/types'

/** 升级记录实体（对齐 qms.escalation 表） */
export interface Escalation {
  id: number
  supplierId?: number
  supplierName?: string
  supplierCode?: string
  materialCode?: string
  escalationReason: string
  relatedExceptionIds?: string
  escalationAction: string
  status: string
  processStage?: string
  actionPlan?: string
  ownerName?: string
  dueDate?: string
  executionRecord?: string
  executedBy?: string
  executedAt?: string
  verificationResult?: string
  verificationEvidence?: string
  verifiedBy?: string
  verifiedAt?: string
  closeReason?: string
  closedBy?: string
  closedAt?: string
  remark?: string
  reviewOpinion?: string
  reviewedBy?: string
  reviewedAt?: string
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

/** 升级列表查询参数 */
export interface EscalationListParams extends PageParams {
  status?: string
  supplierId?: number
}

/** 发起升级请求 */
export interface EscalationCreateDTO {
  supplierId: number
  escalationReason: string
  relatedExceptionIds?: string
  escalationAction: string
  status?: string
  remark?: string
}

export interface EscalationReviewDTO {
  decision: 'APPROVE' | 'REJECT'
  opinion: string
}

/** 批量升级检查请求 */
export interface EscalationCheckDTO {
  supplierId?: number
  daysWindow?: number
  minRepeatCount?: number
}

/** 触发升级供应商 */
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

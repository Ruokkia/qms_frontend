/**
 * 供应商物料变更管理 API 封装
 * 路径前缀：/api/v1/supplier-material-changes
 */
import { apiGet, apiPost } from './request'
import type { ApiResult, PageResult } from '@/types'

/** 变更单主单 */
export interface SupplierMaterialChange {
  id: number
  changeNo: string
  applicantId?: number
  applicant?: string
  supplierCode: string
  supplierName: string
  materialCode: string
  materialName: string
  changeType: string // SPEC 规格 / PROCESS 工艺 / ORIGIN 产地
  changeDesc?: string
  validationReport?: string
  riskAssessment?: string
  standardId?: number
  tightenedSubgroupSize?: number
  spcEnabled?: number // 0 否 / 1 是
  status: string // DRAFT / PENDING / APPROVED / REJECTED / VOID
  rejectReason?: string
  attachments?: string
  plantCode?: string
  plantName?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

/** 联合审批记录 */
export interface SupplierMaterialChangeApproval {
  id: number
  changeId: number
  approvalRole: string // QUALITY / PURCHASE / RD
  approver?: string
  approverId?: number
  approvalStatus: string // PENDING / APPROVED / REJECTED / CANCELLED
  opinion?: string
  approvedAt?: string
}

/** 变更单详情（主单 + 审批记录聚合） */
export interface SupplierMaterialChangeDetail {
  change: SupplierMaterialChange
  approvals: SupplierMaterialChangeApproval[]
  myApprovalRole?: string | null
}

/** 提交申请请求 */
export interface ChangeCreateParams {
  supplierCode: string
  supplierName: string
  materialCode: string
  materialName: string
  changeType: string
  changeDesc: string
  validationReport?: string
  riskAssessment?: string
  tightenedSubgroupSize?: number
  spcEnabled?: boolean
  attachments?: string
  qualityApproverId: number
  purchaseApproverId: number
  rdApproverId: number
}

export const createChangeApi = (data: ChangeCreateParams): Promise<ApiResult<SupplierMaterialChangeDetail>> =>
  apiPost<SupplierMaterialChangeDetail>('/supplier-material-changes', data)

export const listChangesApi = (params: {
  page: number
  size: number
  keyword?: string
  status?: string
  changeType?: string
}): Promise<ApiResult<PageResult<SupplierMaterialChangeDetail>>> =>
  apiGet<PageResult<SupplierMaterialChangeDetail>>('/supplier-material-changes', { params })

export const myApprovalsApi = (params: {
  page: number
  size: number
}): Promise<ApiResult<PageResult<SupplierMaterialChangeDetail>>> =>
  apiGet<PageResult<SupplierMaterialChangeDetail>>('/supplier-material-changes/my-approvals', { params })

export const getChangeApi = (id: number): Promise<ApiResult<SupplierMaterialChangeDetail>> =>
  apiGet<SupplierMaterialChangeDetail>(`/supplier-material-changes/${id}`)

export const approveChangeApi = (id: number, data: { approvalRole: string; opinion?: string }): Promise<ApiResult<null>> =>
  apiPost<null>(`/supplier-material-changes/${id}/approve`, data)

export const rejectChangeApi = (id: number, data: { approvalRole: string; rejectReason: string }): Promise<ApiResult<null>> =>
  apiPost<null>(`/supplier-material-changes/${id}/reject`, data)

export const voidChangeApi = (id: number): Promise<ApiResult<null>> =>
  apiPost<null>(`/supplier-material-changes/${id}/void`)

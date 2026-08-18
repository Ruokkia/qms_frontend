/**
 * 供应商现场审核 API 封装
 * 路径前缀：/api/v1/supplier-audits
 */
import { apiGet, apiPost } from './request'
import type { ApiResult, PageResult } from '@/types'

export interface SupplierAuditPlan {
  id: number
  supplierId: number
  supplierCode?: string
  supplierName?: string
  auditType?: string
  planYear?: number
  frequency?: string
  plannedDate?: string
  status?: string
  auditor?: string
  remark?: string
}

export interface SupplierAuditRecord {
  id: number
  planId?: number
  supplierId: number
  supplierCode?: string
  supplierName?: string
  reportNo?: string
  auditDate?: string
  auditor?: string
  auditSummary?: string
}

export interface SupplierAuditFinding {
  id: number
  recordId: number
  supplierId: number
  level?: string
  description?: string
  photoUrls?: string
  status?: string
}

export interface SupplierAuditReport {
  record: SupplierAuditRecord
  findings: {
    finding: SupplierAuditFinding
    measure?: string
    owner?: string
    verifyResult?: string
    closed?: boolean
  }[]
}

export interface PlanCreateParams {
  auditType: string
  planYear?: number
  supplierId?: number
  plannedDate?: string
  auditor?: string
  remark?: string
}

export interface RecordCreateParams {
  planId?: number
  supplierId: number
  auditDate: string
  auditor?: string
  auditSummary?: string
  findings?: {
    level: string
    description: string
    photoUrls?: string[]
  }[]
}

export interface RectifyParams {
  measure?: string
  dueDate?: string
  owner?: string
  verifyResult?: string
  verifiedBy?: string
}

export function createPlanApi(params: PlanCreateParams): Promise<ApiResult<SupplierAuditPlan[]>> {
  return apiPost<SupplierAuditPlan[]>('/supplier-audits/plans', params)
}

export function listPlansApi(params: {
  page: number
  size: number
  supplierId?: number
  auditType?: string
  status?: string
  keyword?: string
}): Promise<ApiResult<PageResult<SupplierAuditPlan>>> {
  return apiGet<PageResult<SupplierAuditPlan>>('/supplier-audits/plans', { params })
}

export function listRecordsApi(params: {
  page: number
  size: number
  supplierId?: number
  keyword?: string
}): Promise<ApiResult<PageResult<SupplierAuditRecord>>> {
  return apiGet<PageResult<SupplierAuditRecord>>('/supplier-audits/records', { params })
}

export function listFindingsApi(params: {
  page: number
  size: number
  supplierId?: number
  status?: string
  keyword?: string
}): Promise<ApiResult<PageResult<SupplierAuditFinding>>> {
  return apiGet<PageResult<SupplierAuditFinding>>('/supplier-audits/findings', { params })
}

export function createRecordApi(params: RecordCreateParams): Promise<ApiResult<SupplierAuditRecord>> {
  return apiPost<SupplierAuditRecord>('/supplier-audits/records', params)
}

export function rectifyApi(id: number, params: RectifyParams): Promise<ApiResult<void>> {
  return apiPost<void>(`/supplier-audits/findings/${id}/rectify`, params)
}

export function verifyApi(id: number, params: RectifyParams): Promise<ApiResult<void>> {
  return apiPost<void>(`/supplier-audits/findings/${id}/verify`, params)
}

export function getReportApi(id: number): Promise<ApiResult<SupplierAuditReport>> {
  return apiGet<SupplierAuditReport>(`/supplier-audits/records/${id}/report`)
}

export interface SupplierAuditAuditor {
  id: number
  account?: string
  realName?: string
  roleCode?: string
}

export function listAuditorsApi(): Promise<ApiResult<SupplierAuditAuditor[]>> {
  return apiGet<SupplierAuditAuditor[]>('/supplier-audits/auditors')
}

export function uploadFileApi(file: File, subDir = 'supplier-audit'): Promise<ApiResult<string>> {
  const form = new FormData()
  form.append('file', file)
  form.append('subDir', subDir)
  return apiPost<string>('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

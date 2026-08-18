import { apiGet, apiPost, apiPut } from './request'

export interface MaterialChange {
  id: number
  supplierId: number
  supplierCode?: string
  supplierName?: string
  materialCode?: string
  materialName?: string
  changeType?: string
  reason?: string
  beforeDesc?: string
  afterDesc?: string
  affectSop?: number
  firstLotStrict?: number
  status: string
  approvals?: string
  applicant?: string
  createdAt?: string
  updatedAt?: string
}

export interface ApprovalItem {
  role: string
  approver: string
  opinion: string
  decision: string
  time: string
}

export interface MaterialChangeVO {
  change: MaterialChange
  approvals: ApprovalItem[]
}

export interface CreateChangeDTO {
  supplierId: number
  materialCode?: string
  materialName?: string
  changeType?: string
  reason?: string
  beforeDesc?: string
  afterDesc?: string
  affectSop?: boolean
  firstLotStrict?: boolean
}

export interface ApproveDTO {
  role: string
  opinion?: string
  decision: string
}

export function createChangeApi(data: CreateChangeDTO) {
  return apiPost<MaterialChangeVO>('/suppliers/material-changes', data)
}

export function submitChangeApi(id: number) {
  return apiPost<MaterialChangeVO>(`/suppliers/material-changes/${id}/submit`)
}

export function approveChangeApi(id: number, data: ApproveDTO) {
  return apiPut<MaterialChangeVO>(`/suppliers/material-changes/${id}/approve`, data)
}

export function implementChangeApi(id: number) {
  return apiPost<MaterialChangeVO>(`/suppliers/material-changes/${id}/implement`)
}

export function pageChangesApi(params: {
  page?: number
  size?: number
  supplierId?: number
  status?: string
  keyword?: string
}) {
  return apiGet<{ list: MaterialChangeVO[]; total: number; page: number; size: number }>('/suppliers/material-changes/page', { params })
}

export function getChangeApi(id: number) {
  return apiGet<MaterialChangeVO>(`/suppliers/material-changes/${id}`)
}

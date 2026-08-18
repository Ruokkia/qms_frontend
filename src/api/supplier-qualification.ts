import { apiGet, apiPost, apiPut, apiDelete } from './request'

export interface SupplierQualification {
  id: number
  supplierId: number
  supplierCode?: string
  supplierName?: string
  certType: string
  certNo?: string
  issuer?: string
  issueDate?: string
  expireDate?: string
  longTerm?: number
  fileUrls?: string
  remark?: string
  plantCode?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface QualificationVO {
  qualification: SupplierQualification
  daysToExpire: number | null
  warnLevel: string
}

export interface ExpiryVO {
  qualificationId: number
  supplierId: number
  supplierName: string
  certType: string
  certNo: string
  expireDate: string
  daysToExpire: number
  warnLevel: string
  plantCode: string
  plantName: string
}

export function createQualificationApi(data: Partial<SupplierQualification> & { fileUrls?: string[] }) {
  return apiPost<QualificationVO>('/suppliers/qualifications', data)
}

export function updateQualificationApi(id: number, data: Partial<SupplierQualification> & { fileUrls?: string[] }) {
  return apiPut<QualificationVO>(`/suppliers/qualifications/${id}`, data)
}

export function deleteQualificationApi(id: number) {
  return apiDelete(`/suppliers/qualifications/${id}`)
}

export function listQualificationsApi(supplierId: number) {
  return apiGet<QualificationVO[]>('/suppliers/qualifications/by-supplier', { params: { supplierId } })
}

export function pageQualificationsApi(params: {
  page?: number
  size?: number
  supplierId?: number
  warnLevel?: string
  keyword?: string
}) {
  return apiGet<{ list: QualificationVO[]; total: number; page: number; size: number }>('/suppliers/qualifications/page', { params })
}

export function scanExpiringApi() {
  return apiGet<ExpiryVO[]>('/suppliers/qualifications/expiring')
}

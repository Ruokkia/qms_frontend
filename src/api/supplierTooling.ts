import { apiGet, apiPost, apiPut } from './request'
import type { ApiResult, PageResult } from '@/types'

export interface SupplierItem { id: number; supplierCode: string; supplierName: string; contactPerson?: string; contactPhone?: string; riskLevel?: string; status?: string }
export interface SupplierAssessment { id?: number; supplierId: number; assessmentPeriod: string; qualifiedRate?: number; defectRate?: number; rectificationRate?: number; deliveryRate?: number; complianceRate?: number; spcAssessment?: string; grade?: string; shareSuggestion?: string; auditFrequency?: string; admissionSuggestion?: string; remark?: string }
export interface SpcEvidence { materialCount: number; capabilityMaterialCount?: number; minCpk?: number; assessment: string; message: string }
export interface ToolingAsset { id?: number; toolingCode: string; qrCode?: string; toolingName: string; toolingType: string; specification?: string; applicableProduct?: string; applicableProcess?: string; material?: string; supplierName?: string; purchaseDate?: string; cost?: number; versionNo?: string; status?: string; storageLocation?: string; keeperName?: string; lifeLimit?: number; usedCount?: number }
export interface ToolingRecord { id?: number; toolingId?: number; recordType: '保养' | '维修'; planCycle?: string; dueDate?: string; executedDate?: string; faultDescription?: string; repairMeasure?: string; rootCause?: string; acceptanceResult?: string; verificationResult?: string; status?: string; responsibleName?: string; remark?: string }
export interface ToolingBinding { id?: number; bindingType: 'BOM' | '工艺路线'; productCode?: string; productName?: string; bomCode?: string; processCode?: string; processName?: string }
export interface ToolingVersion { id?: number; versionNo: string; changeType: string; changeDescription: string; effectiveDate?: string }
export interface ToolingFailureStat { faultType: string; rootCause: string; count: number }

export const getSuppliers = () => apiGet<PageResult<SupplierItem>>('/suppliers', { params: { page: 1, size: 200 } })
export const getAssessments = (period?: string) => apiGet<PageResult<SupplierAssessment>>('/supplier-assessments', { params: { page: 1, size: 100, period } })
export const getSupplierSpcEvidence = (supplierId: number) => apiGet<SpcEvidence>('/supplier-assessments/spc-evidence', { params: { supplierId } })
export const createAssessment = (data: SupplierAssessment) => apiPost<SupplierAssessment>('/supplier-assessments', data)
export const updateAssessment = (id: number, data: SupplierAssessment) => apiPut<SupplierAssessment>(`/supplier-assessments/${id}`, data)
export const getTooling = (params: { keyword?: string; status?: string; page: number; size: number }) => apiGet<PageResult<ToolingAsset>>('/tooling', { params })
export const createTooling = (data: ToolingAsset) => apiPost<ToolingAsset>('/tooling', data)
export const updateTooling = (id: number, data: ToolingAsset) => apiPut<ToolingAsset>(`/tooling/${id}`, data)
export const getToolingRecords = (id: number) => apiGet<ToolingRecord[]>(`/tooling/${id}/records`)
export const createToolingRecord = (id: number, data: ToolingRecord) => apiPost<ToolingRecord>(`/tooling/${id}/records`, data)
export const addToolingUsage = (id: number, count: number) => apiPost<ToolingAsset>(`/tooling/${id}/usage`, undefined, { params: { count } })
export const getToolingBindings = (id: number) => apiGet<ToolingBinding[]>(`/tooling/${id}/bindings`)
export const saveToolingBindings = (id: number, data: ToolingBinding[]) => apiPut<ToolingBinding[]>(`/tooling/${id}/bindings`, data)
export const getToolingVersions = (id: number) => apiGet<ToolingVersion[]>(`/tooling/${id}/versions`)
export const createToolingVersion = (id: number, data: ToolingVersion) => apiPost<ToolingVersion>(`/tooling/${id}/versions`, data)
export const getToolingReminders = () => apiGet<ToolingRecord[]>('/tooling/reminders')
export const getToolingFailureStats = () => apiGet<ToolingFailureStat[]>('/tooling/failure-stats')
export const verifyToolingRepair = (recordId: number, data: Pick<ToolingRecord, 'verificationResult' | 'remark'>) => apiPost<ToolingRecord>(`/tooling/records/${recordId}/verify`, data)

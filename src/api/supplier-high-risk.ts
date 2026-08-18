import { apiGet, apiPost, apiDelete } from './request'

export interface HighRiskMaterial {
  id: number
  materialCode: string
  materialName: string
  riskLevel: string
  extraRequirement: string
  remark?: string
}

export interface SupplierHighRiskMaterial {
  id: number
  supplierId: number
  supplierName?: string
  materialId: number
  materialCode: string
  materialName: string
  extraRequirement: string
}

export function listHighRiskMaterialsApi() {
  return apiGet<HighRiskMaterial[]>('/suppliers/high-risk-materials/materials')
}

export function listSupplierHighRiskApi(supplierId: number) {
  return apiGet<SupplierHighRiskMaterial[]>('/suppliers/high-risk-materials/by-supplier', { params: { supplierId } })
}

export function linkHighRiskApi(data: { supplierId: number; materialId: number }) {
  return apiPost<SupplierHighRiskMaterial>('/suppliers/high-risk-materials/link', data)
}

export function unlinkHighRiskApi(id: number) {
  return apiDelete(`/suppliers/high-risk-materials/link/${id}`)
}

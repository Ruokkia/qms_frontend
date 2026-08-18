import { apiGet } from './request'

export interface SupplierPerformance {
  supplierId: number
  supplierName: string
  supplierCode: string
  riskLevel?: string
  totalBatches: number
  passRate: number
  unqualifiedRate: number
  rectifyOnTimeRate: number
  complianceRate: number
  deliveryOnTimeRate: number | null
  score: number
  grade: string
}

export interface SupplierPerfTrend {
  month: string
  avgPassRate: number
  avgScore: number
  batches: number
}

export interface SupplierPerfPareto {
  category: string
  count: number
  cumulativeRate: number
}

export function getPerfRankApi() {
  return apiGet<SupplierPerformance[]>('/suppliers/performance/rank')
}

export function getPerfTrendApi() {
  return apiGet<SupplierPerfTrend[]>('/suppliers/performance/trend')
}

export function getPerfParetoApi() {
  return apiGet<SupplierPerfPareto[]>('/suppliers/performance/pareto')
}

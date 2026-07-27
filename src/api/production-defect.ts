import service, { apiGet, apiPost, apiPut, apiDelete } from './request'
import type { ApiResult } from '@/types'
import type {
  ProductionRepair,
  ImportResult,
  RepairSaveRequest,
  RepairUpdateRequest,
  DefectAnalyticsQuery,
  DefectSummary,
  DefectTrendPoint,
  DefectRankItem,
} from '@/types/production-defect'

export interface RepairPageParams {
  page?: number
  size?: number
  keyword?: string
  process?: string
  defectPhenomenon?: string
  productName?: string
  productBatchOrSn?: string
  productNo?: string
  startDate?: string
  endDate?: string
  repairStatus?: string
}

export interface RepairPageResult {
  list: ProductionRepair[]
  total: number
}

const R = '/production-repairs'

export function importExcelApi(file: File): Promise<ApiResult<ImportResult>> {
  const form = new FormData()
  form.append('file', file)
  return service.post(`${R}/import`, form) as any
}

export function getRepairsApi(params: RepairPageParams) {
  return apiGet<RepairPageResult>(`${R}`, { params }) as Promise<ApiResult<RepairPageResult>>
}

export function getRepairDetailApi(id: number) {
  return apiGet<ProductionRepair>(`${R}/${id}`) as Promise<ApiResult<ProductionRepair>>
}

export function createRepairApi(dto: RepairSaveRequest) {
  return apiPost<number>(`${R}`, dto) as Promise<ApiResult<number>>
}

export function updateRepairApi(id: number, dto: RepairUpdateRequest) {
  return apiPut<void>(`${R}/${id}`, dto) as Promise<ApiResult<void>>
}

export function deleteRepairApi(id: number) {
  return apiDelete<void>(`${R}/${id}`) as Promise<ApiResult<void>>
}

// ---- 不良分析（精简版） ----
export function getDefectSummaryApi(params: DefectAnalyticsQuery) {
  return apiGet<DefectSummary>('/production-defect-analytics/summary', { params }) as Promise<ApiResult<DefectSummary>>
}

export function getDefectTrendApi(params: DefectAnalyticsQuery) {
  return apiGet<DefectTrendPoint[]>('/production-defect-analytics/trend', { params }) as Promise<ApiResult<DefectTrendPoint[]>>
}

export function getDefectRankApi(params: DefectAnalyticsQuery) {
  return apiGet<DefectRankItem[]>('/production-defect-analytics/rank', { params }) as Promise<ApiResult<DefectRankItem[]>>
}

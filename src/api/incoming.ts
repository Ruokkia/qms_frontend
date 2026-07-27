/**
 * M1 来料数据管理 API 封装
 *
 * 路径前缀：/api/v1/material-inspections
 * 严格对齐 MaterialInspectionController 接口契约。
 */
import { apiGet, apiPost, apiPut, apiDelete } from './request'
import type { ApiResult, PageResult } from '@/types'
import type {
  MaterialInspection,
  MaterialInspectionStats,
  MaterialInspectionListParams,
  MaterialInspectionImportDTO,
  MaterialInspectionImportResultVO,
  MaterialInspectionReconcileResultVO,
  KeySupplierTrend,
} from '@/types/incoming'


const BASE = '/material-inspections'

/** 分页查询物料检验记录 */
export function getMaterialInspectionListApi(
  params: MaterialInspectionListParams,
): Promise<ApiResult<PageResult<MaterialInspection>>> {
  return apiGet<PageResult<MaterialInspection>>(BASE, { params })
}

/** 物料检验看板统计 */
export function getMaterialInspectionStatsApi(): Promise<ApiResult<MaterialInspectionStats>> {
  return apiGet<MaterialInspectionStats>(`${BASE}/stats`)
}

/** 重点供应商质量趋势（近30天来料批次量 Top5） */
export function getKeySupplierTrendApi(): Promise<ApiResult<KeySupplierTrend>> {
  return apiGet<KeySupplierTrend>(`${BASE}/key-supplier-trend`)
}

/** 物料检验详情 */
export function getMaterialInspectionDetailApi(id: number): Promise<ApiResult<MaterialInspection>> {
  return apiGet<MaterialInspection>(`${BASE}/${id}`)
}

/** 新增物料检验记录 */
export function createMaterialInspectionApi(
  data: Partial<MaterialInspection>,
): Promise<ApiResult<MaterialInspection>> {
  return apiPost<MaterialInspection>(BASE, data)
}

/** 更新物料检验记录 */
export function updateMaterialInspectionApi(
  id: number,
  data: Partial<MaterialInspection>,
): Promise<ApiResult<void>> {
  return apiPut<void>(`${BASE}/${id}`, data)
}

/** 逻辑删除物料检验记录 */
export function deleteMaterialInspectionApi(id: number): Promise<ApiResult<void>> {
  return apiDelete<void>(`${BASE}/${id}`)
}

/** 批量导入物料检验记录 */
export function importMaterialInspectionApi(
  data: MaterialInspectionImportDTO,
): Promise<ApiResult<MaterialInspectionImportResultVO>> {
  return apiPost<MaterialInspectionImportResultVO>(`${BASE}/import`, data)
}

/** 手动对账（扫描不合格未关联异常单的记录并自动建单） */
export function reconcileMaterialInspectionApi(params?: {
  startDate?: string
  endDate?: string
  plantCode?: string
}): Promise<ApiResult<MaterialInspectionReconcileResultVO>> {
  return apiPost<MaterialInspectionReconcileResultVO>(`${BASE}/reconcile`, null, { params })
}


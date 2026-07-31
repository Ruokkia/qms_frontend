/**
 * M1 来料数据管理 API 封装
 *
 * 路径前缀：/api/v1/material-inspections
 * 严格对齐 MaterialInspectionController 接口契约。
 */
import service, { apiGet, apiPost, apiPut, apiDelete } from './request'
import type { AxiosResponse } from 'axios'
import type { ApiResult, PageResult } from '@/types'
import type {
  MaterialInspection,
  MaterialInspectionStats,
  MaterialInspectionListParams,
  MaterialInspectionImportDTO,
  MaterialInspectionImportResultVO,
  MaterialInspectionImportPreviewVO,
  MaterialInspectionReconcileResultVO,
  KeySupplierTrend,
  SupplierRankItem,
} from '@/types/incoming'


const BASE = '/material-inspections'

/** 分页查询物料检验记录 */
export function getMaterialInspectionListApi(
  params: MaterialInspectionListParams,
): Promise<ApiResult<PageResult<MaterialInspection>>> {
  return apiGet<PageResult<MaterialInspection>>(BASE, { params })
}

export interface CriticalMaterialBindingItem {
  materialCode?: string
  materialBarcode?: string
  isActive?: string
}

/** Query critical material bindings by material code for list-only barcode display. */
export function getCriticalMaterialBindingsApi(params: { page: number; size: number; materialCode: string }): Promise<ApiResult<PageResult<CriticalMaterialBindingItem>>> {
  return apiGet<PageResult<CriticalMaterialBindingItem>>('/material-bindings', { params })
}

/** 绑定弹窗专用：按 category + keyword 模糊查询子项候选列表 */
export interface SearchChildrenParams {
  category: '半成品' | '物料'
  barcodeKeyword?: string
  nameKeyword?: string
  page?: number
  size?: number
}
export interface SearchChildrenItem {
  id: number
  barcode: string
  name: string
  specModel?: string
  category?: string
  materialCode?: string
  materialBatchNo?: string
  inspectionResult?: string
}
export function searchChildrenApi(params: SearchChildrenParams): Promise<ApiResult<PageResult<SearchChildrenItem>>> {
  return apiGet<PageResult<SearchChildrenItem>>('/material-bindings/search-children', { params })
}

/** 创建关键物料绑定记录 */
export interface CreateBindingParams {
  category: string
  productBarcode: string
  productName?: string
  productMaterialNo?: string
  materialBarcode: string
  materialCode?: string
  materialName?: string
  specModel?: string
  workOrderNo?: string
  workOrderQty?: number
  processCode?: string
  processName?: string
}
export function createBindingApi(data: CreateBindingParams): Promise<ApiResult<any>> {
  return apiPost<any>('/material-bindings', data)
}
/** 物料检验看板统计 */
export function getMaterialInspectionStatsApi(): Promise<ApiResult<MaterialInspectionStats>> {
  return apiGet<MaterialInspectionStats>(`${BASE}/stats`)
}

/** 重点供应商质量趋势（自定义时间范围内来料批次量 TopN） */
export function getKeySupplierTrendApi(topN?: number, startDate?: string, endDate?: string): Promise<ApiResult<KeySupplierTrend>> {
  return apiGet<KeySupplierTrend>(`${BASE}/key-supplier-trend`, {
    params: { topN, startDate, endDate },
  })
}

/** 供应商合格率排名（可选时间范围） */
export function getSupplierRankApi(startDate?: string, endDate?: string): Promise<ApiResult<SupplierRankItem[]>> {
  return apiGet<SupplierRankItem[]>(`${BASE}/supplier-rank`, {
    params: { startDate, endDate },
  })
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

/** 导入预览：解析 Excel 并逐行校验（不落库），返回可导入列表与失败明细 */
export function previewImportApi(file: File): Promise<ApiResult<MaterialInspectionImportPreviewVO>> {
  const form = new FormData()
  form.append('file', file)
  return service.post<ApiResult<MaterialInspectionImportPreviewVO>>(`${BASE}/import/preview`, form) as unknown as Promise<ApiResult<MaterialInspectionImportPreviewVO>>
}

/** 下载来料检验导入 Excel 模板（二进制流） */
export function downloadTemplateApi(): Promise<AxiosResponse<Blob>> {
  return service.get(`${BASE}/import/template`, { responseType: 'blob' }) as unknown as Promise<AxiosResponse<Blob>>
}


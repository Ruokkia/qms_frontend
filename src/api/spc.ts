/**
 * M4 SPC 过程能力分析 API 封装
 * 路径前缀：/spc（baseURL 已含 /api/v1）
 * 严格对齐 SpcController 接口契约。
 */
import { apiGet, apiPost, apiPut, apiDelete } from './request'
import type { ApiResult } from '@/types'
import type {
  SpcProcess,
  SpcParameter,
  SpcSubgroup,
  SpcChartData,
  SpcCapabilityResult,
  SpcProcessRequest,
  SpcParameterRequest,
  SpcSubgroupSaveRequest,
} from '@/types/spc'

const BASE = '/spc'

// ===== 工序管理 =====

export function createProcessApi(data: SpcProcessRequest): Promise<ApiResult<SpcProcess>> {
  return apiPost<SpcProcess>(`${BASE}/processes`, data)
}

export function getProcessesApi(): Promise<ApiResult<SpcProcess[]>> {
  return apiGet<SpcProcess[]>(`${BASE}/processes`)
}

export function updateProcessApi(id: number, data: SpcProcessRequest): Promise<ApiResult<SpcProcess>> {
  return apiPut<SpcProcess>(`${BASE}/processes/${id}`, data)
}

export function deleteProcessApi(id: number): Promise<ApiResult<void>> {
  return apiDelete<void>(`${BASE}/processes/${id}`)
}

// ===== 参数管理 =====

export function createParameterApi(data: SpcParameterRequest): Promise<ApiResult<SpcParameter>> {
  return apiPost<SpcParameter>(`${BASE}/parameters`, data)
}

export function getParametersApi(processId?: number): Promise<ApiResult<SpcParameter[]>> {
  return apiGet<SpcParameter[]>(`${BASE}/parameters`, { params: { processId } })
}

export function getParameterDetailApi(id: number): Promise<ApiResult<SpcParameter>> {
  return apiGet<SpcParameter>(`${BASE}/parameters/${id}`)
}

export function updateParameterApi(id: number, data: SpcParameterRequest): Promise<ApiResult<SpcParameter>> {
  return apiPut<SpcParameter>(`${BASE}/parameters/${id}`, data)
}

export function deleteParameterApi(id: number): Promise<ApiResult<void>> {
  return apiDelete<void>(`${BASE}/parameters/${id}`)
}

// ===== 子组 / 数据采集 =====

export function saveSubgroupApi(data: SpcSubgroupSaveRequest): Promise<ApiResult<SpcSubgroup>> {
  return apiPost<SpcSubgroup>(`${BASE}/subgroups`, data)
}

export function appendPendingSamplesApi(id: number, sampleValues: number[]): Promise<ApiResult<SpcSubgroup>> {
  return apiPost<SpcSubgroup>(`${BASE}/subgroups/${id}/samples`, { sampleValues })
}


export function getSubgroupsApi(paramId: number): Promise<ApiResult<SpcSubgroup[]>> {
  return apiGet<SpcSubgroup[]>(`${BASE}/subgroups`, { params: { paramId } })
}

export function getSubgroupDetailApi(id: number): Promise<ApiResult<SpcSubgroup>> {
  return apiGet<SpcSubgroup>(`${BASE}/subgroups/${id}`)
}

/** 按首件记录查询 SPC 子组（FAI 跳转 SPC 自动定位待补子组） */
export function getSubgroupsByFaiApi(faiRecordId: number): Promise<ApiResult<SpcSubgroup[]>> {
  return apiGet<SpcSubgroup[]>(`${BASE}/subgroups/by-fai`, { params: { faiRecordId } })
}

export function deleteSubgroupApi(id: number): Promise<ApiResult<void>> {
  return apiDelete<void>(`${BASE}/subgroups/${id}`)
}

// ===== 统一代码字典（已签首件 ∪ 已激活标准） =====
export interface SpcItemDict {
  itemType?: string
  itemCode?: string
  itemName?: string
  processCode?: string
  paramCode?: string
}

/** 查询 SPC 统一代码字典（不再查 trace 表，消除两套体系冲突） */
export function searchSpcItemsApi(keyword?: string): Promise<ApiResult<SpcItemDict[]>> {
  return apiGet<SpcItemDict[]>(`${BASE}/items/search`, { params: { keyword } })
}

// ===== 控制图 =====

export function getXbarRChartApi(
  paramId: number,
  itemType?: 'PRODUCT' | 'MATERIAL',
  itemCode?: string,
  batchNo?: string,
): Promise<ApiResult<SpcChartData>> {
  return apiGet<SpcChartData>(`${BASE}/charts/${paramId}/xbar-r`, {
    params: { itemType, itemCode, batchNo },
  })
}

export function getXbarSChartApi(
  paramId: number,
  itemType?: 'PRODUCT' | 'MATERIAL',
  itemCode?: string,
  batchNo?: string,
): Promise<ApiResult<SpcChartData>> {
  return apiGet<SpcChartData>(`${BASE}/charts/${paramId}/xbar-s`, {
    params: { itemType, itemCode, batchNo },
  })
}

export function recalcControlLimitsApi(paramId: number): Promise<ApiResult<Record<string, unknown>>> {
  return apiPost<Record<string, unknown>>(`${BASE}/control-limits/${paramId}/recalc`)
}

// ===== 过程能力 =====

export function getCapabilityApi(paramId: number, itemType?: string, itemCode?: string, batchNo?: string): Promise<ApiResult<SpcCapabilityResult>> {
  return apiGet<SpcCapabilityResult>(`${BASE}/capability/${paramId}`, {
    params: { itemType, itemCode, batchNo }
  })
}

export function recalcCapabilityApi(paramId: number, itemType?: string, itemCode?: string, batchNo?: string): Promise<ApiResult<SpcCapabilityResult>> {
  return apiPost<SpcCapabilityResult>(`${BASE}/capability/${paramId}/recalc`, null, {
    params: { itemType, itemCode, batchNo }
  })
}


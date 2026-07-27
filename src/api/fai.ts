/**
 * M3 首件检验管理 API 封装
 * 路径前缀：/fai（baseURL 已含 /api/v1）
 * 严格对齐 FaiController 接口契约。
 */
import { apiGet, apiPost, apiPut, apiDelete } from './request'
import type { ApiResult, PageResult } from '@/types'
import type {
  FaiChangeTrigger,
  FaiInspectionRecord,
  FaiInspectionRecordResponse,
  FaiReportResponse,
  FaiStandard,
  FaiSpcBaselineVO,
  CreateChangeTriggerRequest,
  CreateInspectionRequest,
  FaiItemValue,
  FaiSignatureRequest,
  FaiQuery,
  ChangeTriggerQuery,
  FaiStandardSaveRequest,
} from '@/types/fai'

const BASE = '/fai'

// ===== 变更触发 =====

/** 创建变更触发 */
export function createChangeTriggerApi(
  data: CreateChangeTriggerRequest,
): Promise<ApiResult<FaiChangeTrigger>> {
  return apiPost<FaiChangeTrigger>(`${BASE}/change-triggers`, data)
}

/** 分页查询变更触发 */
export function getChangeTriggersApi(
  params: ChangeTriggerQuery,
): Promise<ApiResult<PageResult<FaiChangeTrigger>>> {
  return apiGet<PageResult<FaiChangeTrigger>>(`${BASE}/change-triggers`, { params })
}

/** 变更触发详情 */
export function getChangeTriggerDetailApi(id: number): Promise<ApiResult<FaiChangeTrigger>> {
  return apiGet<FaiChangeTrigger>(`${BASE}/change-triggers/${id}`)
}

// ===== 首件检验 =====

/** 从变更触发创建首件检验单 */
export function createInspectionApi(
  data: CreateInspectionRequest,
): Promise<ApiResult<FaiInspectionRecordResponse>> {
  return apiPost<FaiInspectionRecordResponse>(`${BASE}/inspections`, data)
}

/** 分页查询首件检验记录 */
export function getInspectionsApi(
  params: FaiQuery,
): Promise<ApiResult<PageResult<FaiInspectionRecord>>> {
  return apiGet<PageResult<FaiInspectionRecord>>(`${BASE}/inspections`, { params })
}

/** 首件检验详情（含参数明细） */
export function getInspectionDetailApi(id: number): Promise<ApiResult<FaiInspectionRecordResponse>> {
  return apiGet<FaiInspectionRecordResponse>(`${BASE}/inspections/${id}`)
}

/** 批量填写参数实际值 */
export function submitInspectionItemsApi(
  id: number,
  items: FaiItemValue[],
): Promise<ApiResult<FaiInspectionRecordResponse>> {
  return apiPut<FaiInspectionRecordResponse>(`${BASE}/inspections/${id}/items`, {
    faiRecordId: id,
    items,
  })
}

/** 重新自动判定 */
export function judgeInspectionApi(id: number): Promise<ApiResult<FaiInspectionRecordResponse>> {
  return apiPost<FaiInspectionRecordResponse>(`${BASE}/inspections/${id}/judge`)
}

/** 刷新检验标准值：从当前激活标准同步最新值，补全新标准项，重新判定 */
export function refreshStandardApi(id: number): Promise<ApiResult<FaiInspectionRecordResponse>> {
  return apiPost<FaiInspectionRecordResponse>(`${BASE}/inspections/${id}/refresh-standard`)
}

/** 电子签名 */
export function signInspectionApi(
  id: number,
  data: FaiSignatureRequest,
): Promise<ApiResult<FaiInspectionRecordResponse>> {
  return apiPost<FaiInspectionRecordResponse>(`${BASE}/inspections/${id}/signature`, {
    ...data,
    faiRecordId: id,
  })
}

/** 首件检验报告（JSON） */
export function getInspectionReportApi(id: number): Promise<ApiResult<FaiReportResponse>> {
  return apiGet<FaiReportResponse>(`${BASE}/inspections/${id}/report`)
}

// ===== 标准模板 =====

/** 标准模板列表 */
export function getStandardsApi(): Promise<ApiResult<FaiStandard[]>> {
  return apiGet<FaiStandard[]>(`${BASE}/standards`)
}

/** 查询最新激活标准 */
export function getLatestStandardApi(
  materialCode: string,
  processName: string,
): Promise<ApiResult<FaiStandard>> {
  return apiGet<FaiStandard>(`${BASE}/standards/${encodeURIComponent(materialCode)}/${encodeURIComponent(processName)}`)
}

/** 新增检验标准模板（手动设置物料/工序标准） */
export function createStandardApi(
  data: FaiStandardSaveRequest,
): Promise<ApiResult<number>> {
  return apiPost<number>(`${BASE}/standards`, data)
}

/** 更新检验标准模板 */
export function updateStandardApi(
  id: number,
  data: FaiStandardSaveRequest,
): Promise<ApiResult<unknown>> {
  return apiPut<unknown>(`${BASE}/standards/${id}`, data)
}

/** 删除检验标准模板（逻辑删除） */
export function deleteStandardApi(id: number): Promise<ApiResult<unknown>> {
  return apiDelete<unknown>(`${BASE}/standards/${id}`)
}

// ===== SPC 联动 =====

/** SPC 调取基准数据 */
export function getSpcBaselineApi(id: number): Promise<ApiResult<FaiSpcBaselineVO[]>> {
  return apiGet<FaiSpcBaselineVO[]>(`${BASE}/spc-baseline/${id}`)
}

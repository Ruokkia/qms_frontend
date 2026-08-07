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
  FaiStandardHistory,
  FaiStandardApproval,
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

/** 作废变更触发（仅草稿态：未建单、未检验） */
export function voidChangeTriggerApi(
  id: number,
  reason: string,
): Promise<ApiResult<unknown>> {
  return apiPost<unknown>(`${BASE}/change-triggers/${id}/void`, null, {
    params: { reason },
  })
}

/** 直接修改变更触发原记录（仅草稿态：未建单、未检验） */
export function updateChangeTriggerApi(
  id: number,
  data: CreateChangeTriggerRequest,
): Promise<ApiResult<FaiChangeTrigger>> {
  return apiPut<FaiChangeTrigger>(`${BASE}/change-triggers/${id}`, data)
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

/** 标准模板列表（按分类过滤，itemType 可空表示全部） */
export function getStandardsApi(itemType?: 'PRODUCT' | 'MATERIAL'): Promise<ApiResult<FaiStandard[]>> {
  return apiGet<FaiStandard[]>(`${BASE}/standards`, { params: itemType ? { itemType } : undefined })
}

/** 查询最新激活标准（按物料代码 + 工序） */
export function getLatestStandardApi(
  materialCode: string,
  processName: string,
): Promise<ApiResult<FaiStandard>> {
  return apiGet<FaiStandard>(`${BASE}/standards/${encodeURIComponent(materialCode)}/${encodeURIComponent(processName)}`)
}

/** 查询最新激活标准（按分类 + 代码 + 工序，区分产品/物料模板） */
export function getLatestStandardByItemApi(
  itemType: 'PRODUCT' | 'MATERIAL',
  itemCode: string,
  processName: string,
): Promise<ApiResult<FaiStandard>> {
  return apiGet<FaiStandard>(`${BASE}/standards/item`, {
    params: { itemType, itemCode, processName },
  })
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

/** 查询标准模板变更历史（P0：变更追溯） */
export function getStandardHistoryApi(id: number): Promise<ApiResult<FaiStandardHistory[]>> {
  return apiGet<FaiStandardHistory[]>(`${BASE}/standards/${id}/history`)
}

/** 提交标准变更至审批队列（P1：轻量级审批） */
export function submitForApprovalApi(data: FaiStandardSaveRequest): Promise<ApiResult<number>> {
  return apiPost<number>(`${BASE}/standards/approvals`, data)
}

/** 查询待审批列表（P1：轻量级审批） */
export function getPendingApprovalsApi(): Promise<ApiResult<FaiStandardApproval[]>> {
  return apiGet<FaiStandardApproval[]>(`${BASE}/standards/approvals`)
}

/** 审批通过（P1：轻量级审批） */
export function approveStandardApi(id: number): Promise<ApiResult<unknown>> {
  return apiPost<unknown>(`${BASE}/standards/approvals/${id}/approve`)
}

/** 驳回审批（P1：轻量级审批） */
export function rejectStandardApi(id: number, reason?: string): Promise<ApiResult<unknown>> {
  const params = reason ? `?reason=${encodeURIComponent(reason)}` : ''
  return apiPost<unknown>(`${BASE}/standards/approvals/${id}/reject${params}`)
}

/** 创建新版本（P2：版本管理） */
export function createNewVersionApi(id: number, data: FaiStandardSaveRequest): Promise<ApiResult<number>> {
  return apiPost<number>(`${BASE}/standards/${id}/version`, data)
}

/** 回滚到历史版本（P2：版本管理） */
export function rollbackToVersionApi(id: number, historyId: number): Promise<ApiResult<number>> {
  return apiPost<number>(`${BASE}/standards/${id}/rollback/${historyId}`)
}

/** 标记标准已复审（P3：定期复审提醒） */
export function markReviewedApi(id: number): Promise<ApiResult<unknown>> {
  return apiPost<unknown>(`${BASE}/standards/${id}/review`)
}

/** 查询复审逾期的标准列表（P3：定期复审提醒） */
export function getOverdueReviewsApi(): Promise<ApiResult<FaiStandard[]>> {
  return apiGet<FaiStandard[]>(`${BASE}/standards/overdue-reviews`)
}

/** 按分类 + 代码取检验标准已维护工序（去重），供变更触发下拉。
 *  itemCode 非空时仅返回该代码绑定的工序；为空时返回该分类下全部已维护工序。 */
export function getStandardProcessesApi(
  itemType: 'PRODUCT' | 'MATERIAL',
  itemCode?: string,
): Promise<ApiResult<{ processCode: string; processName: string }[]>> {
  return apiGet<{ processCode: string; processName: string }[]>(`${BASE}/standards/processes`, {
    params: { itemType, itemCode },
  })
}

/** FAI 标准参数项（SPC 数据采集专用） */
export interface FaiStandardSpcParamVO {
  /** FAI 标准参数项 ID */
  standardItemId: number
  /** SPC 参数 ID（提交子组时的 paramId） */
  spcParameterId: number
  /** 参数名称 */
  paramName: string
  /** 参数编码 */
  paramCode: string
  /** 规格上限 USL */
  upperLimit: number | null
  /** 规格下限 LSL */
  lowerLimit: number | null
  /** 目标值 */
  standardValue: string | null
  /** 单位 */
  unit: string | null
  /** 子组大小 n */
  subgroupSize: number | null
  /** 控制图类型：Xbar-R / Xbar-s */
  chartType: string | null
}

/** SPC数据采集专用：获取分类+代码+工序下 spcEnabled=是的标准参数项（含USL/LSL/目标值/子组大小/控制图类型） */
export function getStandardSpcParamsApi(
  itemType: 'PRODUCT' | 'MATERIAL',
  itemCode: string,
  processName: string,
): Promise<ApiResult<FaiStandardSpcParamVO[]>> {
  return apiGet<FaiStandardSpcParamVO[]>(`${BASE}/standards/spc-params`, {
    params: { itemType, itemCode, processName },
  })
}

// ===== SPC 联动 =====

/** SPC 调取基准数据 */
export function getSpcBaselineApi(id: number): Promise<ApiResult<FaiSpcBaselineVO[]>> {
  return apiGet<FaiSpcBaselineVO[]>(`${BASE}/spc-baseline/${id}`)
}

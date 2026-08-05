/**
 * M2 异常与整改 API 封装
 *
 * 路径前缀：/api/v1/exceptions
 * 严格对齐 ExceptionController 接口契约。
 */
import { apiGet, apiPost, apiPut, apiDelete } from './request'
import type { ApiResult, PageResult } from '@/types'
import type {
  ExceptionOrder,
  ExceptionDetailVO,
  ExceptionStats,
  ExceptionAnalysisVO,
  ExceptionListParams,
  ExceptionCloseDTO,
  EscalationCheckResultVO,
  EightDReport,
  EightDSaveDTO,
  SupplierExceptionSummary,
  AuditLog,
  CloseReadinessVO,
  QualityRuleCatalog,
  EightDStepLogVO,
} from '@/types/exception'


const BASE = '/exceptions'

/** 分页查询异常单 */
export function getExceptionListApi(
  params: ExceptionListParams,
): Promise<ApiResult<PageResult<ExceptionOrder>>> {
  return apiGet<PageResult<ExceptionOrder>>(BASE, { params })
}

/** 异常单详情（含改善措施 + 验证记录） */
export function getExceptionDetailApi(id: number): Promise<ApiResult<ExceptionDetailVO>> {
  return apiGet<ExceptionDetailVO>(`${BASE}/${id}`)
}

/** 新增异常单 */
export function createExceptionApi(data: Partial<ExceptionOrder>): Promise<ApiResult<ExceptionOrder>> {
  return apiPost<ExceptionOrder>(BASE, data)
}

/** 更新异常单 */
export function updateExceptionApi(id: number, data: Partial<ExceptionOrder>): Promise<ApiResult<void>> {
  return apiPut<void>(`${BASE}/${id}`, data)
}

/** 逻辑删除异常单 */
export function deleteExceptionApi(id: number): Promise<ApiResult<void>> {
  return apiDelete<void>(`${BASE}/${id}`)
}

/** 异常闭环 */
export function closeExceptionApi(id: number, data: ExceptionCloseDTO): Promise<ApiResult<void>> {
  return apiPost<void>(`${BASE}/${id}/close`, data)
}

/** 发起整改流程（选择 CAPA / 8D / BOTH，capaStatus 待发起→进行中） */
export function initiateProcessApi(
  id: number,
  processType: string,
): Promise<ApiResult<ExceptionOrder>> {
  return apiPost<ExceptionOrder>(`${BASE}/${id}/initiate`, null, {
    params: { processType },
  })
}

/** KPI 看板统计 */
export function getExceptionStatsApi(): Promise<ApiResult<ExceptionStats>> {
  return apiGet<ExceptionStats>(`${BASE}/stats`)
}

/** 查询开发人员确认并在系统中实际执行的来料异常规则 */
export function getQualityRuleCatalogApi(): Promise<ApiResult<QualityRuleCatalog>> {
  return apiGet<QualityRuleCatalog>(`${BASE}/rules/catalog`)
}

/** 多维度分析 */
export function getExceptionAnalysisApi(dimension: string): Promise<ApiResult<ExceptionAnalysisVO>> {
  return apiGet<ExceptionAnalysisVO>(`${BASE}/analysis`, {
    params: { dimension },
  })
}

/** 批量升级检查 */
export function checkEscalationApi(data?: {
  supplierId?: number
  daysWindow?: number
  minRepeatCount?: number
}): Promise<ApiResult<EscalationCheckResultVO>> {
  return apiPost<EscalationCheckResultVO>('/escalations/check', data)
}

/** 查询 8D 报告 */
export function getEightDApi(exceptionId: number): Promise<ApiResult<EightDReport>> {
  return apiGet<EightDReport>(`${BASE}/${exceptionId}/eight-d`)
}

/** 保存/更新 8D 报告 */
export function saveEightDApi(
  exceptionId: number,
  data: EightDSaveDTO,
): Promise<ApiResult<EightDReport>> {
  return apiPut<EightDReport>(`${BASE}/${exceptionId}/eight-d`, data)
}

/** 提交 8D 到下一步 */
export function nextStepEightDApi(exceptionId: number): Promise<ApiResult<EightDReport>> {
  return apiPost<EightDReport>(`${BASE}/${exceptionId}/eight-d/next-step`)
}

/** 查询 8D 步骤留痕 */
export function getEightDHistoryApi(exceptionId: number): Promise<ApiResult<EightDStepLogVO[]>> {
  return apiGet<EightDStepLogVO[]>(`${BASE}/${exceptionId}/eight-d/history`)
}

/** 供应商来料不良频次汇总 */
export function getSupplierExceptionSummaryApi(params?: {
  supplierId?: number
  startDate?: string
  endDate?: string
  minCount?: number
}): Promise<ApiResult<SupplierExceptionSummary[]>> {
  return apiGet<SupplierExceptionSummary[]>(`${BASE}/supplier-summary`, { params })
}

/** 审核追溯时间线（聚合异常单自身+改善措施+验证记录+8D+整改计划的审计日志） */
export function getAuditTrailApi(id: number): Promise<ApiResult<AuditLog[]>> {
  return apiGet<AuditLog[]>(`${BASE}/${id}/audit-trail`)
}

/** 闭环前置条件检查 */
export function getCloseReadinessApi(id: number): Promise<ApiResult<CloseReadinessVO>> {
  return apiGet<CloseReadinessVO>(`${BASE}/${id}/close-readiness`)
}

/** 重置异常单为最初状态（清空流程/状态，逻辑删除关联数据） */
export function resetExceptionApi(id: number): Promise<ApiResult<void>> {
  return apiPost<void>(`${BASE}/${id}/reset`)
}

/** 根据来源 ID 查找关联异常单 */
export function getExceptionBySourceIdApi(sourceId: number): Promise<ApiResult<number | null>> {
  return apiGet<number | null>(`${BASE}/by-source/${sourceId}`)
}

/** 从来料检验记录创建异常整改单 */
export function createExceptionFromInspectionApi(inspectionId: number): Promise<ApiResult<ExceptionOrder>> {
  return apiPost<ExceptionOrder>(`${BASE}/from-inspection/${inspectionId}`)
}


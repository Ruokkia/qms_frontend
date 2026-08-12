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
  ExceptionInitiateDTO,
  EightDD1TeamDTO,
  EightDD1ReviewDTO,
  ExceptionUserOptionVO,
  ExceptionSourceOptionVO,
  StageApprovalDTO,
  ExceptionApprovalConfigVO,
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

/** 异常单「选择源头记录」聚合查询（按来源类型分库模糊搜索） */
export function getSourceOptionsApi(params: {
  sourceType: string
  keyword?: string
  page?: number
  size?: number
}): Promise<ApiResult<PageResult<ExceptionSourceOptionVO>>> {
  return apiGet<PageResult<ExceptionSourceOptionVO>>(`${BASE}/source-options`, { params })
}

/** 更新异常单 */
export function updateExceptionApi(id: number, data: Partial<ExceptionOrder>): Promise<ApiResult<void>> {
  return apiPut<void>(`${BASE}/${id}`, data)
}

/** 逻辑删除异常单 */
export function deleteExceptionApi(id: number): Promise<ApiResult<void>> {
  return apiDelete<void>(`${BASE}/${id}`)
}

/** 人员选项列表（选择责任人 / 组建 8D 团队 / 指派 CAPA 负责人） */
export function getUserOptionsApi(): Promise<ApiResult<ExceptionUserOptionVO[]>> {
  return apiGet<ExceptionUserOptionVO[]>(`${BASE}/user-options`)
}

/** 异常闭环 */
export function closeExceptionApi(id: number, data: ExceptionCloseDTO): Promise<ApiResult<void>> {
  return apiPost<void>(`${BASE}/${id}/close`, data)
}

/** 发起整改流程（D0 立案 + 指派；质量部门手动选择 CAPA / 8D / BOTH） */
export function initiateProcessApi(
  id: number,
  data: ExceptionInitiateDTO,
): Promise<ApiResult<ExceptionOrder>> {
  return apiPost<ExceptionOrder>(`${BASE}/${id}/initiate`, data)
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

/** 提交 8D/CAPA 到下一步（阶段级审批拦截） */
export function nextStepEightDApi(exceptionId: number): Promise<ApiResult<EightDReport>> {
  return apiPost<EightDReport>(`${BASE}/${exceptionId}/eight-d/next-step`)
}

/** 阶段审批通过 */
export function approveStageApi(
  exceptionId: number,
  data: StageApprovalDTO,
): Promise<ApiResult<EightDReport>> {
  return apiPost<EightDReport>(`${BASE}/${exceptionId}/eight-d/approve`, data)
}

/** 阶段审批驳回（回退上一阶段重新填写） */
export function rejectStageApi(
  exceptionId: number,
  data: StageApprovalDTO,
): Promise<ApiResult<EightDReport>> {
  return apiPost<EightDReport>(`${BASE}/${exceptionId}/eight-d/reject`, data)
}

/** 查询 8D 步骤留痕 */
export function getEightDHistoryApi(exceptionId: number): Promise<ApiResult<EightDStepLogVO[]>> {
  return apiGet<EightDStepLogVO[]>(`${BASE}/${exceptionId}/eight-d/history`)
}

/** D1 团队提交（负责人自行组建团队后提交质量部审核） */
export function submitD1TeamApi(
  exceptionId: number,
  data: EightDD1TeamDTO,
): Promise<ApiResult<EightDReport>> {
  return apiPost<EightDReport>(`${BASE}/${exceptionId}/eight-d/d1/team/submit`, data)
}

/** D1 团队审核（质量部门审核团队构成） */
export function reviewD1TeamApi(
  exceptionId: number,
  data: EightDD1ReviewDTO,
): Promise<ApiResult<EightDReport>> {
  return apiPost<EightDReport>(`${BASE}/${exceptionId}/eight-d/d1/team/review`, data)
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

// ===== CAPA 相位审批（BOTH 模式专用） =====

/** CAPA 根因审批（BOTH 模式：8D D4 完成后 CAPA 质量部门审批根因分析结果） */
export function approveCapaRootCauseApi(
  id: number,
  comment: string,
): Promise<ApiResult<void>> {
  return apiPost<void>(`${BASE}/${id}/capa/approve-root-cause`, { comment })
}

/** CAPA 措施审批（BOTH 模式：8D D5 完成后 CAPA 质量部门审批措施方案） */
export function approveCapaMeasuresApi(
  id: number,
  comment: string,
): Promise<ApiResult<void>> {
  return apiPost<void>(`${BASE}/${id}/capa/approve-measures`, { comment })
}

/** 根据来源 ID 查找关联异常单 */
export function getExceptionBySourceIdApi(sourceId: number): Promise<ApiResult<number | null>> {
  return apiGet<number | null>(`${BASE}/by-source/${sourceId}`)
}

/** 从来料检验记录创建异常整改单 */
export function createExceptionFromInspectionApi(inspectionId: number): Promise<ApiResult<ExceptionOrder>> {
  return apiPost<ExceptionOrder>(`${BASE}/from-inspection/${inspectionId}`)
}

// ===== 阶段级审批配置（系统管理模块，/api/v1/admin/approval-config） =====

/** 查询某流程维度（8D / CAPA）的阶段审批配置 */
export function getApprovalConfigListApi(
  processFlow: string,
): Promise<ApiResult<ExceptionApprovalConfigVO[]>> {
  return apiGet<ExceptionApprovalConfigVO[]>(`/admin/approval-config/${processFlow}`)
}

/** 保存/更新一条阶段审批配置 */
export function saveApprovalConfigApi(
  data: Partial<ExceptionApprovalConfigVO>,
): Promise<ApiResult<void>> {
  return apiPost<void>('/admin/approval-config', data)
}

/** 删除一条阶段审批配置 */
export function deleteApprovalConfigApi(id: number): Promise<ApiResult<void>> {
  return apiDelete<void>(`/admin/approval-config/${id}`)
}


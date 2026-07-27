/**
 * M2-5 供应商升级 API 封装
 *
 * 路径前缀：/api/v1/escalations
 * 严格对齐 EscalationController 接口契约。
 */
import { apiGet, apiPost } from './request'
import type { ApiResult, PageResult } from '@/types'
import type {
  Escalation,
  EscalationListParams,
  EscalationCreateDTO,
  EscalationCheckDTO,
  EscalationCheckResultVO,
  EscalationReviewDTO,
} from '@/types/escalation'

const BASE = '/escalations'

/** 分页查询升级记录 */
export function getEscalationListApi(
  params: EscalationListParams,
): Promise<ApiResult<PageResult<Escalation>>> {
  return apiGet<PageResult<Escalation>>(BASE, { params })
}

/** 升级记录详情 */
export function getEscalationDetailApi(id: number): Promise<ApiResult<Escalation>> {
  return apiGet<Escalation>(`${BASE}/${id}`)
}

/** 发起升级 */
export function createEscalationApi(data: EscalationCreateDTO): Promise<ApiResult<Escalation>> {
  return apiPost<Escalation>(BASE, data)
}

/** 批量升级检查 */
export function checkEscalationApi(data?: EscalationCheckDTO): Promise<ApiResult<EscalationCheckResultVO>> {
  return apiPost<EscalationCheckResultVO>(`${BASE}/check`, data)
}

/** 审核自动触发的供应商升级任务 */
export function reviewEscalationApi(id: number, data: EscalationReviewDTO): Promise<ApiResult<Escalation>> {
  return apiPost<Escalation>(`${BASE}/${id}/review`, data)
}

export function submitEscalationPlanApi(id: number, data: { actionPlan: string; ownerName: string; dueDate?: string }) { return apiPost<Escalation>(`${BASE}/${id}/plan`, data) }
export function submitEscalationExecutionApi(id: number, data: { executionRecord: string }) { return apiPost<Escalation>(`${BASE}/${id}/execute`, data) }
export function submitEscalationVerificationApi(id: number, data: { result: 'PASS' | 'FAIL'; evidence: string }) { return apiPost<Escalation>(`${BASE}/${id}/verify`, data) }
export function closeEscalationApi(id: number, data: { reason: string }) { return apiPost<Escalation>(`${BASE}/${id}/close`, data) }

/**
 * M2-5 整改计划 API 封装
 *
 * 路径前缀：/api/v1/rectification-plans
 * 严格对齐 RectificationPlanController 接口契约。
 */
import { apiGet, apiPost, apiPut, apiDelete } from './request'
import type { ApiResult, PageResult } from '@/types'
import type { RectificationPlan } from '@/types/exception'

const BASE = '/rectification-plans'

/** 按异常单查询整改计划 */
export function getRectificationPlanListApi(
  exceptionId: number,
  page = 1,
  size = 100,
): Promise<ApiResult<PageResult<RectificationPlan>>> {
  return apiGet<PageResult<RectificationPlan>>(BASE, { params: { exceptionId, page, size } })
}

/** 新增整改计划 */
export function createRectificationPlanApi(
  data: Partial<RectificationPlan>,
): Promise<ApiResult<RectificationPlan>> {
  return apiPost<RectificationPlan>(BASE, data)
}

/** 更新整改计划 */
export function updateRectificationPlanApi(
  id: number,
  data: Partial<RectificationPlan>,
): Promise<ApiResult<void>> {
  return apiPut<void>(`${BASE}/${id}`, data)
}

/** 逻辑删除整改计划 */
export function deleteRectificationPlanApi(id: number): Promise<ApiResult<void>> {
  return apiDelete<void>(`${BASE}/${id}`)
}

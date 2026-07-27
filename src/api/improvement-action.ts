/**
 * M2-3 改善措施 API 封装
 *
 * 路径前缀：/api/v1/improvement-actions
 * 严格对齐 ImprovementActionController 接口契约。
 */
import { apiGet, apiPost, apiPut, apiDelete } from './request'
import type { ApiResult, PageResult } from '@/types'
import type { ImprovementAction } from '@/types/exception'

const BASE = '/improvement-actions'

/** 按异常单分页查询改善措施 */
export function getImprovementActionListApi(
  exceptionId: number,
  page = 1,
  size = 20,
): Promise<ApiResult<PageResult<ImprovementAction>>> {
  return apiGet<PageResult<ImprovementAction>>(BASE, { params: { exceptionId, page, size } })
}

/** 改善措施详情 */
export function getImprovementActionDetailApi(id: number): Promise<ApiResult<ImprovementAction>> {
  return apiGet<ImprovementAction>(`${BASE}/${id}`)
}

/** 新增改善措施 */
export function createImprovementActionApi(
  data: Partial<ImprovementAction>,
): Promise<ApiResult<ImprovementAction>> {
  return apiPost<ImprovementAction>(BASE, data)
}

/** 更新改善措施 */
export function updateImprovementActionApi(
  id: number,
  data: Partial<ImprovementAction>,
): Promise<ApiResult<void>> {
  return apiPut<void>(`${BASE}/${id}`, data)
}

/** 逻辑删除改善措施 */
export function deleteImprovementActionApi(id: number): Promise<ApiResult<void>> {
  return apiDelete<void>(`${BASE}/${id}`)
}

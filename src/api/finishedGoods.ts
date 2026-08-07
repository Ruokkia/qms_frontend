/**
 * M1 成品数据管理 API 封装
 *
 * 路径前缀：/api/v1/finished-goods
 * 严格对齐 FinishedGoodsInspectionController 接口契约。
 */
import { apiGet, apiPut, apiDelete } from './request'
import type { ApiResult, PageResult } from '@/types'
import type {
  FinishedGoodsInspection,
  FinishedGoodsListParams,
} from '@/types/finishedGoods'

const BASE = '/finished-goods'

/** 分页查询成品入库检验 */
export function getFinishedGoodsListApi(
  params: FinishedGoodsListParams,
): Promise<ApiResult<PageResult<FinishedGoodsInspection>>> {
  return apiGet<PageResult<FinishedGoodsInspection>>(BASE, { params })
}

/** 成品检验详情 */
export function getFinishedGoodsDetailApi(
  id: number,
): Promise<ApiResult<FinishedGoodsInspection>> {
  return apiGet<FinishedGoodsInspection>(`${BASE}/${id}`)
}

/** 更新成品入库检验 */
export function updateFinishedGoodsApi(
  id: number,
  data: Partial<FinishedGoodsInspection>,
): Promise<ApiResult<void>> {
  return apiPut<void>(`${BASE}/${id}`, data)
}

/** 逻辑删除成品入库检验 */
export function deleteFinishedGoodsApi(id: number): Promise<ApiResult<void>> {
  return apiDelete<void>(`${BASE}/${id}`)
}

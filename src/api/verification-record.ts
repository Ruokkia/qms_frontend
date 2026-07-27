/**
 * M2-4 验证记录 API 封装
 *
 * 路径前缀：/api/v1/verification-records
 * 严格对齐 VerificationRecordController 接口契约。
 */
import { apiGet, apiPost, apiPut, apiDelete } from './request'
import type { ApiResult, PageResult } from '@/types'
import type { VerificationRecord } from '@/types/exception'

const BASE = '/verification-records'

/** 按异常单分页查询验证记录 */
export function getVerificationRecordListApi(
  exceptionId: number,
  page = 1,
  size = 20,
): Promise<ApiResult<PageResult<VerificationRecord>>> {
  return apiGet<PageResult<VerificationRecord>>(BASE, { params: { exceptionId, page, size } })
}

/** 验证记录详情 */
export function getVerificationRecordDetailApi(id: number): Promise<ApiResult<VerificationRecord>> {
  return apiGet<VerificationRecord>(`${BASE}/${id}`)
}

/** 新增验证记录 */
export function createVerificationRecordApi(
  data: Partial<VerificationRecord>,
): Promise<ApiResult<VerificationRecord>> {
  return apiPost<VerificationRecord>(BASE, data)
}

/** 更新验证记录 */
export function updateVerificationRecordApi(
  id: number,
  data: Partial<VerificationRecord>,
): Promise<ApiResult<void>> {
  return apiPut<void>(`${BASE}/${id}`, data)
}

/** 逻辑删除验证记录 */
export function deleteVerificationRecordApi(id: number): Promise<ApiResult<void>> {
  return apiDelete<void>(`${BASE}/${id}`)
}

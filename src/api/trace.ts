/**
 * M0 追溯模块 API 封装
 *
 * 严格对齐 qms-backend/docs/api/m0-m1-m2-api.md 第一篇 m0-3 接口契约。
 * 走真实后端，不经 Mock。
 */
import axios, { type AxiosResponse } from 'axios'
import { apiGet } from './request'
import type { ApiResult } from '@/types'
import type { TraceTreeResult, TraceNodeDetail, TraceQueryParams, TraceNode } from '@/types/trace'
import { TraceDirectionEnum } from '@/enums/trace'
import { buildTraceAuthorizationHeaders } from './trace-authorization'

/** 后端原始追溯节点结构（convert 前） */
interface RawTraceNode {
  id: string | number
  nodeType: string
  barcode: string
  name: string
  productCode: string | null
  specification: string | null
  materialCode: string | null
  materialBatchNo: string | null
  plantCode?: string
  category?: string
  sonLotNo?: string | null
  children?: RawTraceNode[]
  upward?: RawTraceNode[]
}
/** 追溯 API 统一走同源代理：开发时 Vite 转发至 localhost:8080，生产时 Spring Boot 直接提供 */
const incomingTraceBase = '/api/v2/incoming-trace'
/** 按分类 + 条码查询产品/物料主数据，供 FAI 录入复用 */
export interface TraceItemInfo {
  itemCode: string
  itemName: string
  batchNo: string
}

export function getItemByBarcodeApi(
  itemType: 'PRODUCT' | 'MATERIAL',
  barcode: string,
): Promise<ApiResult<TraceItemInfo>> {
  return apiGet<TraceItemInfo>('/incoming-trace/item', {
    baseURL: '/api/v2',
    params: { itemType, barcode },
  })
}

/** 条码模糊搜索候选结果，供 FAI 标准/变更触发项选择 */
export interface TraceItemSearchResult {
  barcode: string
  itemCode: string
  itemName: string
  batchNo: string
}

export function searchItemsByBarcodeApi(
  itemType: 'PRODUCT' | 'MATERIAL',
  keyword: string,
  limit = 20,
  itemCode?: string,
): Promise<ApiResult<TraceItemSearchResult[]>> {
  return apiGet<TraceItemSearchResult[]>('/incoming-trace/search', {
    baseURL: '/api/v2',
    params: { itemType, keyword, limit, ...(itemCode ? { itemCode } : {}) },
  })
}

/** 追溯层级上限（固化基线） */
const TRACE_MAX_LEVEL = 8

/**
 * 追溯查询（统一入口）
 * @param direction forward=向下 / backward=向上 / full=双向
 * @param params nodeCode 起始节点编码，maxLevel 最大层级
 */
export function traceQueryApi(
  direction: TraceDirectionEnum,
  params: TraceQueryParams,
): Promise<ApiResult<TraceTreeResult>> {
  const directionMap: Record<TraceDirectionEnum, string> = {
    [TraceDirectionEnum.FORWARD]: 'DOWN', [TraceDirectionEnum.BACKWARD]: 'UP', [TraceDirectionEnum.FULL]: 'FULL', [TraceDirectionEnum.BATCH_IMPACT]: 'BATCH_IMPACT',
  }
  return axios.get(`${incomingTraceBase}/tree`, {
    params: { rootBarcode: params.nodeCode, direction: directionMap[direction] },
    headers: buildTraceAuthorizationHeaders(
      sessionStorage.getItem('qms_token'),
      sessionStorage.getItem('qms_region'),
    ),
  }).then((response: AxiosResponse<ApiResult<{ root: RawTraceNode; direction: string; visitedNodes: number; summary: Record<string, number> }>>) => {
    const data = response.data.data!
    const convert = (n: RawTraceNode): TraceNode => ({ id: n.id, nodeType: n.nodeType, nodeCode: n.barcode, name: n.name, productCode: n.productCode ?? undefined, specification: n.specification ?? undefined, materialCode: n.materialCode ?? undefined, materialBatchNo: n.materialBatchNo ?? undefined, parentId: null, children: (n.children || []).map(convert), batchInfo: n.materialBatchNo ? { batchNo: n.materialBatchNo, materialCode: n.materialCode ?? undefined, materialName: n.name } : null })
    const rootNode = convert(data.root)
    const upward = data.root?.upward ? data.root.upward.map(convert) : undefined
    return { code: 0, message: 'success', data: { rootNode, children: rootNode.children || [], upward, stats: { totalNodes: data.visitedNodes || 1, maxDepth: 8, levelCap: 8, batchCount: data.summary?.materialBatches || 0, supplierCount: 0 } } } as ApiResult<TraceTreeResult>
  })
}

/** 节点详情（含批次信息）— 需传 type 参数（fg=成品表, mi=物料表）；sonLotNo 为半成品子项批号（可选） */
export function getTraceNodeDetailApi(
  id: string | number,
  type: 'fg' | 'mi',
  sonLotNo?: string
): Promise<ApiResult<TraceNodeDetail>> {
  return axios.get(`${incomingTraceBase}/nodes/${id}`, {
    params: { type, sonLotNo },
    headers: buildTraceAuthorizationHeaders(
      sessionStorage.getItem('qms_token'),
      sessionStorage.getItem('qms_region'),
    ),
  }).then((response: AxiosResponse<ApiResult<RawTraceNode>>) => {
    const raw = response.data.data!
    const convert = (n: RawTraceNode): TraceNode => ({ id: n.id, nodeType: n.nodeType, nodeCode: n.barcode, name: n.name, productCode: n.productCode ?? undefined, specification: n.specification ?? undefined, materialCode: n.materialCode ?? undefined, materialBatchNo: n.materialBatchNo ?? undefined, parentId: null, sonLotNo: n.sonLotNo ?? undefined, children: (n.children || []).map(convert), batchInfo: n.materialBatchNo ? { batchNo: n.materialBatchNo, materialCode: n.materialCode ?? undefined, materialName: n.name } : null })
    const detail = convert(raw)
    return { code: 0, message: 'success', data: { detail, children: detail.children || [] } } as ApiResult<TraceNodeDetail>
  })
}

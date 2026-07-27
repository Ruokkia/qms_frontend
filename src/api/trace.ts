/**
 * M0 追溯模块 API 封装
 *
 * 严格对齐 qms-backend/docs/api/m0-m1-m2-api.md 第一篇 m0-3 接口契约。
 * 走真实后端，不经 Mock。
 */
import axios from 'axios'
import type { ApiResult } from '@/types'
import type { TraceTreeResult, TraceNodeDetail, TraceQueryParams } from '@/types/trace'
import { TraceDirectionEnum } from '@/enums/trace'

/** 追溯 API 统一走同源代理：开发时 Vite 转发至 localhost:8080，生产时 Spring Boot 直接提供 */
const incomingTraceBase = '/api/v2/incoming-trace'

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
    headers: { Authorization: `Bearer ${sessionStorage.getItem('qms_token') || ''}` },
  }).then((response: any) => {
    const data = response.data.data
    const convert = (n: any): any => ({ id: n.id, nodeType: n.nodeType, nodeCode: n.barcode, name: n.name, productCode: n.productCode, specification: n.specification, materialCode: n.materialCode, materialBatchNo: n.materialBatchNo, children: (n.children || []).map(convert), batchInfo: n.materialBatchNo ? { batchNo: n.materialBatchNo, materialCode: n.materialCode, materialName: n.name } : null })
    const rootNode = convert(data.root)
    const upward = (data.upward || data.root?.upward) ? (data.upward || data.root?.upward).map(convert) : undefined
    return { code: 0, message: 'success', data: { rootNode, children: rootNode.children || [], upward, stats: { totalNodes: data.visitedNodes || 1, maxDepth: 8, levelCap: 8, batchCount: data.summary.materialBatches || 0, supplierCount: 0 } } } as ApiResult<TraceTreeResult>
  })
/*
  const pathMap: Record<TraceDirectionEnum, string> = {
    [TraceDirectionEnum.FORWARD]: '/trace/forward',
    [TraceDirectionEnum.BACKWARD]: '/trace/backward',
    [TraceDirectionEnum.FULL]: '/trace/full',
  }
  return apiGet<TraceTreeResult>(pathMap[direction], {
    params: {
      nodeCode: params.nodeCode,
      maxLevel: params.maxLevel ?? TRACE_MAX_LEVEL,
    },
  })
*/
}

/** 节点详情（含批次信息、父子节点、IQC检验明细） */
export function getTraceNodeDetailApi(id: number): Promise<ApiResult<TraceNodeDetail>> {
  return axios.get(`${incomingTraceBase}/nodes/${id}`, {
    headers: { Authorization: `Bearer ${sessionStorage.getItem('qms_token') || ''}` },
  }).then((response: any) => {
    const data = response.data.data
    const convert = (n: any): any => ({ id: n.id, nodeType: n.nodeType, nodeCode: n.barcode, name: n.name, productCode: n.productCode, specification: n.specification, materialCode: n.materialCode, materialBatchNo: n.materialBatchNo, children: (n.children || []).map(convert), batchInfo: n.materialBatchNo ? { batchNo: n.materialBatchNo, materialCode: n.materialCode, materialName: n.name } : null })
    return { code: 0, message: 'success', data: { detail: convert(data), parents: (data.parents || []).map(convert), children: (data.children || []).map(convert) } } as ApiResult<TraceNodeDetail>
  })
}

/** 快捷绑定：将来料检验记录与成品检验记录关联到追溯图 */
export function bindMaterialToFinishedGoodsApi(
  materialInspectionId: number,
  finishedGoodsInspectionId: number,
): Promise<ApiResult<{
  bound: boolean
  message: string
  finishedGoodsNodeId: number
  finishedGoodsSn: string
  finishedGoodsName: string
  materialNodeId: number
  materialBatchNo: string
  materialName: string
  relationParentId: number
  relationChildId: number
}>> {
  return axios.post(`${incomingTraceBase}/bind`, {
    materialInspectionId,
    finishedGoodsInspectionId,
  }, {
    headers: { Authorization: `Bearer ${sessionStorage.getItem('qms_token') || ''}` },
  }).then(r => r.data)
}

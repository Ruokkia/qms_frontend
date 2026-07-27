/**
 * M0 追溯模块类型定义
 *
 * 严格对齐 qms-backend/docs/api/m0-m1-m2-api.md 第一篇 m0-2/m0-3 接口契约。
 * 字段命名与后端 VO camelCase 一致；不做前端自创字段。
 */
import type { NodeTypeEnum, IqcStatusEnum, InspectionResultEnum } from '@/enums/trace'

/** 追溯节点（对齐 m0-2 响应） */
export interface TraceNode {
  /** 节点ID */
  id: number
  /** 节点类型：SN/部件/关键物料/非关键物料/来料批次/生产批次 */
  nodeType: string
  /** 节点编码（SN或物料码，唯一） */
  nodeCode: string
  /** Human-readable name of the finished good, semi-finished good, or material. */
  name?: string
  /** 成品/半成品料号 */
  productCode?: string
  /** 规格型号 */
  specification?: string
  /** 物料代码（MATERIAL 类型专用） */
  materialCode?: string
  /** 物料批号（MATERIAL 类型专用） */
  materialBatchNo?: string
  /** 直接父级ID（NULL=根节点） */
  parentId: number | null
  /** 父级编码（连表填充，便于前端展示） */
  parentCode?: string | null
  /** 关联批次ID */
  batchId?: number | null
  /** 该节点用量（支持 1:N 配比） */
  qtyUsed?: number | null
  /** 关联工单ID */
  workOrderId?: number | null
  /** 分公司编码 */
  plantCode?: string
  /** 层级（根=1） */
  level?: number
  /** 完整路径（如 SN001 > M001 > MC-001） */
  path?: string
  /** 关联批次信息（树查询时填充） */
  batchInfo?: TraceBatchInfo | null
  /** 子节点（树结构） */
  children?: TraceNode[]
}

/** 追溯节点关联的批次信息（对齐 m0-3 树节点 batchInfo） */
export interface TraceBatchInfo {
  /** 批次号 */
  batchNo: string
  /** 供应商名称 */
  supplierName?: string
  /** 供应商编号 */
  supplierCode?: string
  /** 物料编码 */
  materialCode?: string
  /** 物料名称 */
  materialName?: string
  /** 规格型号 */
  specModel?: string
  /** IQC 检验状态：待检/在检/已检/异常 */
  iqcStatus?: string
  /** 检验结果：合格/不合格 */
  inspectionResult?: string
  /** 来料日期 */
  arrivalDate?: string
  /** 数量 */
  qty?: number
  /** 不合格描述 */
  defectDesc?: string
}

/** 追溯查询响应（对齐 m0-3，树形结构） */
export interface TraceTreeResult {
  /** 起始节点（根） */
  rootNode: TraceNode
  /** 子节点树（向下追溯时填充） */
  children: TraceNode[]
  /** 向上链（双向/向上追溯时填充，按起点→顶层顺序） */
  upward?: TraceNode[]
  /** 追溯统计 */
  stats: TraceStats
}

/** 追溯统计 */
export interface TraceStats {
  /** 总节点数 */
  totalNodes: number
  /** 最大层级 */
  maxDepth: number
  /** 层级上限（8） */
  levelCap: number
  /** 涉及批次数 */
  batchCount: number
  /** 涉及供应商数 */
  supplierCount: number
}

/** 追溯节点详情（对齐 m0-2 GET /{id} + 节点详情下钻） */
export interface TraceNodeDetail {
  /** 节点详情 */
  detail: TraceNode
  /** 关联批次信息 */
  batchInfo?: TraceBatchInfo | null
  /** 父节点（若有） */
  parent?: TraceNode | null
  /** 直接子节点列表 */
  children: TraceNode[]
  /** IQC 检验明细（若有批次关联） */
  inspections?: TraceInspectionItem[]
}

/** IQC 检验明细项 */
export interface TraceInspectionItem {
  id: number
  /** 检验项 */
  item: string
  /** 规格要求 */
  spec: string
  /** 实测值 */
  measured: string
  /** 判定：合格/不合格 */
  judgment: string
  /** 检验员 */
  inspector: string
  /** 检验时间 */
  time: string
}

/** 追溯查询参数 */
export interface TraceQueryParams {
  /** 起始节点编码（SN/物料码/批次号） */
  nodeCode: string
  /** 最大层级（默认8，上限8） */
  maxLevel?: number
}

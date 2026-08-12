/**
 * M4 SPC 过程能力分析 类型定义
 * 严格对齐后端 com.kangli.qms.dto / entity（qms.spc_* 表）。
 */

/** 工序定义 */
export interface SpcProcess {
  id: number
  processCode: string
  processName: string
  description?: string
  sortOrder?: number
  isActive?: string
  changeRemark?: string
  plantCode: string
  plantName: string
  version?: number
  /** 该工序关联到的 FAI 检验标准数（按 processCode+plantCode 关联，is_deleted=0）；>0 则工序不可删 */
  linkedStandardCount?: number
}

/** 关键参数定义（完整字段；字典层表单仅编辑基础字段，USL/LSL/n/控制图归标准层） */
export interface SpcParameter {
  id: number
  processId: number
  paramCode: string
  paramName: string
  paramType?: string
  unit?: string
  upperSpecLimit?: number | null
  lowerSpecLimit?: number | null
  targetValue?: number | null
  subgroupSize: number
  chartType: string // 'Xbar-R' | 'Xbar-s'
  isActive?: string
  decimalPlaces?: number
  isCritical?: string
  changeRemark?: string
  plantCode: string
  plantName: string
  version?: number
  /** 该参数下已录入的子组数量（批量查询时返回，用于删除守卫：>0 则不可删） */
  subgroupCount?: number
  /** 该参数被 FAI 检验标准引用的次数（批量查询时返回，用于删除守卫：>0 则不可删） */
  faiReferenceCount?: number
}

/** 采样明细 */
export interface SpcSample {
  id: number
  subgroupId: number
  sampleNo: number
  sampleValue: number
  /** 样本对应条码（SN 级追溯标识，可空） */
  barcode?: string | null
}

/** 子组（含样本明细） */
export interface SpcSubgroup {
  id: number
  paramId: number
  subgroupNo: string
  sampleCount: number
  meanValue: number
  rangeValue: number
  stdDev: number
  sampleTime?: string
  sourceType?: string
  faiRecordId?: number | null
  workOrderNo?: string
  batchNo?: string
  materialCode?: string
  materialName?: string
  /** 分类：PRODUCT(产品) / MATERIAL(物料) */
  itemType?: 'PRODUCT' | 'MATERIAL'
  /** 产品/物料代码（随 itemType 取值，控制图关联维度） */
  itemCode?: string
  /** 关联工序 spc_process.id（由后端按 paramId 反查填充，用于 FAI 联动按工序定位） */
  processId?: number
  processCode?: string
  subgroupStatus?: '待补样本' | '已完成'
  plantCode: string
  plantName: string
  samples?: SpcSample[]
}

/** 控制图单点 */
export interface SpcChartPoint {
  subgroupNo: string
  /** 子组主键 id（点击数据点溯源用） */
  subgroupId?: number
  /** 分类：PRODUCT(产品) / MATERIAL(物料) */
  itemType?: 'PRODUCT' | 'MATERIAL'
  /** 产品/物料代码（随 itemType 取值，控制图关联维度） */
  itemCode?: string
  /** 来源批次号（子组级，悬停展示） */
  batchNo?: string
  x: number
  r?: number | null
  s?: number | null
  /** 样本明细（含条码，用于悬停展示） */
  samples?: SpcSample[]
}

/** 控制图数据响应 */
export interface SpcChartData {
  paramId: number
  paramCode?: string
  paramName?: string
  chartType?: string
  points: SpcChartPoint[]
  xbarUcl?: number | null
  xbarCl?: number | null
  xbarLcl?: number | null
  rUcl?: number | null
  rCl?: number | null
  rLcl?: number | null
  sUcl?: number | null
  sCl?: number | null
  sLcl?: number | null
  /** 当前可用的批次列表（去重，用于前端批次筛选下拉） */
  availableBatches?: string[]
  /** 过程能力指数 */
  cp?: number
  cpk?: number
  pp?: number
  ppk?: number
  sigmaWithin?: number
  sigmaOverall?: number

  // ─── 规格限（从 FAI 检验标准层解析，非参数字典回填；未选产品/物料时为 null） ───
  /** 规格上限 USL */
  upperSpecLimit?: number | null
  /** 规格下限 LSL */
  lowerSpecLimit?: number | null
  /** 目标值 */
  targetValue?: number | null
  /** 子组大小 n */
  subgroupSize?: number | null
}

/** 过程能力指数响应 */
export interface SpcCapabilityResult {
  paramId: number
  cp?: number | null
  cpk?: number | null
  pp?: number | null
  ppk?: number | null
  cpu?: number | null
  cpl?: number | null
  sampleCount?: number | null
  subgroupCount?: number | null
  judgment?: string | null

  // ─── 规格限（从 FAI 检验标准层解析，非参数字典回填；未选产品/物料时为 null） ───
  /** 规格上限 USL */
  upperSpecLimit?: number | null
  /** 规格下限 LSL */
  lowerSpecLimit?: number | null
  /** 目标值 */
  targetValue?: number | null
  /** 子组大小 n */
  subgroupSize?: number | null
}

/** 可联动首件记录 */
export interface SpcFaiRecord {
  id: number
  faiNo: string
  materialName?: string
  batchNo?: string
  processName?: string
  createdAt?: string
  plantCode: string
  plantName: string
}

/** 工序创建/更新请求 */
export interface SpcProcessRequest {
  processCode: string
  processName: string
  description?: string
  sortOrder?: number
  isActive?: string
  changeRemark?: string
  version?: number
}

/** 参数创建/更新请求（字典层） */
export interface SpcParameterRequest {
  processId: number
  paramCode: string
  paramName: string
  paramType?: string
  unit?: string
  isActive?: string
  decimalPlaces?: number
  isCritical?: string
  changeRemark?: string
  version?: number
}

/** 子组保存请求（手动录入） */
export interface SpcSubgroupSaveRequest {
  paramId: number
  sampleValues: number[]
  sourceType?: string
  /** 分类：PRODUCT(产品) / MATERIAL(物料) */
  itemType?: 'PRODUCT' | 'MATERIAL'
  /** 产品/物料代码（随 itemType 取值，控制图关联维度） */
  itemCode?: string
  /** 批次号（手动录入时可填写） */
  batchNo?: string
  /** 条码（追溯标识，手动录入时必填） */
  barcode?: string
  /** 产品/物料名称（手动录入时可填写） */
  materialName?: string
}

/** 首件导入请求 */
export interface SpcSubgroupFromFaiRequest {
  faiRecordId: number
  paramId: number
}

/** 列表查询参数 */
export interface SpcQuery {
  processId?: number
  paramId?: number
  page?: number
  size?: number
}

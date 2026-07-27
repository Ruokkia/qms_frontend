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
  plantCode: string
  plantName: string
}

/** 关键参数定义 */
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
  plantCode: string
  plantName: string
}

/** 采样明细 */
export interface SpcSample {
  id: number
  subgroupId: number
  sampleNo: number
  sampleValue: number
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
  processCode?: string
  subgroupStatus?: '待补样本' | '已完成'
  plantCode: string
  plantName: string
  samples?: SpcSample[]
}

/** 控制图单点 */
export interface SpcChartPoint {
  subgroupNo: string
  x: number
  r?: number | null
  s?: number | null
  samples?: number[]
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
  version?: number
}

/** 参数创建/更新请求 */
export interface SpcParameterRequest {
  processId: number
  paramCode: string
  paramName: string
  paramType?: string
  unit?: string
  upperSpecLimit?: number | null
  lowerSpecLimit?: number | null
  targetValue?: number | null
  subgroupSize: number
  chartType: string
  isActive?: string
  version?: number
}

/** 子组保存请求（手动录入） */
export interface SpcSubgroupSaveRequest {
  paramId: number
  sampleValues: number[]
  sourceType?: string
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

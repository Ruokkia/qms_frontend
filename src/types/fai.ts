/**
 * M3 首件检验管理 类型定义
 * 对齐后端 com.kangli.qms.dto / entity（qms.fai_* 表）。
 */

/** 变更触发记录 */
export interface FaiChangeTrigger {
  id: number
  triggerType: string
  workOrderNo?: string
  materialCode?: string
  materialName?: string
  batchNo?: string
  processName?: string
  processCode?: string
  triggerReason?: string
  status: string
  remark?: string
  plantCode?: string
  plantName?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
  hasInspection?: boolean
}

/** 首件检验主记录 */
export interface FaiInspectionRecord {
  id: number
  faiNo: string
  changeTriggerId?: number
  materialCode?: string
  materialName?: string
  batchNo?: string
  processName?: string
  processCode?: string
  workOrderNo?: string
  inspectionResult: string
  signatureStatus: string
  remark?: string
  plantCode?: string
  plantName?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

/** 首件检验参数明细 */
export interface FaiInspectionItem {
  id: number
  faiRecordId: number
  /** 关联标准参数项ID（用于标准值同步追踪） */
  standardItemId?: number
  paramName?: string
  paramCode?: string
  /** 参数类别：AQL/关键尺寸/性能参数（复制自标准模板） */
  paramCategory?: string
  standardValue?: string
  upperLimit?: number
  lowerLimit?: number
  actualValue?: number
  unit?: string
  result: string
  sortOrder?: number
  /** 首件签名后是否自动同步到 SPC */
  spcEnabled?: string
  spcParameterId?: number
  isRequired?: string
  /** 最新标准值（当前激活标准中的值，用于对比提示） */
  latestStandardValue?: string
  /** 最新上限 */
  latestUpperLimit?: number
  /** 最新下限 */
  latestLowerLimit?: number
  /** 最新单位 */
  latestUnit?: string
  /** 标准是否已变更（任一值不一致即 true） */
  hasStandardChanged?: boolean
  plantCode?: string
  plantName?: string
  createdAt?: string
  updatedAt?: string
}

/** 电子签名 */
export interface FaiSignature {
  id: number
  faiRecordId: number
  signerId: string
  signerName?: string
  signType: string
  signatureHash?: string
  signedAt?: string
  signReason?: string
  plantCode?: string
  plantName?: string
  createdAt?: string
  updatedAt?: string
}

/** 参数类别：AQL / 关键尺寸 / 性能参数 */
export type FaiStandardCategory = 'AQL' | '关键尺寸' | '性能参数'

/** 标准模板参数项 */
export interface FaiStandardItem {
  id: number
  standardId: number
  paramName?: string
  paramCode?: string
  /** 参数类别：AQL/关键尺寸/性能参数 */
  paramCategory?: FaiStandardCategory
  standardValue?: string
  upperLimit?: number
  lowerLimit?: number
  unit?: string
  isRequired?: string
  sortOrder?: number
  /** 首件签名后是否自动同步到 SPC */
  spcEnabled?: string
  spcParameterId?: number
}

/** 标准模板主表 */
export interface FaiStandard {
  id: number
  materialCode: string
  /** 物料名称（冗余，便于展示） */
  materialName?: string
  processName: string
  processCode?: string
  stdVersion: number
  isActive: string
  remark?: string
  items?: FaiStandardItem[]
}

/** 首件检验详情响应（含参数明细 + 签名） */
export interface FaiInspectionRecordResponse extends FaiInspectionRecord {
  items?: FaiInspectionItem[]
  signatures?: FaiSignature[]
}

/** 首件检验报告响应 */
export interface FaiReportResponse extends FaiInspectionRecord {
  items?: FaiInspectionItem[]
  signatures?: FaiSignature[]
  totalCount?: number
  qualifiedCount?: number
  unqualifiedCount?: number
  passRate?: number
}

/** SPC 调取基准数据 */
export interface FaiSpcBaselineVO {
  subgroupNo?: string
  paramCode?: string
  paramName?: string
  value?: number
  sampleTime?: string
  plantCode?: string
}

// ===== 请求类型 =====

export interface CreateChangeTriggerRequest {
  triggerType: string
  workOrderNo?: string
  materialCode?: string
  materialName?: string
  batchNo?: string
  processName?: string
  processCode?: string
  triggerReason?: string
  remark?: string
}

export interface CreateInspectionRequest {
  changeTriggerId: number
}

export interface FaiItemValue {
  id: number
  actualValue?: number
}

export interface FaiItemValueRequest {
  faiRecordId: number
  items: FaiItemValue[]
}

export interface FaiSignatureRequest {
  faiRecordId: number
  signerId: string
  signerName?: string
  signType: string
  signReason: string
  password?: string
}

export interface FaiQuery {
  page?: number
  size?: number
  faiNo?: string
  batchNo?: string
  materialName?: string
  inspectionResult?: string
}

export interface ChangeTriggerQuery {
  page?: number
  size?: number
  triggerType?: string
  materialCode?: string
  batchNo?: string
  status?: string
}

// ===== 标准模板 维护（手动设置物料/工序标准） =====

/** 标准模板参数项 请求（新增/编辑，可只传可编辑字段） */
export interface FaiStandardItemRequest {
  id?: number
  paramName?: string
  paramCode?: string
  paramCategory?: FaiStandardCategory
  standardValue?: string
  upperLimit?: number
  lowerLimit?: number
  unit?: string
  isRequired?: string
  sortOrder?: number
  /** 首件签名后是否自动同步到 SPC */
  spcEnabled?: string
  spcParameterId?: number
}

/** 标准模板 保存请求 */
export interface FaiStandardSaveRequest {
  materialCode: string
  materialName?: string
  processName: string
  processCode?: string
  stdVersion?: number
  isActive?: string
  remark?: string
  items: FaiStandardItemRequest[]
}

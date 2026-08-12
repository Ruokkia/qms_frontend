/**
 * M3 首件检验管理 类型定义
 * 对齐后端 com.kangli.qms.dto / entity（qms.fai_* 表）。
 */

/** 变更触发记录 */
export interface FaiChangeTrigger {
  id: number
  triggerType: string
  /** 分类：PRODUCT(产品) / MATERIAL(物料) */
  itemType?: 'PRODUCT' | 'MATERIAL'
  /** 产品/物料代码（随 itemType 取值） */
  itemCode?: string
  /** 产品/物料名称（随 itemType 取值） */
  itemName?: string
  /** 产品/物料条码（随 itemType 取值） */
  itemBarcode?: string
  /** 物料代码（冗余兼容列） */
  materialCode?: string
  /** 物料名称（冗余兼容列） */
  materialName?: string
  batchNo?: string
  processName?: string
  processCode?: string
  triggerReason?: string
  status: string
  remark?: string
  /** 作废原因（仅 status=已作废 时有值） */
  voidReason?: string
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
  /** 分类：PRODUCT(产品) / MATERIAL(物料) */
  itemType?: 'PRODUCT' | 'MATERIAL'
  /** 产品/物料代码（随 itemType 取值） */
  itemCode?: string
  /** 产品/物料名称（随 itemType 取值） */
  itemName?: string
  /** 产品/物料条码（追溯标识，从变更触发复制） */
  itemBarcode?: string
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
  /** 目标值（物料-工序专属标准，非参数字典回填） */
  targetValue?: number
  /** SPC 子组大小 n（物料-工序专属标准） */
  subgroupSize?: number
  /** SPC 控制图类型：Xbar-R / Xbar-S / I-MR（物料-工序专属标准） */
  chartType?: string
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
  /** 分类：PRODUCT(产品) / MATERIAL(物料) */
  itemType?: 'PRODUCT' | 'MATERIAL'
  /** 产品/物料条码（追溯标识） */
  itemBarcode?: string
  /** 产品/物料代码（随 itemType 取值） */
  itemCode?: string
  /** 产品/物料名称（随 itemType 取值） */
  itemName?: string
  processName: string
  processCode?: string
  stdVersion: number
  isActive: string
  remark?: string
  /** 生效日期（ECN 变更/药监审计） */
  effectiveDate?: string
  /** 变更备注（ECN 变更/药监审计） */
  changeRemark?: string
  items?: FaiStandardItem[]
  /** 最近复审时间（P3：定期复审提醒） */
  lastReviewedAt?: string
  /** 复审间隔天数（P3：定期复审提醒） */
  reviewIntervalDays?: number
  /** 引用状态（0=未引用，1=已引用）（P3：执行情况统计） */
  usageStatus?: number
  /** 最近引用时间（P3：执行情况统计） */
  lastUsedAt?: string
  /** 是否复审逾期（前端计算或后端返回） */
  reviewOverdue?: boolean
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
  /** 分类：PRODUCT(产品) / MATERIAL(物料) */
  itemType: 'PRODUCT' | 'MATERIAL'
  itemCode?: string
  itemName?: string
  itemBarcode?: string
  /** 物料代码（冗余兼容列） */
  materialCode?: string
  /** 物料名称（冗余兼容列） */
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
  /** 分类过滤：PRODUCT(产品) / MATERIAL(物料)，随分类选择器切换 */
  itemType?: 'PRODUCT' | 'MATERIAL'
  inspectionResult?: string
  /** 电子签名状态精确过滤：未签/已签 */
  signatureStatus?: string
  /** 档案模式：true 时服务端强制仅返回已签记录（不合格亦可进档案，未签不进档案；历史报告档案专用） */
  archiveOnly?: boolean
}

export interface ChangeTriggerQuery {
  page?: number
  size?: number
  triggerType?: string
  materialCode?: string
  batchNo?: string
  status?: string
  /** 分类：PRODUCT(产品) / MATERIAL(物料) */
  itemType?: string
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
  /** 目标值（物料-工序专属标准） */
  targetValue?: number
  /** SPC 子组大小 n（物料-工序专属标准） */
  subgroupSize?: number
  /** SPC 控制图类型：Xbar-R / Xbar-S / I-MR（物料-工序专属标准） */
  chartType?: string
  unit?: string
  isRequired?: string
  sortOrder?: number
  /** 首件签名后是否自动同步到 SPC */
  spcEnabled?: string
  spcParameterId?: number
}

/** 标准模板 保存请求 */
export interface FaiStandardSaveRequest {
  /** 编辑时必填，新建时不填 */
  id?: number
  materialCode: string
  materialName?: string
  /** 分类：PRODUCT(产品) / MATERIAL(物料) */
  itemType: 'PRODUCT' | 'MATERIAL'
  /** 产品/物料条码（追溯标识） */
  itemBarcode?: string
  itemCode?: string
  itemName?: string
  processName: string
  processCode?: string
  stdVersion?: number
  isActive?: string
  remark?: string
  /** 生效日期（ECN 变更/药监审计，格式 yyyy-MM-dd） */
  effectiveDate?: string
  /** 变更备注（ECN 变更/药监审计） */
  changeRemark?: string
  items: FaiStandardItemRequest[]
}

/** 标准变更历史记录（P0：变更追溯） */
export interface FaiStandardHistory {
  id: number
  standardId: number
  /** CREATE / UPDATE / DELETE */
  changeType: string
  /** 操作人填写的变更原因 */
  changeReason?: string
  /** 变更前快照 JSON（标准 + 参数项），CREATE 时为 null */
  beforeSnapshot?: string
  /** 变更后快照 JSON（标准 + 参数项），DELETE 时为 null */
  afterSnapshot?: string
  /** 自动生成的差异摘要 */
  diffSummary?: string
  /** 操作人 */
  changedBy?: string
  /** 操作时间 */
  changedAt?: string
  plantCode?: string
  plantName?: string
}

/** 标准审批记录（P1：轻量级审批） */
export interface FaiStandardApproval {
  id: number
  standardId?: number
  /** CREATE / UPDATE / DELETE */
  approvalType: string
  /** 待审批的请求数据（JSON 字符串，可解析为 FaiStandardSaveRequest） */
  requestData: string
  requester: string
  requestedAt: string
  approver?: string
  approvedAt?: string
  /** PENDING / APPROVED / REJECTED */
  approvalStatus: string
  rejectReason?: string
  applied: boolean
  remark?: string
  plantCode?: string
  plantName?: string
}

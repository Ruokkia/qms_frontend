/**
 * M1 成品数据管理类型定义
 *
 * 严格对齐 qms-backend FinishedGoodsInspection 实体。
 * 字段命名与后端 camelCase 一致。
 */
import type { PageParams } from '@/types'

/** 成品入库检验审核记录（对齐 qms.finished_goods_inspection 表） */
export interface FinishedGoodsInspection {
  id: number
  /** 是否加急：是/否 */
  isUrgent?: string
  /** 品管审核：待审核/已审核/驳回 */
  qcReview?: string
  /** 管代批准：待审核/已审核/驳回 */
  mgrApproval?: string
  /** 是否有效：是/否 */
  isValid?: string
  /** 检验结果：合格/不合格 */
  inspectionResult?: string
  /** 报告编号（唯一） */
  reportNo?: string
  /** 送检单号 */
  inspectionRequestNo?: string
  /** 生产订单号 */
  productionOrderNo?: string
  /** 物料编码 */
  materialCode?: string
  /** 产品名称 */
  productName?: string
  /** 型号规格 */
  modelSpec?: string
  /** 生产批号或产品编号 */
  prodBatchOrSn?: string
  /** 生产日期 */
  productionDate?: string
  /** 有效期至 */
  expiryDate?: string
  /** 送检数量 */
  submittedQty?: number
  /** 检验数量 */
  inspectedQty?: number
  /** 合格数量 */
  qualifiedQty?: number
  /** 不合格数量 */
  unqualifiedQty?: number
  /** 单位 */
  unit?: string
  /** 检验名字 */
  inspectorName?: string
  /** 分类 */
  category?: string
  /** 品管复核人 */
  qcReviewer?: string
  /** 品管复核时间 */
  qcReviewTime?: string
  /** 管代 */
  mgrRepresentative?: string
  /** 管代批准时间 */
  mgrApprovalTime?: string
  /** 是否委托：是/否 */
  isEntrusted?: string
  /** 药监批号 */
  drugRegNo?: string
  /** 性能检验方式 */
  perfTestMethod?: string
  /** 性能抽检批次编号 */
  perfSampleBatchNo?: string
  /** 电子签名人 */
  signatureUser?: string
  /** 电子签名时间 */
  signatureTime?: string
  /** 电子签名原因 */
  signatureReason?: string
  /** 分公司编码 */
  plantCode?: string
  /** 分公司名称 */
  plantName?: string
  /** 创建人 */
  createdBy?: string
  /** 更新人 */
  updatedBy?: string
  /** 创建时间 */
  createdAt?: string
  /** 更新时间 */
  updatedAt?: string
}

/** 成品检验列表查询参数 */
export interface FinishedGoodsListParams extends PageParams {
  keyword?: string
  category?: string
  inspectionResult?: string
  /** 检验结果自定义关键字（模糊搜索） */
  inspectionResultLike?: string
  qcReview?: string
  mgrApproval?: string
  dateField?: string

  startDate?: string

  endDate?: string
  pageSize?: number
}

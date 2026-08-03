/**
 * M1 来料数据管理类型定义
 *
 * 严格对齐 qms-backend MaterialInspectionController + MaterialInspectionStatsVO。
 * 字段命名与后端 camelCase 一致；不做前端自创字段。
 */
import type { PageParams } from '@/types'

/** 物料检验记录（对齐 qms.material_inspection 表） */
export interface MaterialInspection {
  id: number
  recordNo: string
  processNo?: string
  formVersion?: string
  isCustomerSupplied?: string
  memo?: string
  materialCategory?: string
  isValid?: string
  reviewStatus: string
  signatureStatus?: string
  isUrgent?: string
  dataRecordFlag?: string
  isInvalid?: string
  reportGenerated?: string
  purchaseOrder?: string
  inboundNo?: string
  inspectionRequestNo?: string
  mesInspectionNo?: string
  inspectionDate: string
  judgementDate?: string
  inspector?: string
  inspectionResult: string
  supplierName?: string
  supplierCode?: string
  materialCode?: string
  /** 仅列表展示：关联关键物料绑定清单得到的物料条码。 */
  materialBarcode?: string
  materialName?: string
  specModel?: string
  materialBatchNo?: string
  qualifiedQty?: number
  unqualifiedQty?: number
  submittedQty?: number
  lossQty?: number
  unit?: string
  defectDesc?: string
  handlingMethod?: string
  unqualifiedFinalStatus?: string
  unqualifiedReview?: string
  unqualifiedReviewNo?: string
  inspectionCategory?: string
  arrivalDate?: string
  receivingNo?: string
  poLineNo?: string
  receivingLineNo?: string
  shelfLifeDays?: number
  reinspectRemark?: string
  judge?: string
  inspectionEndDate?: string
  reviewer?: string
  reviewDate?: string
  submitter?: string
  submitDate?: string
  remark?: string
  extId?: string
  lastModifiedBy?: string
  signatureUser?: string
  signatureTime?: string
  signatureReason?: string
  plantCode?: string
  plantName?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

/** 高频不合格描述项 */
export interface DefectDescItem {
  defectDesc: string
  count: number
}

/** 供应商合格率排名项 */
export interface SupplierRankItem {
  supplierName: string
  supplierCode: string
  totalBatches: number
  passRate: number
  qualifiedBatches?: number
  unqualifiedBatches?: number
  unqualifiedRate?: number
}

/** 日统计趋势项 */
export interface DailyTrendItem {
  date: string
  totalBatches: number
  passRate: number
}

/** 重点供应商项（近30天来料批次量 Top5） */
export interface KeySupplierItem {
  supplierCode: string
  supplierName: string
  totalBatches: number
  passRate: number
}

/** 重点供应商趋势线（与 dates 对齐的每日合格率） */
export interface KeySupplierSeries {
  supplierCode: string
  supplierName: string
  passRateList: (number | null)[]
}

/** 重点供应商质量趋势（近30天批次量 Top5） */
export interface KeySupplierTrend {
  keySuppliers: KeySupplierItem[]
  dates: string[]
  series: KeySupplierSeries[]
}

/** 来料检验看板统计 */
export interface MaterialInspectionStats {
  totalBatches: number
  qualifiedBatches: number
  unqualifiedBatches: number
  qualifiedRate: number
  pendingReviewCount: number
  urgentCount: number
  topDefectDesc: DefectDescItem[]
  supplierRank: SupplierRankItem[]
  dailyTrend: DailyTrendItem[]
}

/** 物料检验批量导入结果 */
export interface MaterialInspectionImportResultVO {
  totalCount: number
  successCount: number
  failCount: number
  failList: { index: number; recordNo: string; reason: string }[]
  createdExceptionCount: number
  createdExceptionIds: number[]
}

/** 导入预览逐行失败明细 */
export interface ImportPreviewFailItem {
  rowIndex: number
  recordNo: string
  reason: string
}

/** 导入预览结果（解析并逐行校验，未落库） */
export interface MaterialInspectionImportPreviewVO {
  /** 可导入记录列表（确认后原样提交 /import） */
  list: Partial<MaterialInspection>[]
  /** 逐行失败明细，rowIndex 为 Excel 物理行号（从 1 开始） */
  errors: ImportPreviewFailItem[]
  validCount: number
  totalCount: number
}

/** 物料检验批量导入请求 */
export interface MaterialInspectionImportDTO {
  list: Partial<MaterialInspection>[]
  autoCreateException?: boolean
}

/** 物料检验对账结果 */
export interface MaterialInspectionReconcileResultVO {
  scannedCount: number
  createdCount: number
  createdExceptionIds: number[]
}

/** 物料检验列表查询参数 */
export interface MaterialInspectionListParams extends PageParams {
  keyword?: string
  reviewStatus?: string
  inspectionResult?: string
  supplierCode?: string
  materialCode?: string
  /** 仅列表展示：关联关键物料绑定清单得到的物料条码。 */
  materialBarcode?: string
  startDate?: string
  endDate?: string
}

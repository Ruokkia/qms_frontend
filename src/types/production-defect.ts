export interface ImportFailItem {
  rowIndex: number
  repairNo: string
  reason: string
}

export interface ImportResult {
  totalCount: number
  successCount: number
  duplicateSkipCount: number
  pendingCount: number
  failCount: number
  failList: ImportFailItem[]
}

// 生产维修记录（字段与数据库 production_repair 表一一对应；多维分析统计字段已删除）
export interface ProductionRepair {
  id: number
  auditStatus?: string
  formName?: string
  repairNo: string
  productNo?: string
  productName?: string
  specModel?: string
  workOrderNo?: string
  productBatchOrSn?: string
  process?: string
  defectQty?: number
  defectPhenomenon?: string
  defectCode?: string
  sendRepairDate?: string
  repairDate?: string
  repairJudgmentResult?: string
  repairStatus?: string
  repairRecord?: string
  sendRepairer?: string
  repairer?: string
  auditor?: string
  auditDate?: string
  remark?: string
  repairDone?: number
  formNo?: string
  plantCode?: string
  plantName?: string
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
  signatureUser?: string
  signatureTime?: string
  signatureReason?: string
}

export interface RepairSaveRequest {
  repairNo: string
  formName?: string
  formNo?: string
  productNo?: string
  productName?: string
  specModel?: string
  workOrderNo?: string
  productBatchOrSn?: string
  process: string
  defectQty: number
  defectPhenomenon?: string
  defectCode?: string
  sendRepairDate?: string
  repairDate?: string
  repairJudgmentResult?: string
  repairStatus?: string
  repairRecord?: string
  sendRepairer?: string
  repairer?: string
  auditor?: string
  auditStatus?: string
  auditDate?: string
  remark?: string
}

export type RepairUpdateRequest = Partial<RepairSaveRequest>

// ---- 不良分析（精简版，仅基于 production_repair 实际字段，不新增任何列） ----
export interface DefectAnalyticsQuery {
  plantCode?: string
  start?: string
  end?: string
  excludeDraft?: boolean
  metric?: 'defectQty' | 'repairCount' | 'scrapQty'
  dim?: 'process' | 'defectCode' | 'defectPhenomenon'
  granularity?: 'MONTH' | 'WEEK' | 'QUARTER'
  momMode?: 'auto' | 'custom'
  momStart?: string
  yoyYearsAgo?: number
  topN?: number
}

export interface DefectSummary {
  currentMetricValue?: number | null
  momPct?: number | null
  yoyPct?: number | null
  scrapQty?: number | null
  scrapRate?: number | null
  topProcess?: string | null
}

export interface DefectTrendPoint {
  period?: string
  metricValue?: number | null
  repairCount?: number | null
  scrapQty?: number | null
  momPct?: number | null
  yoyPct?: number | null
}

export interface DefectRankItem {
  name?: string
  metricValue?: number | null
  repairCount?: number | null
  scrapQty?: number | null
  sharePct?: number | null
}

/**
 * M1 来料数据管理 Mock 数据
 *
 * 结构与 /api/v1/material-inspections 真实接口完全一致。
 * 按 sessionStorage 中 plantCode 过滤，开发演示用。
 */
import type { ApiResult, PageResult } from '@/types'
import type {
  MaterialInspection,
  MaterialInspectionStats,
} from '@/types/incoming'

// 供应商与物料代码对齐真实 ERP 编码体系（来源：qms-pg-dev 导出 material_inspection）
const SUPPLIERS = [
  { code: 'S2012073', name: '深圳康立供应商A' },
  { code: 'S2014054', name: '深圳康立供应商B' },
  { code: 'S2018022', name: '深圳康立供应商C' },
  { code: 'S2009013', name: '深圳康立供应商D' },
  { code: 'S2021042', name: '深圳康立供应商E' },
]

const MATERIALS = [
  { code: '99.11.100558', name: '可充电式电批', spec: '扭矩0.5N·m' },
  { code: '10.09.200320', name: 'A26', spec: '通用件' },
  { code: '10.99.990135', name: 'EP离心管', spec: '50mL' },
  { code: '99.99.004076', name: '奶瓶重力球', spec: '食品级' },
  { code: '20.18.990015', name: '超声板PCBA', spec: '控制板' },
]

const DEFECTS = ['外观划伤', '尺寸超差', '引脚变形', '标识模糊', '包装破损', '性能偏差']

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function buildRecords(): MaterialInspection[] {
  const list: MaterialInspection[] = []
  const today = new Date('2026-07-17')
  for (let i = 0; i < 68; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - Math.floor(i / 3))
    const supplier = SUPPLIERS[i % SUPPLIERS.length]
    const material = MATERIALS[i % MATERIALS.length]
    const isFail = i % 7 === 0 || i % 11 === 0
    const isUrgent = i % 13 === 0 ? '是' : '否'
    const reviewStatus = i % 4 === 0 ? '待审核' : '已审核'
    const seq = 100 + i
    list.push({
      id: i + 1,
      recordNo: `IQC-2026-${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(seq)}`,
      inspectionDate: formatDate(date),
      supplierCode: supplier.code,
      supplierName: supplier.name,
      materialCode: material.code,
      materialName: material.name,
      specModel: material.spec,
      materialBatchNo: `B-${supplier.code}-${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(seq)}`,
      submittedQty: 1000 + i * 50,
      qualifiedQty: isFail ? 900 + i * 40 : 1000 + i * 50,
      unqualifiedQty: isFail ? 100 + i * 10 : 0,
      unit: 'PCS',
      inspectionResult: isFail ? '不合格' : '合格',
      reviewStatus,
      signatureStatus: reviewStatus === '已审核' ? '已签' : '未签',
      isUrgent: isUrgent,
      isCustomerSupplied: '否',
      handlingMethod: isFail ? (i % 3 === 0 ? '退货' : '挑选') : undefined,
      defectDesc: isFail ? DEFECTS[i % DEFECTS.length] : undefined,
      inspector: ['张三', '李四', '王五'][i % 3],
      judge: ['张三', '李四', '王五'][i % 3],
      plantCode: i % 3 === 0 ? 'SZ' : 'MZ',
      plantName: i % 3 === 0 ? '深圳' : '梅州',
      createdAt: `${formatDate(date)} 09:00:00`,
      updatedAt: `${formatDate(date)} 09:00:00`,
    } as MaterialInspection)
  }
  return list
}

const ALL_RECORDS = buildRecords()

function getPlantCode(): string {
  return sessionStorage.getItem('qms_region') || 'SZ'
}

function filterByPlant(list: MaterialInspection[]) {
  const code = getPlantCode()
  return list.filter((r) => r.plantCode === code)
}

/** Mock: 分页查询 */
export function mockMaterialInspectionList(params: {
  page?: number
  size?: number
  keyword?: string
  reviewStatus?: string
  inspectionResult?: string
  supplierCode?: string
  startDate?: string
  endDate?: string
}): ApiResult<PageResult<MaterialInspection>> {
  let list = filterByPlant(ALL_RECORDS)
  if (params.keyword) {
    const k = params.keyword.toLowerCase()
    list = list.filter(
      (r) =>
        r.recordNo.toLowerCase().includes(k) ||
        r.materialBatchNo?.toLowerCase().includes(k) ||
        r.materialName?.toLowerCase().includes(k) ||
        r.supplierName?.toLowerCase().includes(k),
    )
  }
  if (params.reviewStatus) list = list.filter((r) => r.reviewStatus === params.reviewStatus)
  if (params.inspectionResult) list = list.filter((r) => r.inspectionResult === params.inspectionResult)
  if (params.supplierCode) list = list.filter((r) => r.supplierCode === params.supplierCode)
  if (params.startDate) list = list.filter((r) => (r.inspectionDate || '') >= params.startDate!)
  if (params.endDate) list = list.filter((r) => (r.inspectionDate || '') <= params.endDate!)

  const page = Number(params.page || 1)
  const size = Number(params.size || 20)
  const start = (page - 1) * size
  return {
    code: 0,
    message: 'success',
    data: {
      list: list.slice(start, start + size),
      total: list.length,
      page,
      size,
    },
  }
}

/** Mock: 看板统计 */
export function mockMaterialInspectionStats(): ApiResult<MaterialInspectionStats> {
  const list = filterByPlant(ALL_RECORDS)
  const total = list.length
  const qualified = list.filter((r) => r.inspectionResult === '合格').length
  const unqualified = total - qualified
  const pendingReview = list.filter((r) => r.reviewStatus === '待审核').length
  const urgent = list.filter((r) => r.isUrgent === '是').length

  // 供应商排名
  const supMap = new Map<string, { name: string; code: string; total: number; pass: number }>()
  for (const r of list) {
    const key = r.supplierCode || '未知'
    const s = supMap.get(key) || { name: r.supplierName || '未知', code: key, total: 0, pass: 0 }
    s.total++
    if (r.inspectionResult === '合格') s.pass++
    supMap.set(key, s)
  }
  const supplierRank = Array.from(supMap.values())
    .map((s) => ({
      supplierName: s.name,
      supplierCode: s.code,
      totalBatches: s.total,
      passRate: Number(((s.pass / s.total) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.passRate - a.passRate)

  // 高频不良
  const defectMap = new Map<string, number>()
  for (const r of list) {
    if (r.defectDesc) {
      defectMap.set(r.defectDesc, (defectMap.get(r.defectDesc) || 0) + 1)
    }
  }
  const topDefectDesc = Array.from(defectMap.entries())
    .map(([defectDesc, count]) => ({ defectDesc, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 30 天日趋势
  const trendMap = new Map<string, { total: number; pass: number }>()
  const today = new Date('2026-07-17')
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    trendMap.set(formatDate(d), { total: 0, pass: 0 })
  }
  for (const r of list) {
    const v = trendMap.get(r.inspectionDate)
    if (v) {
      v.total++
      if (r.inspectionResult === '合格') v.pass++
    }
  }
  const dailyTrend = Array.from(trendMap.entries())
    .map(([date, v]) => ({
      date,
      totalBatches: v.total,
      passRate: v.total === 0 ? 100 : Number(((v.pass / v.total) * 100).toFixed(2)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    code: 0,
    message: 'success',
    data: {
      totalBatches: total,
      qualifiedBatches: qualified,
      unqualifiedBatches: unqualified,
      qualifiedRate: total === 0 ? 0 : Number(((qualified / total) * 100).toFixed(2)),
      pendingReviewCount: pendingReview,
      urgentCount: urgent,
      supplierRank,
      topDefectDesc,
      dailyTrend,
    },
  }
}

/** Mock: 详情 */
export function mockMaterialInspectionDetail(id: number): ApiResult<MaterialInspection> {
  const record = ALL_RECORDS.find((r) => r.id === id) || ALL_RECORDS[0]
  return { code: 0, message: 'success', data: record }
}

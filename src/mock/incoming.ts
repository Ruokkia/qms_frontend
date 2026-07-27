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

const SUPPLIERS = [
  { code: 'SUP-001', name: '盛达电子' },
  { code: 'SUP-002', name: '华芯科技' },
  { code: 'SUP-003', name: '立精密' },
  { code: 'SUP-004', name: '鑫达材料' },
  { code: 'SUP-005', name: '远东精密' },
]

const MATERIALS = [
  { code: 'M001', name: '电容-0805', spec: '10uF/16V' },
  { code: 'M002', name: '芯片-MCU', spec: 'STM32F103' },
  { code: 'M003', name: '外壳-B型', spec: 'ABS阻燃' },
  { code: 'M004', name: '传感器', spec: '压力0.5MPa' },
  { code: 'M005', name: '连接器', spec: '4Pin防水' },
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

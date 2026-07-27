/**
 * M2 异常与整改 Mock 数据
 *
 * 结构与 /api/v1/exceptions 真实接口完全一致。
 * 按 sessionStorage 中 plantCode 过滤，开发演示用。
 */
import type { ApiResult, PageResult } from '@/types'
import type {
  ExceptionOrder,
  ExceptionDetailVO,
  ExceptionStats,
  ExceptionAnalysisVO,
  EscalationCheckResultVO,
  ImprovementAction,
  VerificationRecord,
} from '@/types/exception'

const SUPPLIERS = [
  { id: 1, name: '盛达电子' },
  { id: 2, name: '华芯科技' },
  { id: 3, name: '立精密' },
  { id: 4, name: '鑫达材料' },
  { id: 5, name: '远东精密' },
]

const SOURCE_TYPES = ['来料不良', '制程不良', '审核问题', '客户投诉', '重复问题']
const SEVERITIES = ['严重', '一般']
const STATUSES = ['待整改', '整改中', '待验证', '已闭环']

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function buildExceptions(): ExceptionOrder[] {
  const list: ExceptionOrder[] = []
  const today = new Date('2026-07-17')
  for (let i = 0; i < 42; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - Math.floor(i / 2))
    const supplier = SUPPLIERS[i % SUPPLIERS.length]
    const severity = i % 5 === 0 ? '严重' : '一般'
    const status = STATUSES[i % STATUSES.length]
    const sourceType = SOURCE_TYPES[i % SOURCE_TYPES.length]
    list.push({
      id: i + 1,
      exceptionNo: `EX-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(i + 1)}`,
      sourceType,
      severity,
      status,
      supplierId: supplier.id,
      supplierName: supplier.name,
      materialCode: `M00${(i % 5) + 1}`,
      defectDesc: ['外观划伤', '尺寸超差', '引脚变形', '标识模糊', '性能偏差'][i % 5],
      defectQty: 12 + i,
      totalQty: 1000 + i * 50,
      deadline: formatDate(new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)),
      closedAt: status === '已闭环' ? `${formatDate(date)} 16:00:00` : undefined,
      plantCode: i % 3 === 0 ? 'SZ' : 'MZ',
      plantName: i % 3 === 0 ? '深圳' : '梅州',
      createdBy: ['张三', '李四', '王五'][i % 3],
      createdAt: `${formatDate(date)} 10:00:00`,
      updatedAt: `${formatDate(date)} 10:00:00`,
    } as ExceptionOrder)
  }
  return list
}

const ALL_EXCEPTIONS = buildExceptions()

function getPlantCode(): string {
  return sessionStorage.getItem('qms_region') || 'SZ'
}

function filterByPlant(list: ExceptionOrder[]) {
  return list.filter((r) => r.plantCode === getPlantCode())
}

/** Mock: 分页查询 */
export function mockExceptionList(params: {
  page?: number
  size?: number
  severity?: string
  status?: string
  supplierId?: number
  sourceType?: string
  startDate?: string
  endDate?: string
}): ApiResult<PageResult<ExceptionOrder>> {
  let list = filterByPlant(ALL_EXCEPTIONS)
  if (params.severity) list = list.filter((r) => r.severity === params.severity)
  if (params.status) list = list.filter((r) => r.status === params.status)
  if (params.supplierId) list = list.filter((r) => r.supplierId === params.supplierId)
  if (params.sourceType) list = list.filter((r) => r.sourceType === params.sourceType)
  if (params.startDate) list = list.filter((r) => (r.createdAt || '') >= params.startDate!)
  if (params.endDate) list = list.filter((r) => (r.createdAt || '') <= `${params.endDate!} 23:59:59`)

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

/** Mock: 详情 */
export function mockExceptionDetail(id: number): ApiResult<ExceptionDetailVO> {
  const e = ALL_EXCEPTIONS.find((r) => r.id === id) || ALL_EXCEPTIONS[0]
  const actions: ImprovementAction[] = [
    {
      id: 1,
      exceptionId: e.id,
      actionType: '临时措施',
      content: '暂停该批次使用，增加全检筛选',
      ownerName: '王五',
      dueDate: formatDate(new Date(new Date(e.createdAt!).getTime() + 2 * 24 * 60 * 60 * 1000)),
      status: 'DONE',
      completedAt: `${formatDate(new Date(new Date(e.createdAt!).getTime() + 1 * 24 * 60 * 60 * 1000))} 14:00:00`,
    },
    {
      id: 2,
      exceptionId: e.id,
      actionType: '纠正措施',
      content: '更新IQC检验规范，增加关键尺寸CPK监控',
      ownerName: '李四',
      dueDate: formatDate(new Date(new Date(e.createdAt!).getTime() + 7 * 24 * 60 * 60 * 1000)),
      status: e.status === '已闭环' || e.status === '待验证' ? 'DONE' : 'PENDING',
    },
    {
      id: 3,
      exceptionId: e.id,
      actionType: '预防措施',
      content: '建立供应商月度质量回顾机制',
      ownerName: '赵六',
      dueDate: formatDate(new Date(new Date(e.createdAt!).getTime() + 14 * 24 * 60 * 60 * 1000)),
      status: e.status === '已闭环' ? 'DONE' : 'PENDING',
    },
  ]
  const verifications: VerificationRecord[] =
    e.status === '已闭环' || e.status === '待验证'
      ? [
          {
            id: 1,
            exceptionId: e.id,
            verifyType: '连续N批',
            result: '通过',
            verifierName: '陈工',
            verifyDate: formatDate(new Date(new Date(e.createdAt!).getTime() + 5 * 24 * 60 * 60 * 1000)),
            evidence: '连续3批次检验报告',
          },
        ]
      : []
  return {
    code: 0,
    message: 'success',
    data: { ...e, improvementActions: actions, verificationRecords: verifications, rectificationPlans: [] },
  }
}

/** Mock: KPI 统计 */
export function mockExceptionStats(): ApiResult<ExceptionStats> {
  const list = filterByPlant(ALL_EXCEPTIONS)
  const total = list.length
  const pending = list.filter((r) => r.status === '待整改').length
  const inProgress = list.filter((r) => r.status === '整改中').length
  const pendingVerify = list.filter((r) => r.status === '待验证').length
  const closed = list.filter((r) => r.status === '已闭环').length
  const overdue = list.filter((r) => r.status !== '已闭环' && r.deadline && r.deadline < '2026-07-17').length

  const severityMap = new Map<string, number>()
  const sourceMap = new Map<string, number>()
  for (const r of list) {
    severityMap.set(r.severity, (severityMap.get(r.severity) || 0) + 1)
    sourceMap.set(r.sourceType, (sourceMap.get(r.sourceType) || 0) + 1)
  }

  return {
    code: 0,
    message: 'success',
    data: {
      totalExceptions: total,
      pendingCount: pending,
      inProgressCount: inProgress,
      pendingVerifyCount: pendingVerify,
      closedCount: closed,
      closureRate: total === 0 ? 0 : Number(((closed / total) * 100).toFixed(2)),
      overdueCount: overdue,
      escalationCount: 2,
      severityBreakdown: Array.from(severityMap.entries()).map(([name, count]) => ({ name, count })),
      sourceBreakdown: Array.from(sourceMap.entries()).map(([name, count]) => ({ name, count })),
    },
  }
}

/** Mock: 多维度分析 */
export function mockExceptionAnalysis(dimension: string): ApiResult<ExceptionAnalysisVO> {
  const list = filterByPlant(ALL_EXCEPTIONS)
  const map = new Map<string, number>()

  for (const r of list) {
    let key = ''
    if (dimension === 'defectDesc') key = r.defectDesc || '未分类'
    else if (dimension === 'supplier') key = r.supplierName || '未知'
    else if (dimension === 'material') key = r.materialCode || '未知'
    else if (dimension === 'time') key = (r.createdAt || '').slice(0, 10)
    map.set(key, (map.get(key) || 0) + 1)
  }

  const items = Array.from(map.entries())
    .map(([name, count]) => ({ name, count, ratio: 0 }))
    .sort((a, b) => b.count - a.count)

  const total = items.reduce((s, it) => s + it.count, 0)
  items.forEach((it) => {
    it.ratio = total === 0 ? 0 : Number(((it.count / total) * 100).toFixed(2))
  })

  return {
    code: 0,
    message: 'success',
    data: { dimension, items },
  }
}

/** Mock: 批量升级检查 */
export function mockEscalationCheck(): ApiResult<EscalationCheckResultVO> {
  return {
    code: 0,
    message: 'success',
    data: {
      totalChecked: 5,
      triggeredSuppliers: [
        {
          supplierId: 5,
          supplierName: '远东精密',
          defectDesc: '外观划伤',
          repeatCount: 4,
          windowDays: 90,
          shouldEscalate: true,
          relatedExceptionIds: [5, 10, 15, 20],
        },
      ],
    },
  }
}

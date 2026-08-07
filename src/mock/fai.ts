/**
 * M3 首件检验管理 Mock 数据
 * 结构与 /api/v1/fai 真实接口完全一致。
 * 注意：main.ts 中 Mock 拦截器当前已关闭（走真实后端）。
 * 如需本地 Mock 调试，可在 main.ts 启用 setupMock 并在此文件实现 Mock 适配。
 */
import type { ApiResult, PageResult } from '@/types'
import type {
  FaiChangeTrigger,
  FaiInspectionRecord,
  FaiInspectionRecordResponse,
  FaiReportResponse,
  FaiStandard,
  FaiSpcBaselineVO,
  FaiItemValue,
} from '@/types/fai'

const TRIGGER_TYPES = ['换模具', '升级系统', '换批次', '换设备', '材料批次']
const PROCESSES = ['装配', '焊接', '检测']

// 物料代码对齐真实 ERP 编码体系（来源：qms-pg-dev 导出 material_inspection）
const MOCK_MATERIAL_CODES = ['99.11.100558', '10.09.200320', '10.99.990135', '99.99.004076', '20.18.990015']
const MOCK_MATERIAL_NAMES = ['可充电式电批', 'A26', 'EP离心管', '奶瓶重力球', '超声板PCBA']

function getPlantCode(): string {
  return sessionStorage.getItem('qms_region') || 'SZ'
}

let triggerSeq = 1
let inspectSeq = 1

function buildTriggers(): FaiChangeTrigger[] {
  const list: FaiChangeTrigger[] = []
  for (let i = 0; i < 12; i++) {
    list.push({
      id: i + 1,
      triggerType: TRIGGER_TYPES[i % TRIGGER_TYPES.length],
      itemType: i % 2 === 0 ? 'PRODUCT' : 'MATERIAL',
      itemCode: MOCK_MATERIAL_CODES[i % 5],
      itemName: MOCK_MATERIAL_NAMES[i % 5],
      itemBarcode: `BC-${String(i + 1).padStart(4, '0')}`,
      materialCode: MOCK_MATERIAL_CODES[i % 5],
      materialName: MOCK_MATERIAL_NAMES[i % 5],
      batchNo: `B-20260719-${String(i + 1).padStart(3, '0')}`,
      processName: PROCESSES[i % PROCESSES.length],
      triggerReason: '新品首产/换线，需执行首件检验',
      status: i % 3 === 0 ? '待检验' : i % 3 === 1 ? '已检验' : '关闭',
      plantCode: getPlantCode(),
      plantName: getPlantCode() === 'SZ' ? '深圳' : '梅州',
      createdAt: '2026-07-19 09:00:00',
    })
  }
  return list
}

const ALL_TRIGGERS = buildTriggers()

function buildInspections(): FaiInspectionRecordResponse[] {
  const list: FaiInspectionRecordResponse[] = []
  for (let i = 0; i < 12; i++) {
    const t = ALL_TRIGGERS[i]
    const itemNames = ['长度', '直径', '扭矩', '外观', '电阻']
    const items = itemNames.map((name, idx) => ({
      id: i * 10 + idx + 1,
      faiRecordId: i + 1,
      paramName: name,
      paramCode: `P${idx + 1}`,
      standardValue: String(10 + idx),
      lowerLimit: 10 + idx - 0.5,
      upperLimit: 10 + idx + 0.5,
      actualValue: 10 + idx + (i % 2 === 0 ? 0 : 0.8),
      unit: 'mm',
      result: i % 2 === 0 ? '合格' : '不合格',
      sortOrder: idx,
      isRequired: idx < 3 ? '是' : '否',
    }))
    list.push({
      id: i + 1,
      faiNo: `FAI-${getPlantCode()}-20260719-${String(i + 1).padStart(4, '0')}`,
      changeTriggerId: t?.id,
      materialCode: t?.materialCode,
      materialName: t?.materialName,
      batchNo: t?.batchNo,
      processName: t?.processName,
      inspectionResult: i % 2 === 0 ? '合格' : '不合格',
      signatureStatus: i % 4 === 0 ? '已签' : '未签',
      plantCode: getPlantCode(),
      plantName: getPlantCode() === 'SZ' ? '深圳' : '梅州',
      createdAt: '2026-07-19 09:30:00',
      items,
      signatures: [],
    })
  }
  return list
}

const ALL_INSPECTIONS = buildInspections()

const STANDARDS: FaiStandard[] = [
  {
    id: 1,
    materialCode: '99.11.100558',
    processName: '装配',
    stdVersion: 1,
    isActive: '是',
    items: [
      { id: 1, standardId: 1, paramName: '长度', paramCode: 'P1', standardValue: '10', lowerLimit: 9.5, upperLimit: 10.5, unit: 'mm', isRequired: '是', sortOrder: 0 },
      { id: 2, standardId: 1, paramName: '扭矩', paramCode: 'P2', standardValue: '12', lowerLimit: 11.5, upperLimit: 12.5, unit: 'N·m', isRequired: '是', sortOrder: 1 },
    ],
  },
]

// ===== Mock 函数（结构对齐真实接口） =====

export function mockChangeTriggers(params: any): ApiResult<PageResult<FaiChangeTrigger>> {
  let list = ALL_TRIGGERS.filter((r) => r.plantCode === getPlantCode())
  if (params?.triggerType) list = list.filter((r) => r.triggerType === params.triggerType)
  if (params?.materialCode) list = list.filter((r) => (r.materialCode || '').includes(params.materialCode))
  if (params?.batchNo) list = list.filter((r) => r.batchNo === params.batchNo)
  if (params?.status) list = list.filter((r) => r.status === params.status)
  const page = Number(params?.page || 1)
  const size = Number(params?.size || 20)
  return {
    code: 0,
    message: 'success',
    data: { list: list.slice((page - 1) * size, page * size), total: list.length, page, size },
  }
}

export function mockInspections(params: any): ApiResult<PageResult<FaiInspectionRecord>> {
  let list = ALL_INSPECTIONS.filter((r) => r.plantCode === getPlantCode())
  if (params?.faiNo) list = list.filter((r) => (r.faiNo || '').includes(params.faiNo))
  if (params?.batchNo) list = list.filter((r) => r.batchNo === params.batchNo)
  if (params?.materialName) list = list.filter((r) => (r.materialName || '').includes(params.materialName))
  if (params?.inspectionResult) list = list.filter((r) => r.inspectionResult === params.inspectionResult)
  const page = Number(params?.page || 1)
  const size = Number(params?.size || 20)
  return {
    code: 0,
    message: 'success',
    data: { list: list.slice((page - 1) * size, page * size), total: list.length, page, size },
  }
}

export function mockInspectionDetail(id: number): ApiResult<FaiInspectionRecordResponse> {
  const rec = ALL_INSPECTIONS.find((r) => r.id === id) || ALL_INSPECTIONS[0]
  return { code: 0, message: 'success', data: rec }
}

export function mockReport(id: number): ApiResult<FaiReportResponse> {
  const rec = ALL_INSPECTIONS.find((r) => r.id === id) || ALL_INSPECTIONS[0]
  const items = rec.items || []
  const qualified = items.filter((i) => i.result === '合格').length
  const unqualified = items.filter((i) => i.result === '不合格').length
  const report: FaiReportResponse = {
    ...rec,
    totalCount: items.length,
    qualifiedCount: qualified,
    unqualifiedCount: unqualified,
    passRate: items.length ? Number(((qualified / items.length) * 100).toFixed(2)) : 0,
  }
  return { code: 0, message: 'success', data: report }
}

export function mockStandards(): ApiResult<FaiStandard[]> {
  return { code: 0, message: 'success', data: STANDARDS }
}

export function mockSpcBaseline(id: number): ApiResult<FaiSpcBaselineVO[]> {
  const rec = ALL_INSPECTIONS.find((r) => r.id === id) || ALL_INSPECTIONS[0]
  const data: FaiSpcBaselineVO[] = (rec.items || [])
    .filter((i) => i.actualValue != null)
    .map((i) => ({
      subgroupNo: rec.faiNo,
      paramCode: i.paramCode,
      paramName: i.paramName,
      value: i.actualValue,
      sampleTime: rec.createdAt,
      plantCode: rec.plantCode,
    }))
  return { code: 0, message: 'success', data }
}

export function mockSubmitItems(id: number, items: FaiItemValue[]): ApiResult<FaiInspectionRecordResponse> {
  return mockInspectionDetail(id)
}

export function mockCreateTrigger(req: any): ApiResult<FaiChangeTrigger> {
  const t: FaiChangeTrigger = {
    id: ++triggerSeq,
    ...req,
    status: '待检验',
    plantCode: getPlantCode(),
    plantName: getPlantCode() === 'SZ' ? '深圳' : '梅州',
    createdAt: '2026-07-19 10:00:00',
  }
  ALL_TRIGGERS.unshift(t)
  return { code: 0, message: 'success', data: t }
}

export function mockCreateInspection(changeTriggerId: number): ApiResult<FaiInspectionRecordResponse> {
  const t = ALL_TRIGGERS.find((r) => r.id === changeTriggerId)
  const rec: FaiInspectionRecordResponse = {
    id: ++inspectSeq,
    faiNo: `FAI-${getPlantCode()}-20260719-${String(inspectSeq).padStart(4, '0')}`,
    changeTriggerId,
    materialCode: t?.materialCode,
    materialName: t?.materialName,
    batchNo: t?.batchNo,
    processName: t?.processName,
    inspectionResult: '待判定',
    signatureStatus: '未签',
    plantCode: getPlantCode(),
    items: [
      { id: inspectSeq * 100 + 1, faiRecordId: inspectSeq, paramName: '长度', paramCode: 'P1', lowerLimit: 9.5, upperLimit: 10.5, unit: 'mm', result: '待判定', isRequired: '是' },
    ],
  }
  ALL_INSPECTIONS.unshift(rec)
  return { code: 0, message: 'success', data: rec }
}

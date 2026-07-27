/**
 * M3 首件检验管理 Pinia Store
 * 状态：变更触发列表 / 检验记录列表 / 当前检验详情 / loading
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as faiApi from '@/api/fai'
import type {
  FaiChangeTrigger,
  FaiInspectionRecord,
  FaiInspectionRecordResponse,
  FaiReportResponse,
  FaiStandard,
  FaiItemValue,
  FaiSignatureRequest,
  CreateChangeTriggerRequest,
  FaiQuery,
  ChangeTriggerQuery,
} from '@/types/fai'

export const useFaiStore = defineStore('fai', () => {
  const changeTriggerList = ref<FaiChangeTrigger[]>([])
  const inspectionList = ref<FaiInspectionRecord[]>([])
  const currentInspection = ref<FaiInspectionRecordResponse | null>(null)
  const loading = ref(false)

  /** 分页查询变更触发 */
  async function fetchChangeTriggers(params?: ChangeTriggerQuery) {
    loading.value = true
    try {
      const res = await faiApi.getChangeTriggersApi(params || {})
      changeTriggerList.value = res.data?.list || []
      return res.data
    } finally {
      loading.value = false
    }
  }

  /** 分页查询首件检验记录 */
  async function fetchInspections(params?: FaiQuery) {
    loading.value = true
    try {
      const res = await faiApi.getInspectionsApi(params || {})
      inspectionList.value = res.data?.list || []
      return res.data
    } finally {
      loading.value = false
    }
  }

  /** 创建变更触发 */
  async function createChangeTrigger(data: CreateChangeTriggerRequest) {
    return faiApi.createChangeTriggerApi(data)
  }

  /** 从变更触发创建检验单 */
  async function createInspection(changeTriggerId: number) {
    return faiApi.createInspectionApi({ changeTriggerId })
  }

  /** 批量提交参数实际值 */
  async function submitItems(id: number, items: FaiItemValue[]) {
    return faiApi.submitInspectionItemsApi(id, items)
  }

  /** 重新判定 */
  async function reJudge(id: number) {
    return faiApi.judgeInspectionApi(id)
  }

  /** 电子签名 */
  async function submitSignature(id: number, data: FaiSignatureRequest) {
    return faiApi.signInspectionApi(id, data)
  }

  /** 获取报告 */
  async function fetchReport(id: number): Promise<FaiReportResponse | null> {
    const res = await faiApi.getInspectionReportApi(id)
    return res.data || null
  }

  /** 查询最新激活标准 */
  async function fetchStandard(materialCode: string, processName: string): Promise<FaiStandard | null> {
    const res = await faiApi.getLatestStandardApi(materialCode, processName)
    return res.data || null
  }

  /** 获取检验详情（含参数明细 + 签名），写入 currentInspection */
  async function fetchInspectionDetail(id: number): Promise<FaiInspectionRecordResponse | null> {
    const res = await faiApi.getInspectionDetailApi(id)
    currentInspection.value = res.data || null
    return res.data || null
  }

  /** 刷新检验标准值：从当前激活标准同步最新值 */
  async function refreshStandard(id: number): Promise<FaiInspectionRecordResponse | null> {
    const res = await faiApi.refreshStandardApi(id)
    currentInspection.value = res.data || null
    return res.data || null
  }

  return {
    changeTriggerList,
    inspectionList,
    currentInspection,
    loading,
    fetchChangeTriggers,
    fetchInspections,
    createChangeTrigger,
    createInspection,
    submitItems,
    reJudge,
    submitSignature,
    fetchReport,
    fetchStandard,
    fetchInspectionDetail,
    refreshStandard,
  }
})

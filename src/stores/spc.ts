/**
 * M4 SPC 过程能力分析 Pinia Store
 * 状态：工序列表 / 参数列表 / 当前参数 / 子组列表 / 控制图数据 / 能力指数 / 首件记录 / loading
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as spcApi from '@/api/spc'
import type {
  SpcProcess,
  SpcParameter,
  SpcSubgroup,
  SpcChartData,
  SpcCapabilityResult,
  SpcProcessRequest,
  SpcParameterRequest,
  SpcSubgroupSaveRequest,
  SpcQuery,
} from '@/types/spc'

export const useSpcStore = defineStore('spc', () => {
  const processList = ref<SpcProcess[]>([])
  const parameterList = ref<SpcParameter[]>([])
  const currentParameter = ref<SpcParameter | null>(null)
  const subgroupList = ref<SpcSubgroup[]>([])
  const chartDataXbarR = ref<SpcChartData | null>(null)
  const chartDataXbarS = ref<SpcChartData | null>(null)
  const capabilityResult = ref<SpcCapabilityResult | null>(null)
  // 控制图关联的产品/物料分类与代码（仅控制图 Tab 使用）
  const chartItemType = ref<'PRODUCT' | 'MATERIAL' | undefined>(undefined)
  const chartItemCode = ref<string | undefined>(undefined)
  const chartBatchNo = ref<string | undefined>(undefined)
  const loading = ref(false)
  // 致命加载错误（工序/参数拉取失败时），页面据此展示错误卡片而非卡死在 loading
  const error = ref<string | null>(null)
  // 防御性兜底：任何未捕获异常导致 loading 永久滞留时，强制复位并显示超时提示
  let loadWatchdog: ReturnType<typeof setTimeout> | null = null
  function startLoadingWatchdog() {
    if (loadWatchdog) clearTimeout(loadWatchdog)
    loadWatchdog = setTimeout(() => {
      loadWatchdog = null
      if (loading.value) {
        loading.value = false
        if (!error.value) error.value = '数据加载超时，请点击重试'
      }
    }, 20000)
  }
  function clearLoadingWatchdog() {
    if (loadWatchdog) {
      clearTimeout(loadWatchdog)
      loadWatchdog = null
    }
  }
  function errorMessage(e: unknown, fallback: string): string {
    if (e && typeof e === 'object' && 'message' in e) {
      return (e as { message?: string }).message || fallback
    }
    return fallback
  }

  // ===== 工序 =====

  async function fetchProcesses() {
    loading.value = true
    error.value = null
    startLoadingWatchdog()
    try {
      const res = await spcApi.getProcessesApi()
      processList.value = res.data || []
    } catch (e) {
      error.value = errorMessage(e, '工序数据加载失败')
    } finally {
      loading.value = false
      clearLoadingWatchdog()
    }
  }

  async function createProcess(data: SpcProcessRequest) {
    return spcApi.createProcessApi(data)
  }

  async function updateProcess(id: number, data: SpcProcessRequest) {
    return spcApi.updateProcessApi(id, data)
  }

  async function removeProcess(id: number) {
    return spcApi.deleteProcessApi(id)
  }

  // ===== 参数 =====

  async function fetchParameters(processId?: number) {
    loading.value = true
    error.value = null
    startLoadingWatchdog()
    try {
      const res = await spcApi.getParametersApi(processId)
      parameterList.value = res.data || []
      return res.data
    } catch (e) {
      error.value = errorMessage(e, '参数数据加载失败')
    } finally {
      loading.value = false
      clearLoadingWatchdog()
    }
  }

  async function createParameter(data: SpcParameterRequest) {
    return spcApi.createParameterApi(data)
  }

  async function updateParameter(id: number, data: SpcParameterRequest) {
    return spcApi.updateParameterApi(id, data)
  }

  async function removeParameter(id: number) {
    return spcApi.deleteParameterApi(id)
  }

  // ===== 子组 / 采集 =====

  async function fetchSubgroups(paramId: number): Promise<SpcSubgroup[]> {
    loading.value = true
    try {
      const res = await spcApi.getSubgroupsApi(paramId)
      subgroupList.value = res.data || []
      return res.data || []
    } finally {
      loading.value = false
    }
  }

  async function saveSubgroup(data: SpcSubgroupSaveRequest) {
    return spcApi.saveSubgroupApi(data)
  }

  async function appendPendingSamples(id: number, sampleValues: number[]) {
    return spcApi.appendPendingSamplesApi(id, sampleValues)
  }


  async function deleteSubgroup(id: number) {
    return spcApi.deleteSubgroupApi(id)
  }

  // ===== 控制图 =====

  async function fetchChartDataXbarR(
    paramId: number,
    itemType?: 'PRODUCT' | 'MATERIAL',
    itemCode?: string,
    batchNo?: string,
  ): Promise<SpcChartData | null> {
    const res = await spcApi.getXbarRChartApi(paramId, itemType, itemCode, batchNo)
    chartDataXbarR.value = res.data || null
    return res.data || null
  }

  async function fetchChartDataXbarS(
    paramId: number,
    itemType?: 'PRODUCT' | 'MATERIAL',
    itemCode?: string,
    batchNo?: string,
  ): Promise<SpcChartData | null> {
    const res = await spcApi.getXbarSChartApi(paramId, itemType, itemCode, batchNo)
    chartDataXbarS.value = res.data || null
    return res.data || null
  }

  /** 设置控制图关联维度（产品/物料代码、批次），同步触发图表和能力分析刷新 */
  function setChartItem(itemType?: 'PRODUCT' | 'MATERIAL', itemCode?: string, batchNo?: string) {
    chartItemType.value = itemType
    chartItemCode.value = itemCode
    chartBatchNo.value = batchNo
  }

  async function recalcControlLimits(paramId: number) {
    return spcApi.recalcControlLimitsApi(paramId)
  }

  // ===== 过程能力 =====

  async function fetchCapability(paramId: number, itemType?: string, itemCode?: string, batchNo?: string): Promise<SpcCapabilityResult | null> {
    const res = await spcApi.getCapabilityApi(paramId, itemType, itemCode, batchNo)
    capabilityResult.value = res.data || null
    return res.data || null
  }

  async function recalcCapability(paramId: number, itemType?: string, itemCode?: string, batchNo?: string) {
    const res = await spcApi.recalcCapabilityApi(paramId, itemType, itemCode, batchNo)
    capabilityResult.value = res.data || null
    return res.data || null
  }

  return {
    processList,
    parameterList,
    currentParameter,
    subgroupList,
    chartDataXbarR,
    chartDataXbarS,
    capabilityResult,
    chartItemType,
    chartItemCode,
    chartBatchNo,
    loading,
    error,
    fetchProcesses,
    createProcess,
    updateProcess,
    removeProcess,
    fetchParameters,
    createParameter,
    updateParameter,
    removeParameter,
    fetchSubgroups,
    saveSubgroup,
    appendPendingSamples,
    deleteSubgroup,
    fetchChartDataXbarR,
    fetchChartDataXbarS,
    setChartItem,
    recalcControlLimits,
    fetchCapability,
    recalcCapability,
  }
})

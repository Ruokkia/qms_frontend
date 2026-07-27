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
  const loading = ref(false)

  // ===== 工序 =====

  async function fetchProcesses() {
    loading.value = true
    try {
      const res = await spcApi.getProcessesApi()
      processList.value = res.data || []
    } finally {
      loading.value = false
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
    try {
      const res = await spcApi.getParametersApi(processId)
      parameterList.value = res.data || []
      return res.data
    } finally {
      loading.value = false
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

  async function fetchChartDataXbarR(paramId: number): Promise<SpcChartData | null> {
    const res = await spcApi.getXbarRChartApi(paramId)
    chartDataXbarR.value = res.data || null
    return res.data || null
  }

  async function fetchChartDataXbarS(paramId: number): Promise<SpcChartData | null> {
    const res = await spcApi.getXbarSChartApi(paramId)
    chartDataXbarS.value = res.data || null
    return res.data || null
  }

  async function recalcControlLimits(paramId: number) {
    return spcApi.recalcControlLimitsApi(paramId)
  }

  // ===== 过程能力 =====

  async function fetchCapability(paramId: number): Promise<SpcCapabilityResult | null> {
    const res = await spcApi.getCapabilityApi(paramId)
    capabilityResult.value = res.data || null
    return res.data || null
  }

  async function recalcCapability(paramId: number) {
    const res = await spcApi.recalcCapabilityApi(paramId)
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
    loading,
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
    recalcControlLimits,
    fetchCapability,
    recalcCapability,
  }
})

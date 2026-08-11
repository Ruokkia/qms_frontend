<template>
  <div class="spc-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <h2 class="page-title">SPC 过程能力分析</h2>
        <div class="page-sub">关键工序（装配 / 焊接 / 检测）过程控制与能力评估 · {{ plantName }}</div>
      </div>
    </div>

    <!-- 数据加载失败提示（可重试，避免卡死在 loading） -->
    <el-alert
      v-if="store.error"
      type="error"
      :closable="false"
      show-icon
      class="load-error"
      style="margin-bottom: 14px"
    >
      <template #default>
        <div class="load-error-body">
          <span>{{ store.error }}</span>
          <el-button type="primary" size="small" :loading="store.loading" @click="reload">
            重新加载
          </el-button>
        </div>
      </template>
    </el-alert>

    <el-tabs v-model="activeTab" class="spc-tabs" lazy>
      <el-tab-pane label="参数配置" name="config">
        <ProcessConfig />
      </el-tab-pane>

      <el-tab-pane label="数据采集" name="entry">
        <DataEntry
          :preset-item-code="faiPreset.itemCode"
          :preset-process-name="faiPreset.processName"
          :fai-record-id="faiPreset.faiRecordId"
          @saved="onSaved"
          @context-change="onEntryContextChange"
        />
      </el-tab-pane>

      <el-tab-pane label="控制图" name="chart">
        <div class="chart-filterbar">
          <div class="filter-item">
            <span class="lbl">分类</span>
            <el-radio-group :model-value="chartItemType" @update:model-value="onChartItemTypeChange">
              <el-radio-button value="PRODUCT">产品</el-radio-button>
              <el-radio-button value="MATERIAL">物料</el-radio-button>
            </el-radio-group>
          </div>
          <div class="filter-item">
            <el-autocomplete
              v-model="chartItemCode"
              :fetch-suggestions="chartQuerySearchAsync"
              :placeholder="`${chartTypeLabel}代码（支持模糊搜索，可下拉选择）`"
              clearable
              value-key="itemCode"
              :trigger-on-focus="false"
              class="code-input"
              @select="onChartItemSelect"
              @blur="onChartItemBlur"
              @clear="onChartItemClear"
              @keyup.enter="onChartFilter"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
              <template #default="{ item }">
                <div class="barcode-option">
                  <span class="barcode-option__code">{{ item.itemCode }}</span>
                  <span class="barcode-option__meta">{{ item.itemName }} · {{ item.itemType === 'PRODUCT' ? '产品' : '物料' }}</span>
                </div>
              </template>
            </el-autocomplete>
            <!-- 批次筛选下拉（多批次存在时显示） -->
            <el-select
              v-if="currentChartBatches.length > 0"
              v-model="chartBatchNo"
              size="small"
              placeholder="全部批次"
              clearable
              class="batch-select"
              @change="onBatchChange"
            >
              <el-option label="全部批次" value="" />
              <el-option v-for="b in currentChartBatches" :key="b" :label="b" :value="b" />
            </el-select>
          </div>
          <div class="filter-item">
            <span class="lbl">工序</span>
            <el-select
              v-model="chartProcessCode"
              placeholder="请先输入代码"
              :disabled="!chartItemCode"
              clearable
              class="process-select"
              style="width:180px"
              @change="onChartProcessChange"
            >
              <el-option
                v-for="p in chartProcessOptions"
                :key="p.processCode"
                :label="p.processName"
                :value="p.processCode"
              />
            </el-select>
          </div>
          <div class="filter-item grow">
            <span class="lbl">参数</span>
            <el-select
              v-model="chartParamId"
              :placeholder="chartProcessId ? '选择关键参数' : '请先选工序'"
              :disabled="!chartProcessId"
              clearable
              class="param-select"
              @change="onChartFilter"
            >
              <el-option
                v-for="p in filteredChartParams"
                :key="p.id"
                :label="`${p.paramName}（${p.paramCode} · n=${p.subgroupSize} · ${p.chartType}）`"
                :value="p.id"
              />
            </el-select>
          </div>
        </div>
        <div v-if="!chartReady" class="need-param">
          <el-icon class="np-icon"><DataAnalysis /></el-icon>
          <div class="np-title">
            <template v-if="!chartItemCode">请先输入代码</template>
            <template v-else-if="!chartProcessId">请选择工序</template>
            <template v-else>请选择分析参数</template>
          </div>
          <div class="np-sub">
            <template v-if="!chartItemCode">在上方输入产品/物料代码，并选中后可继续选择工序与参数</template>
            <template v-else-if="!chartProcessId">该代码已配置标准工序，请选择其中一个工序</template>
            <template v-else>选择关键参数后，即可查看对应的 {{ chartTypeOfSelected }} 控制图</template>
          </div>
        </div>
        <template v-else>
          <el-alert
            v-if="chartCurrentParam"
            :title="`${chartCurrentParam.paramName}（${chartCurrentParam.chartType}）控制图 · ${chartTypeLabel}代码 ${chartItemCode}`"
            type="info"
            :closable="false"
            show-icon
            class="chart-context"
          />
          <el-alert
            v-if="xbarSParams.length"
            type="warning"
            :closable="false"
            show-icon
            class="chart-context"
          >
            <template #default>
              本系统 Xbar-s 控制图（适用 n≥11）仅以下参数可用：
              <el-link
                v-for="p in xbarSParams"
                :key="p.id"
                type="primary"
                underline="never"
                class="xbar-s-link"
                @click="chartParamId = p.id"
              >{{ p.paramName }}（{{ p.subgroupSize }}）</el-link>
              。点击即可切换查看。
            </template>
          </el-alert>
          <div ref="chartCardRef">
            <el-card shadow="hover" class="chart-card" v-if="chartTypeOfSelected === 'Xbar-s'">
              <XbarSChart 
                :param-id="chartParamId" 
                :item-type="(chartItemCode && chartItemType) ? chartItemType : undefined" 
                :item-code="chartItemCode || undefined"
                :batch-no="chartBatchNo || undefined"
                @subgroup-click="onSubgroupClick"
              />
            </el-card>
            <el-card shadow="hover" class="chart-card" v-else>
              <XbarRChart
                :param-id="chartParamId"
                :item-type="(chartItemCode && chartItemType) ? chartItemType : undefined"
                :item-code="chartItemCode || undefined"
                :batch-no="chartBatchNo || undefined"
                @subgroup-click="onSubgroupClick"
              />
            </el-card>
          </div>

          <!-- 同工序其他参数快速切换 (P2-2) -->
          <div v-if="sameProcessOtherParams.length" class="quick-switch">
            <span class="quick-switch-label">同工序其他参数：</span>
            <el-link
              v-for="p in sameProcessOtherParams"
              :key="p.id"
              type="primary"
              underline="never"
              class="quick-switch-link"
              @click="chartParamId = p.id"
            >{{ p.paramName }}</el-link>
          </div>

          <!-- 子组历史明细 (P1-3 + P2-1) -->
          <div ref="subgroupCardRef">
            <el-card shadow="never" class="subgroup-card">
              <SubgroupList 
                ref="subgroupRef"
                :param-id="chartParamId"
                :item-code="chartItemCode || undefined"
                :highlight-subgroup-no="highlightSubgroupNo"
                @deleted="onSubgroupDeleted"
                @row-click="(row: any) => openTrace(row.id, row.subgroupNo)"
              />
            </el-card>
          </div>

          <!-- 悬浮锚点导航（仅控制图 tab 有参数时显示） -->
          <div class="anchor-nav">
            <div
              class="anchor-item"
              :class="{ active: activeAnchor === 'chart' }"
              @click="scrollToSection('chart')"
            >
              <span class="anchor-dot"></span>
              <span class="anchor-label">控制图</span>
            </div>
            <div
              class="anchor-item"
              :class="{ active: activeAnchor === 'subgroup' }"
              @click="scrollToSection('subgroup')"
            >
              <span class="anchor-dot"></span>
              <span class="anchor-label">子组明细</span>
            </div>
            <div class="anchor-divider"></div>
            <div
              class="anchor-item"
              :class="{ active: activeAnchor === 'capability' }"
              @click="switchToCapability"
            >
              <span class="anchor-dot external"></span>
              <span class="anchor-label">过程能力</span>
            </div>
          </div>
        </template>
      </el-tab-pane>

      <el-tab-pane label="过程能力" name="capability">
        <div v-if="!chartReady" class="need-param">
          <el-icon class="np-icon"><DataAnalysis /></el-icon>
          <div class="np-title">
            <template v-if="!chartItemCode">请先输入代码</template>
            <template v-else-if="!chartProcessId">请选择工序</template>
            <template v-else>请选择分析参数</template>
          </div>
          <div class="np-sub">
            <template v-if="!chartItemCode">在上方输入产品/物料代码，并选中后可继续选择工序与参数</template>
            <template v-else-if="!chartProcessId">该代码已配置标准工序，请选择其中一个工序</template>
            <template v-else>选择关键参数后，即可查看过程能力分析</template>
          </div>
        </div>
        <template v-else>
          <el-row :gutter="16">
            <el-col :span="14">
              <el-card shadow="never" class="cap-card">
                <CapabilityPanel :param-id="chartParamId" />
              </el-card>
            </el-col>
            <el-col :span="10">
              <el-card shadow="never" class="cap-card">
                <CapabilityTrend
                  :param-id="chartParamId"
                  :item-type="(chartItemCode && chartItemType) ? chartItemType : undefined"
                  :item-code="chartItemCode || undefined"
                />
              </el-card>
            </el-col>
          </el-row>
          <el-card shadow="never" class="cap-card" style="margin-top: 16px">
            <CapabilityHistogram :param-id="chartParamId" />
          </el-card>
        </template>
      </el-tab-pane>
      </el-tabs>

      <!-- 子组溯源弹窗（风格与来料/成品详情一致） -->
      <SubgroupTraceDialog v-model="traceVisible" :loading="traceLoading" :data="traceData" />
      </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Search, DataAnalysis } from '@element-plus/icons-vue'
import { useSpcStore } from '@/stores/spc'
import { useAuthStore } from '@/stores/auth'
import { useItemTypeStore, type ItemType } from '@/stores/itemType'
import { searchSpcItemsApi, getSubgroupDetailApi, getSourceDetailApi } from '@/api/spc'
import type { SpcItemDict } from '@/api/spc'
import { getStandardProcessesApi, getStandardSpcParamsApi } from '@/api/fai'
import ProcessConfig from './components/ProcessConfig.vue'
import DataEntry from './components/DataEntry.vue'
import XbarRChart from './components/XbarRChart.vue'
import XbarSChart from './components/XbarSChart.vue'
import CapabilityPanel from './components/CapabilityPanel.vue'
import CapabilityTrend from './components/CapabilityTrend.vue'
import CapabilityHistogram from './components/CapabilityHistogram.vue'
import SubgroupList from './components/SubgroupList.vue'
import SubgroupTraceDialog from './components/SubgroupTraceDialog.vue'

const store = useSpcStore()
const auth = useAuthStore()
const route = useRoute()

const activeTab = ref<string>(route.query.tab === 'entry' || route.query.tab === 'chart' ? (route.query.tab as string) : 'config')
// 分析参数（关键参数）提升为控制图 tab 局部状态，仅作用于控制图与过程能力，不再影响数据采集
const chartParamId = ref<number | null>(null)
// 工序下拉（控制图独立筛选）
const chartProcessId = ref<number | null>(null)
// 工序下拉选中值（FAI 标准工序编码）
const chartProcessCode = ref<string | null>(null)
// 工序下拉选项：来自该代码在 FAI 标准库配置过的工序（processCode/processName）
const chartProcessOptions = ref<{ processCode: string; processName: string }[]>([])
/** FAI 检验标准中 spcEnabled=是 的参数ID列表，控制图参数下拉仅展示这些 */
const chartFaiParamIds = ref<number[]>([])
// 控制图关联的产品/物料维度：与数据采集、FAI 共用同一份持久化分类，避免同页两处状态割裂
const itemTypeStore = useItemTypeStore()
const { itemType: chartItemType } = storeToRefs(itemTypeStore)
const chartItemCode = ref<string>('')
/** 批次筛选（空=全部），从图表数据 availableBatches 动态填充选项 */
const chartBatchNo = ref<string>('')
const highlightSubgroupNo = ref<string | null>(null)
const subgroupRef = ref<InstanceType<typeof SubgroupList> | null>(null)
const chartCardRef = ref<HTMLElement | null>(null)
const subgroupCardRef = ref<HTMLElement | null>(null)
const activeAnchor = ref<'chart' | 'subgroup' | 'capability' | null>(null)
const chartTypeLabel = computed(() => (chartItemType.value === 'PRODUCT' ? '产品' : '物料'))

function onChartItemTypeChange(val: string | number | boolean | undefined) {
  itemTypeStore.setItemType(val as ItemType)
  // 分类切换后清空代码筛选，避免跨分类串数据
  chartItemCode.value = ''
  chartProcessId.value = null
  chartProcessCode.value = null
  chartProcessOptions.value = []
  chartParamId.value = null
  lastChartCandidates = []
  onChartFilter()
}

// 按当前录入的代码，从 FAI 标准库拉取该代码已配置过的工序，填充工序下拉
async function loadChartProcesses() {
  const code = (chartItemCode.value || '').trim()
  if (!code) {
    chartProcessOptions.value = []
    return
  }
  try {
    const res = await getStandardProcessesApi(chartItemType.value, code)
    chartProcessOptions.value = res.data || []
  } catch {
    chartProcessOptions.value = []
  }
}

// 控制图代码框模糊搜索候选（统一代码字典：已签首件 ∪ 已激活标准，不再查 trace 表）
let chartTimer: ReturnType<typeof setTimeout> | null = null
let lastChartCandidates: SpcItemDict[] = []

function chartQuerySearchAsync(queryString: string, cb: (results: SpcItemDict[]) => void) {
  const keyword = (queryString || '').trim()
  if (!keyword) {
    cb([])
    return
  }
  if (chartTimer) clearTimeout(chartTimer)
  chartTimer = setTimeout(async () => {
    try {
      const res = await searchSpcItemsApi(keyword)
      const list = res.data || []
      lastChartCandidates = list
      cb(list)
    } catch {
      cb([])
    }
  }, 300)
}

function onChartItemSelect(item: SpcItemDict) {
  const nextItemCode = item.itemCode || ''
  const isSameItemCode = chartItemCode.value === nextItemCode
  chartItemCode.value = nextItemCode
  if (isSameItemCode) {
    return
  }
  // 代码确定后，按代码从 FAI 标准库拉取该代码已配置工序
  chartProcessId.value = null
  chartProcessCode.value = null
  chartParamId.value = null
  chartFaiParamIds.value = []
  loadChartProcesses()
  onChartFilter()
}

// autocomplete 清空按钮：重置代码/工序/参数，避免串数据
function onChartItemClear() {
  chartItemCode.value = ''
  chartProcessOptions.value = []
  chartProcessId.value = null
  chartProcessCode.value = null
  chartParamId.value = null
  chartFaiParamIds.value = []
  lastChartCandidates = []
  onChartFilter()
}

// 手填/粘贴完整代码并失焦时，优先命中最近模糊候选，避免大小写/前后空格差异
function onChartItemBlur() {
  const code = (chartItemCode.value || '').trim()
  if (!code) {
    // 清空代码时重置工序/参数，避免串数据
    chartProcessOptions.value = []
    chartProcessId.value = null
    chartProcessCode.value = null
    chartParamId.value = null
    chartFaiParamIds.value = []
    onChartFilter()
    return
  }
  const hit = lastChartCandidates.find((c) => c.itemCode === code)
  const nextItemCode = hit?.itemCode || code
  if (chartItemCode.value === nextItemCode) {
    return
  }
  chartItemCode.value = nextItemCode
  chartProcessId.value = null
  chartProcessCode.value = null
  chartParamId.value = null
  chartFaiParamIds.value = []
  loadChartProcesses()
  onChartFilter()
}

const plantName = computed(() => auth.plantCode === 'MZ' ? '梅州' : '深圳')

// 控制图参数下拉：按所选工序过滤，且仅保留 FAI 检验标准中 spcEnabled=是 的参数
const filteredChartParams = computed(() => {
  if (!chartProcessId.value) return []
  let list = store.parameterList.filter((p) => p.processId === chartProcessId.value)
  if (chartFaiParamIds.value.length > 0) {
    list = list.filter((p) => chartFaiParamIds.value.includes(p.id))
  }
  return list
})

const chartCurrentParam = computed(() =>
  store.parameterList.find((p) => p.id === chartParamId.value) || null,
)
const chartTypeOfSelected = computed(() => chartCurrentParam.value?.chartType || 'Xbar-R')
// 三选齐守卫：代码 + 工序 + 参数 三者齐全才允许渲染控制图（对应 ask「未指定代码不合理」）
const chartReady = computed(
  () => !!chartItemCode.value && !!chartProcessId.value && !!chartParamId.value,
)
const xbarSParams = computed(() =>
  store.parameterList.filter((p) => p.chartType === 'Xbar-s'),
)

function onChartFilter() {
  // 三选齐守卫：代码/工序/参数任一缺失时，不发起查询并清空图表数据，避免「未指定代码全量基线」误绘
  if (!chartReady.value) {
    store.setChartItem(chartItemType.value, undefined, undefined)
    store.chartDataXbarR = null
    store.chartDataXbarS = null
    highlightSubgroupNo.value = null
    return
  }
  // 同步产品/物料上下文到 spcStore（CapabilityPanel 等子组件通过 store 读取）
  store.setChartItem(chartItemType.value, chartItemCode.value || undefined, chartBatchNo.value || undefined)
  // 清除上次高亮
  highlightSubgroupNo.value = null
}

// 按当前代码和 FAI 标准工序加载 SPC 启用参数；手工选择和数据采集自动带入共用。
async function loadChartFaiParams(processCode: string | null) {
  const process = processCode
    ? store.processList.find((item) => item.processCode === processCode)
    : undefined
  if (!process || !chartItemCode.value) {
    chartFaiParamIds.value = []
    return
  }
  await store.fetchParameters(Number(process.id))
  try {
    const res = await getStandardSpcParamsApi(chartItemType.value, chartItemCode.value, process.processName)
    chartFaiParamIds.value = ((res as any)?.data ?? []).map((p: any) => p.spcParameterId).filter(Boolean)
  } catch {
    chartFaiParamIds.value = []
  }
}

// 工序切换时，将选中的 FAI 标准工序编码(processCode) 反查为 SPC 数字工序 id，
// 并仅展示 FAI 检验标准中启用 SPC 的参数。
async function onChartProcessChange() {
  const code = chartProcessCode.value
  const process = code ? store.processList.find((item) => item.processCode === code) : undefined
  chartProcessId.value = process ? Number(process.id) : null
  chartParamId.value = null
  await loadChartFaiParams(code)
  onChartFilter()
}

/** 控制图点击数据点/异常项 → 打开子组溯源弹窗 */
function onSubgroupClick({ subgroupId, subgroupNo }: { subgroupIndex: number; subgroupNo: string; subgroupId?: number }) {
  openTrace(subgroupId, subgroupNo)
}

// 子组溯源弹窗（风格与来料/成品详情一致）
const traceVisible = ref(false)
const traceLoading = ref(false)
const traceData = ref<Record<string, any> | null>(null)
async function openTrace(subgroupId?: number, subgroupNo?: string) {
  if (!subgroupId) return
  traceVisible.value = true
  traceLoading.value = true
  traceData.value = null
  try {
    // apiGet 拦截器返回的是整个 ApiResult（{code,message,data,...}），需解包到内层 data
    const baseRes: Record<string, any> = await getSubgroupDetailApi(subgroupId)
    const base: Record<string, any> = baseRes?.data ?? baseRes
    if (!base || !base.itemType) {
      traceData.value = base ?? null
      return
    }
    // 用「代码 + 批次号/条码」去成品表/物料表反查来源明细，注入弹窗
    if (base.itemType && base.itemCode && (base.batchNo || base.barcode)) {
      try {
        const srcRes = await getSourceDetailApi(base.itemType, base.itemCode, base.batchNo, base.barcode, base.plantCode)
        base.sourceDetail = srcRes?.data ?? srcRes ?? null
      } catch {
        base.sourceDetail = null
      }
    } else {
      base.sourceDetail = null
    }
    traceData.value = base
  } finally {
    traceLoading.value = false
  }
}

/** 当前图表数据的可用批次（用于批次下拉选择器） */
const currentChartBatches = computed(() => {
  const src = store.chartDataXbarR || store.chartDataXbarS
  return src?.availableBatches || []
})

/** 批次切换时触发图表刷新 */
function onBatchChange() {
  store.setChartItem(chartItemType.value, chartItemCode.value || undefined, chartBatchNo.value || undefined)
  highlightSubgroupNo.value = null
}

/** 子组删除后刷新控制图数据 */
function onSubgroupDeleted() {
  // 子组变更后，图表组件会通过 watch 重新拉取数据
}

/** 同工序的其他参数（用于快速切换，P2-2） */
const sameProcessOtherParams = computed(() => {
  if (!chartParamId.value || !chartCurrentParam.value) return []
  const pid = chartCurrentParam.value.processId
  if (!pid) return []
  return store.parameterList.filter(
    (p) => p.processId === pid && p.id !== chartParamId.value,
  )
})

function onSaved() {
  // 数据采集变更后，控制图 / 能力面板会在切换 tab 时按 paramId 重新拉取
}

async function onEntryContextChange(context: { itemCode: string; processCode: string | null; paramId: number | null }) {
  const isSameItemCode = chartItemCode.value === context.itemCode
  chartItemCode.value = context.itemCode
  chartBatchNo.value = ''
  if (context.processCode) {
    chartProcessCode.value = context.processCode
    const process = store.processList.find((item) => item.processCode === context.processCode)
    chartProcessId.value = process ? Number(process.id) : null
  } else if (!isSameItemCode) {
    chartProcessCode.value = null
    chartProcessId.value = null
  }
  await loadChartFaiParams(chartProcessCode.value)
  if (chartItemCode.value !== context.itemCode || chartProcessCode.value !== context.processCode) {
    return
  }
  if (context.paramId != null) {
    chartParamId.value = context.paramId
  } else if (!isSameItemCode) {
    chartParamId.value = null
  }
  loadChartProcesses()
  onChartFilter()
}

// 重新加载工序与参数（供错误卡片“重新加载”按钮使用）
async function reload() {
  await store.fetchProcesses()
  await store.fetchParameters()
  if (!chartParamId.value && store.parameterList.length) {
    chartParamId.value = store.parameterList[0].id
  }
}

// 来自 FAI「去采集」跳转：同步分类到共享 store、激活数据采集 tab、透传预填参数
const faiPreset = ref<{ itemCode: string; processName: string; faiRecordId?: string }>({
  itemCode: '',
  processName: '',
  faiRecordId: undefined,
})

function applyQueryFromFai() {
  const q = route.query
  if (!q || (q.itemType !== 'PRODUCT' && q.itemType !== 'MATERIAL')) return
  // 1) 同步分类到共享 store（与 FAI / 数据采集同源；先设类型，避免 DataEntry 内 watch(itemType) 清空代码）
  itemTypeStore.setItemType(q.itemType as ItemType)
  // 2) 激活数据采集 tab
  if (q.tab === 'entry' || q.tab === 'chart') {
    activeTab.value = q.tab
  }
  // 3) 缓存预填值，透传给 DataEntry（DataEntry 在 tab 挂载时回填）
  faiPreset.value = {
    itemCode: typeof q.itemCode === 'string' ? q.itemCode : '',
    processName: typeof q.processName === 'string' ? q.processName : '',
    faiRecordId: typeof q.faiRecordId === 'string' ? q.faiRecordId : undefined,
  }
}

onMounted(async () => {
  await reload()
  applyQueryFromFai()
  setupAnchorObserver()
})

// ── 悬浮锚点导航 ──
function scrollToSection(target: 'chart' | 'subgroup') {
  const el = target === 'chart' ? chartCardRef.value : subgroupCardRef.value
  if (!el) return
  activeAnchor.value = target
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function switchToCapability() {
  activeTab.value = 'capability'
  activeAnchor.value = 'capability'
}

let anchorObserver: IntersectionObserver | null = null

function setupAnchorObserver() {
  // DOM 可能尚未渲染（v-if），延迟一帧
  nextTick(() => {
    const targets = [
      { key: 'chart' as const, el: chartCardRef.value },
      { key: 'subgroup' as const, el: subgroupCardRef.value },
    ]
    const els = targets.map((t) => t.el).filter((el): el is HTMLElement => !!el)
    if (!els.length) return
    anchorObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length) {
          const match = targets.find((t) => t.el === visible[0].target)
          if (match) activeAnchor.value = match.key
        }
      },
      { rootMargin: '-15% 0px -50% 0px', threshold: [0, 0.3, 0.6] },
    )
    els.forEach((el) => anchorObserver!.observe(el))
  })
}

onUnmounted(() => {
  anchorObserver?.disconnect()
})
</script>

<style scoped>
/* ── SPC 页面字体分层策略 ──
 * L1 表格数据列 → tabular-nums 对齐 + 系统等宽回退
 * L2 独立KPI数值 → JetBrains Mono 强制等宽（增强数据感）
 * L3 标签描述   → 系统无衬线（默认）
 */
.spc-page {
  font-variant-numeric: tabular-nums;
  padding: 16px 20px;
}
.page-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 14px; }
.page-title { margin: 0; font-size: 20px; color: #1B3A5B; font-weight: 700; }
.page-sub { font-size: 12px; color: #8C9BA8; margin-top: 4px; }
.head-param { display: flex; align-items: center; gap: 8px; }
.head-param .lbl { font-size: 13px; color: #5B7A99; }
.spc-tabs { --el-color-primary: #1B3A5B; }

/* 控制图筛选栏 */
.chart-filterbar {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  padding: 14px 18px; margin-bottom: 14px;
  background: #FFFFFF; border: 1px solid #ECE7E1; border-radius: 10px;
  box-shadow: 0 1px 3px rgba(27, 58, 91, 0.04);
}
.filter-item { display: flex; align-items: center; gap: 8px; }
.filter-item .lbl { font-size: 13px; color: #5B7A99; font-weight: 600; white-space: nowrap; }
.filter-item.grow { flex: 1; min-width: 280px; }
.code-input { width: 240px; }
.code-input :deep(.el-input__prefix) { color: #8C9BA8; }
.param-select { width: 100%; }
.batch-select { width: 140px; margin-left: 8px; }
.chart-context { margin-bottom: 12px; border-radius: 8px; }

/* 控制图卡片 */
.chart-card {
  border: 1px solid #ECE7E1; border-radius: 10px;
  transition: box-shadow .2s ease;
}
.cap-card { border: 1px solid #ECE7E1; }

/* 未选参数空状态引导 */
.need-param {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 72px 0; text-align: center;
  border: 1px dashed #C9D6E2; border-radius: 10px; background: #FAF8F5;
}
.np-icon { font-size: 40px; color: #B7C4D2; margin-bottom: 4px; }
.np-title { font-size: 15px; font-weight: 600; color: #5B7A99; }
.np-sub { font-size: 12px; color: #8C9BA8; }
.xbar-s-link { margin: 0 6px; font-size: 13px; }
.barcode-option { display: flex; flex-direction: column; line-height: 1.3; }
.barcode-option__code { font-weight: 600; color: var(--el-text-color-primary); }
.barcode-option__meta { font-size: 12px; color: var(--el-text-color-secondary); }

/* 同工序参数快速切换 (P2-2) */
.quick-switch {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 14px; margin-top: 10px;
  background: #FAF8F5; border: 1px solid #ECE7E1; border-radius: 6px;
}
.quick-switch-label { font-size: 12px; color: #5B7A99; font-weight: 500; white-space: nowrap; }
.quick-switch-link { font-size: 12px; padding: 2px 8px; border-radius: 3px; }
.quick-switch-link:hover { background: #E8E3DA; }

/* 子组卡片 */
.subgroup-card { margin-top: 12px; }

/* ── 悬浮锚点导航 ── */
.anchor-nav {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid #ECE7E1;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(27, 58, 91, 0.06);
}

.anchor-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 0;
  transition: opacity 0.2s;
  opacity: 0.45;
}

.anchor-item:hover,
.anchor-item.active {
  opacity: 1;
}

.anchor-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #C9D6E2;
  transition: background 0.25s, transform 0.25s;
}

.anchor-item.active .anchor-dot {
  background: #1B3A5B;
  transform: scale(1.4);
}

.anchor-dot.external {
  background: transparent;
  border: 1.5px dashed #C9D6E2;
}

.anchor-item.active .anchor-dot.external {
  border-color: #1B3A5B;
  background: #1B3A5B;
}

.anchor-label {
  font-size: 12px;
  color: #5B7A99;
  font-weight: 500;
  white-space: nowrap;
}

.anchor-divider {
  width: 16px;
  height: 1px;
  background: #ECE7E1;
  margin: 4px 0;
  align-self: center;
}
</style>

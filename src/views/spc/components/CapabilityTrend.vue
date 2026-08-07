<template>
  <div class="cap-trend">
    <div class="trend-head">
      <span class="trend-title">过程均值（X̄）趋势</span>
      <span class="trend-tag">{{ chartTypeLabel }}</span>
    </div>

    <div v-if="hasData" class="spec-bar">
      <span>规格上限 USL <b class="usl">{{ fmt(usl) }}</b></span>
      <span>目标 <b>{{ fmt(target) }}</b></span>
      <span>规格下限 LSL <b class="lsl">{{ fmt(lsl) }}</b></span>
      <span class="unit">单位：{{ unit || '—' }}</span>
    </div>

    <div ref="chartRef" class="trend-body"></div>

    <div class="trend-caption" v-if="hasData">
      <span>UCL <b>{{ fmt(limits.ucl) }}</b></span>
      <span>CL <b>{{ fmt(limits.cl) }}</b></span>
      <span>LCL <b>{{ fmt(limits.lcl) }}</b></span>
      <span class="ooc" :class="{ 'ooc-on': limits.ooc > 0 }">失控点 {{ limits.ooc }}</span>
    </div>

    <div v-if="anomalies.length" class="anomaly-box">
      <div class="anomaly-head">⚠ 检出 {{ anomalies.length }} 个异常子组（判异规则）：</div>
      <ul>
        <li v-for="a in pagedAnomalies" :key="a.index">
          <b>{{ a.subgroupNo }}</b>：{{ a.rules.join('、') }}
        </li>
      </ul>
      <div v-if="anomalies.length > anomalyPageSize" class="anomaly-pager">
        <el-pagination
          v-model:current-page="anomalyPage"
          :page-size="anomalyPageSize"
          :total="anomalies.length"
          layout="prev, pager, next"
          small
          background
        />
      </div>
    </div>

    <el-empty v-if="!hasData" description="暂无数据" :image-size="60" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { useSpcStore } from '@/stores/spc'
import { detectControlRules } from '@/utils/spcRules'
import { buildLimitMarks, axisRange, spanOf } from '@/utils/spcChartMarks'

const props = defineProps<{
  paramId: number | null
  itemType?: 'PRODUCT' | 'MATERIAL'
  itemCode?: string
}>()
const store = useSpcStore()

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

const chartType = computed(() => store.parameterList.find((p) => p.id === props.paramId)?.chartType || 'Xbar-R')
const chartTypeLabel = computed(() => (chartType.value === 'Xbar-s' ? 'Xbar-s 均值' : 'Xbar-R 均值'))
const data = computed(() => (chartType.value === 'Xbar-s' ? store.chartDataXbarS : store.chartDataXbarR))
const hasData = computed(() => (data.value?.points?.length || 0) > 0)

const param = computed(() => store.parameterList.find((p) => p.id === props.paramId) || null)
const unit = computed(() => param.value?.unit || '')
// 规格限：优先从 chartData（FAI 标准层解析结果），未选产品时为 null → 不展示规格线
const usl = computed(() => (data.value?.upperSpecLimit == null ? null : Number(data.value.upperSpecLimit)))
const lsl = computed(() => (data.value?.lowerSpecLimit == null ? null : Number(data.value.lowerSpecLimit)))
const target = computed(() => (data.value?.targetValue == null ? null : Number(data.value.targetValue)))

const limits = ref<{ ucl: number | null; cl: number | null; lcl: number | null; ooc: number }>({
  ucl: null,
  cl: null,
  lcl: null,
  ooc: 0,
})
const anomalies = ref<ReturnType<typeof detectControlRules>['anomalies']>([])
const anomalyPageSize = 10
const anomalyPage = ref(1)
const pagedAnomalies = computed(() => {
  const start = (anomalyPage.value - 1) * anomalyPageSize
  return anomalies.value.slice(start, start + anomalyPageSize)
})

function n(v: number | null | undefined): number | null {
  return v == null ? null : Number(v)
}
function fmt(v: number | null | undefined): string {
  return v == null ? '—' : Number(v).toFixed(3)
}

function handleResize() {
  chart?.resize()
}

function render() {
  if (!chart) return
  const d = data.value
  if (!d || !d.points || !d.points.length) {
    chart.clear()
    limits.value = { ucl: null, cl: null, lcl: null, ooc: 0 }
    anomalies.value = []
    return
  }
  const fullNos = d.points.map((p) => p.subgroupNo)
  const cats = d.points.map((_, i) => `子组 ${i + 1}`)
  const x = d.points.map((p) => n(p.x))
  const xUcl = n(d.xbarUcl)
  const xCl = n(d.xbarCl)
  const xLcl = n(d.xbarLcl)

  const res = detectControlRules(x, xCl, xUcl, xLcl, cats)
  anomalies.value = res.anomalies
  anomalyPage.value = 1
  const oocCount = x.filter((v) => v != null && ((xUcl != null && v > xUcl) || (xLcl != null && v < xLcl))).length
  limits.value = { ucl: xUcl, cl: xCl, lcl: xLcl, ooc: oocCount }

  const xSeries = x.map((v, i) => {
    const t = res.tags.get(i) || []
    const isBeyond = (v != null && ((xUcl != null && v > xUcl) || (xLcl != null && v < xLcl)))
    return {
      value: v,
      itemStyle: {
        color: isBeyond ? '#B84B3E' : '#1B3A5B',
        borderColor: !isBeyond && t.length ? '#B84B3E' : 'transparent',
        borderWidth: !isBeyond && t.length ? 2 : 0,
      },
      label: t.length
        ? { show: true, position: 'top' as const, fontSize: 9, color: '#B84B3E', formatter: t.join('\n') }
        : { show: false },
    }
  })

  const span = spanOf(x, [xUcl, xCl, xLcl, usl.value, lsl.value])
  const limitMark = buildLimitMarks([
    { label: 'UCL', value: xUcl, kind: 'ctrl' },
    { label: 'CL', value: xCl, kind: 'ctrl' },
    { label: 'LCL', value: xLcl, kind: 'ctrl' },
  ], span)
  const specMark = buildLimitMarks([
    { label: 'USL', value: usl.value, kind: 'spec' },
    { label: 'LSL', value: lsl.value, kind: 'spec' },
  ], span)

  chart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const i = params[0]?.dataIndex ?? 0
          return `子组 ${i + 1}（${fullNos[i]}）<br/>均值 X：<b>${params[0]?.value == null ? '—' : Number(params[0].value).toFixed(3)}</b>`
        },
      },
      legend: { data: ['均值 X'], top: 0, right: 12, itemWidth: 16, itemHeight: 10, textStyle: { color: '#5B7A99', fontSize: 11 } },
      grid: { left: 64, right: 28, top: 40, bottom: 40 },
      xAxis: {
        type: 'category',
        data: cats,
        boundaryGap: false,
        name: '子组序号',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: '#8C9BA8', fontSize: 10 },
        axisLabel: { color: '#8C9BA8', fontSize: 10, rotate: cats.length > 16 ? 45 : 0 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        ...axisRange(x, [xUcl, xCl, xLcl, usl.value, lsl.value]),
        name: `X̄（${unit.value}）`,
        nameTextStyle: { color: '#5B7A99', fontSize: 10 },
        splitLine: { lineStyle: { color: '#F0EDE9' } },
        axisLabel: { color: '#8C9BA8' },
      },
      series: [
        {
          name: '均值 X',
          type: 'line',
          data: xSeries,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#1B3A5B', width: 2.5 },
          z: 3,
          markLine: limitMark,
        },
        {
          name: '规格限',
          type: 'line',
          data: [],
          symbol: 'none',
          lineStyle: { opacity: 0 },
          z: 1,
          markLine: specMark,
        },
      ],
    },
    true,
  )
}

async function load() {
  if (!props.paramId) return
  // 必须透传分类与代码：本组件与控制图共用 store 中同一份图表数据，
  // 若此处不带筛选条件，会用全量数据覆盖控制图已按分类过滤的结果。
  if (chartType.value === 'Xbar-s') {
    await store.fetchChartDataXbarS(props.paramId, props.itemType, props.itemCode)
  } else {
    await store.fetchChartDataXbarR(props.paramId, props.itemType, props.itemCode)
  }
  render()
}

watch(
  () => [props.paramId, props.itemType, props.itemCode],
  () => load(),
)
function initChart() {
  if (!chartRef.value || chart) return
  chart = echarts.init(chartRef.value!)
  ro = new ResizeObserver(() => {
    // 仅当容器可见（宽度>0）时 resize，避免隐藏 Tab 内的 0 尺寸容器触发无限重渲染
    if (chart && chartRef.value && chartRef.value.clientWidth > 0) chart.resize()
  })
  ro.observe(chartRef.value!)
  load()
}
onMounted(() => { initChart() })
onUnmounted(() => {
  ro?.disconnect()
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.cap-trend { width: 100%; }
.trend-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.trend-title { font-size: 13px; font-weight: 600; color: #1b3a5b; }
.trend-tag { font-size: 11px; color: #5b7a99; background: #eef2f6; border-radius: 4px; padding: 1px 6px; }
.spec-bar { display: flex; gap: 16px; flex-wrap: wrap; font-size: 11px; color: #8c9ba8; margin-bottom: 6px; }
.spec-bar b { font-weight: 600; color: #5b7a99; }
.spec-bar .usl { color: #b84b3e; }
.spec-bar .lsl { color: #b84b3e; }
.spec-bar .unit { margin-left: auto; }
.trend-body { width: 100%; height: 260px; }
.trend-caption { display: flex; gap: 14px; flex-wrap: wrap; font-size: 11px; color: #8c9ba8; margin-top: 4px; }
.trend-caption b { color: #5b7a99; font-weight: 600; }
.trend-caption .ooc { color: #5b7a99; }
.trend-caption .ooc-on { color: #b84b3e; font-weight: 600; }
.anomaly-box { margin-top: 8px; background: #FBF1EF; border: 1px solid #E7C4BE; border-radius: 6px; padding: 8px 12px; }
.anomaly-head { color: #B84B3E; font-weight: 600; font-size: 12px; margin-bottom: 4px; }
.anomaly-box ul { margin: 0; padding-left: 18px; }
.anomaly-box li { font-size: 11px; color: #8C5A52; line-height: 1.7; }
.anomaly-box b { color: #B84B3E; }
.anomaly-pager { margin-top: 8px; display: flex; justify-content: center; }
</style>

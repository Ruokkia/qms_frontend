<template>
  <div class="cap-hist">
    <div class="hist-head">
      <span class="hist-title">样本分布直方图（含正态拟合与规格限）</span>
    </div>

    <div v-if="hasData" class="spec-bar">
      <span>规格上限 USL <b class="usl">{{ fmt(usl) }}</b></span>
      <span>目标 <b>{{ fmt(target) }}</b></span>
      <span>规格下限 LSL <b class="lsl">{{ fmt(lsl) }}</b></span>
      <span>子组 <b>{{ subgroupCount }}</b> · n=<b>{{ subgroupSize }}</b> · 样本 <b>{{ stats.n }}</b></span>
      <span class="unit">单位：{{ unit || '—' }}</span>
    </div>

    <div ref="chartRef" class="hist-body"></div>

    <div class="hist-caption" v-if="hasData">
      <span>样本 n <b>{{ stats.n }}</b></span>
      <span>均值 X̄ <b>{{ fmt(stats.mean) }}</b></span>
      <span>标准差 σ <b>{{ fmt(stats.std) }}</b></span>
      <span v-if="cap" :class="judgeClass">Cpk {{ fmt(cap.cpk) }}（{{ cap.judgment }}）</span>
    </div>
    <el-empty v-if="!hasData" description="暂无样本数据" :image-size="60" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { useSpcStore } from '@/stores/spc'

const props = defineProps<{ paramId: number | null }>()
const store = useSpcStore()

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

const values = ref<number[]>([])
const stats = ref<{ n: number; mean: number; std: number }>({ n: 0, mean: 0, std: 0 })
const cap = computed(() => (props.paramId ? store.capabilityResult : null))
const hasData = computed(() => values.value.length > 0)

const param = computed(() => store.parameterList.find((p) => p.id === props.paramId) || null)
const unit = computed(() => param.value?.unit || '')
// 规格限：从 store.capabilityResult（FAI 标准层解析结果），未选产品时为 null → 不展示规格线
const usl = computed(() => (cap.value?.upperSpecLimit == null ? null : Number(cap.value.upperSpecLimit)))
const lsl = computed(() => (cap.value?.lowerSpecLimit == null ? null : Number(cap.value.lowerSpecLimit)))
const target = computed(() => (cap.value?.targetValue == null ? null : Number(cap.value.targetValue)))
const subgroupSize = computed(() => cap.value?.subgroupSize ?? param.value?.subgroupSize ?? 0)
const subgroupCount = computed(() => (props.paramId ? store.subgroupList.length : 0))

function n(v: number | null | undefined): number | null {
  return v == null ? null : Number(v)
}
function fmt(v: number | null | undefined): string {
  return v == null ? '—' : Number(v).toFixed(3)
}
const judgeClass = computed(() => {
  const j = cap.value?.judgment || ''
  if (j.includes('充足')) return 'judge ok'
  if (j.includes('不足')) return 'judge bad'
  return 'judge warn'
})

function handleResize() {
  chart?.resize()
}

async function load() {
  if (!props.paramId) {
    values.value = []
    stats.value = { n: 0, mean: 0, std: 0 }
    return
  }
  const list = await store.fetchSubgroups(props.paramId)
  const arr: number[] = []
  list.forEach((sg) => (sg.samples || []).forEach((s) => arr.push(Number(s.sampleValue))))
  values.value = arr
  render()
}

function render() {
  if (!chart) return
  const arr = values.value
  if (!arr.length) {
    chart.clear()
    stats.value = { n: 0, mean: 0, std: 0 }
    return
  }

  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1 || 1)
  const std = Math.sqrt(variance) || 1e-9
  stats.value = { n: arr.length, mean, std }

  const uslV = n(usl.value)
  const lslV = n(lsl.value)

  const dataMin = Math.min(...arr)
  const dataMax = Math.max(...arr)
  let axisMin = dataMin
  let axisMax = dataMax
  if (lslV != null) axisMin = Math.min(axisMin, lslV)
  if (uslV != null) axisMax = Math.max(axisMax, uslV)
  const pad = (axisMax - axisMin) * 0.06 || 1
  axisMin -= pad
  axisMax += pad

  const binCount = Math.min(20, Math.max(8, Math.round(Math.sqrt(arr.length))))
  const binWidth = (axisMax - axisMin) / binCount
  const bins: { center: number; count: number }[] = []
  for (let i = 0; i < binCount; i++) bins.push({ center: axisMin + (i + 0.5) * binWidth, count: 0 })
  arr.forEach((v) => {
    let idx = Math.floor((v - axisMin) / binWidth)
    if (idx < 0) idx = 0
    if (idx >= binCount) idx = binCount - 1
    bins[idx].count++
  })

  const inv = 1 / (std * Math.sqrt(2 * Math.PI))
  const normPts: [number, number][] = []
  const steps = 160
  for (let i = 0; i <= steps; i++) {
    const xv = axisMin + ((axisMax - axisMin) * i) / steps
    const y = arr.length * binWidth * inv * Math.exp(-Math.pow(xv - mean, 2) / (2 * std * std))
    normPts.push([Number(xv.toFixed(6)), Number(y.toFixed(3))])
  }

  const specMark = {
    silent: true,
    symbol: 'none',
    lineStyle: { color: '#B84B3E', type: 'dashed' as const, width: 1.6 },
    label: { show: false },
    data: [
      ...(uslV != null ? [{ xAxis: Number(uslV.toFixed(6)), name: 'USL', label: { show: true, formatter: `USL ${fmt(uslV)}`, color: '#B84B3E', fontSize: 10, position: 'end' as const } }] : []),
      ...(lslV != null ? [{ xAxis: Number(lslV.toFixed(6)), name: 'LSL', label: { show: true, formatter: `LSL ${fmt(lslV)}`, color: '#B84B3E', fontSize: 10, position: 'end' as const } }] : []),
    ],
  }
  const meanMark = {
    silent: true,
    symbol: 'none',
    lineStyle: { color: '#B8763E', type: 'solid' as const, width: 1.4 },
    label: { show: true, formatter: `X̄ ${fmt(mean)}`, color: '#B8763E', fontSize: 10, position: 'end' as const },
    data: [{ xAxis: Number(mean.toFixed(6)) }],
  }

  chart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params
          return `区间中心 ${Number(p.value[0]).toFixed(3)}<br/>频数 ${Math.round(p.value[1])}`
        },
      },
      legend: { data: ['频数', '正态拟合'], top: 0, right: 12, itemWidth: 16, itemHeight: 10, textStyle: { color: '#5B7A99', fontSize: 11 } },
      grid: { left: 52, right: 28, top: 38, bottom: 44 },
      xAxis: {
        type: 'value',
        min: Number(axisMin.toFixed(6)),
        max: Number(axisMax.toFixed(6)),
        name: `测量值（${unit || ''}）`,
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: '#5B7A99', fontSize: 10 },
        axisLabel: { color: '#8C9BA8', fontSize: 10 },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#ECE7E1' } },
      },
      yAxis: {
        type: 'value',
        name: '频数',
        nameTextStyle: { color: '#5B7A99', fontSize: 10 },
        splitLine: { lineStyle: { color: '#F4F1ED' } },
        axisLabel: { color: '#8C9BA8' },
      },
      series: [
        {
          name: '频数',
          type: 'custom',
          renderItem: (params: any, api: any) => {
            const center = api.value(0)
            const cnt = api.value(1)
            const pt = api.coord([center, cnt])
            const base = api.coord([center, 0])
            const half = api.size([binWidth, 0])[0] / 2
            return {
              type: 'rect',
              shape: {
                x: pt[0] - half,
                y: pt[1],
                width: half * 2,
                height: Math.max(0, base[1] - pt[1]),
              },
              style: { fill: '#5B7A99' },
            }
          },
          encode: { x: 0, y: 1 },
          data: bins.map((b) => [Number(b.center.toFixed(6)), b.count]),
          z: 1,
        },
        {
          name: '正态拟合',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: normPts,
          lineStyle: { color: '#B8763E', width: 2 },
          z: 2,
          markLine: specMark,
        },
        {
          name: '均值线',
          type: 'line',
          data: [],
          symbol: 'none',
          lineStyle: { opacity: 0 },
          z: 1,
          markLine: meanMark,
        },
      ],
    },
    true,
  )
}

watch(
  () => props.paramId,
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
.cap-hist { width: 100%; }
.hist-head { margin-bottom: 6px; }
.hist-title { font-size: 13px; font-weight: 600; color: #1b3a5b; }
.spec-bar { display: flex; gap: 16px; flex-wrap: wrap; font-size: 11px; color: #8c9ba8; margin-bottom: 6px; }
.spec-bar b { font-weight: 600; color: #5b7a99; }
.spec-bar .usl { color: #b84b3e; }
.spec-bar .lsl { color: #b84b3e; }
.spec-bar .unit { margin-left: auto; }
.hist-body { width: 100%; height: 320px; }
.hist-caption { display: flex; gap: 16px; flex-wrap: wrap; font-size: 11px; color: #8c9ba8; margin-top: 4px; }
.hist-caption b { color: #5b7a99; font-weight: 600; }
.hist-caption .judge { font-weight: 600; }
.hist-caption .judge.ok { color: #3e7a4e; }
.hist-caption .judge.warn { color: #b8763e; }
.hist-caption .judge.bad { color: #b84b3e; }
</style>

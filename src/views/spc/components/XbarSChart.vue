<template>
  <div class="spc-chart">
    <div class="chart-toolbar">
      <div class="chart-title-wrap">
        <span class="chart-title">Xbar-s 控制图</span>
        <span class="chart-meta">子组 <b>{{ subgroupCount }}</b> · 每组样本 n=<b>{{ subgroupSize }}</b> · 样本 <b>{{ sampleTotal }}</b></span>
      </div>
      <el-button size="small" :loading="recalcLoading" @click="onRecalc">重新计算控制限</el-button>
    </div>

    <div v-if="hasData && xCl == null" class="limit-missing-hint">
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>尚未生成控制限基线，请点击「重新计算控制限」按钮生成，以便判定过程稳定性并标注异常点。</template>
      </el-alert>
    </div>

    <div v-if="hasData" class="stat-grid">
      <div class="stat-cell">
        <span class="stat-label">均值 X̄</span>
        <span class="stat-value">{{ fmt(xCl) }}<i class="stat-unit">{{ unit }}</i></span>
      </div>
      <div class="stat-cell">
        <span class="stat-label">标准差 s̄</span>
        <span class="stat-value">{{ fmt(sCl) }}<i class="stat-unit">{{ unit }}</i></span>
      </div>
      <div class="stat-cell">
        <span class="stat-label">最大值</span>
        <span class="stat-value">{{ fmt(maxVal) }}<i class="stat-unit">{{ unit }}</i></span>
      </div>
      <div class="stat-cell">
        <span class="stat-label">最小值</span>
        <span class="stat-value">{{ fmt(minVal) }}<i class="stat-unit">{{ unit }}</i></span>
      </div>
      <div class="stat-cell">
        <span class="stat-label">样本总数</span>
        <span class="stat-value">{{ sampleTotal }}</span>
      </div>
    </div>

    <div ref="chartRef" class="chart-body"></div>

    <!-- 过程能力分析（使用专用能力 API 结果，与过程能力 tab 一致） -->
    <CapabilityCard
      v-if="data"
      :cp="capValues.cp"
      :cpk="capValues.cpk"
      :pp="capValues.pp"
      :ppk="capValues.ppk"
      :sigma-within="null"
      :sigma-overall="null"
    />

    <!-- 控制限数值表（工厂审核用，含公式） -->
    <div v-if="hasData" class="limit-table">
      <table>
        <thead>
          <tr><th>统计量</th><th>UCL</th><th>CL</th><th>LCL</th><th>计算公式</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>均值 X 中心线</td>
            <td :class="{ danger: xOoc }">{{ fmt(xUcl) }}</td>
            <td>{{ fmt(xCl) }}</td>
            <td :class="{ danger: xOoc }">{{ fmt(xLcl) }}</td>
            <td class="formula">X̄ ± A₃·s̄</td>
          </tr>
          <tr>
            <td>标准差 s 中心线</td>
            <td>{{ fmt(sUcl) }}</td>
            <td>{{ fmt(sCl) }}</td>
            <td>{{ fmt(sLcl) }}</td>
            <td class="formula">UCL=B₄·s̄ / LCL=B₃·s̄</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 异常点说明 -->
    <div v-if="anomalies.length" class="anomaly-box">
      <div class="anomaly-head">⚠ 检出 {{ anomalies.length }} 个异常子组（判异规则），点击可定位：</div>
      <ul>
        <li v-for="a in pagedAnomalies" :key="a.index" class="anomaly-item" @click="emit('subgroup-click', { subgroupIndex: a.index, subgroupNo: a.subgroupNo, subgroupId: a.subgroupId })">
          <b>#{{ a.index + 1 }} {{ a.subgroupNo }}</b>：{{ a.rules.join('、') }}
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

    <el-empty v-if="!hasData" description="该参数暂无子组数据，请先在上方选择代码或采集数据" :image-size="72" class="chart-empty" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { useSpcStore } from '@/stores/spc'
import type { SpcChartData } from '@/types/spc'
import { detectControlRules } from '@/utils/spcRules'
import { buildLimitMarks, axisRange, spanOf } from '@/utils/spcChartMarks'
import CapabilityCard from './CapabilityCard.vue'

const props = defineProps<{
  paramId: number | null
  itemType?: 'PRODUCT' | 'MATERIAL'
  itemCode?: string
  batchNo?: string
}>()

const emit = defineEmits<{
  (e: 'subgroup-click', payload: { subgroupIndex: number; subgroupNo: string; subgroupId?: number }): void
}>()

function getControlColor(v: number | null, upper: number | null, lower: number | null): string {
  if (v == null) return '#5B7A99'
  if ((upper != null && v > upper) || (lower != null && v < lower)) return '#B84B3E'
  return '#3E7A4E'
}

const store = useSpcStore()

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null
const recalcLoading = ref(false)

const data = computed<SpcChartData | null>(() => store.chartDataXbarS)

// 控制图内嵌能力卡片使用专用能力 API 结果（与过程能力 tab 一致）
const capValues = computed(() => ({
  cp: store.capabilityResult?.cp ?? null,
  cpk: store.capabilityResult?.cpk ?? null,
  pp: store.capabilityResult?.pp ?? null,
  ppk: store.capabilityResult?.ppk ?? null,
} as { cp: number | null; cpk: number | null; pp: number | null; ppk: number | null }))
const hasData = computed(() => (data.value?.points?.length || 0) > 0)
const param = computed(() => store.parameterList.find((p) => p.id === props.paramId) || null)
const subgroupSize = computed(() => data.value?.subgroupSize ?? param.value?.subgroupSize ?? 0)
const subgroupCount = computed(() => data.value?.points?.length || 0)
const sampleTotal = computed(() => subgroupCount.value * (subgroupSize.value || 0))
const unit = computed(() => param.value?.unit || '')
const maxVal = computed(() => {
  const xs = (data.value?.points || []).map((p) => n(p.x)).filter((v): v is number => v != null)
  return xs.length ? Math.max(...xs) : null
})
const minVal = computed(() => {
  const xs = (data.value?.points || []).map((p) => n(p.x)).filter((v): v is number => v != null)
  return xs.length ? Math.min(...xs) : null
})
// 规格限：优先从 chartData（FAI 标准层解析结果），未选产品时为 null → 不展示规格线
const usl = computed(() => (data.value?.upperSpecLimit == null ? null : Number(data.value.upperSpecLimit)))
const lsl = computed(() => (data.value?.lowerSpecLimit == null ? null : Number(data.value.lowerSpecLimit)))

const xUcl = ref<number | null>(null)
const xCl = ref<number | null>(null)
const xLcl = ref<number | null>(null)
const sUcl = ref<number | null>(null)
const sCl = ref<number | null>(null)
const sLcl = ref<number | null>(null)
const xOoc = ref(false)
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

/** 容错读取控制限：兼容后端不同序列化大小写（sUcl / sucl / SUcl） */
function lv(obj: any, keys: string[]): number | null {
  for (const k of keys) {
    if (obj && obj[k] != null) return Number(obj[k])
  }
  return null
}

/** 限定线构建与坐标轴范围计算见 @/utils/spcChartMarks（合并塌缩线 + 规格限/控制限标签左右错开）。 */

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  ro = new ResizeObserver(() => {
    if (chart && chartRef.value && chartRef.value.clientWidth > 0) chart.resize()
  })
  ro.observe(chartRef.value)
}

function handleResize() {
  chart?.resize()
}

function render() {
  if (!chart) return
  const d = data.value
  if (!d || !d.points || !d.points.length) {
    chart.clear()
    return
  }
  const fullNos = d.points.map((p) => p.subgroupNo)
  const fullIds = d.points.map((p) => p.subgroupId)
  const cats = d.points.map((_, i) => `子组 ${i + 1}`)
  const x = d.points.map((p) => n(p.x))
  const s = d.points.map((p) => n(p.s))
  const xu = lv(d, ['xbarUcl', 'xbarucl', 'XbarUcl']), xc = lv(d, ['xbarCl', 'xbarcl', 'XbarCl']), xl = lv(d, ['xbarLcl', 'xbarlcl', 'XbarLcl'])
  const su = lv(d, ['sUcl', 'sucl', 'SUcl'])
  const sc = lv(d, ['sCl', 'scl', 'SCl'])
  const sl = lv(d, ['sLcl', 'slcl', 'SLcl'])
  xUcl.value = xu; xCl.value = xc; xLcl.value = xl
  sUcl.value = su; sCl.value = sc; sLcl.value = sl

  const xRes = detectControlRules(x, xc, xu, xl, fullNos, fullIds)
  anomalies.value = xRes.anomalies
  anomalyPage.value = 1
  xOoc.value = xRes.tags.size > 0

  // 批次分组（与 XbarRChart 一致）
  const BATCH_PALETTE = ['#1B3A5B', '#B84B3E', '#3E7A4E', '#D48217', '#6B4E8D', '#2F7CA6', '#C24B7C', '#5A8A5A']
  const batchMap = new Map<string, number[]>()
  d.points.forEach((p, i) => {
    const bn = (p.batchNo || '').trim() || '__default__'
    if (!batchMap.has(bn)) batchMap.set(bn, [])
    batchMap.get(bn)!.push(i)
  })
  const hasMultiBatches = batchMap.size > 1

  function buildBatchSeries(
    fnMap: (v: number | null, i: number, bn: string, batchIdx: number) => { value: number | null; itemStyle: Record<string, any>; label?: Record<string, any> },
    allVals: (number | null)[],
  ) {
    const seriesArr: any[] = []
    let batchIdx = 0
    for (const [bn, idxs] of batchMap.entries()) {
      const color = BATCH_PALETTE[batchIdx % BATCH_PALETTE.length]
      const data = allVals.map((val, gi) => {
        if (!idxs.includes(gi)) return null
        return fnMap(val, gi, bn, hasMultiBatches ? batchIdx : 0)
      })
      seriesArr.push({
        name: hasMultiBatches ? `批次 ${bn}` : bn,
        type: 'line', data, connectNulls: false,
        symbol: 'circle', symbolSize: 6,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
      })
      batchIdx++
    }
    return seriesArr
  }

  const xBatchSeries = buildBatchSeries((v, i, bn, batchIdx) => {
    const t = xRes.tags.get(i) || []
    const isBeyond = (v != null && ((xu != null && v > xu) || (xl != null && v < xl)))
    return {
      value: Array.isArray(v) ? v : (v ?? null),
      itemStyle: {
        color: isBeyond ? '#B84B3E' : undefined,
        borderColor: !isBeyond && t.length ? '#B84B3E' : 'transparent',
        borderWidth: !isBeyond && t.length ? 2 : 0,
      },
      label: t.length
        ? { show: true, position: 'top' as const, distance: 10, fontSize: 8, color: '#B84B3E', backgroundColor: 'rgba(255,255,255,0.85)', borderColor: '#B84B3E', borderWidth: 1, padding: [2, 4], borderRadius: 2, formatter: t.slice(0, 2).join('\n') }
        : { show: false },
    }
  }, x)

  const sBatchSeries = buildBatchSeries((v, i, bn, batchIdx) => ({
    value: Array.isArray(v) ? v : (v ?? null),
    itemStyle: { color: getControlColor(v, su, sl) },
  }), s)

  const xMarks = buildLimitMarks([
    { label: 'USL', value: usl.value, kind: 'spec' },
    { label: 'UCL', value: xu, kind: 'ctrl' },
    { label: 'CL', value: xc, kind: 'ctrl' },
    { label: 'LCL', value: xl, kind: 'ctrl' },
    { label: 'LSL', value: lsl.value, kind: 'spec' },
  ], spanOf(x, [xu, xc, xl, usl.value, lsl.value]))
  const sMarks = buildLimitMarks([
    { label: 'UCL', value: su, kind: 'ctrl' },
    { label: 'CL', value: sc, kind: 'ctrl' },
    { label: 'LCL', value: sl, kind: 'ctrl' },
  ], spanOf(s, [su, sc, sl]))

  const tip = (params: any) => {
    const i = params[0]?.dataIndex ?? 0
    const pt: any = d.points[i] || {}
    let s2 = `<b>子组 ${i + 1}</b><br/>`
    // 悬停只显示：该子组对应的批次号 + 样本数据 + 录入时间（精简低噪）
    if (pt.batchNo) s2 += `批次号：<b>${pt.batchNo}</b><br/>`
    if (pt.samples && pt.samples.length > 0) {
      s2 += `样本数据：`
      pt.samples.forEach((sv: any, si: number) => {
        s2 += `${sv != null ? Number(sv.sampleValue).toFixed(3) : '—'}`
        if (si < pt.samples.length - 1) s2 += ', '
      })
      s2 += '<br/>'
    }
    if (pt.sampleTime) s2 += `录入时间：<b>${pt.sampleTime}</b>`
    return s2
  }

  chart.setOption({
    tooltip: { trigger: 'axis', formatter: tip },
    legend: {
      data: hasMultiBatches
        ? [...batchMap.keys()].filter(b => b !== '__default__').map(b => `批次 ${b}`)
        : ['均值 X', '标准差 s'],
      top: 4, right: 12, itemWidth: 16, itemHeight: 10,
      textStyle: { color: '#5B7A99', fontSize: 11 },
    },
    grid: [
      { left: 76, right: 30, top: 54, height: '33%' },
      { left: 76, right: 30, top: '60%', height: '33%' },
    ],
    xAxis: [
      { type: 'category', gridIndex: 0, data: cats, axisLabel: { show: false }, axisTick: { show: false }, name: '子组序号', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: '#8C9BA8', fontSize: 10 } },
      { type: 'category', gridIndex: 1, data: cats, axisLabel: { color: '#8C9BA8', fontSize: 10 }, name: '子组序号', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: '#8C9BA8', fontSize: 10 } },
    ],
    yAxis: [
      { type: 'value', gridIndex: 0, ...axisRange(x, [xu, xc, xl, usl.value, lsl.value]), name: `均值 X（${unit}）`, nameLocation: 'middle', nameRotate: 90, nameGap: 46, nameTextStyle: { color: '#5B7A99', fontSize: 10 }, splitLine: { lineStyle: { color: '#F4F1ED' } }, axisLabel: { color: '#8C9BA8' } },
      { type: 'value', gridIndex: 1, ...axisRange(s, [su, sc, sl]), name: `标准差 s（${unit}）`, nameLocation: 'middle', nameRotate: 90, nameGap: 46, nameTextStyle: { color: '#5B7A99', fontSize: 10 }, splitLine: { lineStyle: { color: '#F4F1ED' } }, axisLabel: { color: '#8C9BA8' } },
    ],
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: [0, 1],
        bottom: 0,
        height: 22,
        start: 0,
        end: 100,
        borderColor: '#ECE7E1',
        fillerColor: 'rgba(27,58,91,0.08)',
        handleStyle: { color: '#5B7A99', borderColor: '#1B3A5B' },
        textStyle: { color: '#8C9BA8', fontSize: 10 },
        moveHandleStyle: { color: '#1B3A5B' },
      },
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      },
    ],
    series: [
      ...xBatchSeries.map((ser, si) => ({
        ...ser,
        name: hasMultiBatches ? `X̄ - ${ser.name}` : '均值 X',
        xAxisIndex: 0, yAxisIndex: 0, smooth: false,
        markLine: si === 0 ? xMarks : undefined,
      })),
      ...sBatchSeries.map((ser, si) => ({
        ...ser,
        name: hasMultiBatches ? `s - ${ser.name}` : '标准差 s',
        xAxisIndex: 1, yAxisIndex: 1, smooth: false,
        markLine: si === 0 ? sMarks : undefined,
      })),
    ],
  }, true)

  // 点击图表数据点 → 联动跳转子组明细
  chart.off('click')
  chart.on('click', (params: any) => {
    const i = params.dataIndex ?? -1
    if (i >= 0 && d.points[i]) {
      emit('subgroup-click', { subgroupIndex: i, subgroupNo: fullNos[i], subgroupId: d.points[i]?.subgroupId })
    }
  })
}

async function load() {
  if (!props.paramId) return
  // 图表数据 + 能力指数并行获取
  await Promise.all([
    store.fetchChartDataXbarS(props.paramId, props.itemType, props.itemCode, props.batchNo),
    store.fetchCapability(props.paramId, props.itemType, props.itemCode),
  ])
  render()
}

async function onRecalc() {
  if (!props.paramId) return
  recalcLoading.value = true
  try {
    await store.recalcControlLimits(props.paramId, props.itemType, props.itemCode)
    ElMessage.success('控制限已重算')
    await load()
  } finally {
    recalcLoading.value = false
  }
}

watch(() => [props.paramId, props.itemType, props.itemCode, props.batchNo], load)
onMounted(() => { initChart(); load() })
onUnmounted(() => {
  ro?.disconnect()
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.spc-chart { width: 100%; }
.chart-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.chart-title-wrap { display: flex; flex-direction: column; gap: 2px; }
.chart-title { font-weight: 700; font-size: 15px; color: #1B3A5B; letter-spacing: .3px; }
.chart-meta { font-size: 11px; color: #8C9BA8; }
.chart-meta b { color: #5B7A99; font-weight: 600; }

/* 统计指标网格 */
.stat-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.fallback-alert { margin-bottom: 12px; }
.stat-cell {
  flex: 1; min-width: 110px; padding: 10px 14px;
  background: #FAF8F5; border: 1px solid #ECE7E1; border-radius: 8px;
  display: flex; flex-direction: column; gap: 3px;
}
.stat-label { font-size: 11px; color: #8C9BA8; font-weight: 600; }
.stat-value { font-size: 17px; font-weight: 700; color: #1B3A5B; font-variant-numeric: tabular-nums; }
.stat-value .stat-unit { font-size: 11px; font-weight: 400; color: #8C9BA8; font-style: normal; margin-left: 3px; }

.chart-body { width: 100%; height: 380px; }
.limit-table { margin-top: 12px; width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; border-radius: 8px; overflow: hidden; border: 1px solid #ECE7E1; }
.limit-table th, .limit-table td { padding: 8px 12px; text-align: center; color: #5B7A99; }
.limit-table thead th { background: #1B3A5B; color: #FFFFFF; font-weight: 600; letter-spacing: .5px; }
.limit-table tbody tr:nth-child(even) td { background: #FAF8F5; }
.limit-table .formula { color: #8C9BA8; font-family: 'JetBrains Mono', monospace; }
.limit-table td.danger { color: #B84B3E; font-weight: 600; }
.anomaly-box { margin-top: 12px; background: #FBF1EF; border: 1px solid #E7C4BE; border-radius: 8px; padding: 10px 14px; }
.anomaly-head { color: #B84B3E; font-weight: 600; font-size: 12px; margin-bottom: 4px; }
.anomaly-box ul { margin: 0; padding-left: 18px; }
.anomaly-box li { font-size: 11px; color: #8C5A52; line-height: 1.7; }
.anomaly-item { cursor: pointer; transition: all .15s; border-radius: 3px; padding: 1px 4px; }
.anomaly-item:hover { background: rgba(184,75,62,0.08); color: #7A2E27; }
.anomaly-item b { color: #B84B3E; }
.anomaly-pager { margin-top: 8px; display: flex; justify-content: center; }
.chart-empty { padding: 36px 0; }
</style>

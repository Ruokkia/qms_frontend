<template>
  <div class="spc-chart">
    <div class="chart-toolbar">
      <span class="chart-title">Xbar-s 控制图</span>
      <span class="chart-meta">
        子组 <b>{{ subgroupCount }}</b> · 每组样本 n=<b>{{ subgroupSize }}</b> · 样本 <b>{{ sampleTotal }}</b>
      </span>
      <el-button size="small" :loading="recalcLoading" @click="onRecalc">重新计算控制限</el-button>
    </div>
    <div ref="chartRef" class="chart-body"></div>

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
            <td class="formula">X̄̄ ± A₃·s̄</td>
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

    <el-empty v-if="!hasData" description="该参数暂无子组数据，请先采集" :image-size="70" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { useSpcStore } from '@/stores/spc'
import type { SpcChartData } from '@/types/spc'
import { detectControlRules } from '@/utils/spcRules'

const props = defineProps<{ paramId: number | null }>()
const store = useSpcStore()

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null
const recalcLoading = ref(false)

const data = computed<SpcChartData | null>(() => store.chartDataXbarS)
const hasData = computed(() => (data.value?.points?.length || 0) > 0)
const param = computed(() => store.parameterList.find((p) => p.id === props.paramId) || null)
const subgroupSize = computed(() => param.value?.subgroupSize ?? 0)
const subgroupCount = computed(() => data.value?.points?.length || 0)
const sampleTotal = computed(() => subgroupCount.value * (subgroupSize.value || 0))
const unit = computed(() => param.value?.unit || '')

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
  const cats = d.points.map((_, i) => `子组 ${i + 1}`)
  const x = d.points.map((p) => n(p.x))
  const s = d.points.map((p) => n(p.s))
  const xu = n(d.xbarUcl), xc = n(d.xbarCl), xl = n(d.xbarLcl)
  const su = lv(d, ['sUcl', 'sucl', 'SUcl'])
  const sc = lv(d, ['sCl', 'scl', 'SCl'])
  const sl = lv(d, ['sLcl', 'slcl', 'SLcl'])
  xUcl.value = xu; xCl.value = xc; xLcl.value = xl
  sUcl.value = su; sCl.value = sc; sLcl.value = sl

  const xRes = detectControlRules(x, xc, xu, xl, fullNos)
  anomalies.value = xRes.anomalies
  anomalyPage.value = 1
  xOoc.value = xRes.tags.size > 0

  const xSeries = x.map((v, i) => {
    const t = xRes.tags.get(i) || []
    const isBeyond = (v != null && ((xu != null && v > xu) || (xl != null && v < xl)))
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
  const sSeries = s.map((v) => ({
    value: v,
    itemStyle: {
      color: v == null ? '#5B7A99' : (su != null && v > su) || (sl != null && v < sl) ? '#B84B3E' : '#3E7A4E',
    },
  }))

  const limitLine = (ucl: number | null, cl: number | null, lcl: number | null, color: string) => ({
    silent: true,
    symbol: 'none',
    lineStyle: { color, type: 'dashed' as const, width: 1.2 },
    label: { show: false },
    data: [
      ...(ucl != null
        ? [{ yAxis: ucl, name: 'UCL', label: { show: true, formatter: `UCL ${fmt(ucl)}`, color, fontSize: 10, position: 'end' as const } }]
        : []),
      ...(cl != null
        ? [{ yAxis: cl, name: 'CL', label: { show: true, formatter: `CL ${fmt(cl)}`, color, fontSize: 10, position: 'end' as const } }]
        : []),
      ...(lcl != null
        ? [{ yAxis: lcl, name: 'LCL', label: { show: true, formatter: `LCL ${fmt(lcl)}`, color, fontSize: 10, position: 'end' as const } }]
        : []),
    ],
  })

  const tip = (params: any) => {
    const i = params[0]?.dataIndex ?? 0
    let s2 = `子组 ${i + 1}（${fullNos[i]}）<br/>`
    params.forEach((p: any) => {
      s2 += `${p.marker}${p.seriesName}：<b>${p.value == null ? '—' : Number(p.value).toFixed(3)}</b><br/>`
    })
    return s2
  }

  chart.setOption({
    tooltip: { trigger: 'axis', formatter: tip },
    legend: { data: ['均值 X', '标准差 s'], top: 4, right: 12, itemWidth: 16, itemHeight: 10, textStyle: { color: '#5B7A99', fontSize: 11 } },
    grid: [
      { left: 70, right: 28, top: 44, height: '38%' },
      { left: 70, right: 28, top: '56%', height: '32%' },
    ],
    xAxis: [
      { type: 'category', gridIndex: 0, data: cats, axisLabel: { show: false }, axisTick: { show: false }, name: '子组序号', nameLocation: 'middle', nameGap: 24, nameTextStyle: { color: '#8C9BA8', fontSize: 10 } },
      { type: 'category', gridIndex: 1, data: cats, axisLabel: { color: '#8C9BA8', fontSize: 10 }, name: '子组序号', nameLocation: 'middle', nameGap: 24, nameTextStyle: { color: '#8C9BA8', fontSize: 10 } },
    ],
    yAxis: [
      { type: 'value', gridIndex: 0, scale: true, name: `均值 X（${unit}）`, nameTextStyle: { color: '#5B7A99', fontSize: 10 }, splitLine: { lineStyle: { color: '#F4F1ED' } }, axisLabel: { color: '#8C9BA8' } },
      { type: 'value', gridIndex: 1, scale: true, name: `标准差 s（${unit}）`, nameTextStyle: { color: '#5B7A99', fontSize: 10 }, splitLine: { lineStyle: { color: '#F4F1ED' } }, axisLabel: { color: '#8C9BA8' } },
    ],
    series: [
      {
        name: '均值 X',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: xSeries,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#1B3A5B', width: 2 },
        markLine: limitLine(xu, xc, xl, '#B84B3E'),
      },
      {
        name: '标准差 s',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: sSeries,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#3E7A4E', width: 2 },
        markLine: limitLine(su, sc, sl, '#B84B3E'),
      },
    ],
  }, true)
}

async function load() {
  if (!props.paramId) return
  await store.fetchChartDataXbarS(props.paramId)
  render()
}

async function onRecalc() {
  if (!props.paramId) return
  recalcLoading.value = true
  try {
    await store.recalcControlLimits(props.paramId)
    ElMessage.success('控制限已重算')
    await load()
  } finally {
    recalcLoading.value = false
  }
}

watch(() => props.paramId, load)
onMounted(() => { initChart(); load() })
onUnmounted(() => {
  ro?.disconnect()
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.spc-chart { width: 100%; }
.chart-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
.chart-title { font-weight: 600; color: #1B3A5B; }
.chart-meta { font-size: 11px; color: #8C9BA8; }
.chart-meta b { color: #5B7A99; font-weight: 600; }
.chart-body { width: 100%; height: 380px; }
.limit-table { margin-top: 10px; width: 100%; border-collapse: collapse; font-size: 11px; }
.limit-table th, .limit-table td { border: 1px solid #ECE7E1; padding: 7px 12px; text-align: center; color: #5B7A99; }
.limit-table th { background: #F7F5F2; font-weight: 600; }
.limit-table .formula { color: #8C9BA8; font-family: 'JetBrains Mono', monospace; }
.limit-table td.danger { color: #B84B3E; font-weight: 600; }
.anomaly-box { margin-top: 10px; background: #FBF1EF; border: 1px solid #E7C4BE; border-radius: 6px; padding: 8px 12px; }
.anomaly-head { color: #B84B3E; font-weight: 600; font-size: 12px; margin-bottom: 4px; }
.anomaly-box ul { margin: 0; padding-left: 18px; }
.anomaly-box li { font-size: 11px; color: #8C5A52; line-height: 1.7; }
.anomaly-box b { color: #B84B3E; }
.anomaly-pager { margin-top: 8px; display: flex; justify-content: center; }
</style>

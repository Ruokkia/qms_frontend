<template>
  <div ref="chartRef" class="trend-chart"></div>
</template>

<script setup lang="ts">
// ===== M1: 重点供应商合格率趋势对比图（近30天批次量 Top5） =====
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { KeySupplierTrend } from '@/types/incoming'

const props = defineProps<{ trend: KeySupplierTrend | null; loading?: boolean }>()

// 企业色板：区分 Top5 供应商
const COLORS = ['#1B3A5B', '#B8763E', '#3E7A4E', '#5B7A99', '#B84B3E']

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  render()
  window.addEventListener('resize', handleResize)
}

function handleResize() {
  chart?.resize()
}

function render() {
  if (!chart) return
  const t = props.trend
  const dates = (t?.dates || []).map((d) => d.slice(5))
  const series = (t?.series || []).map((s, i) => ({
    name: s.supplierName,
    type: 'line',
    data: s.passRateList.map((v) => (v == null ? null : Number(v))),
    smooth: true,
    symbol: 'circle',
    symbolSize: 5,
    connectNulls: false,
    lineStyle: { color: COLORS[i % COLORS.length], width: 2.5 },
    itemStyle: { color: COLORS[i % COLORS.length] },
  }))

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        const idx = params[0].dataIndex
        const dateFull = (t?.dates || [])[idx] || ''
        let html = `<div style="font-size:12px"><div style="font-weight:600;margin-bottom:4px">${dateFull}</div>`
        params.forEach((p: any) => {
          const val = p.value == null ? '无来料' : `${p.value}%`
          html += `<div>${p.marker}${p.seriesName}: <b>${val}</b></div>`
        })
        return html + '</div>'
      },
    },
    grid: { left: 48, right: 24, top: 36, bottom: 24 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#E3E0DC' } },
      axisLabel: { color: '#8C9BA8', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#F0EDE9' } },
      axisLabel: { color: '#8C9BA8', fontSize: 11, formatter: '{value}%' },
    },
    series: [
      ...series,
      {
        name: '目标 95%',
        type: 'line',
        data: [],
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ yAxis: 95 }],
          lineStyle: { color: '#B84B3E', type: 'dashed', width: 1 },
          label: { formatter: '目标 95%', position: 'end', color: '#B84B3E', fontSize: 10 },
        },
      },
    ],
    legend: {
      data: (t?.series || []).map((s) => s.supplierName).concat(['目标 95%']),
      type: 'scroll',
      right: 0,
      top: 0,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: '#8C9BA8', fontSize: 11 },
    },
  })
}

watch(() => props.trend, render, { deep: true })

onMounted(initChart)
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.trend-chart {
  width: 100%;
  height: 100%;
  min-height: 280px;
}
</style>

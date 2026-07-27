<template>
  <div ref="chartRef" class="rank-chart"></div>
</template>

<script setup lang="ts">
// ===== M1: 供应商合格率排名图 =====
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { SupplierRankItem } from '@/types/incoming'

const props = defineProps<{ data: SupplierRankItem[]; loading?: boolean }>()

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
  const sorted = [...props.data].sort((a, b) => a.passRate - b.passRate)
  const names = sorted.map((d) => d.supplierName)
  const rates = sorted.map((d) => d.passRate)
  const totals = sorted.map((d) => d.totalBatches)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const idx = params[0].dataIndex
        const item = sorted[idx]
        return `<div style="font-size:12px">
          <div style="font-weight:600;margin-bottom:4px">${item.supplierName}</div>
          <div>合格率: <b>${item.passRate}%</b></div>
          <div>总批次: <b>${item.totalBatches}</b></div>
        </div>`
      },
    },
    grid: { left: 88, right: 48, top: 16, bottom: 16 },
    xAxis: {
      type: 'value',
      min: 80,
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#F0EDE9' } },
      axisLabel: { color: '#8C9BA8', fontSize: 11, formatter: '{value}%' },
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLine: { lineStyle: { color: '#E3E0DC' } },
      axisLabel: { color: '#5B6770', fontSize: 12 },
      axisTick: { show: false },
    },
    series: [
      {
        name: '合格率',
        type: 'bar',
        data: rates.map((v) => ({
          value: v,
          itemStyle: {
            color:
              v >= 98
                ? '#3E7A4E'
                : v >= 95
                  ? '#1B3A5B'
                  : v >= 90
                    ? '#B8763E'
                    : '#B84B3E',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barMaxWidth: 18,
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          color: '#5B6770',
          fontSize: 11,
          fontWeight: 600,
        },
      },
    ],
  })
}

watch(() => props.data, render, { deep: true })

onMounted(initChart)
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.rank-chart {
  width: 100%;
  height: 100%;
  min-height: 280px;
}
</style>

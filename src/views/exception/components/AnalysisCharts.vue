<template>
  <div class="analysis-charts">
    <div ref="barRef" class="chart-box"></div>
    <div ref="pieRef" class="chart-box"></div>
  </div>
</template>

<script setup lang="ts">
// ===== M2: 异常多维度分析图表 =====
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { ANALYSIS_DIMENSION_LABELS, AnalysisDimensionEnum } from '@/enums/exception'
import type { ExceptionAnalysisItem } from '@/types/exception'

const props = defineProps<{
  dimension: AnalysisDimensionEnum
  items: ExceptionAnalysisItem[]
}>()

const barRef = ref<HTMLDivElement | null>(null)
const pieRef = ref<HTMLDivElement | null>(null)
let barChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

function initCharts() {
  if (!barRef.value || !pieRef.value) return
  barChart = echarts.init(barRef.value)
  pieChart = echarts.init(pieRef.value)
  render()
  window.addEventListener('resize', handleResize)
}

function handleResize() {
  barChart?.resize()
  pieChart?.resize()
}

function render() {
  if (!barChart || !pieChart) return
  const dimLabel = ANALYSIS_DIMENSION_LABELS[props.dimension]
  const names = props.items.map((d) => d.name)
  const counts = props.items.map((d) => d.count)
  const pieData = props.items.map((d) => ({ name: d.name, value: d.count }))

  barChart.setOption({
    title: { text: `${dimLabel}分布`, left: 'center', textStyle: { fontSize: 13, color: '#1B3A5B' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '12%', right: '8%', bottom: '15%', top: '18%' },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { rotate: names.length > 6 ? 30 : 0, fontSize: 11, color: '#5B6770' },
      axisLine: { lineStyle: { color: '#E3E0DC' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#F0EDE9' } },
      axisLabel: { fontSize: 11, color: '#8C9BA8' },
    },
    series: [
      {
        type: 'bar',
        data: counts,
        barMaxWidth: 32,
        itemStyle: {
          color: new (echarts as any).graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1B3A5B' },
            { offset: 1, color: '#3E6B95' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        label: { show: true, position: 'top', fontSize: 11, color: '#1B3A5B', fontWeight: 600 },
      },
    ],
  })

  pieChart.setOption({
    title: { text: `${dimLabel}占比`, left: 'center', textStyle: { fontSize: 13, color: '#1B3A5B' } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll', fontSize: 10, itemWidth: 10, itemHeight: 10 },
    color: ['#1B3A5B', '#3E6B95', '#B8763E', '#B84B3E', '#3E7A4E', '#8C9BA8', '#5B7A99', '#6B8E9E'],
    series: [
      {
        type: 'pie',
        radius: ['38%', '62%'],
        center: ['50%', '45%'],
        data: pieData,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { fontSize: 11, color: '#5B6770' },
      },
    ],
  })
}

watch(() => [props.dimension, props.items], render, { deep: true })

onMounted(initCharts)
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  barChart?.dispose()
  pieChart?.dispose()
})
</script>

<style scoped>
.analysis-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.chart-box {
  width: 100%;
  height: 300px;
}
@media (max-width: 1024px) {
  .analysis-charts { grid-template-columns: 1fr; }
}
</style>

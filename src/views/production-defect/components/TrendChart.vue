<template>
  <div class="trend-chart">
    <div ref="chartRef" class="chart-body"></div>
    <el-empty v-if="!hasData" description="暂无数据" :image-size="60" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import type { DefectTrendPoint } from '@/types/production-defect'

const props = defineProps<{ points: DefectTrendPoint[]; metricLabel: string }>()
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null
const hasData = computed(() => props.points.length > 0)

function render() {
  if (!chart) return
  const x = props.points.map((p) => p.period || '')
  const y = props.points.map((p) => p.metricValue ?? 0)
  chart.setOption(
    {
      color: ['#1b3a5b'],
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const i = params[0].dataIndex
          const p = props.points[i]
          const mp = p.momPct == null ? '—' : `${p.momPct > 0 ? '+' : ''}${p.momPct}%`
          const yp = p.yoyPct == null ? '—' : `${p.yoyPct > 0 ? '+' : ''}${p.yoyPct}%`
          return `${p.period}<br/>${props.metricLabel}：${p.metricValue ?? '—'}<br/>环比：${mp}<br/>同比：${yp}`
        },
      },
      grid: { left: 55, right: 24, top: 30, bottom: 50 },
      xAxis: { type: 'category', data: x, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: props.metricLabel },
      series: [
        {
          name: props.metricLabel,
          type: 'line',
          smooth: true,
          data: y,
          areaStyle: { opacity: 0.1 },
          markPoint: {
            data: [{ type: 'max', name: '峰值' }],
            symbolSize: 42,
            label: { formatter: '异常峰值', color: '#fff', backgroundColor: '#b84b3e', padding: [4, 6], borderRadius: 3 },
            itemStyle: { color: '#b84b3e' },
          },
          itemStyle: { color: '#b8763e' },
          lineStyle: { color: '#b8763e' },
        },
      ],
    },
    true,
  )
}

onMounted(() => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
    render()
    ro = new ResizeObserver(() => chart?.resize())
    ro.observe(chartRef.value)
  }
})
watch(() => props.points, render, { deep: true })
onUnmounted(() => {
  ro?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.chart-body {
  width: 100%;
  height: 360px;
}
</style>

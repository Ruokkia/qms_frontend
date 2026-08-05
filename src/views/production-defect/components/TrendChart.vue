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
const MAX_RETRY = 10
let retryCount = 0
let retryRafId = 0

function render() {
  if (!chart) {
    // 容器尚未初始化（如所在 tab 未激活 / 尺寸为 0 时 chart 为 null），
    // 先尝试初始化，由 initChart 内部的重试机制在可见后完成渲染。
    initChart()
    return
  }
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

function initChart() {
  if (!chartRef.value) return
  if (chart) {
    render()
    return
  }
  if (chartRef.value.clientWidth === 0 || chartRef.value.clientHeight === 0) {
    // 容器暂不可见（如所在 tab 未激活 / 布局未完成），有限次 rAF 重试，
    // 同时已在 onMounted 注册 ResizeObserver 作为兜底，容器变可见时必触发初始化。
    if (retryCount < MAX_RETRY) {
      retryCount++
      retryRafId = requestAnimationFrame(() => initChart())
    }
    return
  }
  retryCount = 0
  chart = echarts.init(chartRef.value)
  render()
}

function ensureObserver() {
  if (ro || !chartRef.value) return
  ro = new ResizeObserver(() => {
    if (!chartRef.value) return
    if (chartRef.value.clientWidth > 0 && chartRef.value.clientHeight > 0) {
      if (!chart) initChart()
      else chart.resize()
    }
  })
  ro.observe(chartRef.value)
}

onMounted(() => {
  initChart()
  ensureObserver()
})
watch(() => props.points, render, { deep: true })
onUnmounted(() => {
  if (retryRafId) cancelAnimationFrame(retryRafId)
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

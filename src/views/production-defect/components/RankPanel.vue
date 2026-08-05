<template>
  <div class="rank-panel">
    <div ref="chartRef" class="rank-chart"></div>
    <el-table :data="rows" size="small" style="width: 100%; margin-top: 8px" max-height="320">
      <el-table-column prop="name" label="名称" min-width="120" />
      <el-table-column :label="metricLabel" prop="metricValue" min-width="90" align="right" />
      <el-table-column label="维修条数" prop="repairCount" min-width="90" align="right" />
      <el-table-column label="报废数量" prop="scrapQty" min-width="90" align="right" />
      <el-table-column label="占比%" prop="sharePct" min-width="90" align="right" />
    </el-table>
    <el-empty v-if="!hasData" description="暂无数据" :image-size="60" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import type { DefectRankItem } from '@/types/production-defect'

const props = defineProps<{ items: DefectRankItem[]; metricLabel: string }>()
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null
const hasData = computed(() => props.items.length > 0)
const MAX_RETRY = 10
let retryCount = 0
let retryRafId = 0
const rows = computed(() =>
  props.items.map((it) => ({
    name: it.name,
    metricValue: it.metricValue ?? 0,
    repairCount: it.repairCount ?? 0,
    scrapQty: it.scrapQty ?? 0,
    sharePct: it.sharePct ?? 0,
  })),
)

function render() {
  if (!chart) {
    initChart()
    return
  }
  const reversed = [...props.items].reverse()
  const names = reversed.map((i) => i.name || '')
  const vals = reversed.map((i) => i.metricValue ?? 0)
  chart.setOption(
    {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 130, right: 30, top: 20, bottom: 20 },
      xAxis: [
        { type: 'value', name: props.metricLabel },
        { type: 'value', max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { show: false } },
      ],
      yAxis: { type: 'category', data: names },
      series: [
        {
          type: 'bar',
          data: vals,
          itemStyle: { color: '#3e7a4e' },
          barWidth: '60%',
        },
        {
          type: 'line', xAxisIndex: 1, data: reversed.map((i) => i.sharePct ?? 0),
          symbolSize: 8, itemStyle: { color: '#b84b3e' }, lineStyle: { color: '#b84b3e' },
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
watch(() => props.items, render, { deep: true })
onUnmounted(() => {
  if (retryRafId) cancelAnimationFrame(retryRafId)
  ro?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.rank-chart {
  width: 100%;
  height: 340px;
}
</style>

<template>
  <div ref="chartRef" class="rank-chart"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { SupplierRankItem } from '@/types/incoming'
import { buildSupplierRateRanges, toRate, type SupplierRateRangeGroup } from './supplierRankRange'

const props = defineProps<{ data: SupplierRankItem[]; loading?: boolean }>()
const emit = defineEmits<{
  'range-click': [payload: { range: string; items: SupplierRankItem[] }]
}>()

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let groups: SupplierRateRangeGroup[] = []

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  render()
  window.addEventListener('resize', handleResize)
  chart.on('click', (params: any) => {
    const group = groups[params.dataIndex]
    if (group) emit('range-click', { range: group.label, items: group.items })
  })
}

function handleResize() {
  chart?.resize()
}

function render() {
  if (!chart) return
  groups = buildSupplierRateRanges(props.data)
  chart.showLoading({
    text: '加载中',
    color: '#5E8C9F',
    textColor: '#8C9BA8',
    maskColor: 'rgba(255,255,255,0.7)',
  })
  if (!props.loading) chart.hideLoading()

  const seriesData = groups.map((group) => {
    const averageRate = group.items.reduce((sum, item) => sum + toRate(item.passRate), 0) / group.items.length
    return {
      name: group.label,
      value: group.items.length,
      itemStyle: { color: group.color },
      averageRate,
    }
  })
  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const group = groups[params.dataIndex]
        const averageRate = group?.items.length
          ? group.items.reduce((sum, item) => sum + toRate(item.passRate), 0) / group.items.length
          : 0
        return `<div style="font-size:12px"><div style="font-weight:600;margin-bottom:4px">${params.name}</div><div>供应商数量：<b>${params.value}</b></div><div>平均合格率：<b>${averageRate.toFixed(2)}%</b></div><div style="color:#909399;margin-top:4px">点击查看明细</div></div>`
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#5B6770', fontSize: 11 },
    },
    series: [{
      name: '供应商合格率分布',
      type: 'pie',
      radius: ['43%', '72%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#fff', borderWidth: 3 },
      label: { formatter: '{b}\n{c}家', color: '#5B6770', fontSize: 11 },
      labelLine: { length: 10, length2: 8 },
      data: seriesData,
    }],
    graphic: {
      type: 'text',
      left: 'center',
      top: '39%',
      style: { text: '供应商\n合格率分布', textAlign: 'center', fill: '#5B6770', fontSize: 14, fontWeight: 600, lineHeight: 21 },
    },
  }, true)
}

watch(() => [props.data, props.loading], render, { deep: true })
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
  min-height: 300px;
}
</style>
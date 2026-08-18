<template>
  <div class="perf-rank">
    <el-row :gutter="16">
      <el-col :span="14">
        <el-card shadow="never" header="绩效排名（A/B/C/D）">
          <el-table :data="rank" v-loading="loading" border stripe max-height="420">
            <el-table-column type="index" label="#" width="44" />
            <el-table-column prop="supplierName" label="供应商" min-width="140" />
            <el-table-column label="等级" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="gradeType(row.grade)" effect="dark">{{ row.grade }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="综合分" width="90" align="center" sortable :sort-by="(r:any)=>r.score">
              <template #default="{ row }">{{ row.score?.toFixed(1) }}</template>
            </el-table-column>
            <el-table-column label="来料合格率" width="100" align="center">
              <template #default="{ row }">{{ fmt(row.passRate) }}%</template>
            </el-table-column>
            <el-table-column label="整改及时率" width="100" align="center">
              <template #default="{ row }">{{ fmt(row.rectifyOnTimeRate) }}%</template>
            </el-table-column>
            <el-table-column label="合规率" width="90" align="center">
              <template #default="{ row }">{{ fmt(row.complianceRate) }}%</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card shadow="never" header="绩效月度趋势">
          <div ref="trendRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" header="来料不合格柏拉图" style="margin-top:16px">
      <div ref="paretoRef" class="chart tall"></div>
    </el-card>

    <el-alert type="info" :closable="false" show-icon style="margin-top:12px"
      title="说明：绩效等级按综合评分划分（A≥90、B≥80、C≥70、D<70），综合分=来料合格率40%+整改及时率25%+资质合规率20%+交付及时率15%。交付及时率数据接入中。"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  getPerfRankApi,
  getPerfTrendApi,
  getPerfParetoApi,
  type SupplierPerformance,
  type SupplierPerfTrend,
  type SupplierPerfPareto,
} from '@/api/archivePerfRank'

const rank = ref<SupplierPerformance[]>([])
const trend = ref<SupplierPerfTrend[]>([])
const pareto = ref<SupplierPerfPareto[]>([])
const loading = ref(false)
const trendRef = ref<HTMLDivElement | null>(null)
const paretoRef = ref<HTMLDivElement | null>(null)
let trendChart: echarts.ECharts | null = null
let paretoChart: echarts.ECharts | null = null

function fmt(v: number | null | undefined) {
  return v == null ? '-' : Number(v).toFixed(1)
}

function gradeType(g: string) {
  if (g === 'A') return 'success'
  if (g === 'B') return 'primary'
  if (g === 'C') return 'warning'
  return 'danger'
}

async function load() {
  loading.value = true
  try {
    const [r, t, p] = await Promise.all([getPerfRankApi(), getPerfTrendApi(), getPerfParetoApi()])
    rank.value = r.data || []
    trend.value = t.data || []
    pareto.value = p.data || []
    await nextTick()
    renderTrend()
    renderPareto()
  } finally {
    loading.value = false
  }
}

function renderTrend() {
  if (!trendRef.value) return
  if (!trendChart) trendChart = echarts.init(trendRef.value)
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: trend.value.map((d) => d.month), axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: 'value', name: '合格率%', max: 100, axisLabel: { formatter: '{value}%' } },
      { type: 'value', name: '批次', position: 'right' },
    ],
    series: [
      { name: '平均合格率', type: 'line', smooth: true, data: trend.value.map((d) => d.avgPassRate), itemStyle: { color: '#5E8C9F' } },
      { name: '来料批次', type: 'bar', yAxisIndex: 1, data: trend.value.map((d) => d.batches), itemStyle: { color: '#A9C7B5' } },
    ],
  })
}

function renderPareto() {
  if (!paretoRef.value) return
  if (!paretoChart) paretoChart = echarts.init(paretoRef.value)
  paretoChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['不合格批次', '累计占比'], bottom: 0 },
    xAxis: { type: 'category', data: pareto.value.map((d) => d.category), axisLabel: { interval: 0, fontSize: 11 } },
    yAxis: [
      { type: 'value', name: '批次' },
      { type: 'value', name: '累计%', max: 100, axisLabel: { formatter: '{value}%' } },
    ],
    series: [
      { name: '不合格批次', type: 'bar', data: pareto.value.map((d) => d.count), itemStyle: { color: '#E08888' } },
      { name: '累计占比', type: 'line', yAxisIndex: 1, data: pareto.value.map((d) => d.cumulativeRate), itemStyle: { color: '#3C5669' }, smooth: false },
    ],
  })
}

function resize() {
  trendChart?.resize()
  paretoChart?.resize()
}
window.addEventListener('resize', resize)

watch(trend, renderTrend)
watch(pareto, renderPareto)
onMounted(() => { load() })
onUnmounted(() => {
  window.removeEventListener('resize', resize)
  trendChart?.dispose()
  paretoChart?.dispose()
})
</script>

<style scoped>
.chart {
  width: 100%;
  height: 300px;
}
.chart.tall {
  height: 320px;
}
</style>

<template>
  <div class="pd-page">
    <div class="pd-card">
      <!-- 题头 -->
      <header class="page-header">
        <div class="header-left">
          <h1 class="header-title">不良信息管理</h1>
          <p class="header-sub">生产维修记录 · 不良趋势分析 · 高频排名 · {{ auth.user?.plantName }}分公司</p>
        </div>
      </header>

      <el-tabs v-model="activeTab" class="pd-tabs" lazy>
        <el-tab-pane label="维修记录" name="list">
          <RepairList />
        </el-tab-pane>
        <el-tab-pane label="分析报表" name="analytics">
          <div v-loading="loading" class="an-wrap">
            <AnalysisFilter @search="onSearch" />
            <SummaryCards :summary="summary" :metric-label="metricLabel" />
            <div class="analytics-grid">
            <el-card class="an-block trend-block" shadow="never">
              <template #header><span class="an-title">不良趋势（环比 / 同比）</span></template>
              <TrendChart :points="trend" :metric-label="metricLabel" />
            </el-card>
            <el-card class="an-block rank-block" shadow="never">
              <template #header><span class="an-title">高频排名 · {{ dimLabel }}</span></template>
              <RankPanel :items="rank" :metric-label="metricLabel" />
            </el-card>
            </div>
            <InsightStrip :summary="summary" :trend="trend" :rank="rank" :dim-label="dimLabel" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    <ImportDialog v-model="importVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import RepairList from './components/RepairList.vue'
import ImportDialog from './components/ImportDialog.vue'
import AnalysisFilter from './components/AnalysisFilter.vue'
import SummaryCards from './components/SummaryCards.vue'
import TrendChart from './components/TrendChart.vue'
import RankPanel from './components/RankPanel.vue'
import InsightStrip from './components/InsightStrip.vue'
import { getDefectSummaryApi, getDefectTrendApi, getDefectRankApi } from '@/api/production-defect'
import type { DefectAnalyticsQuery, DefectSummary, DefectTrendPoint, DefectRankItem } from '@/types/production-defect'

const auth = useAuthStore()
const importVisible = ref(false)
const activeTab = ref('list')
const loading = ref(false)
const summary = ref<DefectSummary | null>(null)
const trend = ref<DefectTrendPoint[]>([])
const rank = ref<DefectRankItem[]>([])
const query = ref<DefectAnalyticsQuery>({})

const metricLabel = computed(
  () =>
    ({ defectQty: '不良数量', repairCount: '维修条数', scrapQty: '报废数量' }[query.value.metric || 'defectQty'] ||
    '不良数量'),
)
const dimLabel = computed(
  () =>
    ({ process: '生产工序', defectCode: '不良代码', defectPhenomenon: '不良现象' }[query.value.dim || 'process'] ||
    '生产工序'),
)

async function loadAnalytics() {
  loading.value = true
  try {
    const [s, t, r] = await Promise.all([
      getDefectSummaryApi(query.value),
      getDefectTrendApi(query.value),
      getDefectRankApi(query.value),
    ])
    summary.value = s.data ?? null
    trend.value = t.data ?? []
    rank.value = r.data ?? []
  } finally {
    loading.value = false
  }
}

function onSearch(q: DefectAnalyticsQuery) {
  query.value = q
  loadAnalytics()
}

onMounted(() => {
  const y = new Date().getFullYear()
  query.value = {
    start: `${y}-01-01`,
    end: `${y}-12-31`,
    metric: 'defectQty',
    dim: 'process',
    granularity: 'MONTH',
    momMode: 'auto',
    yoyYearsAgo: 1,
    excludeDraft: true,
  }
  loadAnalytics()
})
</script>

<style scoped>
/* ── 题头 ── */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #edf0f4;
}
.header-title {
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 4px;
  color: #1b3a5b;
}
.header-sub {
  font-size: 12px;
  color: #8c9ba8;
  margin: 0;
}
.pd-page {
  padding: 4px 0;
}
.pd-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 20px;
}
.an-wrap {
  padding: 8px 0;
}
.analytics-grid { display: grid; grid-template-columns: minmax(0, 7fr) minmax(320px, 3fr); gap: 14px; }
.an-block {
  margin-top: 12px;
  border: 1px solid #dce4ea;
  border-radius: 8px;
}
.an-title {
  font-weight: 600;
  color: #1b3a5b;
}
@media (max-width: 1080px) { .analytics-grid { grid-template-columns: 1fr; } }
</style>

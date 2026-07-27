<template>
  <section class="quality-band">
    <div class="primary-kpi"><span>本期{{ metricLabel }}</span><strong>{{ fmt(summary?.currentMetricValue) }}</strong></div>
    <div class="delta-kpi"><span>环比</span><b :class="trendClass(summary?.momPct)">{{ pct(summary?.momPct) }}</b></div>
    <div class="delta-kpi"><span>同比</span><b :class="trendClass(summary?.yoyPct)">{{ pct(summary?.yoyPct) }}</b></div>
    <div class="impact-kpi"><span>报废影响</span><b>{{ fmt(summary?.scrapQty) }} 件 · {{ pct(summary?.scrapRate) }}</b></div>
    <div class="risk-kpi"><span>重点风险</span><b>{{ summary?.topProcess || '暂无数据' }}</b></div>
  </section>
</template>
<script setup lang="ts">
import type { DefectSummary } from '@/types/production-defect'
defineProps<{ summary: DefectSummary | null; metricLabel: string }>()
function fmt(v?: number | null) { return v == null ? '—' : String(v) }
function pct(v?: number | null) { return v == null ? '—' : `${v > 0 ? '+' : ''}${v}%` }
function trendClass(v?: number | null) { return v == null ? '' : v > 0 ? 'up' : v < 0 ? 'down' : '' }
</script>
<style scoped>
.quality-band { display:flex; align-items:stretch; overflow:hidden; margin-top:12px; color:#fff; background:#123047; border-radius:8px; }
.quality-band > div { padding:18px 24px; border-right:1px solid rgba(255,255,255,.22); }
.quality-band > div:last-child { border:0; }.primary-kpi { min-width:260px; }.primary-kpi strong { display:block; font-size:48px; line-height:1.05; letter-spacing:-2px; }
.quality-band span { display:block; margin-bottom:8px; color:#c9d7e3; font-size:13px; }.delta-kpi { min-width:130px; }.delta-kpi b,.impact-kpi b,.risk-kpi b { font-size:20px; white-space:nowrap; }.impact-kpi { margin-left:auto; }.risk-kpi b,.up { color:#ffad43; }.down { color:#8dd39e; }
@media (max-width:1080px) { .quality-band { flex-wrap:wrap; }.impact-kpi { margin-left:0; } }
</style>

<template>
  <section class="insights">
    <div class="insight-title">洞察与建议</div>
    <div class="insight"><b>01</b>{{ rank[0]?.name ? `${dimLabel}“${rank[0].name}”是当前最主要风险，应优先排查。` : '当前筛选范围暂无可定位的高频问题。' }}</div>
    <div class="insight"><b>02</b>{{ peakText }}</div>
    <div class="insight"><b>03</b>{{ summary?.momPct && summary.momPct > 0 ? '环比上升，建议复盘近期工艺变更与异常工单。' : '质量指标未出现环比恶化，建议持续跟踪重点工序。' }}</div>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { DefectSummary, DefectTrendPoint, DefectRankItem } from '@/types/production-defect'
const props = defineProps<{ summary: DefectSummary | null; trend: DefectTrendPoint[]; rank: DefectRankItem[]; dimLabel: string }>()
const peakText = computed(() => { const p = [...props.trend].sort((a,b) => (b.metricValue ?? 0)-(a.metricValue ?? 0))[0]; return p ? `${p.period} 出现本期峰值（${p.metricValue ?? 0}），建议结合当期生产记录复盘。` : '趋势数据不足，暂无法识别峰值。' })
</script>
<style scoped>
.insights { display:grid; grid-template-columns:170px repeat(3,1fr); margin-top:14px; overflow:hidden; border:1px solid #dce4ea; border-radius:8px; background:#fff; }.insight-title,.insight { display:flex; gap:10px; align-items:flex-start; padding:16px 18px; color:#33485a; font-size:13px; line-height:1.55; }.insight-title { align-items:center; background:#f3f6f8; color:#123047; font-weight:700; font-size:14px; }.insight { border-left:1px solid #dce4ea; }.insight b { color:#5b7a99; }
@media (max-width:1080px) { .insights { grid-template-columns:1fr; }.insight { border-left:0; border-top:1px solid #dce4ea; } }
</style>

<template>
  <div v-if="visible" class="capability-card">
    <div class="cap-header">
      <span class="cap-title">过程能力分析</span>
      <el-tooltip content="Cp/Pp ≥ 1.33（优） | ≥ 1.00（可接受） | < 1.00（不足）">
        <el-icon class="cap-info-icon"><InfoFilled /></el-icon>
      </el-tooltip>
    </div>
    <div class="cap-grid">
      <div
        v-for="item in items"
        :key="item.key"
        class="cap-item"
        :class="item.level"
      >
        <span class="cap-label">{{ item.label }}</span>
        <span class="cap-value">{{ item.value }}</span>
        <span class="cap-level-tag">{{ item.levelText }}</span>
      </div>
    </div>
    <div v-if="sigmaInfo" class="cap-note">
      σ<sub>within</sub> = {{ sigmaInfo.within }} &nbsp; σ<sub>overall</sub> = {{ sigmaInfo.overall }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'

const props = defineProps<{
  cp?: number | null
  cpk?: number | null
  pp?: number | null
  ppk?: number | null
  sigmaWithin?: number | null
  sigmaOverall?: number | null
}>()

function levelInfo(v: number | null | undefined) {
  if (v == null) return { level: '', text: '' }
  if (v >= 1.33) return { level: 'excellent', text: '优' }
  if (v >= 1.00) return { level: 'acceptable', text: '可接受' }
  if (v >= 0.67) return { level: 'marginal', text: '不足' }
  return { level: 'poor', text: '差' }
}

function fmt(v: number | null | undefined) {
  if (v == null) return '-'
  return v.toFixed(4)
}

const visible = computed(() =>
  props.cp != null || props.cpk != null || props.pp != null || props.ppk != null,
)

const items = computed(() => {
  const cpInfo = levelInfo(props.cp)
  const cpkInfo = levelInfo(props.cpk)
  const ppInfo = levelInfo(props.pp)
  const ppkInfo = levelInfo(props.ppk)
  return [
    { key:'cp',  label:'Cp',   value: fmt(props.cp),  level: cpInfo.level,  levelText: cpInfo.text },
    { key:'cpk', label:'Cpk',  value: fmt(props.cpk), level: cpkInfo.level, levelText: cpkInfo.text },
    { key:'pp',  label:'Pp',   value: fmt(props.pp),  level: ppInfo.level,  levelText: ppInfo.text},
    { key:'ppk', label:'Ppk',  value: fmt(props.ppk), level: ppkInfo.level, levelText: ppkInfo.text},
  ]
})

const sigmaInfo = computed(() => {
  if (props.sigmaWithin != null || props.sigmaOverall != null) {
    return {
      within: props.sigmaWithin != null ? props.sigmaWithin.toFixed(4) : '-',
      overall: props.sigmaOverall != null ? props.sigmaOverall.toFixed(4) : '-',
    }
  }
  return null
})
</script>

<style scoped>
.capability-card {
  margin: 0 0 12px;
  padding: 14px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f8f9fc 0%, #f0f3f8 100%);
  border: 1px solid #e5e9f0;
}
.cap-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.cap-title {
  font-weight: 700;
  font-size: 13px;
  color: #2c3e50;
}
.cap-info-icon {
  font-size: 14px;
  color: #8c9ba8;
  cursor: help;
}
.cap-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.cap-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e5e9f0;
  transition: box-shadow .2s;
}
.cap-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.cap-item.excellent { background: linear-gradient(180deg, #e8f5e9 0%, #fff 60%); border-color: #a5d6a7; }
.cap-item.acceptable { background: linear-gradient(180deg, #fff8e1 0%, #fff 60%); border-color: #ffe082; }
.cap-item.marginal { background: linear-gradient(180deg, #fbe9e7 0%, #fff 60%); border-color: #ffab91; }
.cap-item.poor { background: linear-gradient(180deg, #ffebee 0%, #fff 60%); border-color: #ef9a9a; }
.cap-label { font-size: 11px; color: #8c9ba8; text-transform: uppercase; letter-spacing: .5px; }
.cap-value { font-size: 18px; font-weight: 700; color: #1b3a5b; font-variant-numeric: tabular-nums; }
.cap-level-tag { font-size: 10px; margin-top: 2px; padding: 0 6px; border-radius: 8px; font-weight: 500; }
.excellent .cap-level-tag { color: #2e7d32; background: rgba(46,125,50,.1); }
.acceptable .cap-level-tag { color: #f57f17; background: rgba(245,127,23,.1); }
.marginal .cap-level-tag { color: #d84315; background: rgba(216,67,21,.1); }
.poor .cap-level-tag { color: #c62828; background: rgba(198,40,40,.1); }
.cap-note {
  margin-top: 8px;
  font-size: 11px;
  color: #8c9ba8;
  text-align: center;
}
</style>

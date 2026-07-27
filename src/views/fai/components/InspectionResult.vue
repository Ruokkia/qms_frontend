<template>
  <div class="result-card" :class="cardClass">
    <div class="status-icon">
      <el-icon v-if="result === '合格'" size="34"><CircleCheck /></el-icon>
      <el-icon v-else-if="result === '不合格'" size="34"><CircleClose /></el-icon>
      <el-icon v-else size="34"><WarningFilled /></el-icon>
    </div>
    <div class="status-text">
      <div class="status-title">{{ result }}</div>
      <div class="status-sub">首件检验判定结果</div>
    </div>
    <div class="stats">
      <div class="stat">
        <span class="num">{{ total }}</span>
        <span class="label">参数总数</span>
      </div>
      <div class="stat ok">
        <span class="num">{{ qualified }}</span>
        <span class="label">合格</span>
      </div>
      <div class="stat bad">
        <span class="num">{{ unqualified }}</span>
        <span class="label">不合格</span>
      </div>
      <div class="stat">
        <span class="num">{{ passRateText }}%</span>
        <span class="label">合格率</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CircleCheck, CircleClose, WarningFilled } from '@element-plus/icons-vue'
import type { FaiInspectionRecordResponse, FaiReportResponse } from '@/types/fai'

const props = defineProps<{
  record: FaiInspectionRecordResponse | FaiReportResponse
}>()

const result = computed(() => props.record.inspectionResult || '待判定')

const cardClass = computed(() => {
  if (result.value === '合格') return 'ok'
  if (result.value === '不合格') return 'bad'
  return 'pending'
})

const total = computed(() => props.record.items?.length || 0)
const qualified = computed(
  () => props.record.items?.filter((i) => i.result === '合格').length || 0,
)
const unqualified = computed(
  () => props.record.items?.filter((i) => i.result === '不合格').length || 0,
)
const passRateText = computed(() => {
  if (total.value === 0) return '0.00'
  return ((qualified.value / total.value) * 100).toFixed(2)
})
</script>

<style scoped>
.result-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  background: #f7f5f2;
}
.result-card.ok {
  background: #f0f7f1;
  border-color: #3e7a4e;
}
.result-card.bad {
  background: #fbf0ef;
  border-color: #b84b3e;
}
.status-icon {
  color: #5b7a99;
}
.result-card.ok .status-icon {
  color: #3e7a4e;
}
.result-card.bad .status-icon {
  color: #b84b3e;
}
.status-title {
  font-size: 18px;
  font-weight: 700;
  color: #1b3a5b;
}
.status-sub {
  font-size: 12px;
  color: #5b7a99;
}
.stats {
  display: flex;
  gap: 22px;
  margin-left: auto;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat .num {
  font-size: 20px;
  font-weight: 700;
  color: #1b3a5b;
  font-family: 'JetBrains Mono', monospace;
}
.stat.ok .num {
  color: #3e7a4e;
}
.stat.bad .num {
  color: #b84b3e;
}
.stat .label {
  font-size: 12px;
  color: #5b7a99;
}
</style>

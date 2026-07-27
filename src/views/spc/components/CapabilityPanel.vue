<template>
  <div class="capability-panel">
    <div class="cap-toolbar">
      <span class="cap-title">过程能力指数</span>
      <div>
        <el-tag v-if="cap && cap.subgroupCount != null" size="small" type="info" style="margin-right:8px">
          子组 {{ cap.subgroupCount }} / 样本 {{ cap.sampleCount }}
        </el-tag>
        <el-button size="small" :loading="recalcLoading" @click="onRecalc">重新计算</el-button>
      </div>
    </div>

    <el-empty v-if="!cap" description="暂无能力指数，子组数需 ≥ 20 方可计算（或点击重新计算）" :image-size="70">
      <template #description>
        <div>暂无能力指数</div>
        <div style="font-size:12px;color:#8C9BA8">子组数需 ≥ 20 方可计算（或点击重新计算）</div>
      </template>
    </el-empty>

    <template v-else>
      <!-- 主卡：CPK -->
      <el-card shadow="never" class="cpk-card" :style="{ borderColor: cpkColor }">
        <div class="cpk-label">CPK 过程能力指数</div>
        <div class="cpk-value" :style="{ color: cpkColor }">{{ fmt(cap.cpk) }}</div>
        <div class="cpk-judgment" :style="{ color: cpkColor }">
          <el-icon v-if="cap.judgment === '充足'"><SuccessFilled /></el-icon>
          <el-icon v-else-if="cap.judgment === '不足'"><WarningFilled /></el-icon>
          <el-icon v-else><InfoFilled /></el-icon>
          过程能力{{ cap.judgment || '—' }}
        </div>
      </el-card>

      <!-- 子卡 -->
      <el-row :gutter="12" class="sub-cards">
        <el-col :span="8" v-for="m in metrics" :key="m.key">
          <el-card shadow="never" class="metric-card">
            <div class="metric-label">{{ m.label }}</div>
            <div class="metric-value">{{ fmt((cap as any)[m.key]) }}</div>
            <div class="metric-desc">{{ m.desc }}</div>
          </el-card>
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { SuccessFilled, WarningFilled, InfoFilled } from '@element-plus/icons-vue'
import { useSpcStore } from '@/stores/spc'
import type { SpcCapabilityResult } from '@/types/spc'

const props = defineProps<{ paramId: number | null }>()
const store = useSpcStore()
const recalcLoading = ref(false)

const cap = computed<SpcCapabilityResult | null>(() => store.capabilityResult)

function fmt(v: number | null | undefined): string {
  return v == null ? '—' : Number(v).toFixed(3)
}

const cpkColor = computed(() => {
  const c = cap.value?.cpk
  if (c == null) return '#8C9BA8'
  if (c >= 1.33) return '#3E7A4E'
  if (c >= 1.0) return '#B8763E'
  return '#B84B3E'
})

const metrics = [
  { key: 'cp', label: 'CP', desc: '潜在能力' },
  { key: 'pp', label: 'PP', desc: '过程性能' },
  { key: 'ppk', label: 'PPK', desc: '长期能力' },
  { key: 'cpu', label: 'CPU', desc: '上能力' },
  { key: 'cpl', label: 'CPL', desc: '下能力' },
  { key: 'cpk', label: 'CPK', desc: '综合能力' },
]

async function load() {
  if (!props.paramId) return
  await store.fetchCapability(props.paramId)
}

async function onRecalc() {
  if (!props.paramId) return
  recalcLoading.value = true
  try {
    await store.recalcCapability(props.paramId)
    ElMessage.success('能力指数已重算')
  } finally {
    recalcLoading.value = false
  }
}

watch(() => props.paramId, load)
watch(() => cap.value, () => {}, { deep: true })
</script>

<style scoped>
.capability-panel { padding: 4px; }
.cap-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.cap-title { font-weight: 600; color: #1B3A5B; }
.cpk-card { border-width: 2px; text-align: center; margin-bottom: 12px; background: #FAF8F5; }
.cpk-label { font-size: 13px; color: #5B7A99; }
.cpk-value { font-size: 44px; font-weight: 700; font-family: 'JetBrains Mono', monospace; line-height: 1.2; margin: 4px 0; }
.cpk-judgment { font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 4px; }
.sub-cards { margin-top: 4px; }
.metric-card { border: 1px solid #ECE7E1; text-align: center; }
.metric-label { font-size: 12px; color: #8C9BA8; }
.metric-value { font-size: 22px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: #1B3A5B; margin: 2px 0; }
.metric-desc { font-size: 11px; color: #8C9BA8; }
</style>

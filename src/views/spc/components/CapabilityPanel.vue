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
      <!-- 主卡：CPK 主导航指标 -->
      <el-card shadow="never" class="cpk-card" :style="{ borderColor: cpkColor }">
        <div class="cpk-label">Cpk 过程能力指数</div>
        <div class="cpk-value" :style="{ color: cpkColor }">{{ fmt(cap.cpk) }}</div>
        <div class="cpk-row">
          <span class="cpk-grade" :style="{ background: cpkColor, color: '#fff' }">
            {{ cpkGrade }}
          </span>
          <span class="cpk-judgment" :style="{ color: cpkColor }">
            <el-icon v-if="cap.judgment === '充足'"><SuccessFilled /></el-icon>
            <el-icon v-else-if="cap.judgment === '不足'"><WarningFilled /></el-icon>
            <el-icon v-else><InfoFilled /></el-icon>
            过程能力{{ cap.judgment || '—' }}
          </span>
        </div>
        <!-- 规格限（从 FAI 标准层解析，未选产品/物料时不展示） -->
        <div class="spec-range" v-if="cap.upperSpecLimit != null || cap.lowerSpecLimit != null || cap.targetValue != null">
          LSL {{ fmt(cap.lowerSpecLimit) }} — T {{ fmt(cap.targetValue) }} — USL {{ fmt(cap.upperSpecLimit) }}
        </div>
      </el-card>

      <!-- 核心辅助指标：Pp / Ppk -->
      <div class="quick-metrics">
        <div class="quick-item">
          <span class="quick-label">Pp</span>
          <span class="quick-value">{{ fmt(cap.pp) }}</span>
          <span class="quick-desc">过程性能</span>
        </div>
        <div class="quick-item">
          <span class="quick-label">Ppk</span>
          <span class="quick-value">{{ fmt(cap.ppk) }}</span>
          <span class="quick-desc">长期能力</span>
        </div>
        <div class="quick-item">
          <span class="quick-label">Cp</span>
          <span class="quick-value">{{ fmt(cap.cp) }}</span>
          <span class="quick-desc">潜在能力</span>
        </div>
      </div>

      <!-- 可折叠详情：σ + CPU/CPL -->
      <el-collapse v-model="detailOpen" class="cap-detail">
        <el-collapse-item title="更多能力指标与 Sigma" name="detail">
          <el-row :gutter="12" class="sub-cards">
            <el-col :span="6" v-for="m in detailMetrics" :key="m.key">
              <el-card shadow="never" class="metric-card">
                <div class="metric-label">{{ m.label }}</div>
                <div class="metric-value">{{ fmt((cap as any)[m.key]) }}</div>
                <div class="metric-desc">{{ m.desc }}</div>
              </el-card>
            </el-col>
          </el-row>
        </el-collapse-item>
      </el-collapse>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { SuccessFilled, WarningFilled, InfoFilled } from '@element-plus/icons-vue'
import { useSpcStore } from '@/stores/spc'
import type { SpcCapabilityResult } from '@/types/spc'

const props = defineProps<{ paramId: number | null }>()
const store = useSpcStore()
const recalcLoading = ref(false)

const cap = computed<SpcCapabilityResult | null>(() => store.capabilityResult)
const param = computed(() => store.currentParameter) // 仅用于获取 unit 等元数据
const detailOpen = ref<string[]>([])

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

const cpkGrade = computed(() => {
  const c = cap.value?.cpk
  if (c == null) return '—'
  if (c >= 1.67) return 'A+'
  if (c >= 1.33) return 'A'
  if (c >= 1.0) return 'B'
  if (c >= 0.67) return 'C'
  return 'D'
})

const detailMetrics = [
  { key: 'cp', label: 'Cp', desc: '潜在能力' },
  { key: 'cpu', label: 'CPU', desc: '上限能力' },
  { key: 'cpl', label: 'CPL', desc: '下限能力' },
  { key: 'sigmaWithin', label: 'σ组内', desc: '短期波动' },
  { key: 'sigmaOverall', label: 'σ总体', desc: '长期波动' },
  { key: 'meanValue', label: '均值', desc: '样本均值' },
  { key: 'sampleCount', label: '样本数', desc: '总样本' },
  { key: 'subgroupCount', label: '子组数', desc: '子组数' },
]

async function load() {
  if (!props.paramId) return
  await store.fetchCapability(props.paramId, store.chartItemType, store.chartItemCode, store.chartBatchNo)
}

async function onRecalc() {
  if (!props.paramId) return
  recalcLoading.value = true
  try {
    await store.recalcCapability(props.paramId, store.chartItemType, store.chartItemCode, store.chartBatchNo)
    ElMessage.success('能力指数已重算')
  } finally {
    recalcLoading.value = false
  }
}

watch(() => props.paramId, load)
watch(() => cap.value, () => {}, { deep: true })

// 组件挂载时若已选中参数，主动加载过程能力指数（watch 非 immediate，初次挂载不会触发）
onMounted(load)
</script>

<style scoped>
.capability-panel { padding: 4px; }
.cap-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.cap-title { font-weight: 600; color: #1B3A5B; }

/* CPK Hero 卡片 */
.cpk-card { border-width: 2px; text-align: center; margin-bottom: 10px; background: #FAF8F5; }
.cpk-label { font-size: 13px; color: #5B7A99; letter-spacing: 0.5px; }
.cpk-value { font-size: 48px; font-weight: 700; font-family: 'JetBrains Mono', monospace; line-height: 1.15; margin: 4px 0 2px; }
.cpk-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 4px; }
.cpk-grade { 
  display: inline-block; font-size: 13px; font-weight: 700; padding: 1px 10px; border-radius: 3px; 
  letter-spacing: 0.5px; line-height: 1.6;
}
.cpk-judgment { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; }
.spec-range { 
  font-size: 11px; color: #8C9BA8; margin-top: 8px; padding-top: 8px; 
  border-top: 1px dashed #E5E0D8; font-variant-numeric: tabular-nums;
}

/* Pp / Ppk / Cp 辅助指标 */
.quick-metrics { display: flex; gap: 8px; margin-bottom: 8px; }
.quick-item { 
  flex: 1; border: 1px solid #ECE7E1; border-radius: 4px; padding: 8px 6px; 
  background: #FCFAF8; text-align: center;
}
.quick-label { font-size: 11px; font-weight: 600; color: #8C9BA8; display: block; }
.quick-value { font-size: 18px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: #1B3A5B; display: block; margin: 1px 0; }
.quick-desc { font-size: 10px; color: #A8A29E; }

/* 可折叠详情 */
.cap-detail { border: 1px solid #ECE7E1; border-radius: 4px; overflow: hidden; }
.cap-detail :deep(.el-collapse-item__header) { 
  padding: 8px 12px; font-size: 12px; color: #5B7A99; font-weight: 500; background: #FAF8F5;
}
.cap-detail :deep(.el-collapse-item__wrap) { border-top: 1px solid #ECE7E1; }
.sub-cards { margin-top: 4px; padding: 4px; }
.metric-card { border: 1px solid #ECE7E1; text-align: center; }
.metric-card :deep(.el-card__body) { padding: 8px 4px; }
.metric-label { font-size: 11px; color: #8C9BA8; }
.metric-value { font-size: 16px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: #1B3A5B; margin: 2px 0; font-variant-numeric: tabular-nums; }
.metric-desc { font-size: 10px; color: #8C9BA8; }
</style>

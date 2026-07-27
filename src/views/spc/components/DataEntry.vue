<template>
  <div class="data-entry">
    <el-row :gutter="16">
      <!-- 左侧：参数选择 + 录入表单 -->
      <el-col :span="14">
        <el-card shadow="never" class="entry-card">
          <template #header>
            <div class="card-head">
              <span class="card-title">数据采集</span>
              <div class="head-actions">
                <el-tag type="success" size="small">首件签名后自动同步</el-tag>
                <el-button link type="primary" size="small" @click="guideVisible = true">使用说明</el-button>
              </div>
            </div>
          </template>

          <el-form label-width="84px" size="small">
            <el-form-item label="选择工序" required>
              <el-select
                v-model="selectedProcessId"
                placeholder="请先选择工序"
                style="width: 100%"
                @change="onProcessChange"
              >
                <el-option
                  v-for="proc in store.processList"
                  :key="proc.id"
                  :label="`${proc.processName}（${proc.processCode}）`"
                  :value="proc.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="选择参数" required>
              <el-select
                v-model="selectedParamId"
                placeholder="选择关键参数"
                style="width: 100%"
                :disabled="!selectedProcessId"
                @change="onParamChange"
              >
                <el-option
                  v-for="p in filteredParams"
                  :key="p.id"
                  :label="`${p.paramName}（${p.paramCode} · n=${p.subgroupSize} · ${p.chartType}）`"
                  :value="p.id"
                />
              </el-select>
            </el-form-item>
          </el-form>

          <template v-if="currentParam">
            <el-descriptions :column="3" size="small" border class="param-info">
              <el-descriptions-item label="参数">{{ currentParam.paramName }}</el-descriptions-item>
              <el-descriptions-item label="USL">{{ fmt(currentParam.upperSpecLimit) }}</el-descriptions-item>
              <el-descriptions-item label="LSL">{{ fmt(currentParam.lowerSpecLimit) }}</el-descriptions-item>
              <el-descriptions-item label="目标">{{ fmt(currentParam.targetValue) }}</el-descriptions-item>
              <el-descriptions-item label="子组大小 n">{{ currentParam.subgroupSize }}</el-descriptions-item>
              <el-descriptions-item label="控制图">{{ currentParam.chartType }}</el-descriptions-item>
            </el-descriptions>

            <template v-if="pendingSubgroups.length">
              <el-alert title="存在首件待补样本：请从下列首件记录补齐样本，不会新建子组。" type="warning" :closable="false" show-icon style="margin-bottom: 12px" />
              <el-select v-model="selectedPendingId" placeholder="选择待补样本记录" style="width: 100%; margin-bottom: 12px">
                <el-option v-for="sub in pendingSubgroups" :key="sub.id" :value="sub.id" :label="`${sub.workOrderNo || '-'} · ${sub.batchNo || '-'} · ${sub.materialName || sub.materialCode || '-'} · 已有 ${sub.sampleCount}/${currentParam.subgroupSize}`" />
              </el-select>
              <template v-if="selectedPending">
                <el-descriptions :column="4" size="small" border class="param-info">
                  <el-descriptions-item label="工单">{{ selectedPending.workOrderNo || '—' }}</el-descriptions-item>
                  <el-descriptions-item label="批次">{{ selectedPending.batchNo || '—' }}</el-descriptions-item>
                  <el-descriptions-item label="物料">{{ selectedPending.materialName || selectedPending.materialCode || '—' }}</el-descriptions-item>
                  <el-descriptions-item label="工序">{{ selectedPending.processCode || '—' }}</el-descriptions-item>
                </el-descriptions>
                <div class="samples-title">补录剩余 {{ remainingCount }} 个样本值</div>
                <div class="sample-grid"><div v-for="i in remainingCount" :key="i" class="sample-cell"><span class="sample-idx">{{ selectedPending.sampleCount + i }}</span><el-input-number v-model="pendingValues[i - 1]" :controls="false" :precision="3" style="width: 100%" /></div></div>
                <div class="actions"><el-button type="primary" :loading="submitting" @click="onAppendPending">补录并完成子组</el-button></div>
              </template>
            </template>

            <template v-else>
            <div class="samples-title">样本实测值（需录入 {{ currentParam.subgroupSize }} 个）</div>
            <div class="sample-grid">
              <div v-for="i in currentParam.subgroupSize" :key="i" class="sample-cell">
                <span class="sample-idx">{{ i }}</span>
                <el-input-number
                  v-model="sampleValues[i - 1]"
                  :controls="false"
                  :precision="3"
                  style="width: 100%"
                />
              </div>
            </div>

            <div class="actions">
              <el-button @click="resetSamples">清空</el-button>
              <el-button type="primary" :loading="submitting" @click="onSubmit">提交子组</el-button>
            </div>
            </template>
          </template>

          <el-empty v-else description="请选择参数后录入" :image-size="80" />
        </el-card>
      </el-col>

      <!-- 右侧：子组历史 -->
      <el-col :span="10">
        <SubgroupList :param-id="modelValue" @deleted="emit('saved')" />
      </el-col>
    </el-row>

    <el-dialog v-model="guideVisible" title="首件与 SPC 待补样本使用说明" width="680px" append-to-body>
      <el-alert title="首件实测值会自动作为 SPC 子组的第 1 个样本；无需在首件中重复录入 n 个样本。" type="success" :closable="false" show-icon style="margin-bottom: 16px" />
      <el-steps direction="vertical" :active="4" finish-status="success">
        <el-step title="配置 SPC 参数" description="在参数配置中维护工序参数、单位、目标值、USL、LSL 和子组大小 n。" />
        <el-step title="维护首件检验标准" description="按物料代码和工序选择需要检验的 SPC 参数；首件不再维护独立数值标准。" />
        <el-step title="完成首件检验与电子签名" description="首件合格并签名后，系统自动创建带工单、批次、物料和工序信息的待补样本子组。" />
        <el-step title="在本页补齐剩余样本" description="选择对应参数，打开待补样本记录，只录入剩余 n-1 个样本；补满 n 后自动进入控制图和能力分析。" />
      </el-steps>
      <el-alert title="注意：未满 n 的待补样本不参与控制图或 Cp/Cpk；不得将不同工单或批次的样本混入同一子组。" type="warning" :closable="false" style="margin-top: 16px" />
      <template #footer><el-button type="primary" @click="guideVisible = false">我知道了</el-button></template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useSpcStore } from '@/stores/spc'
import type { SpcParameter, SpcSubgroup } from '@/types/spc'
import SubgroupList from './SubgroupList.vue'

const props = defineProps<{
  modelValue: number | null
  paramList: SpcParameter[]
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: number | null): void
  (e: 'saved'): void
}>()

const store = useSpcStore()
const submitting = ref(false)
const guideVisible = ref(false)
const selectedProcessId = ref<number | null>(null)
const selectedParamId = ref<number | null>(props.modelValue)
const sampleValues = ref<number[]>([])
const pendingSubgroups = ref<SpcSubgroup[]>([])
const selectedPendingId = ref<number | null>(null)
const pendingValues = ref<number[]>([])

// 同步外部 modelValue 到内部 selectedParamId
watch(() => props.modelValue, (v) => {
  selectedParamId.value = v
})

const filteredParams = computed(() =>
  selectedProcessId.value
    ? props.paramList.filter((p) => p.processId === selectedProcessId.value)
    : [],
)

const currentParam = computed(() =>
  props.paramList.find((p) => p.id === selectedParamId.value) || null,
)
const selectedPending = computed(() => pendingSubgroups.value.find((s) => s.id === selectedPendingId.value) || null)
const remainingCount = computed(() => Math.max(0, (currentParam.value?.subgroupSize || 0) - (selectedPending.value?.sampleCount || 0)))

function fmt(v: number | null | undefined): string {
  return v == null ? '—' : String(v)
}

function resetSamples() {
  sampleValues.value = new Array(currentParam.value?.subgroupSize || 0).fill(undefined)
}

function onProcessChange() {
  // 切换工序时清除已选参数
  selectedParamId.value = null
  emit('update:modelValue', null)
  sampleValues.value = []
  pendingSubgroups.value = []
  selectedPendingId.value = null
}

watch(currentParam, (p) => {
  sampleValues.value = new Array(p?.subgroupSize || 0).fill(undefined)
  pendingValues.value = []
  selectedPendingId.value = null
  if (p) loadPendingSubgroups(p.id)
}, { immediate: true })

watch(selectedPending, (sub) => { pendingValues.value = new Array(Math.max(0, (currentParam.value?.subgroupSize || 0) - (sub?.sampleCount || 0))).fill(undefined) })

async function loadPendingSubgroups(paramId: number) {
  const subs = await store.fetchSubgroups(paramId)
  pendingSubgroups.value = subs.filter((s) => s.subgroupStatus === '待补样本' && s.sourceType === '首件自动导入')
  selectedPendingId.value = pendingSubgroups.value[0]?.id || null
}

async function onParamChange(id: number) {
  emit('update:modelValue', id)
}

async function onSubmit() {
  const p = currentParam.value
  if (!p) {
    ElMessage.warning('请先选择参数')
    return
  }
  const vals = sampleValues.value.map((v) => Number(v))
  if (vals.length !== p.subgroupSize || vals.some((v) => v == null || Number.isNaN(v))) {
    ElMessage.warning(`请输入全部 ${p.subgroupSize} 个样本值`)
    return
  }
  submitting.value = true
  try {
    await store.saveSubgroup({ paramId: p.id, sampleValues: vals, sourceType: '手动录入' })
    ElMessage.success('子组已保存，已自动重算控制限/能力')
    resetSamples()
    emit('saved')
  } finally {
    submitting.value = false
  }
}

async function onAppendPending() {
  const sub = selectedPending.value
  const vals = pendingValues.value.map((v) => Number(v))
  if (!sub || vals.length !== remainingCount.value || vals.some((v) => Number.isNaN(v))) { ElMessage.warning(`请输入剩余 ${remainingCount.value} 个样本值`); return }
  submitting.value = true
  try {
    await store.appendPendingSamples(sub.id, vals)
    ElMessage.success('样本已补齐，子组已完成并纳入 SPC 统计')
    await loadPendingSubgroups(sub.paramId)
    emit('saved')
  } finally { submitting.value = false }
}

</script>

<style scoped>
.data-entry { padding: 4px; }
.entry-card { border: 1px solid #ECE7E1; }
.card-head { display: flex; align-items: center; justify-content: space-between; }
.head-actions { display: flex; align-items: center; gap: 8px; }
.card-title { font-weight: 600; color: #1B3A5B; }
.param-info { margin: 8px 0 14px; }
.samples-title { font-size: 12px; color: #5B7A99; margin-bottom: 8px; }
.sample-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin-bottom: 14px; }
.sample-cell { display: flex; align-items: center; gap: 6px; }
.sample-idx { width: 18px; text-align: center; font-size: 12px; color: #8C9BA8; font-family: 'JetBrains Mono', monospace; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.num { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #5B7A99; }
</style>

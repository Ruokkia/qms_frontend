<template>
  <div class="eight-d-panel">
    <div class="eight-d-steps">
      <div
        v-for="(step, idx) in stepOrder"
        :key="step"
        class="step-item"
        :class="{ active: step === currentStep, passed: isPassed(step) }"
        @click="selectStep(step)"
      >
        <div class="step-number">{{ step }}</div>
        <div class="step-label">{{ EIGHT_D_STEP_LABELS[step] }}</div>
        <div v-if="idx < stepOrder.length - 1" class="step-line"></div>
      </div>
    </div>

    <div class="eight-d-form">
      <div class="step-title">{{ EIGHT_D_STEP_LABELS[currentStep] }}</div>
      <el-input
        v-model="form[stepField(currentStep)]"
        type="textarea"
        :rows="6"
        :disabled="readonly"
        :placeholder="placeholder(currentStep)"
        resize="none"
      />
      <div class="step-actions">
        <el-button v-if="!readonly" type="primary" :loading="saveLoading" @click="save">
          保存
        </el-button>
        <el-button v-if="!readonly && currentStep !== 'D8'" type="warning" :loading="nextLoading" @click="nextStep">
          提交到下一步
        </el-button>
        <el-button v-if="!readonly && currentStep !== 'D1'" :loading="prevLoading" @click="prevStep">
          上一步
        </el-button>
      </div>
    </div>

    <div class="eight-d-summary">
      <div class="summary-title">8D 报告概览</div>
      <div class="summary-grid">
        <div v-for="step in stepOrder" :key="step" class="summary-item">
          <div class="summary-label">{{ EIGHT_D_STEP_LABELS[step] }}</div>
          <div class="summary-value" :class="{ empty: !form[stepField(step)] }">
            {{ form[stepField(step)] || '待填写' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ===== M2: 8D 报告组件 =====
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { saveEightDApi, nextStepEightDApi } from '@/api/exception'
import { EIGHT_D_STEP_LABELS, EIGHT_D_STEP_ORDER } from '@/enums/exception'
import type { EightDReport, EightDSaveDTO } from '@/types/exception'

const props = defineProps<{
  exceptionId: number
  eightD?: EightDReport
  readonly?: boolean
  cardMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'updated', value: EightDReport): void
}>()

const stepOrder = EIGHT_D_STEP_ORDER
const currentStep = ref('D1')
const currentVersion = ref<number | undefined>(undefined)
const saveLoading = ref(false)
const nextLoading = ref(false)
const prevLoading = ref(false)

const form = ref<Record<string, string>>({
  d1Team: '',
  d2ProblemDesc: '',
  d3Containment: '',
  d4RootCause: '',
  d5Corrective: '',
  d6Implementation: '',
  d7Preventive: '',
  d8Closure: '',
})

watch(
  () => props.eightD,
  (val) => {
    if (val) {
      form.value = {
        d1Team: val.d1Team || '',
        d2ProblemDesc: val.d2ProblemDesc || '',
        d3Containment: val.d3Containment || '',
        d4RootCause: val.d4RootCause || '',
        d5Corrective: val.d5Corrective || '',
        d6Implementation: val.d6Implementation || '',
        d7Preventive: val.d7Preventive || '',
        d8Closure: val.d8Closure || '',
      }
      currentStep.value = val.currentStep || 'D1'
      currentVersion.value = val.version
    }
  },
  { immediate: true },
)

function stepField(step: string) {
  const map: Record<string, string> = {
    D1: 'd1Team',
    D2: 'd2ProblemDesc',
    D3: 'd3Containment',
    D4: 'd4RootCause',
    D5: 'd5Corrective',
    D6: 'd6Implementation',
    D7: 'd7Preventive',
    D8: 'd8Closure',
  }
  return map[step]
}

function isPassed(step: string) {
  const idx = stepOrder.indexOf(step)
  const currentIdx = stepOrder.indexOf(currentStep.value)
  return idx < currentIdx
}

function selectStep(step: string) {
  currentStep.value = step
}

function placeholder(step: string) {
  const map: Record<string, string> = {
    D1: '请输入团队成员及负责人',
    D2: '请按 5W2H 描述问题',
    D3: '请输入临时遏制措施',
    D4: '请输入根本原因分析',
    D5: '请输入纠正措施',
    D6: '请输入实施与验证结果',
    D7: '请输入预防措施',
    D8: '请输入团队表彰/闭环总结',
  }
  return map[step] || '请输入内容'
}

async function save() {
  saveLoading.value = true
  try {
    const payload: EightDSaveDTO = {
      currentStep: currentStep.value,
      ...form.value,
      version: currentVersion.value,
    }
    const res = await saveEightDApi(props.exceptionId, payload)
    if (res.code === 0) {
      ElMessage.success('保存成功')
      currentVersion.value = res.data.version
      emit('updated', res.data)
    }
  } catch (e) {
    console.error('保存 8D 失败', e)
  } finally {
    saveLoading.value = false
  }
}

async function nextStep() {
  // 前置校验：当前步骤内容不可为空
  const field = stepField(currentStep.value)
  if (!form.value[field] || !form.value[field].trim()) {
    ElMessage.warning(`请先填写 ${EIGHT_D_STEP_LABELS[currentStep.value]} 内容后再提交到下一步`)
    return
  }
  nextLoading.value = true
  try {
    const res = await nextStepEightDApi(props.exceptionId)
    if (res.code === 0) {
      ElMessage.success('已提交到下一步')
      emit('updated', res.data)
    }
  } catch (e) {
    console.error('提交下一步失败', e)
  } finally {
    nextLoading.value = false
  }
}

function prevStep() {
  const idx = stepOrder.indexOf(currentStep.value)
  if (idx > 0) {
    currentStep.value = stepOrder[idx - 1]
  }
}
</script>

<style scoped>
/* ── 卡片列表模式 ── */
.eightd-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.eightd-card {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.eightd-card.active {
  border-color: #1b3a5b;
}
.eightd-card.completed {
  border-color: #3e7a4e;
}
.eightd-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}
.eightd-card-header:hover {
  background: #faf9f7;
}
.eightd-card-step {
  display: flex;
  align-items: center;
  gap: 10px;
}
.step-num {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  border: 1px solid #d4cfc8;
  color: #8c9ba8;
  background: #fff;
  flex-shrink: 0;
}
.eightd-card.active .step-num {
  background: #1b3a5b;
  color: #fff;
  border-color: #1b3a5b;
}
.eightd-card.completed .step-num {
  background: #3e7a4e;
  color: #fff;
  border-color: #3e7a4e;
}
.step-label-text {
  font-size: 13px;
  font-weight: 600;
  color: #2a2a2a;
}
.eightd-card-body {
  padding: 0 16px 16px;
  border-top: 1px solid #f0ede9;
}
.eightd-card-body :deep(.el-textarea) {
  margin-top: 12px;
}
.eightd-card-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.eightd-card-preview {
  padding: 0 16px 12px;
  font-size: 12px;
  color: #5b6770;
  line-height: 1.5;
  max-height: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
  border-top: 1px solid #f0ede9;
  white-space: nowrap;
}

/* ── 原有横向步骤条模式 ── */
.eight-d-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.eight-d-steps {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  background: #faf9f7;
  border-radius: 6px;
  overflow-x: auto;
}
.step-item {
  flex: 1;
  min-width: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
  cursor: pointer;
  padding: 8px 0;
  border-radius: 4px;
  transition: all 0.2s;
}
.step-item:hover {
  background: rgba(27, 58, 91, 0.05);
}
.step-item.active .step-number {
  background: #1b3a5b;
  color: #fff;
  border-color: #1b3a5b;
}
.step-item.passed .step-number {
  background: #3e7a4e;
  color: #fff;
  border-color: #3e7a4e;
}
.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid #d4cfc8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #8c9ba8;
  background: #fff;
  font-family: 'JetBrains Mono', monospace;
}
.step-label {
  font-size: 11px;
  color: #5b6770;
  text-align: center;
  line-height: 1.3;
  white-space: nowrap;
}
.step-line {
  position: absolute;
  top: 22px;
  right: -50%;
  width: 100%;
  height: 1px;
  background: #e3e0dc;
  z-index: 0;
}
.step-item.passed + .step-item .step-line,
.step-item.active .step-line {
  background: #3e7a4e;
}
.eight-d-form {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  padding: 16px;
}
.step-title {
  font-size: 14px;
  font-weight: 600;
  color: #1b3a5b;
  margin-bottom: 12px;
}
.step-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.eight-d-summary {
  background: #faf9f7;
  border: 1px solid #f0ede9;
  border-radius: 6px;
  padding: 16px;
}
.summary-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5b;
  margin-bottom: 12px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.summary-item {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 4px;
  padding: 10px;
}
.summary-label {
  font-size: 11px;
  color: #8c9ba8;
  margin-bottom: 4px;
}
.summary-value {
  font-size: 12px;
  color: #2a2a2a;
  line-height: 1.5;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.summary-value.empty {
  color: #b8b3ac;
  font-style: italic;
}
@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

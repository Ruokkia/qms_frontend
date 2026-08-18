<template>
  <div class="process-stepper">
    <div class="stepper-title">整改流程</div>
    <el-steps
      :active="activeIndex"
      direction="vertical"
      :space="64"
      finish-status="success"
      process-status="finish"
    >
      <el-step
        v-for="(s, i) in stages"
        :key="s.key"
        :title="s.title"
        :description="stepDesc(s.key, i)"
        :class="{ clickable: canClick(i), locked: isLocked(s.key) }"
        :icon="lockedIcon(s.key)"
        @click="handleClick(s.key, i)"
      />
    </el-steps>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { processIncludes8D, processIncludesCapa } from '@/enums/exception'

const props = defineProps<{
  current: string
  processType?: string
  capaStatus?: string
  stepAccessible?: Record<string, boolean>
}>()

const emit = defineEmits<{
  'update:current': [stage: string]
}>()

// 根据 processType 动态构建步骤列表
interface StageItem { key: string; title: string; desc: string }

const stages = computed<StageItem[]>(() => {
  const pt = props.processType
  const has8D = processIncludes8D(pt)
  const hasCapa = processIncludesCapa(pt)

  if (has8D && hasCapa) {
    // BOTH（8D + CAPA）：CAPA（治理层）与 8D（执行层）交错推进
    return [
      { key: 'initiate', title: '1. 发起整改流程', desc: '选择 8D + CAPA，指派责任人' },
      { key: '8d_analysis', title: '2. 8D 根因分析', desc: 'D1-D4 根因分析' },
      { key: '8d_measures', title: '3. 8D 措施与执行', desc: 'D5 措施方案 + D6-D8 执行' },
      { key: 'verify', title: '4. 验证与闭环', desc: '验证有效性 → 线上闭环' },
      { key: 'audit', title: '5. 审核追溯', desc: '全过程操作审计记录' },
    ]
  } else if (has8D) {
    // 纯 8D：无 CAPA 治理层，仅 8D 八步法线性推进
    return [
      { key: 'initiate', title: '1. 发起整改流程', desc: '选择 8D，指派责任人' },
      { key: '8d_analysis', title: '2. 8D 根因分析', desc: 'D1-D4 根因分析' },
      { key: '8d_measures', title: '3. 8D 措施与执行', desc: 'D5-D8 措施方案与执行' },
      { key: 'verify', title: '4. 验证与闭环', desc: '验证有效性 → 线上闭环' },
      { key: 'audit', title: '5. 审核追溯', desc: '全过程操作审计记录' },
    ]
  } else {
    // 纯 CAPA：整改计划 → 改善措施 → 验证闭环（审批内嵌于措施尾部，不再独立成节点）
    return [
      { key: 'initiate', title: '1. 发起整改流程', desc: '选择 CAPA / 8D / BOTH' },
      { key: 'plan', title: '2. 制定整改计划', desc: '设定目标、周期与负责人' },
      { key: 'measures', title: '3. 执行改善措施', desc: '临时措施 / 纠正措施 / 预防措施' },
      { key: 'verify', title: '4. 验证与闭环', desc: '验证有效性 → 线上闭环' },
      { key: 'audit', title: '5. 审核追溯', desc: '全过程操作审计记录' },
    ]
  }
})

const stageKeys = computed(() => stages.value.map((s) => s.key))

const activeIndex = computed(() => {
  const idx = stageKeys.value.indexOf(props.current)
  return idx >= 0 ? idx : 0
})

function isLocked(key: string): boolean {
  if (!props.stepAccessible) return false
  // 已当前或已完成(activeIndex之前的)步骤不算锁定
  const idx = stageKeys.value.indexOf(key)
  if (idx <= activeIndex.value) return false
  // 未来步骤：检查门禁
  return props.stepAccessible[key] !== true
}

function canClick(idx: number): boolean {
  if (idx === activeIndex.value) return false
  const key = stageKeys.value[idx]
  return !isLocked(key)
}

function lockedIcon(key: string) {
  return isLocked(key) ? undefined : undefined
}

function stepDesc(key: string, idx: number) {
  if (isLocked(key)) {
    // 确定锁定原因
    const prevKey = stageKeys.value[idx - 1]
    const prevStage = stages.value[idx - 1]
    return '← 需先完成「' + (prevStage?.title?.replace(/^\d\.\s*/, '') || prevKey) + '」'
  }
  return stages.value[idx].desc
}

function handleClick(key: string, idx: number) {
  if (key === props.current) return
  if (isLocked(key)) return
  emit('update:current', key)
}
</script>

<style scoped>
.process-stepper {
  background: #faf9f7;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  padding: 16px 14px;
}

.stepper-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5b;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e3e0dc;
}

.process-stepper :deep(.el-step) {
  cursor: default;
}

.process-stepper :deep(.el-step.clickable) {
  cursor: pointer;
}

.process-stepper :deep(.el-step.clickable:hover .el-step__title) {
  color: #b8763e;
}

/* 锁定状态 */
.process-stepper :deep(.el-step.locked .el-step__icon) {
  opacity: 0.4;
}
.process-stepper :deep(.el-step.locked .el-step__title) {
  color: #c4c0bc !important;
  cursor: not-allowed;
}
.process-stepper :deep(.el-step.locked .el-step__description) {
  color: #c4c0bc;
  font-size: 10px;
}

.process-stepper :deep(.el-step__title) {
  font-size: 13px;
  font-weight: 600;
  color: #2a2a2a;
}

.process-stepper :deep(.el-step__description) {
  font-size: 11px;
  color: #8c9ba8;
  margin-top: 2px;
}

.process-stepper :deep(.el-step.is-finish .el-step__title) {
  color: #3e7a4e;
}

.process-stepper :deep(.el-step.is-process .el-step__title) {
  color: #1b3a5b;
}
</style>

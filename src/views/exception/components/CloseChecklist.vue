<template>
  <div class="close-checklist">
    <div class="checklist-title">闭环前置条件检查</div>
    <div v-loading="loading" class="checklist-body">
      <div
        v-for="check in checks"
        :key="check.item"
        class="checklist-item"
        :class="'checklist-item--' + check.status.toLowerCase()"
      >
        <span class="checklist-icon">
          <span v-if="check.status === 'PASS'" class="icon-pass">&#10003;</span>
          <span v-else-if="check.status === 'FAIL'" class="icon-fail">&#10007;</span>
          <span v-else class="icon-na">&mdash;</span>
        </span>
        <div class="checklist-text">
          <span class="checklist-name">{{ check.item }}</span>
          <span class="checklist-detail">{{ check.detail }}</span>
        </div>
      </div>
    </div>
    <div v-if="!loading && readiness" class="checklist-actions">
      <div v-if="!readiness.canClose" class="checklist-warn">
        不满足闭环条件，请完善上述缺失项后再执行闭环
      </div>
      <template v-if="readiness.canClose">
        <el-input
          v-model="closeReason"
          type="textarea"
          :rows="2"
          placeholder="请输入闭环原因/总结"
          resize="none"
          style="margin-bottom: 10px"
        />
        <el-button
          type="success"
          :loading="closeLoading"
          :disabled="!closeReason.trim()"
          @click="$emit('close', closeReason)"
        >
          确认闭环
        </el-button>
      </template>
    </div>
    <div v-if="checkError" class="checklist-error">
      {{ checkError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { getCloseReadinessApi } from '@/api/exception'
import { getErrorMessage } from '@/api/request-error'
import type { CloseReadinessVO } from '@/types/exception'

const props = defineProps<{
  exceptionId: number
  closeLoading?: boolean
}>()

defineEmits<{
  close: [closeReason: string]
}>()

const loading = ref(false)
const readiness = ref<CloseReadinessVO | null>(null)
const checkError = ref('')
const closeReason = ref('')
const checks = ref<CloseReadinessVO['checks']>([])

async function load() {
  if (!props.exceptionId) return
  loading.value = true
  checkError.value = ''
  try {
    const res = await getCloseReadinessApi(props.exceptionId)
    if (res.code === 0 && res.data) {
      readiness.value = res.data
      checks.value = res.data.checks
    }
  } catch (e: any) {
    checkError.value = getErrorMessage(e, '加载闭环检查失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.exceptionId, load)

defineExpose({ refresh: load })
</script>

<style scoped>
.close-checklist {
  margin-top: 16px;
  background: #fff;
  border: 1px solid #e3e0dc;
  border-radius: 6px;
  padding: 16px;
}
.checklist-title {
  font-size: 14px;
  font-weight: 600;
  color: #1b3a5b;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0ede9;
}
.checklist-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 40px;
}
.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 4px;
  background: #faf9f7;
}
.checklist-item--pass {
  background: #f2f8f2;
}
.checklist-item--fail {
  background: #fef6f5;
}
.checklist-item--na {
  background: #f5f6f7;
}
.checklist-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  margin-top: 1px;
}
.icon-pass {
  background: #3e7a4e;
  color: #fff;
}
.icon-fail {
  background: #b84b3e;
  color: #fff;
}
.icon-na {
  background: #c5ced6;
  color: #fff;
}
.checklist-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.checklist-name {
  font-size: 13px;
  font-weight: 600;
  color: #2a2a2a;
}
.checklist-detail {
  font-size: 11px;
  color: #8c9ba8;
}
.checklist-item--fail .checklist-name {
  color: #b84b3e;
}
.checklist-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0ede9;
}
.checklist-warn {
  font-size: 12px;
  color: #b84b3e;
  padding: 8px 12px;
  background: #fef6f5;
  border-radius: 4px;
  border: 1px solid #f5d5d0;
}
.checklist-error {
  margin-top: 10px;
  font-size: 12px;
  color: #b84b3e;
}
</style>

<template>
  <el-drawer
    v-model="visible"
    :title="`首件检验录入 · ${record?.faiNo || ''}`"
    size="720px"
    @open="onOpen"
  >
    <div v-if="record" v-loading="store.loading">
      <!-- 基础信息 -->
      <el-descriptions :column="2" border size="small" class="info-block">
        <el-descriptions-item label="物料名称">{{ record.materialName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="批次号">{{ record.batchNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="工序">{{ record.processName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="工单号">{{ record.workOrderNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="判定结果">
          <el-tag :type="resultTag(record.inspectionResult)" effect="light">{{ record.inspectionResult }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="签名状态">
          <el-tag :type="record.signatureStatus === '已签' ? 'success' : 'info'" effect="plain">
            {{ record.signatureStatus }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 不合格拦截提示 -->
      <el-alert
        v-if="record.inspectionResult === '不合格'"
        type="error"
        :closable="false"
        show-icon
        class="block-alert"
      >
        <template #title>首件检验不合格，禁止生产，已触发异常流程</template>
      </el-alert>

      <!-- 标准变更提示 -->
      <el-alert
        v-if="standardChangedCount > 0"
        type="warning"
        :closable="false"
        show-icon
        class="block-alert"
      >
        <template #title>
          校验标准已更新，{{ standardChangedCount }} 项参数与当前激活标准不一致，建议
          <el-button type="warning" size="small" plain :loading="refreshing" @click="handleRefreshStandard">刷新标准</el-button>
        </template>
      </el-alert>

      <!-- 检验结果总览 -->
      <InspectionResult :record="record" class="block-alert" />

      <!-- 参数录入表 -->
      <div class="section-title">检验参数录入</div>
      <el-table :data="localItems" border stripe>
        <el-table-column prop="paramName" label="参数名称" min-width="130" />
        <el-table-column label="类别" width="100">
          <template #default="{ row }">
            <el-tag :type="categoryTag(row.paramCategory)" size="small" effect="plain">{{ row.paramCategory || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标准值" width="100">
          <template #default="{ row }">
            <span :class="{ 'changed-field': row.hasStandardChanged }">{{ row.standardValue ?? '-' }}</span>
            <el-tooltip v-if="row.hasStandardChanged && row.latestStandardValue !== undefined" effect="dark" placement="top">
              <template #content>当前激活标准值：{{ row.latestStandardValue ?? '-' }}</template>
              <el-icon class="changed-icon"><WarningFilled /></el-icon>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="下限" width="90">
          <template #default="{ row }">
            <span :class="{ 'changed-field': row.hasStandardChanged }">{{ row.lowerLimit ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="上限" width="90">
          <template #default="{ row }">
            <span :class="{ 'changed-field': row.hasStandardChanged }">{{ row.upperLimit ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="单位" width="70">
          <template #default="{ row }">
            <span :class="{ 'changed-field': row.hasStandardChanged }">{{ row.unit ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="实际值" width="170">
          <template #default="{ row }">
            <el-input-number
              v-model="row.actualValue"
              :precision="4"
              :controls="false"
              style="width: 150px"
              placeholder="录入"
            />
          </template>
        </el-table-column>
        <el-table-column label="判定" width="90">
          <template #default="{ row }">
            <el-tag :type="resultTag(clientJudge(row))" effect="light">{{ clientJudge(row) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="footer-actions">
        <el-button :loading="refreshing" @click="handleRefreshStandard">刷新标准</el-button>
        <el-button type="primary" :icon="Check" :loading="submitting" @click="submit">提交并判定</el-button>
          <el-tooltip
            :content="record.signatureStatus === '已签' ? '已完成电子签名' : '请先提交检验结果（录入实际值并完成判定）后再进行电子签名'"
            :disabled="!(record.signatureStatus === '已签' || record.inspectionResult === '待判定')"
          >
            <span>
              <el-button type="success" :icon="Stamp" :disabled="record.signatureStatus === '已签' || record.inspectionResult === '待判定'" @click="showSign = true">
                电子签名
              </el-button>
            </span>
          </el-tooltip>
      </div>
    </div>

    <SignaturePanel v-model="showSign" :inspection-id="inspectionId ?? 0" @signed="onSigned" />
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Stamp, WarningFilled } from '@element-plus/icons-vue'
import { useFaiStore } from '@/stores/fai'
import { useAuthStore } from '@/stores/auth'
import InspectionResult from './InspectionResult.vue'
import SignaturePanel from './SignaturePanel.vue'
import type { FaiInspectionItem, FaiInspectionRecordResponse } from '@/types/fai'

const props = defineProps<{
  modelValue: boolean
  inspectionId: number | null
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  updated: []
}>()

const store = useFaiStore()
const auth = useAuthStore()
const showSign = ref(false)
const submitting = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const record = computed<FaiInspectionRecordResponse | null>(() => store.currentInspection)
const localItems = ref<FaiInspectionItem[]>([])
const refreshing = ref(false)

/** 标准已变更的项目数量 */
const standardChangedCount = computed(() =>
  localItems.value.filter((it) => it.hasStandardChanged).length,
)

async function onOpen() {
  if (props.inspectionId == null) return
  const detail = await store.fetchInspectionDetail(props.inspectionId)
  localItems.value = (detail?.items || []).map((it) => ({ ...it }))
}

/** 刷新标准：从当前激活标准同步最新值 */
async function handleRefreshStandard() {
  if (!record.value) return
  refreshing.value = true
  try {
    await store.refreshStandard(record.value.id)
    const detail = await store.fetchInspectionDetail(record.value.id)
    localItems.value = (detail?.items || []).map((it) => ({ ...it }))
    ElMessage.success('标准已刷新')
    emit('updated')
  } catch {
    ElMessage.error('刷新标准失败')
  } finally {
    refreshing.value = false
  }
}

function resultTag(r: string) {
  if (r === '合格') return 'success'
  if (r === '不合格') return 'danger'
  return 'warning'
}

function categoryTag(c?: string): 'warning' | 'primary' | 'success' | 'info' {
  if (c === 'AQL') return 'warning'
  if (c === '关键尺寸') return 'primary'
  if (c === '性能参数') return 'success'
  return 'info'
}

/** 仅用于前端实时着色的展示判定（服务端为最终判定来源），算法与服务端一致 */
function clientJudge(it: FaiInspectionItem): string {
  const actual = it.actualValue
  if (actual === null || actual === undefined) return '待判定'
  const upper = it.upperLimit
  const lower = it.lowerLimit
  if (upper != null && lower != null) {
    return actual >= lower && actual <= upper ? '合格' : '不合格'
  }
  if (upper == null && lower == null) {
    if (!it.standardValue) return '不合格' // 已录入但无判定基准，无法确认合格
    const std = Number(it.standardValue)
    if (Number.isNaN(std)) return '不合格'
    return Math.abs(actual - std) <= 0.0001 ? '合格' : '不合格'
  }
  let ok = true
  if (lower != null && actual < lower) ok = false
  if (upper != null && actual > upper) ok = false
  return ok ? '合格' : '不合格'
}

async function submit() {
  if (!record.value) return
  const items = localItems.value.map((it) => ({ id: it.id, actualValue: it.actualValue ?? undefined }))
  submitting.value = true
  try {
    await store.submitItems(record.value.id, items)
    const detail = await store.fetchInspectionDetail(record.value.id)
    localItems.value = (detail?.items || []).map((it) => ({ ...it }))
    if (detail?.inspectionResult === '不合格') {
      ElMessage.warning('首件检验不合格，禁止生产，已触发异常流程')
    } else {
      ElMessage.success('提交成功，判定：' + detail?.inspectionResult)
    }
    emit('updated')
  } finally {
    submitting.value = false
  }
}

async function onSigned() {
  showSign.value = false
  if (props.inspectionId != null) {
    await store.fetchInspectionDetail(props.inspectionId)
  }
  ElMessage.success('电子签名完成')
  emit('updated')
}
</script>

<style scoped>
.info-block {
  margin-bottom: 12px;
}
.block-alert {
  margin-bottom: 14px;
}
.section-title {
  font-weight: 600;
  color: #1b3a5b;
  margin: 10px 0;
}
.footer-actions {
  margin-top: 16px;
  text-align: right;
}
.changed-field {
  color: #b84b3e;
  font-weight: 600;
}
.changed-icon {
  color: #b84b3e;
  margin-left: 4px;
  font-size: 14px;
  vertical-align: middle;
  cursor: help;
}
</style>

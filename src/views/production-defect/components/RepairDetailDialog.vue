<template>
  <el-dialog
    :model-value="modelValue"
    title="维修记录详情"
    width="780px"
    top="4vh"
    class="repair-detail-dialog"
    append-to-body
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @closed="onClosed"
  >
    <div v-if="detail" class="rd-body">
      <!-- 头部 -->
      <div class="rd-header">
        <div class="rd-title">
          <span class="rd-no font-mono">{{ detail.repairNo }}</span>
          <span class="rd-sub">产品：{{ detail.productName || '—' }}</span>
        </div>
        <div class="rd-tags">
          <el-tag :type="detail.repairDone === 1 ? 'success' : 'info'" effect="dark" size="small">
            {{ detail.repairDone === 1 ? '已维修' : '未维修' }}
          </el-tag>
          <el-tag v-if="detail.auditStatus" :type="auditType(detail.auditStatus)" effect="plain" size="small">
            审核：{{ detail.auditStatus }}
          </el-tag>
        </div>
      </div>

      <el-scrollbar class="rd-scroll" :max-height="540">
        <!-- 基本信息 -->
        <section class="rd-section">
          <div class="rd-section-title">基本信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="表单名称">{{ fmt(detail.formName) }}</el-descriptions-item>
            <el-descriptions-item label="维修编号">
              <span class="font-mono">{{ fmt(detail.repairNo) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="表单编号">{{ fmt(detail.formNo) }}</el-descriptions-item>
            <el-descriptions-item label="产品编号">{{ fmt(detail.productNo) }}</el-descriptions-item>
            <el-descriptions-item label="产品名称">{{ fmt(detail.productName) }}</el-descriptions-item>
            <el-descriptions-item label="规格型号">{{ fmt(detail.specModel) }}</el-descriptions-item>
            <el-descriptions-item label="生产工单">{{ fmt(detail.workOrderNo) }}</el-descriptions-item>
            <el-descriptions-item label="产品批号/序列号" :span="2">
              <span class="font-mono">{{ fmt(detail.productBatchOrSn) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="所属分公司" :span="2">{{ fmt(detail.plantName || detail.plantCode) }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <!-- 不良信息 -->
        <section class="rd-section">
          <div class="rd-section-title">不良信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="生产工序">{{ fmt(detail.process) }}</el-descriptions-item>
            <el-descriptions-item label="不良代码">{{ fmt(detail.defectCode) }}</el-descriptions-item>
            <el-descriptions-item label="不良数量">
              <span class="font-mono">{{ fmtNum(detail.defectQty) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="送修人">{{ fmt(detail.sendRepairer) }}</el-descriptions-item>
            <el-descriptions-item label="不良现象" :span="2">
              <div class="rd-pre">{{ detail.defectPhenomenon || '—' }}</div>
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <!-- 维修信息 -->
        <section class="rd-section">
          <div class="rd-section-title">维修信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="送修日期">{{ fmt(detail.sendRepairDate) }}</el-descriptions-item>
            <el-descriptions-item label="维修日期">{{ fmt(detail.repairDate) }}</el-descriptions-item>
            <el-descriptions-item label="维修员">{{ fmt(detail.repairer) }}</el-descriptions-item>
            <el-descriptions-item label="维修判定结果">{{ fmt(detail.repairJudgmentResult) }}</el-descriptions-item>
            <el-descriptions-item label="维修状态" :span="2">
              <el-tag :type="detail.repairDone === 1 ? 'success' : 'info'" size="small" effect="light">
                {{ detail.repairDone === 1 ? '已维修' : '未维修' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="维修记录" :span="2">
              <div class="rd-pre">{{ detail.repairRecord || '—' }}</div>
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <!-- 审核信息 -->
        <section class="rd-section">
          <div class="rd-section-title">审核信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="审核人">{{ fmt(detail.auditor) }}</el-descriptions-item>
            <el-descriptions-item label="审核状态">{{ fmt(detail.auditStatus) }}</el-descriptions-item>
            <el-descriptions-item label="审核日期" :span="2">{{ fmt(detail.auditDate) }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <!-- 电子签名 -->
        <section v-if="hasSignature" class="rd-section">
          <div class="rd-section-title">电子签名</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="签名人">{{ fmt(detail.signatureUser) }}</el-descriptions-item>
            <el-descriptions-item label="签名时间">{{ fmt(detail.signatureTime) }}</el-descriptions-item>
            <el-descriptions-item label="签名事由" :span="2">{{ fmt(detail.signatureReason) }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <!-- 系统信息 -->
        <section class="rd-section">
          <div class="rd-section-title">系统信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="创建人">{{ fmt(detail.createdBy) }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ fmt(detail.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="更新人">{{ fmt(detail.updatedBy) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ fmt(detail.updatedAt) }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">
              <div class="rd-pre">{{ detail.remark || '—' }}</div>
            </el-descriptions-item>
          </el-descriptions>
        </section>
      </el-scrollbar>
    </div>
    <template #footer>
      <el-button type="primary" @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProductionRepair } from '@/types/production-defect'
import type { TagProps } from 'element-plus'

const props = defineProps<{ modelValue: boolean; detail?: ProductionRepair | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const hasSignature = computed(
  () => !!(props.detail?.signatureUser || props.detail?.signatureTime || props.detail?.signatureReason),
)

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string' && v.trim() === '') return '—'
  if (typeof v === 'number') return String(v)
  return String(v)
}

function fmtNum(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'string' ? Number(v) : v
  return Number.isNaN(n) ? '—' : String(n)
}

function auditType(s: string): TagProps['type'] {
  const t = (s || '').trim()
  if (/已审核/.test(t)) return 'success'
  if (/驳回/.test(t)) return 'danger'
  if (/待审核|待/.test(t)) return 'warning'
  return 'info'
}

function onClosed() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.repair-detail-dialog :deep(.el-dialog__body) {
  padding: 0;
}
.rd-body {
  padding: 0;
}
.rd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #1b3a5b 0%, #2c4f78 100%);
  color: #fff;
}
.rd-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rd-no {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.rd-sub {
  font-size: 12px;
  opacity: 0.85;
}
.rd-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.rd-scroll {
  padding: 16px 20px 4px;
}
.rd-section {
  margin-bottom: 18px;
}
.rd-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5b;
  padding-left: 9px;
  border-left: 3px solid #b8763e;
  margin-bottom: 10px;
  line-height: 1.2;
}
.rd-pre {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  color: #333;
}
.font-mono {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}
</style>

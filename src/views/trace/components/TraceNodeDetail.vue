<template>
  <el-drawer
    v-model="show"
    :title="node ? '物件详情' : '追溯节点详情'"
    direction="rtl"
    size="480px"
    :destroy-on-close="true"
  >
    <div v-loading="loading">
      <template v-if="node">
        <!-- 类型 + 名称 -->
        <div class="detail-header" :style="{ borderLeftColor: typeColor }">
          <span class="detail-type-tag" :style="{ background: typeColor + '18', color: typeColor }">
            {{ typeLabel }}
          </span>
          <div class="detail-name">{{ node.name || node.nodeCode }}</div>
          <div class="detail-code">{{ node.nodeCode }}</div>
        </div>

        <div v-if="detailTarget" class="detail-action">
          <el-button type="primary" plain :loading="businessDetailLoading" @click="openBusinessDetail">
            查看详细信息
          </el-button>
        </div>

        <!-- 基本信息 -->
        <div class="field-group">
          <div class="group-title">基本信息</div>
          <div class="field-row">
            <span class="field-label">类型</span>
            <span class="field-value">{{ typeLabel }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">条码</span>
            <span class="field-value mono">{{ node.nodeCode }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">名称</span>
            <span class="field-value">{{ node.name || '—' }}</span>
          </div>
          <div class="field-row" v-if="node.productCode">
            <span class="field-label">料号</span>
            <span class="field-value mono">{{ node.productCode }}</span>
          </div>
          <div class="field-row" v-if="node.specification">
            <span class="field-label">规格型号</span>
            <span class="field-value mono">{{ node.specification }}</span>
          </div>
          <div class="field-row" v-if="node.nodeType === 'MATERIAL'">
            <span class="field-label">物料代码</span>
            <span class="field-value mono">{{ node.materialCode || '—' }}</span>
          </div>
          <div class="field-row" v-if="node.nodeType === 'MATERIAL'">
            <span class="field-label">物料批号</span>
            <span class="field-value mono">{{ node.materialBatchNo || '—' }}</span>
          </div>
        </div>

        <!-- 批次信息（仅物料节点有 batchInfo） -->
        <div v-if="batch" class="field-group">
          <div class="group-title">批次信息</div>
          <div class="field-row">
            <span class="field-label">批次号</span>
            <span class="field-value mono">{{ batch.batchNo || '—' }}</span>
          </div>
          <div class="field-row" v-if="batch.supplierName">
            <span class="field-label">供应商</span>
            <span class="field-value">{{ batch.supplierName }}</span>
          </div>
          <div class="field-row" v-if="batch.arrivalDate">
            <span class="field-label">来料日期</span>
            <span class="field-value mono">{{ batch.arrivalDate }}</span>
          </div>
          <div class="field-row" v-if="batch.qty != null">
            <span class="field-label">数量</span>
            <span class="field-value mono">{{ batch.qty }}</span>
          </div>
          <div class="field-row" v-if="batch.iqcStatus">
            <span class="field-label">IQC 状态</span>
            <span
              class="field-value"
              :style="{ color: iqcColor(batch.iqcStatus), fontWeight: 600 }"
            >{{ batch.iqcStatus }}{{ batch.inspectionResult ? ' · ' + batch.inspectionResult : '' }}</span>
          </div>
          <div class="field-row" v-if="batch.specModel">
            <span class="field-label">规格型号</span>
            <span class="field-value mono">{{ batch.specModel }}</span>
          </div>
          <div class="field-row" v-if="batch.defectDesc">
            <span class="field-label">不合格描述</span>
            <span class="field-value defect">{{ batch.defectDesc }}</span>
          </div>
        </div>

        <!-- IQC 检验明细 -->
        <div v-if="inspections?.length" class="field-group">
          <div class="group-title">IQC 检验明细（{{ inspections.length }} 项）</div>
          <table class="inspect-table">
            <thead>
              <tr>
                <th>检验项</th>
                <th>规格</th>
                <th>实测</th>
                <th>判定</th>
                <th>检验员</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in inspections" :key="i.id">
                <td>{{ i.item }}</td>
                <td class="mono">{{ i.spec }}</td>
                <td class="mono">{{ i.measured }}</td>
                <td>
                  <span class="judge-tag" :class="i.judgment === '合格' ? 'pass' : 'fail'">{{ i.judgment }}</span>
                </td>
                <td>{{ i.inspector }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <div v-else-if="!loading" class="empty-detail">
        <p>暂无详情数据</p>
      </div>
    </div>
  </el-drawer>

  <FinishedGoodsDetailDialog
    v-model="finishedDetailVisible"
    :detail="finishedDetail"
    :edit-mode="false"
    readonly
  />
  <IncomingDetailDialog
    v-model="incomingDetailVisible"
    :detail="incomingDetail"
    mode="view"
    readonly
  />
</template>

<script setup lang="ts">
// ===== M0: 追溯节点详情抽屉（物件全字段展示） =====
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getTraceNodeDetailApi } from '@/api/trace'
import { getFinishedGoodsDetailApi } from '@/api/finishedGoods'
import { getMaterialInspectionDetailApi } from '@/api/incoming'
import type { TraceNodeDetail } from '@/types/trace'
import type { FinishedGoodsInspection } from '@/types/finishedGoods'
import type { MaterialInspection } from '@/types/incoming'
import { resolveTraceDetailTarget } from '@/utils/trace-detail-target'
import FinishedGoodsDetailDialog from '@/views/finished-goods/components/FinishedGoodsDetailDialog.vue'
import IncomingDetailDialog from '@/views/incoming/components/IncomingDetailDialog.vue'
import {
  NodeTypeEnum,
  NODE_TYPE_LABELS,
  NODE_TYPE_COLORS,
  IQC_STATUS_COLORS,
} from '@/enums/trace'

const props = defineProps<{
  visible: boolean
  nodeId: string | null
  /** 半成品子项批号（详情查询用，不影响追溯链路） */
  sonLotNo?: string | null
}>()
const emit = defineEmits<{
  'update:visible': [v: boolean]
}>()

const show = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
})

const loading = ref(false)
const detail = ref<TraceNodeDetail | null>(null)
const node = computed(() => detail.value?.detail ?? null)
const batch = computed(() => detail.value?.batchInfo ?? null)
const inspections = computed(() => detail.value?.inspections ?? [])
const detailTarget = computed(() => node.value ? resolveTraceDetailTarget(node.value.id, node.value.nodeType) : null)
const finishedDetailVisible = ref(false)
const incomingDetailVisible = ref(false)
const finishedDetail = ref<FinishedGoodsInspection | null>(null)
const incomingDetail = ref<MaterialInspection | null>(null)
const businessDetailLoading = ref(false)

const typeLabel = computed(() => {
  if (!node.value) return ''
  const style: Record<string, string> = { FINISHED_GOOD: '成品', SEMI_FINISHED: '半成品', MATERIAL: '物料' }
  return style[node.value.nodeType] || NODE_TYPE_LABELS[node.value.nodeType as NodeTypeEnum] || node.value.nodeType
})
const typeColor = computed(() => {
  if (!node.value) return '#8C9BA8'
  const style: Record<string, string> = { FINISHED_GOOD: '#1B3A5B', SEMI_FINISHED: '#167C80', MATERIAL: '#C58A32' }
  return style[node.value.nodeType] || NODE_TYPE_COLORS[node.value.nodeType as NodeTypeEnum] || '#8C9BA8'
})

function iqcColor(status: string): string {
  return IQC_STATUS_COLORS[status] ?? '#8C9BA8'
}

async function openBusinessDetail() {
  const target = detailTarget.value
  if (!target) return

  businessDetailLoading.value = true
  try {
    if (target.kind === 'finished') {
      const res = await getFinishedGoodsDetailApi(target.id)
      if (res.code === 0 && res.data) {
        finishedDetail.value = res.data
        finishedDetailVisible.value = true
      } else {
        ElMessage.error(res.message || '加载成品详细信息失败')
      }
      return
    }

    const res = await getMaterialInspectionDetailApi(target.id)
    if (res.code === 0 && res.data) {
      incomingDetail.value = res.data
      incomingDetailVisible.value = true
    } else {
      ElMessage.error(res.message || '加载来料详细信息失败')
    }
  } catch {
    ElMessage.error('加载详细信息失败，请稍后重试')
  } finally {
    businessDetailLoading.value = false
  }
}

async function loadDetail(nodeIdStr: string) {
  loading.value = true
  detail.value = null
  try {
    // 解析复合 ID：新格式 "fg:ABC" / "mi:ABC"（条码），兼容旧格式 "fg_123" / "mi_456"（数字主键）
    let type: 'fg' | 'mi' = 'fg'
    let id: string | number = nodeIdStr
    if (nodeIdStr.includes(':')) {
      const [prefix, value] = nodeIdStr.split(':')
      type = prefix as 'fg' | 'mi'
      id = value
    } else {
      const parts = nodeIdStr.split('_')
      const parsed = parseInt(parts[1], 10)
      if (!['fg', 'mi'].includes(parts[0]) || isNaN(parsed)) {
        console.error('无法解析节点ID:', nodeIdStr)
        return
      }
      type = parts[0] as 'fg' | 'mi'
      id = parsed
    }
    if (!['fg', 'mi'].includes(type) || id === '') {
      console.error('无法解析节点ID:', nodeIdStr)
      return
    }
    const res = await getTraceNodeDetailApi(id, type, props.sonLotNo ?? undefined)
    if (res.code === 0) detail.value = res.data
  } catch (e) {
    console.error('加载节点详情失败', e)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.nodeId,
  (id) => {
    if (id != null && props.visible) loadDetail(id)
  },
)
watch(
  () => props.visible,
  (v) => {
    if (v && props.nodeId != null && !detail.value) loadDetail(props.nodeId)
  },
)
</script>

<style scoped>
.detail-header {
  background: #fff;
  border: 1px solid #e3e0dc;
  border-left: 4px solid #1B3A5B;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 20px;
}
.detail-action {
  display: flex;
  justify-content: flex-end;
  margin: -8px 0 20px;
}
.detail-type-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 2px;
  margin-bottom: 8px;
}
.detail-name {
  font-size: 18px;
  font-weight: 600;
  color: #1b3a5b;
  line-height: 1.3;
}
.detail-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: #8c9ba8;
  margin-top: 4px;
}

.field-group {
  margin-bottom: 20px;
}
.group-title {
  font-size: 11px;
  color: #b8763e;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0ede9;
}
.field-row {
  display: flex;
  align-items: baseline;
  padding: 6px 0;
  border-bottom: 1px solid #f8f7f5;
}
.field-label {
  font-size: 12px;
  color: #8c9ba8;
  width: 80px;
  flex-shrink: 0;
}
.field-value {
  font-size: 13px;
  color: #2a2a2a;
  word-break: break-all;
}
.field-value.mono {
  font-family: 'JetBrains Mono', monospace;
}
.field-value.defect {
  color: #8a3528;
}

.inspect-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.inspect-table th {
  background: #faf9f7;
  color: #8c9ba8;
  font-weight: 500;
  font-size: 10px;
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid #e3e0dc;
}
.inspect-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #f0ede9;
}
.mono { font-family: 'JetBrains Mono', monospace; }
.judge-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 2px;
}
.judge-tag.pass { background: #3e7a4e18; color: #3e7a4e; }
.judge-tag.fail { background: #b84b3e18; color: #b84b3e; }

.empty-detail {
  padding: 40px 0;
  text-align: center;
  color: #b8b3ac;
  font-size: 13px;
}
</style>

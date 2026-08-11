<template>
  <el-dialog
    :model-value="modelValue"
    class="subgroup-trace-dialog"
    width="860px"
    top="2vh"
    :close-on-click-modal="false"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <template #header>
      <div class="id-header">
        <div class="id-title">
          <span class="id-no">子组溯源 · {{ fmt(data?.subgroupNo) }}</span>
          <span class="id-sub">
            控制图数据点追溯 · {{ data?.itemType === 'PRODUCT' ? '产品' : '物料' }}代码 {{ fmt(data?.itemCode) }}
          </span>
        </div>
        <div class="id-tags">
          <el-tag v-if="data?.itemType" size="small" effect="dark" type="info">
            {{ data?.itemType === 'PRODUCT' ? '产品' : '物料' }}
          </el-tag>
          <el-tag v-if="data?.subgroupStatus" size="small" effect="dark"
            :type="data?.subgroupStatus === '已完成' ? 'success' : 'warning'">
            {{ data?.subgroupStatus }}
          </el-tag>
          <el-tag v-if="data?.sourceType" size="small" effect="dark" type="info">
            {{ sourceLabel(data?.sourceType) }}
          </el-tag>
        </div>
      </div>
    </template>

    <el-scrollbar class="id-scroll" v-loading="loading">
      <div class="id-body" v-if="data">
        <!-- 来源与归属 -->
        <section class="id-section">
          <div class="id-section-title">来源与归属</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="子组编号">
              <span class="font-mono">{{ fmt(data.subgroupNo) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="分类">
              {{ data.itemType === 'PRODUCT' ? '产品' : '物料' }}
            </el-descriptions-item>
            <el-descriptions-item label="产品/物料代码">
              <span class="font-mono">{{ fmt(data.itemCode) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="产品/物料名称">{{ fmt(data.itemName) }}</el-descriptions-item>
            <el-descriptions-item label="批次号">
              <span class="font-mono">{{ fmt(data.batchNo) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="条码（追溯标识）">
              <span class="font-mono">{{ fmt(data.barcode) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="工序编码">
              <span class="font-mono">{{ fmt(data.processCode) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="工序名称">{{ fmt(data.processName) }}</el-descriptions-item>
            <el-descriptions-item label="工单号">
              <span class="font-mono">{{ fmt(data.workOrderNo) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="采样时间">{{ fmt(data.sampleTime) }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <!-- 统计量 -->
        <section class="id-section">
          <div class="id-section-title">统计量</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="参数编码">
              <span class="font-mono">{{ fmt(data.paramCode) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="参数名称">{{ fmt(data.paramName) }}</el-descriptions-item>
            <el-descriptions-item label="子组均值 X̄">
              <span class="font-mono">{{ fmtNum(data.meanValue) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="子组极差 R">
              <span class="font-mono">{{ fmtNum(data.rangeValue) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="子组标准差 s">
              <span class="font-mono">{{ fmtNum(data.stdDev) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="样本数">
              <span class="font-mono">{{ (data.samples || []).length }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <!-- 标准快照（当时副本，不随标准库改版变动） -->
        <section class="id-section">
          <div class="id-section-title">当时标准快照</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="标准版本">
              <el-tag v-if="data.standardVersion != null" size="small" effect="light" type="warning">
                v{{ data.standardVersion }}
              </el-tag>
              <span v-else class="font-mono">—</span>
            </el-descriptions-item>
            <el-descriptions-item label="单位">{{ fmt(data.unit) }}</el-descriptions-item>
            <el-descriptions-item label="目标值">
              <span class="font-mono">{{ fmtNum(data.targetValue) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="规格上限 USL">
              <span class="font-mono">{{ fmtNum(data.upperSpecLimit) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="规格下限 LSL">
              <span class="font-mono">{{ fmtNum(data.lowerSpecLimit) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="来源">
              {{ data.sourceType ? sourceLabel(data.sourceType) : '—' }}
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <!-- 样本值明细 -->
        <section class="id-section">
          <div class="id-section-title">样本值明细</div>
          <div v-if="(data.samples || []).length" class="sample-grid">
            <div v-for="(s, i) in data.samples" :key="s.id ?? i" class="sample-chip">
              <span class="sample-idx">#{{ s.sampleNo ?? i + 1 }}</span>
              <span class="sample-val font-mono">{{ fmtNum(s.sampleValue) }}</span>
              <span v-if="s.barcode" class="sample-bar font-mono">{{ s.barcode }}</span>
            </div>
          </div>
          <div v-else class="id-pre">—</div>
        </section>

        <!-- 来源表明细（按代码+批号反查成品表/物料表） -->
        <section class="id-section" v-if="sourceFields().length">
          <div class="id-section-title">
            来源明细（{{ data?.itemType === 'PRODUCT' ? '成品表' : '物料表' }}反查）
          </div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item
              v-for="f in sourceFields()"
              :key="f.key"
              :label="f.label"
            >
              <span class="font-mono">{{ fmt(f.value) }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </section>
        <section class="id-section" v-else-if="!loading">
          <div class="id-section-title">
            来源明细（{{ data?.itemType === 'PRODUCT' ? '成品表' : '物料表' }}反查）
          </div>
          <div class="id-pre">未在来源表中查到该代码 + 批号对应的记录</div>
        </section>
      </div>
      <el-empty v-else-if="!loading" description="暂无数据" />
    </el-scrollbar>

    <template #footer>
      <div class="id-footer">
        <span class="id-hint">该子组为标准生成当时的快照，标准库后续改版不影响此处展示</span>
        <div class="id-footer-btns">
          <el-button type="primary" @click="emit('update:modelValue', false)">关闭</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
interface SpcSampleLite {
  id?: number
  sampleNo?: number
  sampleValue?: number
  barcode?: string
}
interface SubgroupTraceData {
  id?: number
  subgroupNo?: string
  itemType?: 'PRODUCT' | 'MATERIAL'
  itemCode?: string
  itemName?: string
  batchNo?: string
  barcode?: string
  processCode?: string
  processName?: string
  workOrderNo?: string
  sampleTime?: string
  paramCode?: string
  paramName?: string
  meanValue?: number
  rangeValue?: number
  stdDev?: number
  unit?: string
  standardVersion?: number | null
  targetValue?: number | null
  upperSpecLimit?: number | null
  lowerSpecLimit?: number | null
  sourceType?: string
  subgroupStatus?: string
  samples?: SpcSampleLite[]
}

const props = defineProps<{
  modelValue: boolean
  loading?: boolean
  data?: SubgroupTraceData | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string' && v.trim() === '') return '—'
  return String(v)
}
function fmtNum(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'string' ? Number(v) : v
  return Number.isNaN(n) ? '—' : String(n)
}
function sourceLabel(s: string): string {
  switch (s) {
    case 'FAI': return '首件导入'
    case 'MANUAL': return '手动录入'
    case 'IMPORT': return '批量导入'
    default: return s
  }
}

// 来源表（物料表/成品表）字段 → 中文标签
const SOURCE_FIELD_LABELS: Record<string, string> = {
  materialCode: '物料代码',
  materialName: '物料名称',
  materialBatchNo: '物料批号',
  materialBarcode: '物料条码',
  supplierName: '供应商',
  supplierCode: '供应商代码',
  inspector: '检验员',
  inspectionResult: '检验结果',
  reviewStatus: '评审状态',
  recordNo: '记录编号',
  qualifiedQty: '合格数量',
  unqualifiedQty: '不合格数量',
  receiveTime: '到货时间',
  inspectionTime: '检验时间',
  materialSpec: '物料规格',
  materialModel: '物料型号',
  // 成品表
  productCode: '产品代码',
  productName: '产品名称',
  prodBatchOrSn: '产品批次/序列号',
  itemCode: '产品代码',
  itemName: '产品名称',
  reportNo: '报告编号',
  productionOrderNo: '生产工单',
  modelSpec: '型号规格',
  qcReview: '质检审核',
  mgrApproval: '经理批准',
  createdAt: '创建时间',
  updatedAt: '更新时间',
}
// 这些字段已在上方基础区展示，来源区跳过以免重复
const SOURCE_SKIP_FIELDS = new Set([
  'id', 'isDeleted', 'version', 'plantCode', 'plantName', 'createdBy', 'updatedBy',
  'batchNo', 'barcode', 'itemCode', 'itemName', 'itemType', 'materialCode', 'productCode',
])
function sourceFieldLabel(k: string): string {
  return SOURCE_FIELD_LABELS[k] || k
}
function sourceFields(): { key: string; label: string; value: unknown }[] {
  const src = (props.data as any)?.sourceDetail
  if (!src || typeof src !== 'object') return []
  const rows: { key: string; label: string; value: unknown }[] = []
  for (const k of Object.keys(src)) {
    if (SOURCE_SKIP_FIELDS.has(k)) continue
    rows.push({ key: k, label: sourceFieldLabel(k), value: src[k] })
  }
  return rows
}
</script>

<style scoped>
.subgroup-trace-dialog :deep(.el-dialog__body) {
  padding: 0;
}
.id-body {
  padding: 0;
}
.id-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #1b3a5b 0%, #2c4f78 100%);
  color: #fff;
}
.id-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.id-no {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.id-sub {
  font-size: 12px;
  opacity: 0.85;
}
.id-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.id-scroll {
  padding: 16px 20px 4px;
}
.id-section {
  margin-bottom: 18px;
}
.id-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5b;
  padding-left: 9px;
  border-left: 3px solid #b8763e;
  margin-bottom: 10px;
  line-height: 1.2;
}
.id-pre {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  color: #333;
}
.font-mono {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}
.sample-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sample-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #f7f9fc;
  min-width: 92px;
}
.sample-idx {
  font-size: 11px;
  color: #8c9ba8;
}
.sample-val {
  font-size: 14px;
  font-weight: 600;
  color: #1b3a5b;
}
.sample-bar {
  font-size: 11px;
  color: #5b6770;
  word-break: break-all;
}
.id-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.id-hint {
  font-size: 12px;
  color: #8c9ba8;
}
.id-footer-btns {
  display: flex;
  gap: 8px;
}
</style>

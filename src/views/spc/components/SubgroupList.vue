<template>
    <el-card shadow="never" class="subgroup-list">
      <template #header>
        <div class="head">
          <span class="title">
            子组历史
            <el-tag v-if="itemCode" size="small" type="success" effect="plain" class="code-tag">按代码「{{ itemCode }}」过滤</el-tag>
            <el-tag v-else size="small" type="info" effect="plain" class="code-tag">全部</el-tag>
            <el-tag v-if="oosCount > 0" size="small" type="danger" effect="dark" class="oos-summary">
              {{ oosCount }} 个子组越界
            </el-tag>
            <el-tag v-else-if="list.length" size="small" type="success" effect="plain" class="oos-summary">
              全部受控
            </el-tag>
          </span>
          <el-button size="small" text @click="load">刷新</el-button>
        </div>
      </template>
      <el-table 
        ref="tableRef"
        :data="list" 
        size="small" 
        empty-text="暂无子组数据" 
        v-loading="loading" 
        :row-class-name="rowClass" 
        :highlight-current-row="true"
        style="width: 100%; flex: 1;"
      >
        <!-- 异常标记列 -->
        <el-table-column label="" width="28" fixed="left">
          <template #default="{ row }">
            <el-tooltip v-if="hasOOS(row)" content="存在越界样本值" placement="right">
              <span class="oos-dot">●</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <!-- ① 分类：左侧固定，始终可见 -->
        <el-table-column label="分类" width="56" fixed="left">
          <template #default="{ row }">
            <el-tag v-if="row.itemType === 'PRODUCT'" size="small" type="primary" effect="light">产品</el-tag>
            <el-tag v-else-if="row.itemType === 'MATERIAL'" size="small" type="success" effect="light">物料</el-tag>
            <span v-else class="dim">—</span>
          </template>
        </el-table-column>
        <!-- ② 名称：左侧固定 -->
        <el-table-column label="名称" min-width="100" fixed="left" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ resolveName(row) }}</span>
          </template>
        </el-table-column>
        <!-- ③ 代码：左侧固定 -->
        <el-table-column prop="itemCode" label="代码" min-width="90" fixed="left" show-overflow-tooltip />
        <!-- ④ 批次号：左侧固定 -->
        <el-table-column prop="batchNo" label="批次号" min-width="100" fixed="left" show-overflow-tooltip />
        <!-- 展开行：样本值明细（固定列之后，不参与横向滚动固定） -->
        <el-table-column type="expand" width="32">
          <template #default="{ row }">
            <div class="expand-samples">
              <span class="expand-label">样本值（n={{ row.sampleSize ?? row.samples?.length }}）</span>
              <div class="expand-tags">
                <template v-if="row.samples && row.samples.length">
                  <el-tooltip
                    v-for="(v, idx) in row.samples"
                    :key="idx"
                    :content="getOOSReason(v.sampleValue, row)"
                    :disabled="!isOOS(v.sampleValue, row)"
                    placement="top"
                  >
                    <el-tag
                      size="small"
                      :type="isOOS(v.sampleValue, row) ? 'danger' : ''"
                      :effect="isOOS(v.sampleValue, row) ? 'dark' : 'plain'"
                    >
                      {{ idx + 1 }}: {{ fmt(v.sampleValue) }}
                    </el-tag>
                  </el-tooltip>
                </template>
                <span v-else class="dim">暂无样本明细</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <!-- ⑤ 采样时间 -->
        <el-table-column label="采样时间" width="86">
          <template #default="{ row }">
            <span class="dim">{{ fmtTime(row.sampleTime) }}</span>
          </template>
        </el-table-column>
        <!-- ⑥ 均值 X̄ -->
        <el-table-column label="均值" width="68">
          <template #default="{ row }"><span class="num">{{ fmt(row.meanValue) }}</span></template>
        </el-table-column>
        <!-- ⑦ 极差 R -->
        <el-table-column label="极差R" width="68">
          <template #default="{ row }"><span class="num">{{ fmt(row.rangeValue) }}</span></template>
        </el-table-column>
        <!-- ⑧ 状态 -->
        <el-table-column label="状态" width="64">
          <template #default="{ row }">
            <el-tag v-if="row.subgroupStatus === '已完成'" size="small" type="success" effect="light">已完成</el-tag>
            <el-tag v-else-if="row.subgroupStatus === '待补样本'" size="small" type="warning" effect="light">待补</el-tag>
            <span v-else class="dim">{{ row.subgroupStatus || '—' }}</span>
          </template>
        </el-table-column>
        <!-- ⑨ 操作 -->
        <el-table-column label="操作" width="50" fixed="right">
          <template #default="{ row }">
            <el-popconfirm title="确认删除该子组及明细？" @confirm="onDelete(row)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="itemCode && list.length" class="list-foot">
        仅展示该代码子组；其中「待补样本」未满 n，<strong>不进入控制图</strong>（此为正常行为）。
      </div>
    </el-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useSpcStore } from '@/stores/spc'
import { searchSpcItemsApi } from '@/api/spc'

const props = defineProps<{ 
  paramId: number | null
  itemCode?: string
  /** 从控制图点击联动传入：要定位高亮的子组编号 */
  highlightSubgroupNo?: string | null
}>()
const emit = defineEmits<{ (e: 'deleted'): void }>()
const store = useSpcStore()
const list = ref<any[]>([])
const loading = ref(false)
const tableRef = ref<any>(null)

// 名称映射缓存
const nameMap = ref<Map<string, string>>(new Map())

function fmt(v: number | null | undefined): string {
  return v == null ? '—' : Number(v).toFixed(3)
}

/** 判断样本值是否超出规格限（USL/LSL） */
function isOOS(sampleValue: number | null | undefined, subgroup: any): boolean {
  if (sampleValue == null || Number.isNaN(sampleValue)) return false
  const paramList = store.parameterList
  if (!paramList || !paramList.length) return false
  const param = paramList.find((p) => p.id === subgroup.paramId)
  if (!param) return false
  const usl = param.upperSpecLimit
  const lsl = param.lowerSpecLimit
  if ((usl != null && sampleValue > usl) || (lsl != null && sampleValue < lsl)) {
    return true
  }
  return false
}

/** 获取 OOS 原因文本 */
function getOOSReason(sampleValue: number | null | undefined, subgroup: any): string {
  if (sampleValue == null || Number.isNaN(sampleValue)) return ''
  const paramList = store.parameterList
  if (!paramList?.length) return ''
  const param = paramList.find((p) => p.id === subgroup.paramId)
  if (!param) return ''
  const usl = param.upperSpecLimit
  const lsl = param.lowerSpecLimit
  if (usl != null && sampleValue > usl) {
    const delta = sampleValue - usl
    return `超出上限 ${delta.toFixed(3)}（${((delta / usl) * 100).toFixed(1)}%）`
  }
  if (lsl != null && sampleValue < lsl) {
    const delta = lsl - sampleValue
    return `低于下限 ${delta.toFixed(3)}（${((delta / lsl) * 100).toFixed(1)}%）`
  }
  return ''
}

/** 检查子组是否有任一 OOS 样本 */
function hasOOS(row: any): boolean {
  if (!row.samples?.length) return false
  return row.samples.some((s: any) => isOOS(s.sampleValue, row))
}

/** OOS 子组计数 */
const oosCount = computed(() => list.value.filter((r) => hasOOS(r)).length)

/** 滚动并高亮指定子组编号对应的行 */
async function scrollToSubgroup(subgroupNo: string) {
  await nextTick()
  const idx = list.value.findIndex((r) => r.subgroupNo === subgroupNo)
  if (idx === -1 || !tableRef.value) return
  tableRef.value.setCurrentRow(list.value[idx])
  // 滚动到该行
  const el = tableRef.value.$el?.querySelector?.('.el-table__body-wrapper')
  if (el) {
    const rows = el.querySelectorAll('.el-table__row')
    const target = rows[idx]
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
}

/** 智能时间格式化 */
function fmtTime(ts: string | undefined): string {
  if (!ts) return '—'
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' +
         d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/** 解析名称 */
function resolveName(row: any): string {
  if (row.materialName) return row.materialName
  const code = row.itemCode
  if (code && nameMap.value.has(code)) return nameMap.value.get(code) || code
  return row.itemCode || '—'
}

function rowClass({ row }: { row: any }): string {
  const classes: string[] = []
  if (row.subgroupStatus === '待补样本') classes.push('row-pending')
  if (hasOOS(row)) classes.push('row-oos')
  return classes.join(' ')
}

async function load() {
  if (!props.paramId) {
    list.value = []
    return
  }
  loading.value = true
  try {
    const all = await store.fetchSubgroups(props.paramId)
    const code = (props.itemCode || '').trim()
    list.value = code ? all.filter((s) => s.itemCode === code) : all

    const codesToQuery = new Set<string>()
    for (const s of list.value) {
      if (!s.materialName && s.itemCode && !nameMap.value.has(s.itemCode)) {
        codesToQuery.add(s.itemCode)
      }
    }
    for (const c of codesToQuery) {
      try {
        const res = await searchSpcItemsApi(c)
        const hit = (res.data || []).find((d: any) => d.itemCode === c)
        if (hit?.itemName) nameMap.value.set(c, hit.itemName)
      } catch { /* 单条失败不影响整体 */ }
    }
  } finally {
    loading.value = false
  }
}

async function onDelete(row: any) {
  await store.deleteSubgroup(row.id)
  ElMessage.success('子组已删除')
  await load()
  emit('deleted')
}

defineExpose({ load, scrollToSubgroup })

watch(() => props.paramId, load)
watch(() => props.itemCode, load)
watch(() => props.highlightSubgroupNo, (v) => {
  if (v) scrollToSubgroup(v)
})
onMounted(load)
</script>

<style scoped>
.subgroup-list {
  border: 1px solid #ECE7E1;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.subgroup-list :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 12px 8px;
}
/* 表格撑满卡片纵向空间 */
.subgroup-list :deep(.el-table) {
  flex: 1;
}
.head { display: flex; align-items: center; justify-content: space-between; }
.title { font-weight: 600; color: #1B3A5B; }
.code-tag { margin-left: 8px; font-weight: 400; }
.dim { color: var(--el-text-color-secondary); }
.num { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #5B7A99; font-variant-numeric: tabular-nums; }
.row-pending { background: #F4F1EC; color: #8C9BA8; }
.row-oos { background: rgba(184, 75, 62, 0.04) !important; }
.list-foot { font-size: 12px; color: #8C9BA8; margin-top: 8px; line-height: 1.4; }

/* OOS 异常标记点 */
.oos-dot { color: #B84B3E; font-size: 18px; line-height: 1; cursor: default; }

/* OOS 汇总标签 */
.oos-summary { margin-left: 8px; }

/* 展开行：样本明细标签列表 */
.expand-samples {
  padding: 8px 16px;
  background: #FAF8F6;
  border-left: 3px solid #1B9C85;
  margin: 4px 0;
}
.expand-label {
  font-size: 12px;
  color: #5B7A99;
  font-weight: 600;
  margin-bottom: 6px;
  display: block;
}
.expand-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>

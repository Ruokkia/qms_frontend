<template>
  <div class="trace-list-view">
    <table class="trace-table">
      <thead>
        <tr>
          <th class="col-level">层级</th>
          <th class="col-type">类型</th>
          <th class="col-code">节点编码</th>
          <th class="col-batch">批次号</th>
          <th class="col-name">名称</th>
          <th class="col-supplier">供应商</th>
          <th class="col-iqc">IQC</th>
          <th class="col-ref">工单/客户</th>
          <th class="col-action">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in flatRows"
          :key="row.key"
          class="trace-row"
          :class="[`type-${row.typeKey}`, { abnormal: row.isAbnormal }]"
        >
          <td class="cell-level" :class="`dir-${row.direction}`">
            <div class="tree-node" :style="{ paddingLeft: (row.depth * 20) + 'px' }">
              <span class="branch-icon" v-if="row.direction !== 'start'">{{ row.isLastInGroup ? '└─' : '├─' }}</span>
              <span class="branch-icon start" v-else>●</span>
              <span class="level-tag" :class="row.direction">{{ row.direction === 'start' ? '起点' : (row.direction === 'up' ? '上溯' : '下溯') + ' L' + row.depth }}</span>
            </div>
          </td>
          <td class="cell-type">
            <span class="type-chip" :style="{ background: row.typeColor + '18', color: row.typeColor, borderColor: row.typeColor + '40' }">
              {{ row.typeLabel }}
            </span>
          </td>
          <td class="cell-code">
            <span class="code-text copyable" @click.stop="copyText(row.node.nodeCode, $event)">{{ row.node.nodeCode }}</span>
            <span v-if="row.isAbnormal" class="abnormal-mark">异常</span>
          </td>
          <td class="cell-batch">
            <span v-if="row.node.batchInfo?.batchNo" class="batch-text copyable" @click.stop="copyText(row.node.batchInfo.batchNo, $event)">{{ row.node.batchInfo.batchNo }}</span>
            <span v-else class="dim">—</span>
          </td>
          <td class="cell-name">
            <span class="name-text copyable" @click.stop="copyText(row.node.name || row.node.nodeCode, $event)">{{ row.node.name || row.node.nodeCode }}</span>
            <div v-if="row.node.batchInfo?.materialCode" class="name-sub copyable" @click.stop="copyText(row.node.batchInfo.materialCode, $event)">{{ row.node.batchInfo.materialCode }}</div>
          </td>
          <td class="cell-supplier">
            <span v-if="row.node.batchInfo?.supplierName" class="sup-name copyable" @click.stop="copyText(row.node.batchInfo.supplierName, $event)">{{ row.node.batchInfo.supplierName }}</span>
            <span v-else class="dim">—</span>
          </td>
          <td class="cell-iqc">
            <span
              v-if="row.node.batchInfo?.iqcStatus"
              class="iqc-badge"
              :style="{ background: iqcColor(row.node.batchInfo.iqcStatus) + '18', color: iqcColor(row.node.batchInfo.iqcStatus) }"
            >
              {{ row.node.batchInfo.iqcStatus }}
            </span>
            <span v-else class="dim">—</span>
          </td>
          <td class="cell-ref">
            <span v-if="row.node.workOrderId" class="ref-text">WO#{{ row.node.workOrderId }}</span>
            <span v-else-if="row.node.nodeType === 'SN'" class="ref-text dim">在库</span>
            <span v-else class="dim">—</span>
          </td>
          <td class="cell-action">
            <button class="detail-btn" @click.stop="$emit('viewDetail', row.node.id)">详情</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
// ===== M0: 追溯列表视图 =====
import { computed } from 'vue'
import type { TraceTreeResult, TraceNode } from '@/types/trace'
import {
  NodeTypeEnum,
  NODE_TYPE_LABELS,
  NODE_TYPE_COLORS,
  IQC_STATUS_COLORS,
} from '@/enums/trace'

const props = defineProps<{ result: TraceTreeResult }>()
defineEmits<{ viewDetail: [id: string | number] }>()

interface FlatRow {
  key: string
  node: TraceNode
  direction: 'up' | 'down' | 'start'
  depth: number
  typeKey: string
  typeLabel: string
  typeColor: string
  isAbnormal: boolean
  isLastInGroup: boolean
}

/** 将树形结果展平为列表行（向上链 + 起点 + 向下树） */
const flatRows = computed<FlatRow[]>(() => {
  const rows: FlatRow[] = []
  const r = props.result

  if (r.upward?.length) {
    const upLen = r.upward.length
    for (let i = upLen - 1; i >= 0; i--) {
      rows.push(toRow(r.upward[i], 'up', upLen - i))
    }
  }
  rows.push(toRow(r.rootNode, 'start', 0))
  if (r.children?.length) walkDown(r.children, 1, rows)

  // 标记每组中的最后一个节点（用于树形连接线 ├─ / └─）
  for (let i = rows.length - 1; i >= 0; i--) {
    const next = rows[i + 1]
    if (rows[i].direction === 'start') {
      rows[i].isLastInGroup = false
    } else if (!next || next.direction !== rows[i].direction || next.depth < rows[i].depth) {
      rows[i].isLastInGroup = true
    }
  }
  return rows
})

function walkDown(nodes: TraceNode[], depth: number, rows: FlatRow[]) {
  for (const n of nodes) {
    rows.push(toRow(n, 'down', depth))
    if (n.children?.length) walkDown(n.children, depth + 1, rows)
  }
}

function toRow(node: TraceNode, direction: 'up' | 'down' | 'start', depth: number): FlatRow {
  const nodeType = node.nodeType as NodeTypeEnum
  const label = NODE_TYPE_LABELS[nodeType] ?? node.nodeType
  const color = NODE_TYPE_COLORS[nodeType] ?? '#8C9BA8'
  const isAbnormal = node.batchInfo?.iqcStatus === '异常' || node.batchInfo?.inspectionResult === '不合格'
  return {
    key: `${direction}-${node.id}-${depth}`,
    node,
    direction,
    depth,
    typeKey: nodeType,
    typeLabel: label,
    typeColor: color,
    isAbnormal,
    isLastInGroup: false,
  }
}

function dirLabel(d: string): string {
  return d === 'up' ? '上溯' : d === 'down' ? '下溯' : '起点'
}

function iqcColor(status: string): string {
  return IQC_STATUS_COLORS[status] ?? '#8C9BA8'
}

function copyText(text: string, event: Event) {
  event.stopPropagation()
  navigator.clipboard.writeText(text).catch(() => {})
}
</script>

<style scoped>
.trace-list-view { overflow-x: auto; }
.trace-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.trace-table thead th {
  background: #faf9f7;
  color: #8c9ba8;
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.5px;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid #e3e0dc;
  white-space: nowrap;
}
.trace-table tbody td {
  padding: 10px 12px;
  border-bottom: 1px solid #f0ede9;
  vertical-align: middle;
}
.trace-row { transition: background 0.12s; }
.trace-row:hover { background: #faf9f7; }

/* 类型色条（左侧 3px，签名元素之一） */
.trace-row td:first-child { border-left: 3px solid transparent; }
.trace-row.type-SN td:first-child { border-left-color: #1B3A5B; }
.trace-row.type-部件 td:first-child { border-left-color: #3E6B95; }
.trace-row.type-关键物料 td:first-child { border-left-color: #B8763E; }
.trace-row.type-非关键物料 td:first-child { border-left-color: #8C9BA8; }
.trace-row.type-来料批次 td:first-child { border-left-color: #6B8E9E; }
.trace-row.type-生产批次 td:first-child { border-left-color: #5B7A99; }
.trace-row.type-FINISHED_GOOD td:first-child { border-left-color: #1B3A5B; }
.trace-row.type-SEMI_FINISHED td:first-child { border-left-color: #3E6B95; }
.trace-row.type-MATERIAL td:first-child { border-left-color: #B8763E; }
.trace-row.type-BATCH td:first-child { border-left-color: #6B8E9E; }

/* 异常批次赭红高亮（签名元素之二） */
.trace-row.abnormal { background: #fdf4f2; }
.trace-row.abnormal:hover { background: #fbeae6; }

.cell-level { white-space: nowrap; min-width: 100px; }
.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}
.branch-icon {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #b8b3ac;
  flex-shrink: 0;
}
.branch-icon.start { color: #b8763e; font-size: 10px; }
.level-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 2px;
  white-space: nowrap;
}
.level-tag.up { background: #f0ede9; color: #5b6770; }
.level-tag.down { background: #eaf0f5; color: #3e6b95; }
.level-tag.start { background: #faf5ef; color: #b8763e; }
.cell-level.dir-start { border-left: 3px solid #b8763e !important; }

.type-chip {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid;
  white-space: nowrap;
}
.code-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #2a2a2a;
  word-break: break-all;
}
.abnormal-mark {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: #b84b3e;
  padding: 1px 5px;
  border-radius: 2px;
  margin-left: 6px;
  vertical-align: middle;
}
.batch-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #1b3a5b;
}
.name-text { font-size: 13px; color: #2a2a2a; font-weight: 500; }
.name-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #b8b3ac;
  margin-top: 3px;
  margin-left: 0;
}
.sup-name { font-size: 12px; color: #2a2a2a; }
.iqc-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 2px;
  white-space: nowrap;
}
.ref-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #3e6b95;
}
.ref-text.dim { color: #b8b3ac; }
.dim { color: #c9c4bc; }
.copyable {
  cursor: copy;
  transition: background 0.12s;
  border-radius: 2px;
  padding: 1px 3px;
  margin: -1px -3px;
}
.copyable:hover {
  background: #e8f0f8;
}
.detail-btn {
  border: 1px solid #d4cfc8;
  background: transparent;
  color: #1b3a5b;
  padding: 3px 10px;
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s;
}
.detail-btn:hover {
  border-color: #1b3a5b;
  background: #1b3a5b;
  color: #fff;
}
</style>

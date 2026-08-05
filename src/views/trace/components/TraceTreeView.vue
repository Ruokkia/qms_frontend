<template>
  <div class="trace-tree-view">
    <div ref="chartRef" class="tree-chart"></div>

    <!-- 图例 -->
    <div class="tree-legend">
      <span class="legend-item" v-for="l in legendItems" :key="l.label">
        <span class="legend-dot" :style="{ background: l.color }"></span>
        {{ l.label }}
      </span>
      <span class="legend-item">
        <span class="legend-dot ring" style="background:#fff;border:2px solid #B84B3E"></span>
        异常批次
      </span>
    </div>

    <p class="tree-hint">可拖拽平移 · 滚轮缩放 · 点击节点查看详情</p>
  </div>
</template>

<script setup lang="ts">
// ===== M0: 追溯树状图 =====
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { TraceTreeResult, TraceNode } from '@/types/trace'
import { buildFullTraceRoot } from '@/utils/trace-full-view'
import {
  NodeTypeEnum,
  NODE_TYPE_LABELS,
  NODE_TYPE_COLORS,
  TraceDirectionEnum,
} from '@/enums/trace'

const props = defineProps<{
  result: TraceTreeResult
  expandDepth: number
  direction: TraceDirectionEnum
}>()
const emit = defineEmits<{ viewDetail: [id: string | number] }>()

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const legendItems = [
  { label: '整机SN', color: NODE_TYPE_COLORS[NodeTypeEnum.SN] },
  { label: '部件', color: NODE_TYPE_COLORS[NodeTypeEnum.PART] },
  { label: '关键物料', color: NODE_TYPE_COLORS[NodeTypeEnum.CRITICAL] },
  { label: '来料批次', color: NODE_TYPE_COLORS[NodeTypeEnum.BATCH] },
]

interface EchartsNode {
  name: string
  nodeId: string | number
  nodeType: string
  nodeCode: string
  label: string
  symbolSize: number
  itemStyle: { color: string; borderColor: string; borderWidth: number; shadowBlur: number; shadowColor: string }
  children: EchartsNode[]
}

/** 将追溯结果转为 ECharts tree 节点（合并向上链 + 起点 + 向下树） */
function buildEchartsTree(): EchartsNode {
  const r = props.result
  const queryId = r.rootNode?.id

  // 全链路：向上分支保留后端原始树结构，与“向上追溯”保持一致；下游分支并列展示。
  if (r.upward?.length) {
    return toEchartsNode(buildFullTraceRoot(r), [], queryId)
  }
  // 无向上链：仅向下树或起点
  if (r.children?.length) {
    const root = toEchartsNode(r.rootNode, [], queryId)
    root.children = r.children.map((n) => toEchartsNode(n, [], queryId))
    return root
  }
  return toEchartsNode(r.rootNode, [], queryId)
}

function toEchartsNode(node: TraceNode, children: EchartsNode[] = [], queryId?: string | number): EchartsNode {
  const nodeType = node.nodeType as NodeTypeEnum
  const graphStyle: Record<string, { color: string; label: string }> = {
    FINISHED_GOOD: { color: '#1B3A5B', label: '成品' },
    SEMI_FINISHED: { color: '#167C80', label: '半成品' },
    MATERIAL: { color: '#C58A32', label: '物料' },
    BATCH: { color: '#B84B3E', label: '风险批次' },
  }
  const color = graphStyle[node.nodeType]?.color ?? NODE_TYPE_COLORS[nodeType] ?? '#8C9BA8'
  const tag = graphStyle[node.nodeType]?.label ?? NODE_TYPE_LABELS[nodeType] ?? node.nodeType
  const isAbnormal = node.batchInfo?.iqcStatus === '异常' || node.batchInfo?.inspectionResult === '不合格'
  const isQueryRoot = queryId !== undefined && node.id === queryId

  let text = node.name
    ? `【${tag}】${node.name}\n${node.nodeCode}`
    : `【${tag}】${node.nodeCode}`
  if (node.batchInfo?.batchNo) {
    text += `\n${node.batchInfo.batchNo}`
    if (node.batchInfo.supplierName) text += ` · ${node.batchInfo.supplierName}`
  }

  return {
    name: String(node.id),
    nodeId: node.id,
    nodeType: node.nodeType,
    nodeCode: node.nodeCode,
    label: text,
    symbolSize: isQueryRoot ? 16 : 12,
    itemStyle: {
      color,
      borderColor: isQueryRoot ? '#B8763E' : (isAbnormal ? '#B84B3E' : color),
      borderWidth: isQueryRoot ? 3 : (isAbnormal ? 3 : 1),
      shadowBlur: isQueryRoot ? 10 : (isAbnormal ? 8 : 0),
      shadowColor: isQueryRoot ? 'rgba(184,118,62,0.4)' : (isAbnormal ? '#B84B3E' : 'transparent'),
    },
    children: children.length ? children : (node.children || []).map((child) => toEchartsNode(child, [], queryId)),
  }
}

function tooltipHtml(data: any): string {
  const node = findNodeById(props.result, data.nodeId)
  if (!node) return `<div style="font-size:12px">${data.nodeCode}</div>`
  const nodeType = node.nodeType as NodeTypeEnum
  const color = NODE_TYPE_COLORS[nodeType] ?? '#8C9BA8'
  const label = NODE_TYPE_LABELS[nodeType] ?? node.nodeType
  const isQuery = node.id === props.result.rootNode?.id
  let h = `<div style="font-weight:600;margin-bottom:4px;font-size:13px;color:${color}">【${label}】${node.name ? node.name + ' · ' : ''}${node.nodeCode}${isQuery ? ' <span style="color:#B8763E;font-size:11px">🔍 当前查询</span>' : ''}</div>`
  if (node.batchInfo) {
    const b = node.batchInfo
    h += `<div style="font-size:11px;color:#5b6770">批次：${b.batchNo}</div>`
    if (b.materialName) h += `<div style="font-size:11px;color:#5b6770">物料：${b.materialName}（${b.materialCode ?? '—'}）</div>`
    if (b.supplierName) h += `<div style="font-size:11px;color:#5b6770">供应商：${b.supplierName}</div>`
    if (b.iqcStatus) {
      const iqcColor = b.iqcStatus === '异常' ? '#B84B3E' : b.iqcStatus === '已检' ? '#3E7A4E' : '#5B7A99'
      h += `<div style="font-size:11px;color:${iqcColor}">IQC：${b.iqcStatus}${b.inspectionResult ? ' · ' + b.inspectionResult : ''}</div>`
    }
  }
  if (node.workOrderId) h += `<div style="font-size:11px;color:#5b6770">工单：#${node.workOrderId}</div>`
  h += `<div style="color:#b8763e;font-size:11px;margin-top:4px">点击查看节点详情</div>`
  return h
}

function findNodeById(result: TraceTreeResult, id: number): TraceNode | null {
  if (result.rootNode.id === id) return result.rootNode
  const search = (nodes?: TraceNode[]): TraceNode | null => {
    if (!nodes) return null
    for (const n of nodes) {
      if (n.id === id) return n
      const found = search(n.children)
      if (found) return found
    }
    return null
  }
  return search(result.children) ?? search(result.upward)
}

function renderChart() {
  if (!chartRef.value) return
  chart ??= echarts.init(chartRef.value)
  const treeData = buildEchartsTree()
  chart.setOption({
    backgroundColor: '#faf9f7',
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (p: any) => tooltipHtml(p.data),
      backgroundColor: '#fff',
      borderColor: '#e3e0dc',
      borderWidth: 1,
      textStyle: { color: '#2a2a2a', fontSize: 12 },
      extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,.08);border-radius:4px;max-width:320px',
    },
    series: [{
      type: 'tree',
      data: [treeData],
      top: '4%',
      left: '12%',
      bottom: '4%',
      right: '24%',
      symbol: 'circle',
      symbolSize: (value: number, params: any) => params.data?.symbolSize || 12,
      orient: 'LR',
      expandAndCollapse: true,
      initialTreeDepth: props.expandDepth,
      roam: true,
      label: {
        position: 'left',
        verticalAlign: 'middle',
        align: 'right',
        fontSize: 11,
        color: '#2a2a2a',
        lineHeight: 15,
        backgroundColor: '#fff',
        borderColor: '#e3e0dc',
        borderWidth: 1,
        borderRadius: 3,
        padding: [4, 8],
        formatter: (p: any) => p.data.label || p.data.name,
      },
      leaves: {
        label: {
          position: 'right',
          verticalAlign: 'middle',
          align: 'left',
          backgroundColor: '#faf9f7',
          borderColor: '#f0ede9',
        },
      },
      emphasis: {
        focus: 'descendant',
        label: { fontWeight: 'bold', borderWidth: 2 },
      },
      lineStyle: { color: '#d4cfc8', width: 1.5, curveness: 0.5 },
      animationDuration: 550,
      animationDurationUpdate: 750,
    }],
  })
  chart.off('click')
  chart.on('click', (params: any) => {
    if (params.data?.nodeId) emit('viewDetail', params.data.nodeId)
  })
}

function resize() {
  chart?.resize()
}

onMounted(() => {
  nextTick(renderChart)
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
  chart = null
})

watch(() => props.result, () => nextTick(renderChart), { deep: true })
watch(() => props.expandDepth, () => renderChart())
</script>

<style scoped>
.trace-tree-view {
  padding: 16px;
}
.tree-chart {
  width: 100%;
  height: 520px;
  background: #faf9f7;
  border: 1px solid #e3e0dc;
  border-radius: 4px;
}
.tree-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding: 8px 0;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #5b6770;
}
.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.legend-dot.ring {
  border-radius: 50%;
}
.tree-hint {
  font-size: 11px;
  color: #b8b3ac;
  margin: 8px 0 0;
  text-align: right;
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessageBox } from 'element-plus'
import type { FishboneCategory } from '@/types/process-tools'

interface FbNode {
  id: number
  name: string
  category: FishboneCategory
  isConfirmedRootCause: boolean
  children: FbNode[]
}

let seq = 0
const nextId = () => ++seq

const CATEGORY_LABEL: Record<FishboneCategory, string> = {
  ROOT: '问题', MAN: '人', MACHINE: '机', MATERIAL: '料', METHOD: '法',
  ENVIRONMENT: '环', MEASUREMENT: '测', CAUSE: '原因',
}

const problemDesc = ref('装配扭矩连续偏移，导致连接松动异响')

/** 初始化 ROOT + 六大类 + 默认原因 */
function buildInitial(): FbNode {
  const categories: { cat: FishboneCategory; name: string; reasons: string[] }[] = [
    { cat: 'MAN', name: '人', reasons: ['培训不足', '作业疏忽'] },
    { cat: 'MACHINE', name: '机', reasons: ['拧紧枪参数漂移'] },
    { cat: 'MATERIAL', name: '料', reasons: ['密封圈批次差异'] },
    { cat: 'METHOD', name: '法', reasons: ['扭矩标准模糊'] },
    { cat: 'ENVIRONMENT', name: '环', reasons: ['车间温湿度波动'] },
    { cat: 'MEASUREMENT', name: '测', reasons: ['扭矩扳手未校准'] },
  ]
  const root: FbNode = { id: nextId(), name: problemDesc.value, category: 'ROOT', isConfirmedRootCause: false, children: [] }
  categories.forEach((c) => {
    const catNode: FbNode = { id: nextId(), name: c.name, category: c.cat, isConfirmedRootCause: false, children: [] }
    c.reasons.forEach((r) => catNode.children.push({ id: nextId(), name: r, category: 'CAUSE', isConfirmedRootCause: false, children: [] }))
    root.children.push(catNode)
  })
  return root
}

const treeData = ref<FbNode[]>([buildInitial()])
const editingId = ref<number | null>(null)
const editName = ref('')

/** 在树中定位节点及其父 */
function findNode(list: FbNode[], id: number, parent: FbNode | null = null): { node: FbNode; parent: FbNode | null } | null {
  for (const n of list) {
    if (n.id === id) return { node: n, parent }
    const r = findNode(n.children, id, n)
    if (r) return r
  }
  return null
}

function addChild(id: number) {
  const hit = findNode(treeData.value, id)
  if (!hit) return
  ElMessageBox.prompt('请输入原因描述', '新增子节点', { inputPattern: /\S+/, inputErrorMessage: '不能为空' })
    .then(({ value }) => {
      const child: FbNode = {
        id: nextId(), name: value, category: hit.node.category === 'ROOT' ? 'CAUSE' : (hit.node.category === 'CAUSE' ? 'CAUSE' : hit.node.category),
        isConfirmedRootCause: false, children: [],
      }
      hit.node.children.push(child)
    })
    .catch(() => {})
}

function startEdit(id: number) {
  const hit = findNode(treeData.value, id)
  if (!hit) return
  editingId.value = id
  editName.value = hit.node.name
}
function saveEdit() {
  if (editingId.value == null) return
  const hit = findNode(treeData.value, editingId.value)
  if (hit && editName.value.trim()) hit.node.name = editName.value.trim()
  editingId.value = null
}

function removeNode(id: number) {
  const hit = findNode(treeData.value, id)
  if (!hit || !hit.parent) return
  ElMessageBox.confirm('确认删除该节点及其全部子节点？', '删除确认', { type: 'warning' })
    .then(() => {
      const idx = hit.parent!.children.findIndex((c) => c.id === id)
      if (idx >= 0) hit.parent!.children.splice(idx, 1)
    })
    .catch(() => {})
}

function toggleRootCause(id: number) {
  const hit = findNode(treeData.value, id)
  if (hit) hit.node.isConfirmedRootCause = !hit.node.isConfirmedRootCause
}

/** 确认根因列表 */
const confirmedRoots = computed(() => {
  const out: string[] = []
  const walk = (list: FbNode[]) => list.forEach((n) => { if (n.isConfirmedRootCause) out.push(n.name); walk(n.children) })
  walk(treeData.value)
  return out
})

/* ── ECharts 树 ── */
const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

function toEchartsTree(node: FbNode): any {
  return {
    name: node.name,
    itemStyle: node.isConfirmedRootCause ? { color: '#B84B3E', borderColor: '#B84B3E' } : undefined,
    label: { color: node.isConfirmedRootCause ? '#fff' : '#1B3A5B' },
    children: node.children.map(toEchartsTree),
  }
}

function renderChart() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption({
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [
      {
        type: 'tree',
        data: treeData.value.map(toEchartsTree),
        top: '4%', left: '12%', bottom: '4%', right: '18%',
        layout: 'orthogonal', orient: 'LR',
        symbol: 'roundRect', symbolSize: [10, 10],
        initialTreeDepth: 3,
        label: { position: 'left', verticalAlign: 'middle', align: 'right', fontSize: 12, color: '#1B3A5B' },
        leaves: { label: { position: 'right', verticalAlign: 'middle', align: 'left' } },
        expandAndCollapse: true,
        animationDuration: 400,
        lineStyle: { color: '#C9BBA8', width: 1.5 },
      },
    ],
  })
}

function resetTree() {
  treeData.value = [buildInitial()]
  problemDesc.value = '装配扭矩连续偏移，导致连接松动异响'
}

onMounted(() => {
  renderChart()
  ro = new ResizeObserver(() => chart?.resize())
  if (chartRef.value) ro.observe(chartRef.value)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  chart?.dispose()
})
watch([treeData, problemDesc], () => nextTick(renderChart), { deep: true })
</script>

<template>
  <div class="fb-page">
    <div class="fb-header">
      <div>
        <h2 class="fb-title">鱼骨图分析</h2>
        <p class="fb-sub">人机料法环测因果分析 · 标记并确认根本原因（与 8D D4 根因分析联动）</p>
      </div>
      <el-button @click="resetTree"><el-icon><RefreshLeft /></el-icon>重置模板</el-button>
    </div>

    <el-card class="prob-card" shadow="never">
      <span class="prob-label">问题描述</span>
      <el-input v-model="problemDesc" size="default" class="prob-input" @input="treeData[0].name = problemDesc" />
    </el-card>

    <div class="fb-body">
      <!-- 左：树形编辑 -->
      <el-card class="edit-card" shadow="never">
        <template #header><span class="card-title">原因结构</span></template>
        <el-tree :data="treeData" node-key="id" :expand-on-click-node="false" default-expand-all>
          <template #default="{ data }">
            <div class="tree-node">
              <template v-if="editingId === data.id">
                <el-input v-model="editName" size="small" class="edit-input" @keyup.enter="saveEdit" @blur="saveEdit" />
              </template>
              <template v-else>
                <span class="node-name" :class="{ 'root-cause': data.isConfirmedRootCause }">
                  <el-tag v-if="data.category !== 'ROOT' && data.category !== 'CAUSE'" size="small" effect="plain" class="cat-tag">
                    {{ CATEGORY_LABEL[data.category as FishboneCategory] }}
                  </el-tag>
                  {{ data.name }}
                  <el-tag v-if="data.isConfirmedRootCause" type="danger" size="small" effect="dark" class="rc-tag">根因</el-tag>
                </span>
              </template>
              <span class="node-ops">
                <el-button link size="small" @click="addChild(data.id)"><el-icon><Plus /></el-icon></el-button>
                <el-button link size="small" @click="startEdit(data.id)"><el-icon><Edit /></el-icon></el-button>
                <el-button link size="small" type="success" @click="toggleRootCause(data.id)"><el-icon><CircleCheck /></el-icon></el-button>
                <el-button v-if="data.category !== 'ROOT'" link size="small" type="danger" @click="removeNode(data.id)"><el-icon><Delete /></el-icon></el-button>
              </span>
            </div>
          </template>
        </el-tree>
        <p class="tip">✓ 标记确认根因；ROOT 不可删除。删除节点将一并移除其子节点。</p>
      </el-card>

      <!-- 右：ECharts 树 -->
      <el-card class="chart-card" shadow="never">
        <template #header><span class="card-title">因果可视化</span></template>
        <div ref="chartRef" class="chart-box"></div>
        <div v-if="confirmedRoots.length" class="rc-panel">
          <span class="rc-title">已确认根本原因：</span>
          <el-tag v-for="r in confirmedRoots" :key="r" type="danger" effect="plain" class="rc-item">{{ r }}</el-tag>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fb-page { padding: 24px; }
.fb-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
.fb-title { margin: 0; font-size: 22px; font-weight: 700; color: #1b3a5b; }
.fb-sub { margin: 6px 0 0; color: #5b7a99; font-size: 13px; }
.prob-card { margin-bottom: 18px; display: flex; align-items: center; gap: 12px; }
.prob-label { font-weight: 600; color: #1b3a5b; white-space: nowrap; }
.prob-input { max-width: 520px; }
.fb-body { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.card-title { font-weight: 600; color: #1b3a5b; }
.tree-node { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding-right: 8px; }
.node-name { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #2b3a47; }
.node-name.root-cause { color: #b84b3e; font-weight: 700; }
.cat-tag { color: #5b7a99; border-color: #d6e0e8; }
.rc-tag { margin-left: 4px; }
.node-ops { display: inline-flex; gap: 2px; }
.edit-input { width: 180px; }
.chart-card { display: flex; flex-direction: column; }
.chart-box { width: 100%; height: 460px; }
.rc-panel { margin-top: 12px; border-top: 1px dashed #e6e0d8; padding-top: 12px; }
.rc-title { font-size: 13px; color: #5b7a99; }
.rc-item { margin: 4px 6px 0 0; }
.tip { margin: 12px 0 0; font-size: 12px; color: #9aa9b8; }
</style>

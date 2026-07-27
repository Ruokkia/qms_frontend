<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { FmeaItem, FmeaItemStatus } from '@/types/process-tools'

/** RPN 高风险阈值 */
const HIGH_RPN_THRESHOLD = 100

let seq = 100
function nextId() {
  return ++seq
}

/** 内置示例数据（展示不同 RPN 等级） */
const items = ref<FmeaItem[]>([
  {
    id: nextId(), process: '装配', failureMode: '螺栓扭矩不足', potentialEffect: '连接松动导致异响',
    potentialCause: '拧紧枪参数漂移', currentControl: '扭矩抽检', severity: 7, occurrence: 4,
    detection: 5, rpn: 140, recommendedAction: '更新拧紧工艺参数并增加在线监控', owner: '张工', dueDate: '2026-08-15', status: 'OPEN',
  },
  {
    id: nextId(), process: '焊接', failureMode: '焊点虚焊', potentialEffect: '结构强度不足',
    potentialCause: '焊枪电极磨损', currentControl: '破坏性试验', severity: 8, occurrence: 3,
    detection: 4, rpn: 96, recommendedAction: '建立电极寿命管理台账', owner: '李工', dueDate: '2026-08-20', status: 'IN_PROGRESS',
  },
  {
    id: nextId(), process: '检测', failureMode: '量具读数偏差', potentialEffect: '误判合格/不合格',
    potentialCause: '量具未校准', currentControl: '日常点检', severity: 5, occurrence: 2,
    detection: 6, rpn: 60, recommendedAction: '缩短校准周期至月度', owner: '王工', dueDate: '2026-09-01', status: 'OPEN',
  },
  {
    id: nextId(), process: '装配', failureMode: '密封圈漏装', potentialEffect: '漏水',
    potentialCause: '防错工位缺失', currentControl: '终检目视', severity: 6, occurrence: 5,
    detection: 3, rpn: 90, recommendedAction: '增加漏装防错传感器', owner: '赵工', dueDate: '2026-08-30', status: 'OPEN',
  },
  {
    id: nextId(), process: '焊接', failureMode: '焊渣飞溅', potentialEffect: '外观缺陷',
    potentialCause: '气体流量不足', currentControl: '首件检查', severity: 3, occurrence: 4,
    detection: 5, rpn: 60, recommendedAction: '规范保护气体流量', owner: '孙工', dueDate: '2026-09-10', status: 'CLOSED',
  },
  {
    id: nextId(), process: '检测', failureMode: '测试覆盖率不足', potentialEffect: '隐性缺陷流出',
    potentialCause: '测试用例陈旧', currentControl: '定期评审', severity: 4, occurrence: 3,
    detection: 4, rpn: 48, recommendedAction: '重构测试用例库', owner: '周工', dueDate: '2026-09-15', status: 'IN_PROGRESS',
  },
])

/** 实时重算 RPN（S × O × D） */
function recompute(item: FmeaItem) {
  item.rpn = item.severity * item.occurrence * item.detection
}

/** 看板统计 */
const dashboard = computed(() => {
  const list = items.value
  const total = list.length
  const open = list.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length
  const closed = list.filter((i) => i.status === 'CLOSED').length
  const overdue = list.filter((i) => i.status === 'OVERDUE').length
  const high = list.filter((i) => i.rpn >= HIGH_RPN_THRESHOLD).length
  const completionRate = total ? closed / total : 0
  const riskDistribution = [
    { label: '≥100 高', value: list.filter((i) => i.rpn >= HIGH_RPN_THRESHOLD).length },
    { label: '50~99 中', value: list.filter((i) => i.rpn >= 50 && i.rpn < HIGH_RPN_THRESHOLD).length },
    { label: '<50 低', value: list.filter((i) => i.rpn < 50).length },
  ]
  const trend = buildTrend(list)
  return { total, open, closed, overdue, high, completionRate, riskDistribution, trend }
})

function buildTrend(list: FmeaItem[]) {
  const map: Record<string, number> = {}
  list.filter((i) => i.status === 'CLOSED').forEach((i) => {
    const m = (i.dueDate || '').slice(0, 7)
    if (m) map[m] = (map[m] || 0) + 1
  })
  return Object.keys(map).sort().map((m) => ({ month: m, completed: map[m] }))
}

const statusMeta: Record<FmeaItemStatus, { label: string; type: 'success' | 'warning' | 'danger' | 'info' }> = {
  OPEN: { label: '未开始', type: 'info' },
  IN_PROGRESS: { label: '进行中', type: 'warning' },
  CLOSED: { label: '已关闭', type: 'success' },
  OVERDUE: { label: '已逾期', type: 'danger' },
}

function isHighRpn(row: FmeaItem) {
  return row.rpn >= HIGH_RPN_THRESHOLD
}

/** el-table 行样式回调 */
function rowClassName({ row }: { row: FmeaItem }): string {
  return isHighRpn(row) ? 'high-rpn-row' : ''
}

/** 新增 / 删除行 */
function addRow() {
  items.value.push({
    id: nextId(), process: '', failureMode: '', potentialEffect: '', potentialCause: '',
    currentControl: '', severity: 1, occurrence: 1, detection: 1, rpn: 1,
    recommendedAction: '', owner: '', dueDate: '', status: 'OPEN',
  })
}
function removeRow(id: number) {
  const idx = items.value.findIndex((i) => i.id === id)
  if (idx >= 0) items.value.splice(idx, 1)
}

/* ── ECharts 看板 ── */
const donutRef = ref<HTMLDivElement>()
const barRef = ref<HTMLDivElement>()
let donutChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

function renderCharts() {
  if (!donutRef.value || !barRef.value) return
  if (!donutChart) donutChart = echarts.init(donutRef.value)
  if (!barChart) barChart = echarts.init(barRef.value)

  const rate = Math.round(dashboard.value.completionRate * 100)
  donutChart.setOption({
    title: { text: `${rate}%`, subtext: '完成率', left: 'center', top: '38%', textStyle: { fontSize: 26, color: '#1B3A5B' }, subtextStyle: { fontSize: 12, color: '#5B7A99' } },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie', radius: ['58%', '78%'], center: ['50%', '50%'], avoidLabelOverlap: false,
        label: { show: false }, labelLine: { show: false },
        data: [
          { value: dashboard.value.closed, name: '已关闭', itemStyle: { color: '#3E7A4E' } },
          { value: Math.max(dashboard.value.total - dashboard.value.closed, 0), name: '未完成', itemStyle: { color: '#E6E0D8' } },
        ],
      },
    ],
  })

  const dist = dashboard.value.riskDistribution
  barChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: dist.map((d) => d.label), axisLabel: { color: '#5B7A99' } },
    yAxis: { type: 'value', axisLabel: { color: '#5B7A99' }, splitLine: { lineStyle: { color: '#EFEAE3' } } },
    series: [
      {
        type: 'bar', barWidth: '46%',
        data: dist.map((d, i) => ({ value: d.value, itemStyle: { color: ['#B84B3E', '#B8763E', '#3E7A4E'][i] } })),
        label: { show: true, position: 'top', color: '#5B7A99' },
      },
    ],
  })
}

onMounted(() => {
  renderCharts()
  ro = new ResizeObserver(() => {
    donutChart?.resize()
    barChart?.resize()
  })
  if (donutRef.value) ro.observe(donutRef.value)
  if (barRef.value) ro.observe(barRef.value)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  donutChart?.dispose()
  barChart?.dispose()
})

watch(dashboard, () => nextTick(renderCharts), { deep: true })
</script>

<template>
  <div class="fmea-page">
    <div class="fmea-header">
      <div>
        <h2 class="fmea-title">FMEA 风险跟踪</h2>
        <p class="fmea-sub">失效模式与影响分析 · RPN = 严重度 × 频度 × 探测度（S/O/D 取值 1~10）</p>
      </div>
      <el-button type="primary" @click="addRow">
        <el-icon><Plus /></el-icon>新增风险项
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="kpi-row">
      <div class="kpi-card">
        <span class="kpi-label">风险项总数</span>
        <span class="kpi-value" style="color:#1B3A5B">{{ dashboard.total }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">未完成</span>
        <span class="kpi-value" style="color:#B8763E">{{ dashboard.open }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">高风险 (RPN≥100)</span>
        <span class="kpi-value" style="color:#B84B3E">{{ dashboard.high }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">逾期项</span>
        <span class="kpi-value" style="color:#B84B3E">{{ dashboard.overdue }}</span>
      </div>
    </div>

    <!-- ECharts 看板 -->
    <el-card class="chart-card" shadow="never">
      <div class="chart-row">
        <div ref="donutRef" class="chart-box"></div>
        <div ref="barRef" class="chart-box"></div>
      </div>
    </el-card>

    <!-- 可编辑表格 -->
    <el-card class="table-card" shadow="never">
      <el-table :data="items" border stripe :row-class-name="rowClassName">
        <el-table-column type="index" label="#" width="48" align="center" />
        <el-table-column label="工序" width="110">
          <template #default="{ row }"><el-input v-model="row.process" size="small" /></template>
        </el-table-column>
        <el-table-column label="故障模式" min-width="130">
          <template #default="{ row }"><el-input v-model="row.failureMode" size="small" /></template>
        </el-table-column>
        <el-table-column label="潜在影响" min-width="130">
          <template #default="{ row }"><el-input v-model="row.potentialEffect" size="small" /></template>
        </el-table-column>
        <el-table-column label="潜在原因" min-width="130">
          <template #default="{ row }"><el-input v-model="row.potentialCause" size="small" /></template>
        </el-table-column>
        <el-table-column label="现行控制" min-width="120">
          <template #default="{ row }"><el-input v-model="row.currentControl" size="small" /></template>
        </el-table-column>
        <el-table-column label="S" width="78" align="center">
          <template #default="{ row }">
            <el-input-number v-model="row.severity" :min="1" :max="10" size="small" controls-position="right" @change="recompute(row)" />
          </template>
        </el-table-column>
        <el-table-column label="O" width="78" align="center">
          <template #default="{ row }">
            <el-input-number v-model="row.occurrence" :min="1" :max="10" size="small" controls-position="right" @change="recompute(row)" />
          </template>
        </el-table-column>
        <el-table-column label="D" width="78" align="center">
          <template #default="{ row }">
            <el-input-number v-model="row.detection" :min="1" :max="10" size="small" controls-position="right" @change="recompute(row)" />
          </template>
        </el-table-column>
        <el-table-column label="RPN" width="80" align="center">
          <template #default="{ row }">
            <span class="rpn" :class="{ 'rpn-high': isHighRpn(row) }">{{ row.rpn }}</span>
          </template>
        </el-table-column>
        <el-table-column label="建议措施" min-width="160">
          <template #default="{ row }"><el-input v-model="row.recommendedAction" size="small" /></template>
        </el-table-column>
        <el-table-column label="责任人" width="90">
          <template #default="{ row }"><el-input v-model="row.owner" size="small" /></template>
        </el-table-column>
        <el-table-column label="计划日期" width="150">
          <template #default="{ row }"><el-date-picker v-model="row.dueDate" type="date" value-format="YYYY-MM-DD" size="small" style="width:100%" /></template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-select v-model="row.status" size="small">
              <el-option v-for="(m, k) in statusMeta" :key="k" :label="m.label" :value="k" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link size="small" @click="removeRow(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <p class="tip">提示：本页为前端模板，数据保存在浏览器内存中，刷新后重置；RPN 随 S/O/D 调整实时计算。</p>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.fmea-page { padding: 24px; }
.fmea-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.fmea-title { margin: 0; font-size: 22px; font-weight: 700; color: #1b3a5b; }
.fmea-sub { margin: 6px 0 0; color: #5b7a99; font-size: 13px; }
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 18px; }
.kpi-card {
  background: #f7f5f2; border-radius: 10px; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 6px; border-left: 4px solid #5b7a99;
}
.kpi-label { font-size: 13px; color: #5b7a99; }
.kpi-value { font-size: 28px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.chart-card { margin-bottom: 18px; }
.chart-row { display: flex; gap: 16px; }
.chart-box { flex: 1; height: 240px; }
.table-card { :deep(.high-rpn-row) { background: #fceee9 !important; } }
.rpn { font-weight: 700; font-family: 'JetBrains Mono', monospace; color: #3e7a4e; }
.rpn-high { color: #b84b3e; }
.tip { margin: 12px 0 0; font-size: 12px; color: #9aa9b8; }
</style>

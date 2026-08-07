<template>
  <div class="data-entry" :style="{ maxHeight: containerMaxHeight }">
    <!-- 上方：数据采集卡（操作区，紧凑自适应，超出时内部滚动） -->
    <el-card shadow="never" class="entry-card entry-top">
      <template #header>
        <div class="card-head">
          <span class="card-title">数据采集</span>
          <div class="head-actions">
            <el-tag type="success" size="small">首件签名后自动同步</el-tag>
            <el-button link type="primary" size="small" @click="guideVisible = true">使用说明</el-button>
          </div>
        </div>
      </template>

      <!-- 筛选区：横向 1 行紧凑布局 -->
      <div class="entry-filterbar">
        <div class="filter-item">
          <span class="lbl">分类</span>
          <el-radio-group :model-value="itemType" @update:model-value="onItemTypeChange" size="small">
            <el-radio-button value="PRODUCT">产品</el-radio-button>
            <el-radio-button value="MATERIAL">物料</el-radio-button>
          </el-radio-group>
        </div>
        <div class="filter-item flex-1">
          <span class="lbl">{{ typeLabel }}代码</span>
          <el-autocomplete
            v-model="itemCode"
            :fetch-suggestions="querySearchAsync"
            :placeholder="`输入${typeLabel}代码/名称可模糊搜索`"
            clearable
            value-key="itemCode"
            :trigger-on-focus="false"
            style="flex:1; min-width:160px"
            @select="onItemSelect"
            @blur="onItemBlur"
          >
            <template #default="{ item }">
              <div class="barcode-option">
                <span class="barcode-option__code">{{ item.itemCode }}</span>
                <span class="barcode-option__meta">{{ item.itemName }}</span>
              </div>
            </template>
          </el-autocomplete>
        </div>
        <div class="filter-item">
          <span class="lbl">批次号</span>
          <el-input
            v-model="batchNo"
            placeholder="必填"
            clearable
            style="width:140px"
          />
        </div>
        <div class="filter-item flex-1">
          <span class="lbl">条码</span>
          <el-autocomplete
            v-model="barcode"
            :fetch-suggestions="queryBarcodeSuggestions"
            :trigger-on-focus="false"
            placeholder="必填，输入条码可模糊搜索"
            clearable
            value-key="barcode"
            style="flex:1; min-width:160px"
            @select="onBarcodeSelect"
            @blur="onBarcodeBlur"
          >
            <template #default="{ item }">
              <div class="barcode-option">
                <span class="barcode-option__code">{{ item.barcode }}</span>
                <span class="barcode-option__meta">{{ item.itemCode }} · {{ item.itemName }}</span>
              </div>
            </template>
          </el-autocomplete>
        </div>
        <div class="filter-item">
          <span class="lbl">工序</span>
          <el-select
            v-model="selectedProcessName"
            placeholder="工序"
            style="width:160px"
            @change="onProcessChange"
          >
            <el-option
              v-for="proc in filteredProcesses"
              :key="proc.processName"
              :label="`${proc.processName}（${proc.processCode}）`"
              :value="proc.processName"
            />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="lbl">参数</span>
          <el-select
            v-model="selectedParamId"
            placeholder="参数"
            style="width:200px"
            :disabled="!selectedProcessName"
            @change="onParamChange"
          >
            <el-option
              v-for="p in filteredParams"
              :key="p.spcParameterId"
              :label="`${p.paramName}（n=${p.subgroupSize}·${p.chartType}）`"
              :value="p.spcParameterId"
            />
          </el-select>
        </div>
        <el-button
          v-if="itemCode || selectedProcessName || selectedParamId"
          link
          type="info"
          size="small"
          class="filterbar-reset-btn"
          @click="resetAllFilters"
        >重置筛选</el-button>
      </div>
      <!-- 筛选区代码提示行 -->
      <div v-if="itemCode && filteredProcesses.length" class="filter-hint">
        已按代码「{{ itemCode }}」筛选出 {{ filteredProcesses.length }} 个标准工序
      </div>
      <div v-else-if="itemCode && !filteredProcesses.length" class="filter-hint filter-hint--warn">
        该代码暂无已配置的参数标准工序，请先维护 FAI 检验标准
      </div>

      <div class="entry-body">
      <template v-if="currentParam">
        <!-- 参数摘要行：默认折叠，点击展开 -->
        <div class="param-summary" @click="paramExpanded = !paramExpanded">
          <span class="param-summary__name">{{ currentParam.paramName }}</span>
          <span class="param-summary__kv">USL: <strong>{{ fmt(currentParam.upperLimit) }}</strong></span>
          <span class="param-summary__kv">LSL: <strong>{{ fmt(currentParam.lowerLimit) }}</strong></span>
          <span class="param-summary__kv">目标: <strong>{{ fmt(targetAsNumber) }}</strong></span>
          <span class="param-summary__meta">n={{ currentParam.subgroupSize }} · {{ currentParam.chartType }}</span>
          <el-icon class="expand-icon" :class="{ rotated: paramExpanded }"><ArrowDown /></el-icon>
        </div>
        <el-collapse-transition>
          <el-descriptions v-show="paramExpanded" :column="3" size="small" border class="param-info">
            <el-descriptions-item label="参数">{{ currentParam.paramName }}</el-descriptions-item>
            <el-descriptions-item label="USL">{{ fmt(currentParam.upperLimit) }}</el-descriptions-item>
            <el-descriptions-item label="LSL">{{ fmt(currentParam.lowerLimit) }}</el-descriptions-item>
            <el-descriptions-item label="目标">{{ currentParam.standardValue || '—' }}</el-descriptions-item>
            <el-descriptions-item label="子组大小 n">{{ currentParam.subgroupSize }}</el-descriptions-item>
            <el-descriptions-item label="控制图">{{ currentParam.chartType }}</el-descriptions-item>
          </el-descriptions>
        </el-collapse-transition>

        <template v-if="pendingSubgroups.length">
          <el-alert title="存在首件待补样本：请从下列首件记录补齐样本，不会新建子组。" type="warning" :closable="false" show-icon style="margin-bottom: 12px" />
          <el-select v-model="selectedPendingId" placeholder="选择待补样本记录" style="width: 100%; margin-bottom: 12px">
            <el-option v-for="sub in pendingSubgroups" :key="sub.id" :value="sub.id" :label="`${sub.workOrderNo || '-'} · ${sub.batchNo || '-'} · ${pendingName(sub)} · 已有 ${sub.sampleCount}/${currentParam.subgroupSize}`" />
          </el-select>
          <template v-if="selectedPending">
            <el-descriptions :column="4" size="small" border class="param-info">
              <el-descriptions-item label="工单">{{ selectedPending.workOrderNo || '—' }}</el-descriptions-item>
              <el-descriptions-item label="批次">{{ selectedPending.batchNo || '—' }}</el-descriptions-item>
              <el-descriptions-item :label="pendingTypeLabel(selectedPending)">{{ pendingName(selectedPending) }}</el-descriptions-item>
              <el-descriptions-item label="工序">{{ selectedPending.processCode || '—' }}</el-descriptions-item>
            </el-descriptions>
            <div class="samples-title">补录剩余 {{ remainingCount }} 个样本值</div>
            <div class="sample-grid"><div v-for="i in remainingCount" :key="i" class="sample-cell"><span class="sample-idx">{{ selectedPending.sampleCount + i }}</span><el-input-number v-model="pendingValues[i - 1]" :controls="false" :precision="3" style="width: 100%" /></div></div>
            <div class="actions"><el-button type="primary" :loading="submitting" @click="onAppendPending">补录并完成子组</el-button></div>
          </template>
        </template>

        <template v-else>
        <!-- 正常录入提示：样本已移至底部固定栏 -->
        <div class="samples-title">样本实测值（需录入 {{ currentParam.subgroupSize }} 个），请在底部 Dock 栏输入</div>
        </template>
      </template>

      <el-empty v-else description="请选择参数后录入" :image-size="80" />
      </div>
    </el-card>

    <!-- 下方：子组历史卡（参考区，填满剩余全部空间） -->
    <SubgroupList class="entry-bottom" :param-id="selectedParamId" :item-code="itemCode" @deleted="emit('saved')" />

    <!-- 底部固定 Dock：样本录入 + 提交，脱离文档流不占用纵向空间 -->
    <Transition name="dock-slide">
    <div v-if="currentParam && !pendingSubgroups.length" class="entry-dock">
      <div class="dock-samples">
        <span class="dock-label">样本值</span>
        <div class="dock-grid">
          <div v-for="i in currentParam.subgroupSize" :key="i" class="dock-cell">
            <span class="sample-idx">{{ i }}</span>
            <el-input-number
              v-model="sampleValues[i - 1]"
              :controls="false"
              :precision="3"
              size="small"
              style="width:96px"
              @paste="i === 1 && onPasteSamples($event)"
            />
          </div>
        </div>
      </div>
      <div class="dock-actions">
        <el-button v-if="lastSubmittedValues.length" size="small" link type="primary" @click="reuseLastSamples">上组复用</el-button>
        <el-button size="small" @click="resetSamples">清空</el-button>
        <el-button size="small" type="primary" :loading="submitting" @click="onSubmit">提交子组</el-button>
      </div>
    </div>
    </Transition>

    <el-dialog v-model="guideVisible" title="首件与 SPC 待补样本使用说明" width="680px" append-to-body>
      <el-alert title="首件实测值会自动作为 SPC 子组的第 1 个样本；无需在首件中重复录入 n 个样本。" type="success" :closable="false" show-icon style="margin-bottom: 16px" />
      <el-steps direction="vertical" :active="4" finish-status="success">
        <el-step title="配置 SPC 参数" description="在参数配置中维护工序参数、单位、目标值、USL、LSL 和子组大小 n。" />
        <el-step title="维护首件检验标准" description="按物料代码和工序选择需要检验的 SPC 参数；首件不再维护独立数值标准。" />
        <el-step title="完成首件检验与电子签名" description="首件合格并签名后，系统自动创建带工单、批次、物料或产品和工序信息的待补样本子组。" />
        <el-step title="在本页补齐剩余样本" description="选择对应参数与代码，打开待补样本记录，只录入剩余 n-1 个样本；补满 n 后自动进入控制图和能力分析。" />
      </el-steps>

      <el-alert type="warning" :closable="false" show-icon class="guide-tips" style="margin-top: 16px">
        <template #default>
          <div class="guide-tip"><strong>① 控制图只统计「已完成」子组：</strong>未满 n 的「待补样本」不参与控制图或 Cp/Cpk，因此数据采集页看到多条子组、控制图却只有少量点是正常现象（待补样本补齐后会自动进图）。</div>
          <div class="guide-tip"><strong>② 代码无匹配会回退展示：</strong>在控制图页输入代码后若无对应子组，会回退展示该参数全部「未关联代码」的子组，此时页面会给出黄色提示，并非数据错误，请核对代码是否正确。</div>
          <div class="guide-tip"><strong>③ 提交子组请带上代码：</strong>录入样本时建议先在上方选择/填入产品代码或物料代码，子组才会按代码归档，否则控制图无法按代码筛选定位到该子组。</div>
        </template>
      </el-alert>
      <template #footer><el-button type="primary" @click="guideVisible = false">我知道了</el-button></template>
    </el-dialog>

    <el-dialog v-model="paramPickerVisible" title="选择需补齐样本的首件参数" width="640px" append-to-body :close-on-click-modal="false">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 12px">
        该首件检验存在多个待补样本参数，请选择本次要补齐的参数。
      </el-alert>
      <el-table :data="pendingCandidates" highlight-current-row @current-change="(row: SpcSubgroup | null) => (selectedPendingId = row?.id ?? null)">
        <el-table-column label="参数" min-width="160">
          <template #default="{ row }">
            {{ pendingName(row) }}
          </template>
        </el-table-column>
        <el-table-column label="工序" prop="processCode" min-width="120" />
        <el-table-column label="工单" prop="workOrderNo" min-width="120" />
        <el-table-column label="批次" prop="batchNo" min-width="120" />
        <el-table-column label="已录/需录" min-width="100">
          <template #default="{ row }">{{ row.sampleCount }}/{{ row.sampleSize ?? row.subgroupSize ?? '—' }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="paramPickerVisible = false">取消（手动选择）</el-button>
        <el-button type="primary" @click="onPickParam">确定</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { useSpcStore } from '@/stores/spc'
import { useItemTypeStore, type ItemType } from '@/stores/itemType'
import type { SpcSubgroup } from '@/types/spc'
import { searchSpcItemsApi, getSubgroupsByFaiApi } from '@/api/spc'
import type { SpcItemDict } from '@/api/spc'
import { searchItemsByBarcodeApi, type TraceItemSearchResult } from '@/api/trace'
import { getStandardProcessesApi, getStandardSpcParamsApi, type FaiStandardSpcParamVO } from '@/api/fai'
import SubgroupList from './SubgroupList.vue'

const emit = defineEmits<{
  (e: 'saved'): void
}>()

// FAI「去采集」跳转携带的预填值：优先从 route.query 直接读取（避免 el-tab-pane 懒渲染时 props 透传丢失）
// 同时保留 props 透传作为兼容（index.vue 仍会传值）
const props = defineProps<{
  presetItemCode?: string
  presetProcessName?: string
  faiRecordId?: string
}>()
const route = useRoute()

/** 从 URL query 或 props 获取 FAI 预填代码（route.query 优先，更可靠） */
function getFaiItemCode(): string {
  const qCode = route.query.itemCode
  if (typeof qCode === 'string' && qCode.trim()) return qCode.trim()
  return (props.presetItemCode || '').trim()
}

/** 从 URL query 或 props 获取 FAI 记录号 */
function getFaiRecordId(): string | undefined {
  const qId = route.query.faiRecordId
  if (typeof qId === 'string' && qId.trim()) return qId.trim()
  return props.faiRecordId
}

const store = useSpcStore()
const submitting = ref(false)
const guideVisible = ref(false)
const paramExpanded = ref(false)
const containerMaxHeight = ref('calc(100vh - 150px)')
/** 工序键值：从 FAI 标准按 processName 匹配（FAI 标准工序无数字 ID） */
const selectedProcessName = ref<string | null>(null)
/** 参数键值：spcParameterId（兼容后端 saveSubgroup 的 paramId） */
const selectedParamId = ref<number | null>(null)
const sampleValues = ref<number[]>([])
const pendingSubgroups = ref<SpcSubgroup[]>([])
const selectedPendingId = ref<number | null>(null)
const pendingValues = ref<number[]>([])
const lastSubmittedValues = ref<number[]>([])
/** FAI 标准层工序列表（按 itemCode 加载） */
const faiProcesses = ref<{ processCode: string; processName: string }[]>([])
/** FAI 标准层 SPC 参数列表（按 itemCode + processName 加载，含 USL/LSL/目标值/n/图表类型） */
const faiSpcParams = ref<FaiStandardSpcParamVO[]>([])
// FAI 跳转自动定位：参数选择对话框 + 候选子组
const paramPickerVisible = ref(false)
const pendingCandidates = ref<SpcSubgroup[]>([])
// 采集维度：产品/物料分类与代码（保存子组时一并写入，供控制图关联）
// 分类来自与 FAI 共享的 store（localStorage 持久化），保证跨模块继承同一次选择
const itemTypeStore = useItemTypeStore()
const { itemType } = storeToRefs(itemTypeStore)
const itemCode = ref<string>('')
const batchNo = ref<string>('')
const barcode = ref<string>('')
const materialName = ref<string>('')
// 当前分类中文名，驱动界面文案，避免产品来源数据被标注为「物料」
const typeLabel = computed(() => (itemType.value === 'PRODUCT' ? '产品' : '物料'))

function onItemTypeChange(val: string | number | boolean | undefined) {
  itemTypeStore.setItemType(val as ItemType)
}

/** 待补样本的展示名：优先统一代码字典名称，其次子组自带名称，代码列作回退 */
function pendingName(sub: SpcSubgroup | null): string {
  if (!sub) return '—'
  const code = sub.itemCode
  if (code && dictMap.has(code)) {
    const d = dictMap.get(code)!
    const name = d.itemName || sub.materialName || ''
    return name ? `${name} (${code})` : code
  }
  return sub.materialName || sub.itemCode || sub.materialCode || '—'
}

/** 待补样本自身的分类中文名（取记录真实分类，不受当前选择器影响） */
function pendingTypeLabel(sub: SpcSubgroup | null): string {
  return sub?.itemType === 'PRODUCT' ? '产品' : '物料'
}

// SPC 模糊搜索候选缓存（失焦时优先命中，避免重复请求）
let itemTimer: ReturnType<typeof setTimeout> | null = null
let lastItemCandidates: SpcItemDict[] = []
// 已拉取过的字典项（itemCode -> 字典），用于待补子组展示名与选中回填
const dictMap = new Map<string, SpcItemDict>()

// el-autocomplete 远程模糊搜索（统一代码字典：已签首件 ∪ 已激活标准，不再查 trace 表）
function querySearchAsync(queryString: string, cb: (results: SpcItemDict[]) => void) {
  const keyword = (queryString || '').trim()
  if (!keyword) {
    cb([])
    return
  }
  if (itemTimer) clearTimeout(itemTimer)
  itemTimer = setTimeout(async () => {
    try {
      const res = await searchSpcItemsApi(keyword)
      const list = res.data || []
      lastItemCandidates = list
      list.forEach((d) => { if (d.itemCode) dictMap.set(d.itemCode, d) })
      cb(list)
    } catch {
      cb([])
    }
  }, 300)
}

function onItemSelect(item: SpcItemDict) {
  itemCode.value = item.itemCode || ''
  materialName.value = item.itemName || ''
  if (item.itemCode) dictMap.set(item.itemCode, item)
  // 切换代码后清空已选工序/参数并重新加载 FAI 标准工序
  selectedProcessName.value = null
  selectedParamId.value = null
  faiSpcParams.value = []
  loadFaiProcesses()
}

// 兼容：手填/粘贴完整代码并失焦时，优先命中最近模糊候选
function onItemBlur() {
  const code = (itemCode.value || '').trim()
  if (!code) return
  const hit = lastItemCandidates.find((c) => c.itemCode === code)
  if (hit) {
    itemCode.value = hit.itemCode || ''
    materialName.value = hit.itemName || ''
    if (hit.itemCode) dictMap.set(hit.itemCode, hit)
  }
  // 手动输入代码后加载 FAI 标准工序
  loadFaiProcesses()
}

// 条码模糊搜索
let barcodeTimer: ReturnType<typeof setTimeout> | undefined
async function queryBarcodeSuggestions(queryString: string, cb: (results: TraceItemSearchResult[]) => void) {
  if (barcodeTimer) clearTimeout(barcodeTimer)
  const kw = (queryString || '').trim()
  if (!kw) {
    cb([])
    return
  }
  barcodeTimer = setTimeout(async () => {
    try {
      const res = await searchItemsByBarcodeApi(itemType.value, kw, 20, itemCode.value || undefined)
      cb(res.data || [])
    } catch {
      cb([])
    }
  }, 300)
}

// 选中条码后自动回填代码、名称、批次号
function onBarcodeSelect(item: TraceItemSearchResult) {
  if (!item) return
  barcode.value = item.barcode || ''
  itemCode.value = item.itemCode || ''
  materialName.value = item.itemName || ''
  if (item.batchNo != null) batchNo.value = item.batchNo
  if (item.itemCode) dictMap.set(item.itemCode, { itemCode: item.itemCode, itemName: item.itemName || '' })
}

// 条码失焦时若手填完整条码尝试补全
function onBarcodeBlur() {
  // 由 autocomplete 的 select 事件处理，失焦不做额外补全
}

const filteredParams = computed(() => faiSpcParams.value)

// FAI 跳转初始化期间（itemType 由跳转同步设置），不要清空刚回填的代码/工序/参数
let faiInitDone = false

/** 工序下拉：直接展示 FAI 标准层按代码 + 分类返回的工序列表 */
const filteredProcesses = computed(() => faiProcesses.value)

/** 当前选中参数（从 FAI 标准参数项查找），属性映射：upperLimit→USL, lowerLimit→LSL, standardValue→目标值 */
const currentParam = computed(() =>
  faiSpcParams.value.find((p) => p.spcParameterId === selectedParamId.value) || null,
)

/** 目标值转换为数字（FAI standardValue 为 String，fmt 需要 number） */
const targetAsNumber = computed(() => {
  const sv = currentParam.value?.standardValue
  if (sv == null || sv === '') return null
  const n = Number(sv)
  return Number.isNaN(n) ? null : n
})
const selectedPending = computed(() => pendingSubgroups.value.find((s) => s.id === selectedPendingId.value) || null)
const remainingCount = computed(() => Math.max(0, (currentParam.value?.subgroupSize || 0) - (selectedPending.value?.sampleCount || 0)))

function fmt(v: number | null | undefined): string {
  return v == null ? '—' : String(v)
}

function resetSamples() {
  sampleValues.value = new Array(currentParam.value?.subgroupSize || 0).fill(undefined)
}

/** 样本值批量粘贴：支持逗号、空格、换行、分号、制表符分隔 */
function onPasteSamples(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') || ''
  const nums = text
    .split(/[,\s;|]+/)
    .map(Number)
    .filter((v) => !Number.isNaN(v))
  if (nums.length >= (currentParam.value?.subgroupSize ?? 0)) {
    e.preventDefault()
    sampleValues.value = nums.slice(0, currentParam.value!.subgroupSize)
  }
}

/** 一键继承上一组样本值 */
function reuseLastSamples() {
  if (lastSubmittedValues.value.length >= (currentParam.value?.subgroupSize ?? 0)) {
    sampleValues.value = lastSubmittedValues.value.slice(0, currentParam.value!.subgroupSize)
  }
}

/** 重置全部筛选条件 */
function resetAllFilters() {
  itemCode.value = ''
  batchNo.value = ''
  barcode.value = ''
  materialName.value = ''
  lastItemCandidates = [] as SpcItemDict[]
  selectedProcessName.value = null
  selectedParamId.value = null
  sampleValues.value = []
  pendingSubgroups.value = []
  selectedPendingId.value = null
  faiProcesses.value = []
  faiSpcParams.value = []
}

function onProcessChange() {
  // 切换工序时清除已选参数并加载新工序的 FAI 标准参数
  selectedParamId.value = null
  sampleValues.value = []
  pendingSubgroups.value = []
  selectedPendingId.value = null
  // 加载当前代码+工序下的 SPC 参数
  loadFaiSpcParams()
}

/** 根据当前 itemType + itemCode 加载 FAI 标准工序列表 */
async function loadFaiProcesses() {
  const code = (itemCode.value || '').trim()
  if (!code) {
    faiProcesses.value = []
    return
  }
  try {
    const res = await getStandardProcessesApi(itemType.value, code)
    faiProcesses.value = res.data || []
  } catch {
    faiProcesses.value = []
  }
}

/** 根据当前 itemType + itemCode + selectedProcessName 加载 FAI 标准 SPC 参数列表 */
async function loadFaiSpcParams() {
  const code = (itemCode.value || '').trim()
  const procName = selectedProcessName.value
  if (!code || !procName) {
    faiSpcParams.value = []
    return
  }
  try {
    const res = await getStandardSpcParamsApi(itemType.value, code, procName)
    faiSpcParams.value = res.data || []
  } catch {
    faiSpcParams.value = []
  }
}

watch(currentParam, (p) => {
  sampleValues.value = new Array(p?.subgroupSize || 0).fill(undefined)
  pendingValues.value = []
  selectedPendingId.value = null
  paramExpanded.value = false
  if (p) loadPendingSubgroups(p.spcParameterId)
}, { immediate: true })

// 切换产品/物料分类时清空已选代码，避免串数据
// FAI 跳转初始化期间（itemType 由跳转同步设置），不要清空刚回填的代码/工序/参数
watch(itemType, () => {
  if (!faiInitDone) return
  itemCode.value = ''
  lastItemCandidates = []
  selectedProcessName.value = null
  selectedParamId.value = null
  faiProcesses.value = []
  faiSpcParams.value = []
})

watch(selectedPending, (sub) => {
  pendingValues.value = new Array(Math.max(0, (currentParam.value?.subgroupSize || 0) - (sub?.sampleCount || 0))).fill(undefined)
  // E 项：选中待补子组时，自动回填代码 / 工序 / 参数，保证补录落到正确记录
  if (sub) {
    itemCode.value = sub.itemCode || ''
    if (sub.itemCode && !dictMap.has(sub.itemCode)) {
      // 字典里暂无该代码，尝试拉取一次，完善展示名与工序/参数候选
      searchSpcItemsApi(sub.itemCode).then((res) => {
        const hit = (res.data || []).find((d) => d.itemCode === sub.itemCode)
        if (hit) dictMap.set(hit.itemCode!, hit)
      }).catch(() => {})
    }
    if (sub.paramId) selectedParamId.value = sub.paramId
  }
})

// FAI「去采集」跳转：组件挂载（已进入数据采集 tab 且 itemType 已就绪）后回填代码
// 注意须在 itemType 稳定后执行，否则会被 watch(itemType) 清空
onMounted(async () => {
  const faiCode = getFaiItemCode()
  const faiId = getFaiRecordId()

  const code = faiCode
  if (code) {
    itemCode.value = code
    lastItemCandidates = []
    // 尝试拉取该代码候选，完善展示名与后续工序/参数定位
    try {
      const res = await searchSpcItemsApi(code)
      const hit = (res.data || []).find((d) => d.itemCode === code)
      if (hit) dictMap.set(code, hit)
    } catch { /* 不影响主流程 */ }
  }

  // 若跳转携带 processName，自动选中对应工序（保证下拉可见且预选）
  const qName = route.query.processName
  if (typeof qName === 'string' && qName.trim()) {
    selectedProcessName.value = qName.trim()
  }

  // 加载 FAI 标准工序列表（按当前分类 + 代码）
  await loadFaiProcesses()
  // 若已预选工序，加载对应的 SPC 参数列表
  if (selectedProcessName.value) {
    await loadFaiSpcParams()
  }

  // FAI 跳转携带的 batchNo / barcode 自动回填
  const qBatchNo = route.query.batchNo
  if (typeof qBatchNo === 'string' && qBatchNo.trim()) {
    batchNo.value = qBatchNo.trim()
  }
  const qBarcode = route.query.barcode
  if (typeof qBarcode === 'string' && qBarcode.trim()) {
    barcode.value = qBarcode.trim()
  }

  if (faiId) {
    await locateFromFai(Number(faiId))
  }
  // 初始化完成：此后用户手动切换分类才会清空，FAI 透传的 itemType 不再触发清空
  faiInitDone = true

  // 动态计算容器高度，精确匹配实际头部 + Tabs 占用
  nextTick(() => {
    const head = (document.querySelector('.page-head') as HTMLElement)?.offsetHeight || 56
    const tabs = (document.querySelector('.spc-tabs .el-tabs__header') as HTMLElement)?.offsetHeight || 40
    containerMaxHeight.value = `calc(100vh - ${head + tabs + 24}px)`
  })
})

/**
 * FAI 跳转自动定位待补子组：
 * 调后端 by-fai 端点拿到该首件全部「待补样本/首件自动导入」子组，
 * 0 条 → 降级提示，手动选择；1 条 → 直接选中触发回填；>1 条 → 弹参数选择对话框。
 */
async function locateFromFai(faiRecordId: number) {
  let subs: SpcSubgroup[] = []
  try {
    const res = await getSubgroupsByFaiApi(faiRecordId)
    subs = (res.data || []).filter(
      (s) => s.subgroupStatus === '待补样本' && s.sourceType === '首件自动导入',
    )
  } catch {
    ElMessage.warning('自动定位首件待补子组失败，请手动选择')
    return
  }
  if (!subs.length) {
    ElMessage.warning('未找到该首件对应的待补子组，请手动选择参数与代码录入')
    return
  }
  if (subs.length === 1) {
    // 唯一待补子组：直接选中，触发 watch(selectedPending) 回填代码/工序/参数
    selectedPendingId.value = subs[0].id
    return
  }
  // 多个参数待补：弹对话框让用户选
  pendingCandidates.value = subs
  paramPickerVisible.value = true
}

function onPickParam() {
  if (!selectedPendingId.value) {
    ElMessage.warning('请选择一个参数对应的待补记录')
    return
  }
  paramPickerVisible.value = false
}

async function loadPendingSubgroups(paramId: number) {
  const subs = await store.fetchSubgroups(paramId)
  pendingSubgroups.value = subs.filter((s) => s.subgroupStatus === '待补样本' && s.sourceType === '首件自动导入')
  selectedPendingId.value = pendingSubgroups.value[0]?.id || null
}

async function onParamChange(id: number) {
  selectedParamId.value = id
}

async function onSubmit() {
  if (!batchNo.value?.trim()) {
    ElMessage.warning('请填写批次号')
    return
  }
  if (!barcode.value?.trim()) {
    ElMessage.warning('请填写条码')
    return
  }
  const p = currentParam.value
  if (!p) {
    ElMessage.warning('请先选择参数')
    return
  }
  const vals = sampleValues.value.map(Number)
  if (vals.length !== p.subgroupSize || vals.some((v) => v == null || Number.isNaN(v))) {
    ElMessage.warning(`请输入全部 ${p.subgroupSize} 个样本值`)
    return
  }
  submitting.value = true
  try {
    await store.saveSubgroup({
      paramId: p.spcParameterId,
      sampleValues: vals,
      sourceType: '手动录入',
      itemType: itemType.value,
      itemCode: itemCode.value || undefined,
      batchNo: batchNo.value?.trim() || undefined,
      barcode: barcode.value?.trim() || undefined,
      materialName: materialName.value || undefined,
    })
    ElMessage.success('子组已保存，已自动重算控制限/能力')
    lastSubmittedValues.value = [...vals]
    resetSamples()
    emit('saved')
  } finally {
    submitting.value = false
  }
}

async function onAppendPending() {
  const sub = selectedPending.value
  const vals = pendingValues.value.map(Number)
  if (!sub || vals.length !== remainingCount.value || vals.some((v) => Number.isNaN(v))) { ElMessage.warning(`请输入剩余 ${remainingCount.value} 个样本值`); return }
  submitting.value = true
  try {
    await store.appendPendingSamples(sub.id, vals)
    ElMessage.success('样本已补齐，子组已完成并纳入 SPC 统计')
    await loadPendingSubgroups(sub.paramId)
    emit('saved')
  } finally { submitting.value = false }
}

</script>

<style scoped>
/* 整页高度约束：数据采集区不超视口，避免整页上下滚动 */
.data-entry {
  padding: 4px;
  max-height: calc(100vh - 150px);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 上方采集卡：操作区，内容自适应高度，超长时内部滚动，不挤压下方历史 */
.entry-top {
  border: 1px solid #ECE7E1;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  max-height: 46%;
  overflow: hidden;
}
/* 下方子组历史：填满剩余全部空间 */
.entry-bottom {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.entry-bottom.subgroup-list {
  height: auto;
}

/* 采集卡：flex 列布局，筛选区固定 + 录入区可滚 */
.entry-card {
  border: 1px solid #ECE7E1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.entry-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 🅐 筛选区：横向 1 行紧凑布局 */
.entry-filterbar {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding: 8px 0 10px;
  border-bottom: 1px solid #ECE7E1;
  margin-bottom: 6px;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
/* 代码输入框：在窄屏换行时单独占满一行，避免与工序框交叠 */
.filter-item.flex-1 {
  flex: 1 1 260px;
  min-width: 220px;
}
.lbl { font-size: 12px; color: #5B7A99; font-weight: 600; white-space: nowrap; }

/* 录入区：内部纵向可滚（参数信息 + 样本 + 操作） */
.entry-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.card-head { display: flex; align-items: center; justify-content: space-between; }
.head-actions { display: flex; align-items: center; gap: 8px; }
.card-title { font-weight: 600; color: #1B3A5B; }
.param-info { margin: 8px 0 14px; }
.samples-title { font-size: 12px; color: #8C9BA8; margin-bottom: 8px; }

/* 🅑 参数摘要行：默认折叠，单行紧凑 */
.param-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  padding: 6px 10px;
  margin: 6px 0 8px;
  background: #F5F7FA;
  border-radius: 6px;
  font-size: 12px;
  color: #5B7A99;
  cursor: pointer;
  user-select: none;
}
.param-summary__name { font-weight: 600; color: #1B3A5B; }
.param-summary__kv strong { color: #1B3A5B; font-family: 'JetBrains Mono', monospace; }
.param-summary__meta { margin-left: auto; color: #8C9BA8; }
.expand-icon { transition: transform 0.2s; margin-left: 4px; flex-shrink: 0; }
.expand-icon.rotated { transform: rotate(180deg); }

/* 🅒 底部固定 Dock：样本录入 + 提交 */
.entry-dock {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 24px;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(6px);
  border-top: 1px solid #ECE7E1;
  box-shadow: 0 -1px 8px rgba(27,58,91,0.05);
}
.dock-samples { display: flex; align-items: center; gap: 10px; flex: 1; overflow-x: auto; }
.dock-label { font-size: 12px; color: #5B7A99; font-weight: 600; white-space: nowrap; }
.dock-grid { display: flex; gap: 8px; flex-wrap: nowrap; overflow-x: auto; }
.dock-cell { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.dock-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* Dock 栏滑入动画 */
.dock-slide-enter-active,
.dock-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}
.dock-slide-enter-from,
.dock-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* 筛选区重置按钮 */
.filterbar-reset-btn {
  flex-shrink: 0;
  align-self: center;
  margin-top: 0;
}

/* 样本编号 */
.sample-idx { width: 18px; text-align: center; font-size: 12px; color: #8C9BA8; font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }

.num { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #5B7A99; font-variant-numeric: tabular-nums; }
.barcode-option { display: flex; flex-direction: column; line-height: 1.3; }
.barcode-option__code { font-weight: 600; color: var(--el-text-color-primary); }
.barcode-option__meta { font-size: 12px; color: var(--el-text-color-secondary); }
.flex-1 { display: flex; align-items: center; gap: 8px; }
.filter-hint { font-size: 12px; color: #1B9C85; margin-top: 2px; line-height: 1.4; }
.filter-hint--warn { color: #C9821B; }
.guide-tips :deep(.el-alert__content) { line-height: 1.6; }
.guide-tip { font-size: 13px; color: #5B7A99; margin: 2px 0; }
</style>

<template>
  <div class="standard-maintenance">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="filter.keyword"
          placeholder="搜索代码/名称"
          clearable
          :prefix-icon="Search"
          style="width: 200px"
          @input="onFilterChange"
        />
        <el-select
          v-model="filter.processName"
          placeholder="全部工序"
          clearable
          style="width: 140px"
          @change="onFilterChange"
        >
          <el-option
            v-for="p in distinctProcesses"
            :key="p"
            :label="p"
            :value="p"
          />
        </el-select>
        <el-select
          v-model="filter.isActive"
          placeholder="全部状态"
          style="width: 110px"
          @change="onFilterChange"
        >
          <el-option label="全部状态" value="" />
          <el-option label="激活" value="是" />
          <el-option label="停用" value="否" />
        </el-select>
        <el-tooltip content="按「产品/物料 + 工序」维护 AQL / 关键尺寸 / 性能参数 标准；首件检验录入时自动调取对应工序标准。" placement="top">
          <el-icon :size="16" style="color:#8a94a6; cursor:help"><QuestionFilled /></el-icon>
        </el-tooltip>
      </div>
      <div class="toolbar-right">
        <span class="filter-count" v-if="filteredList.length !== list.length">已筛选 {{ filteredList.length }} / {{ list.length }} 条</span>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增标准</el-button>
      </div>
    </div>

    <el-table
      :data="filteredList"
      v-loading="loading"
      border
      stripe
      max-height="calc(100vh - 270px)"
      highlight-current-row
    >
      <el-table-column label="分类" width="90">
        <template #default>
          <el-tag size="small" effect="light">{{ typeLabel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="codeLabel" prop="itemCode" width="130">
        <template #default="{ row }">
          <span class="cell-code">{{ row.itemCode || row.materialCode || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="nameLabel" prop="itemName" min-width="130">
        <template #default="{ row }">
          {{ row.itemName || row.materialName || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="processName" label="工序" width="100">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ row.processName }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="版本/状态" width="115" align="center">
        <template #default="{ row }">
          <span class="cell-ver">V{{ row.stdVersion }}</span>
          <el-tag
            :type="row.isActive === '是' ? 'success' : 'info'"
            size="small"
            class="cell-status-tag"
          >
            {{ row.isActive === '是' ? '激活' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      <el-table-column label="引用状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="(row.usageStatus ?? 0) > 0 ? 'warning' : 'info'" size="small">
            {{ (row.usageStatus ?? 0) > 0 ? '已引用' : '未引用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="参数项" width="80" align="center">
        <template #default="{ row }">
          <el-link type="primary" underline="never" @click="previewItems(row)">{{ (row.items || []).length }} 项</el-link>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-tooltip
            v-if="(row.usageStatus ?? 0) > 0"
            content="该标准已被检验记录引用，无法删除（请改为停用）"
            placement="top"
          >
            <el-button link type="danger" :icon="Delete" disabled>删除</el-button>
          </el-tooltip>
          <el-button v-else link type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="table-footer" v-if="filteredList.length > 0">
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 15, 20]"
        :total="filteredList.length"
        layout="total, sizes, prev, pager, next"
        small
        background
      />
    </div>

    <!-- 标准编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑检验标准' : '新增检验标准'"
      width="960px"
      top="5vh"
      :close-on-click-modal="false"
      @close="resetForm"
    >
      <el-form :model="form" label-width="92px" :rules="rules" ref="formRef">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="分类">
              <el-input :model-value="faiItemType === 'PRODUCT' ? '产品' : '物料'" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="faiItemType === 'PRODUCT' ? '产品代码' : '物料代码'" prop="materialCode">
              <el-autocomplete
                v-model="form.materialCode"
                :fetch-suggestions="queryItemSuggestions"
                :trigger-on-focus="false"
                :disabled="!!form.id"
                clearable
                :placeholder="faiItemType === 'PRODUCT' ? '如 10.01.200951' : '如 99.11.100558'"
                style="width: 100%"
                @select="onItemSelect"
              >
                <template #default="{ item }">
                  <div class="suggest-row">
                    <span class="suggest-code">{{ item.itemCode }}</span>
                    <span class="suggest-name">{{ item.itemName }}</span>
                    <span class="suggest-tag">{{ suggestionCodeLabel }}</span>
                  </div>
                </template>
              </el-autocomplete>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="faiItemType === 'PRODUCT' ? '产品名称' : '物料名称'" prop="materialName">
              <el-input v-model="form.materialName" disabled :placeholder="faiItemType === 'PRODUCT' ? '如 测试主轴' : '如 测试主轴'" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="工序" prop="processCode">
              <el-select v-model="form.processCode" placeholder="选择工序" :disabled="!!form.id" style="width: 100%" @change="onProcessChange">
                <el-option v-for="p in processOptions" :key="p.processCode" :label="p.processName" :value="p.processCode" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="条码">
              <el-autocomplete
                v-model="form.itemBarcode"
                :fetch-suggestions="queryBarcodeSuggestions"
                :trigger-on-focus="false"
                placeholder="输入部分条码可模糊搜索"
                clearable
                value-key="barcode"
                style="width: 100%"
                @select="onBarcodeSelect"
              >
                <template #default="{ item }">
                  <div class="suggest-row">
                    <span class="suggest-code">{{ item.barcode }}</span>
                    <span class="suggest-name">{{ item.itemCode }} · {{ item.itemName }}</span>
                    <span class="suggest-tag">条码</span>
                  </div>
                </template>
              </el-autocomplete>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="是否激活" prop="isActive">
              <el-select v-model="form.isActive" style="width: 100%">
                <el-option label="激活" value="是" />
                <el-option label="停用" value="否" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="生效日期">
              <el-date-picker v-model="form.effectiveDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="变更备注">
              <el-input v-model="form.changeRemark" placeholder="ECN 变更说明" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div class="items-header">
        <span class="items-title">检验参数配置</span>
        <div>
          <el-button size="small" type="success" plain :icon="Plus" @click="addInspectionItem">+ 添加检验参数</el-button>
        </div>
      </div>

      <el-alert title="参数名称、编码、单位引用参数字典；目标值、上下限、子组n为本物料工序专属标准，在此维护。" type="success" :closable="false" show-icon style="margin-bottom: 12px" />
      <el-table :data="form.items" border size="small" empty-text="暂无检验参数">
        <el-table-column label="SPC 参数" min-width="200">
          <template #default="{ row }">
            <el-select v-model="row.spcParameterId" clearable placeholder="选择当前工序 SPC 参数" style="width: 100%" @change="(id: number | null) => onSpcParameterChange(row, id)">
              <el-option v-for="p in spcParameters" :key="p.id" :label="`${p.paramName} (${p.paramCode}) · ${p.unit || '-'}`" :value="p.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="paramCode" label="参数编码" width="110">
          <template #default="{ row }">
            <span>{{ row.paramCode || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="70">
          <template #default="{ row }">
            <span>{{ row.unit || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="目标值" width="110">
          <template #default="{ row }">
            <el-input-number v-model="row.targetValue" :precision="4" :controls="false" size="small" style="width: 100%" placeholder="50" />
          </template>
        </el-table-column>
        <el-table-column label="USL" width="100">
          <template #default="{ row }">
            <el-input-number v-model="row.upperLimit" :precision="4" :controls="false" size="small" style="width: 100%" placeholder="50.02" />
          </template>
        </el-table-column>
        <el-table-column label="LSL" width="100">
          <template #default="{ row }">
            <el-input-number v-model="row.lowerLimit" :precision="4" :controls="false" size="small" style="width: 100%" placeholder="49.98" />
          </template>
        </el-table-column>
        <el-table-column label="子组n" width="80">
          <template #default="{ row }">
            <el-input-number v-model="row.subgroupSize" :min="1" :max="25" :controls="false" size="small" style="width: 100%" placeholder="5" />
          </template>
        </el-table-column>
        <el-table-column label="控制图" width="110">
          <template #default="{ row }">
            <el-select v-model="row.chartType" size="small" style="width: 100%">
              <el-option label="Xbar-R" value="Xbar-R" />
              <el-option label="Xbar-S" value="Xbar-S" />
              <el-option label="I-MR" value="I-MR" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="必检" width="80">
          <template #default="{ row }">
            <el-select v-model="row.isRequired" size="small" style="width: 100%">
              <el-option label="是" value="是" />
              <el-option label="否" value="否" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="60" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" :icon="Delete" @click="removeItem(row)" />
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 参数项预览 -->
    <el-dialog v-model="previewVisible" title="标准参数项明细" width="900px">
      <el-table :data="previewData" border stripe size="small">
        <el-table-column prop="paramName" label="参数名称" min-width="120" />
        <el-table-column prop="paramCode" label="编码" width="100" />
        <el-table-column prop="targetValue" label="目标值" width="90" />
        <el-table-column prop="upperLimit" label="USL" width="90" />
        <el-table-column prop="lowerLimit" label="LSL" width="90" />
        <el-table-column prop="subgroupSize" label="子组n" width="70" />
        <el-table-column prop="chartType" label="控制图" width="90" />
        <el-table-column prop="unit" label="单位" width="70" />
        <el-table-column prop="isRequired" label="必检" width="70" align="center" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, inject, watch, type Ref } from 'vue'
import type { ItemType } from '@/stores/itemType'
import { Delete, Plus, Search, QuestionFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getParametersApi, getProcessesApi } from '@/api/spc'
import type { SpcParameter, SpcProcess } from '@/types/spc'
import { searchItemsByBarcodeApi, type TraceItemSearchResult } from '@/api/trace'
import { createLatestRequestGate } from '@/utils/latest-request'
import type { FaiStandard, FaiStandardItemRequest, FaiStandardSaveRequest } from '@/types/fai'
import {
  getStandardsApi,
  createStandardApi,
  deleteStandardApi,
} from '@/api/fai'

// 强制二选一且持久化，恒为 PRODUCT/MATERIAL
const faiItemType = inject<Ref<ItemType>>('faiItemType', ref<ItemType>('PRODUCT'))

// 变更触发「去检验标准维护新建」携带的代码/名称/工序，消费后自动打开新建弹窗
interface PendingStandardCreate { itemType?: ItemType; itemCode: string; itemName: string; processName?: string }
const pendingStandardCreate = inject<Ref<PendingStandardCreate | null>>('pendingStandardCreate', ref(null))

/** 消费 pendingStandardCreate：自动切到对应分类、预填代码/名称/工序并打开新建弹窗 */
function consumePendingCreate() {
  const pending = pendingStandardCreate.value
  if (!pending?.itemCode) return
  pendingStandardCreate.value = null // 一次性消费
  if (pending.itemType) faiItemType.value = pending.itemType
  resetForm()
  form.materialCode = pending.itemCode
  form.materialName = pending.itemName || ''
  // 方案 C：携带非标准工序名（如手填的「装配」），直接预填工序名，便于用户一键为该代码新增此工序
  if (pending.processName) form.processName = pending.processName
  addItem()
  dialogVisible.value = true
}

const typeLabel = computed(() => (faiItemType.value === 'PRODUCT' ? '产品' : '物料'))
const codeLabel = computed(() => `${typeLabel.value}代码`)
const nameLabel = computed(() => `${typeLabel.value}名称`)
// 下拉候选中代码字段前缀，区分"成品编码"与"物料代码"（两表列名都为 material_code 易混淆）
const suggestionCodeLabel = computed(() => (faiItemType.value === 'PRODUCT' ? '成品编码' : '物料代码'))

const processOptions = ref<SpcProcess[]>([])
const spcParameters = ref<SpcParameter[]>([])

const list = ref<FaiStandard[]>([])
const loading = ref(false)

// ── 搜索 / 过滤 / 分页 ──
const filter = reactive({ keyword: '', processName: '', isActive: '' })
const filteredList = ref<FaiStandard[]>([])
const pagination = reactive({ currentPage: 1, pageSize: 15 })

// 从当前列表中提取去重工序名，供搜索栏下拉选择
const distinctProcesses = computed(() => {
  const set = new Set<string>()
  list.value.forEach((r) => { if (r.processName) set.add(r.processName) })
  return Array.from(set).sort()
})

function onFilterChange() {
  const kw = filter.keyword.toLowerCase()
  filteredList.value = list.value.filter((row) => {
    if (kw) {
      const code = (row.itemCode || row.materialCode || '').toLowerCase()
      const name = (row.itemName || row.materialName || '').toLowerCase()
      if (!code.includes(kw) && !name.includes(kw)) return false
    }
    if (filter.processName && row.processName !== filter.processName) return false
    if (filter.isActive) {
      const active = row.isActive === '是'
      if (filter.isActive === '是' && !active) return false
      if (filter.isActive === '否' && active) return false
    }
    return true
  })
  pagination.currentPage = 1
}
const dialogVisible = ref(false)
const saving = ref(false)
const previewVisible = ref(false)
const previewData = ref<FaiStandardItemRequest[]>([])

// 标准保存成功后回写信号（供变更触发自动回填工序）
const standardSavedResult = inject<Ref<{ itemCode: string; processCode: string; processName: string } | null>>('standardSavedResult', ref(null))

const formRef = ref<FormInstance>()
const form = reactive<{
  id: number | null
  materialCode: string
  materialName: string
  itemBarcode: string
  processName: string
  processCode: string
  isActive: string
  remark: string
  effectiveDate: string
  changeRemark: string
  items: FaiStandardItemRequest[]
}>({
  id: null,
  materialCode: '',
  materialName: '',
  itemBarcode: '',
  processName: '',
  processCode: '',
  isActive: '是',
  remark: '',
  effectiveDate: '',
  changeRemark: '',
  items: [],
})

const rules: FormRules = {
  materialCode: [{ required: true, message: '请输入代码', trigger: 'blur' }],
  processName: [{ required: true, message: '请选择工序', trigger: 'change' }],
}

function emptyItem(): FaiStandardItemRequest {
  return {
    paramName: '',
    paramCode: '',
    paramCategory: '关键尺寸',
    standardValue: '',
    upperLimit: undefined,
    lowerLimit: undefined,
    targetValue: undefined,
    subgroupSize: undefined,
    chartType: 'Xbar-R',
    unit: '',
    isRequired: '是',
    spcParameterId: undefined,
    sortOrder: form.items.length + 1,
  }
}

function addItem() {
  form.items.push(emptyItem())
}

const itemSearchGate = createLatestRequestGate()

// 代码输入框：按分类在产品/物料表中模糊搜索候选，支持直接手输（预建标准）
async function queryItemSuggestions(queryString: string, cb: (results: TraceItemSearchResult[]) => void) {
  const requestId = itemSearchGate.begin()
  const kw = (queryString || '').trim()
  if (!kw) {
    cb([])
    return
  }
  try {
    const res = await searchItemsByBarcodeApi(faiItemType.value, kw)
    if (!itemSearchGate.isCurrent(requestId)) return
    const data = res.data || []
    // 按 itemCode 去重，避免同一代码多条批次重复出现
    const seen = new Set<string>()
    const unique = data.filter((d) => {
      if (!d.itemCode || seen.has(d.itemCode)) return false
      seen.add(d.itemCode)
      return true
    })
    cb(unique)
  } catch {
    if (itemSearchGate.isCurrent(requestId)) cb([])
  }
}

// 从下拉候选中选中某条时，回填代码与名称
function onItemSelect(item: TraceItemSearchResult) {
  if (!item) return
  form.materialCode = item.itemCode
  if (item.itemName) form.materialName = item.itemName
  if (item.barcode) form.itemBarcode = item.barcode
}

// 条码模糊搜索：展示该分类下所有条码候选项（不去重，一一对应）
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
      const res = await searchItemsByBarcodeApi(faiItemType.value, kw)
      cb(res.data || [])
    } catch {
      cb([])
    }
  }, 300)
}

// 选中某条条码后自动回填代码/名称
function onBarcodeSelect(item: TraceItemSearchResult) {
  if (!item) return
  form.materialCode = item.itemCode
  if (item.itemName) form.materialName = item.itemName
  form.itemBarcode = item.barcode
}

function addInspectionItem() {
  if (!form.processCode) {
    ElMessage.warning('请先选择工序')
    return
  }
  form.items.push(emptyItem())
}

function removeItem(item: FaiStandardItemRequest) {
  const index = form.items.indexOf(item)
  if (index >= 0) form.items.splice(index, 1)
}

function resetForm() {
  form.id = null
  form.materialCode = ''
  form.materialName = ''
  form.processName = ''
  form.processCode = ''
  form.isActive = '是'
  form.remark = ''
  form.effectiveDate = ''
  form.changeRemark = ''
  form.itemBarcode = ''
  form.items = []
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getStandardsApi(faiItemType.value)
    list.value = res.data || []
    // 重置过滤条件并刷新过滤结果
    filter.keyword = ''
    filter.processName = ''
    filter.isActive = ''
    filteredList.value = list.value
    pagination.currentPage = 1
  } finally {
    loading.value = false
  }
}

function openCreate() {
  resetForm()
  dialogVisible.value = true
  addItem()
}

function previewItems(row: FaiStandard) {
  previewData.value = row.items || []
  previewVisible.value = true
}

async function onProcessChange(code: string) {
  // 命中下拉选项则从字典取名称；自定义工序（代码不在下拉里，如变更触发跳转新增的工序）保留已填名称，避免编辑时丢失
  const proc = processOptions.value.find((p) => p.processCode === code)
  if (proc) {
    form.processName = proc.processName || ''
  } else if (!form.processName) {
    form.processName = code || ''
  }
  await loadSpcParameters(code)
}

async function loadSpcParameters(code: string) {
  const process = processOptions.value.find((p) => p.processCode === code)
  const res = process ? await getParametersApi(process.id) : { data: [] }
  spcParameters.value = res.data || []
}

function onSpcParameterChange(item: FaiStandardItemRequest, id: number | null) {
  if (!id) {
    // 清空 SPC 绑定：清除参数字典回填
    item.paramName = ''
    item.paramCode = ''
    item.unit = ''
    return
  }
  const param = spcParameters.value.find((p) => p.id === id)
  if (!param) return
  // 仅从 SPC 参数字典回填编码/名称/单位（只读回显）。
  // 目标值/USL/LSL/子组n/控制图类型属于物料-工序专属标准，由人工在表格行编辑维护。
  item.paramName = param.paramName
  item.paramCode = param.paramCode
  item.unit = param.unit || ''
}

function normalizeNumber(v: unknown): number | undefined {
  if (v === '' || v === null || v === undefined) return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

async function save() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    if (form.items.length === 0) {
      ElMessage.warning('至少添加一个参数项')
      return
    }
    // 校验参数项：上下限颠倒、目标值越界
    for (let i = 0; i < form.items.length; i++) {
      const it = form.items[i]
      const itemLabel = it.paramName || `第${i + 1}项`
      const ul = normalizeNumber(it.upperLimit)
      const ll = normalizeNumber(it.lowerLimit)
      const tv = normalizeNumber(it.targetValue)
      if (ul !== undefined && ll !== undefined && ul < ll) {
        ElMessage.error(`${itemLabel}：上限值(${ul})不能小于下限值(${ll})，请修正`)
        return
      }
      if (tv !== undefined) {
        if (ul !== undefined && tv > ul) {
          ElMessage.warning(`${itemLabel}：目标值(${tv})超出上限值(${ul})，请确认`)
          return
        }
        if (ll !== undefined && tv < ll) {
          ElMessage.warning(`${itemLabel}：目标值(${tv})低于下限值(${ll})，请确认`)
          return
        }
      }
    }
    const itemType = faiItemType.value
    const payload: FaiStandardSaveRequest = {
      materialCode: form.materialCode.trim(),
      materialName: form.materialName.trim(),
      itemType,
      itemCode: form.materialCode.trim(),
      itemName: form.materialName.trim(),
      itemBarcode: form.itemBarcode?.trim() || undefined,
      processName: form.processName,
      processCode: form.processCode,
      isActive: form.isActive,
      remark: form.remark.trim(),
      effectiveDate: form.effectiveDate || undefined,
      changeRemark: form.changeRemark.trim() || undefined,
      items: form.items.map((it, idx) => ({
        id: it.id,
        paramName: it.paramName?.trim(),
        paramCode: it.paramCode?.trim(),
        paramCategory: it.paramCategory,
        standardValue: it.standardValue?.toString().trim(),
        upperLimit: normalizeNumber(it.upperLimit),
        lowerLimit: normalizeNumber(it.lowerLimit),
        targetValue: normalizeNumber(it.targetValue),
        subgroupSize: typeof it.subgroupSize === 'number' ? it.subgroupSize : undefined,
        chartType: it.chartType || undefined,
        unit: it.unit?.trim(),
        isRequired: it.isRequired || '是',
        spcParameterId: it.spcParameterId,
        sortOrder: idx + 1,
      })),
    }
    saving.value = true
    try {
      await createStandardApi(payload)
      ElMessage.success('新增成功')
      // 回写信号给变更触发：自动回填刚保存的工序并切回（仅当来自跳转创建时父页才会消费切回）
      standardSavedResult.value = {
        itemCode: form.materialCode.trim(),
        processCode: form.processCode,
        processName: form.processName,
      }
      dialogVisible.value = false
      await fetchList()
    } catch (err: any) {
      // 后端已通过 axios 拦截器弹出错误提示，保留弹窗让用户修正
      // 若为网络异常等拦截器未提示的场景，补充通用提示
      if (!err?.response?.data?.message) {
        ElMessage.error('保存失败，请检查网络或联系管理员')
      }
    } finally {
      saving.value = false
    }
  })
}

async function remove(row: FaiStandard) {
  const usageStatus = (row as any).usageStatus ?? 0
  const usageHint = usageStatus > 0 ? `\n该标准已被检验记录引用。` : ''
  try {
    await ElMessageBox.confirm(
      `确认删除标准「${row.materialCode} / ${row.processName}（V${row.stdVersion}）」？${usageHint}`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  await deleteStandardApi(row.id)
  ElMessage.success('已删除')
  await fetchList()
}

onMounted(async () => {
  const processes = await getProcessesApi()
  processOptions.value = processes.data || []
  await fetchList()
  // 组件初始即携带信号（如路由跳转触发）时也消费一次
  consumePendingCreate()
})

// 运行期（已挂载）从变更触发跳转而设置的信号，watch 即时响应
watch(pendingStandardCreate, (val) => {
  if (val?.itemCode) consumePendingCreate()
})

// 分类选择器切换时：清空已选代码/名称（避免旧分类残留值造成"混了"的错觉），再按 itemType 过滤标准列表
watch(() => faiItemType.value, () => {
  form.materialCode = ''
  form.materialName = ''
  fetchList()
})
</script>

<style scoped>
.standard-maintenance {
  padding: 4px 0;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.filter-count {
  font-size: 12px;
  color: #8a94a6;
  white-space: nowrap;
}
.cell-code {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 13px;
  color: #1b3a5b;
}
.cell-ver {
  font-weight: 600;
  color: #1b3a5b;
  margin-right: 4px;
}
.cell-status-tag {
  vertical-align: middle;
}
.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 10px 0 0;
}
.items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 8px;
}
.items-title {
  font-weight: 600;
  color: #1b3a5b;
}
.suggest-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.suggest-code {
  font-family: 'SFMono-Regular', Consolas, monospace;
  color: #1b3a5b;
  font-weight: 600;
}
.suggest-name {
  color: #8a94a6;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.suggest-tag {
  margin-left: auto;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
  color: #fff;
  background: #4a7cc2;
  border-radius: 9px;
  white-space: nowrap;
}
</style>

<template>
  <el-drawer
    v-model="visible"
    :title="props.mode === 'edit' ? '修改变更触发' : '新增变更触发'"
    direction="rtl"
    size="560px"
    @closed="onClosed"
  >
    <div class="drawer-body">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="84px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="变更类型" prop="triggerType">
            <el-select v-model="form.triggerType" placeholder="请选择">
              <el-option v-for="t in triggerTypes" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="分类">
            <el-tag :type="faiItemType === 'PRODUCT' ? 'success' : 'warning'" size="small" effect="plain">
              {{ faiItemType === 'PRODUCT' ? '产品' : '物料' }}
            </el-tag>
          </el-form-item>
        </el-col>
      </el-row>

      <template v-if="faiItemType === 'PRODUCT'">
        <el-form-item label="产品条码" prop="itemBarcode">
          <el-autocomplete
            v-model="form.itemBarcode"
            :fetch-suggestions="querySearchAsync"
            placeholder="输入部分条码可模糊搜索"
            clearable
            value-key="barcode"
            :trigger-on-focus="false"
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
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="产品代码" prop="itemCode">
              <el-input v-model="form.itemCode" placeholder="可手填或带出" @input="onItemCodeInput" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品名称" prop="itemName">
              <el-input v-model="form.itemName" placeholder="可手填或带出" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="批次号">
              <el-input v-model="form.batchNo" placeholder="由条码带出，可手动修改" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工序" prop="processName">
              <el-select v-model="form.processCode" :placeholder="form.itemCode ? '请选择' : '请先填写代码'" :loading="fetching" :disabled="!form.itemCode" filterable allow-create @change="onProcessChange" @blur="onProcessBlur">
                <el-option v-for="p in processes" :key="p.processCode" :label="`${p.processName}(${p.processCode})`" :value="p.processCode" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </template>

      <template v-else-if="faiItemType === 'MATERIAL'">
        <el-form-item label="物料条码" prop="itemBarcode">
          <el-autocomplete
            v-model="form.itemBarcode"
            :fetch-suggestions="querySearchAsync"
            placeholder="输入部分条码可模糊搜索"
            clearable
            value-key="barcode"
            :trigger-on-focus="false"
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
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="物料代码" prop="itemCode">
              <el-input v-model="form.itemCode" placeholder="可手填或带出" @input="onItemCodeInput" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物料名称" prop="itemName">
              <el-input v-model="form.itemName" placeholder="可手填或带出" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="批次号">
              <el-input v-model="form.batchNo" placeholder="由条码带出，可手动修改" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工序" prop="processName">
              <el-select v-model="form.processCode" :placeholder="form.itemCode ? '请选择' : '请先填写代码'" :loading="fetching" :disabled="!form.itemCode" filterable allow-create @change="onProcessChange" @blur="onProcessBlur">
                <el-option v-for="p in processes" :key="p.processCode" :label="`${p.processName}(${p.processCode})`" :value="p.processCode" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </template>

      <!-- 代码为空时引导去检验标准维护 -->
      <div v-if="!form.itemCode" class="process-empty-hint">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>
            <span>请先填写{{ faiItemType === 'PRODUCT' ? '产品' : '物料' }}代码或条码，或在 &nbsp;</span>
            <el-link type="primary" :underline="false" @click="goCreateStandard()">检验标准维护</el-link>
            <span>&nbsp; 中为该{{ faiItemType === 'PRODUCT' ? '产品' : '物料' }}新建标准</span>
          </template>
        </el-alert>
      </div>

      <!-- 检验参数预览：选择工序后自动加载对应标准模板参数 -->
      <div v-if="standardItems.length > 0" class="standard-preview">
        <el-divider content-position="left">
          <span class="preview-divider-title">检验参数预览</span>
          <el-tag size="small" type="info" effect="plain">{{ standardItems.length }} 项</el-tag>
        </el-divider>
        <el-table :data="standardItems" size="small" border stripe :max-height="240">
          <el-table-column prop="paramName" label="参数名称" min-width="100" show-overflow-tooltip />
          <el-table-column label="规格/标准" min-width="80" show-overflow-tooltip>
            <template #default="{ row }">
              <span :class="{ 'value-null': !row.standardValue && row.standardValue !== 0 }">{{ row.standardValue ?? '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="targetValue" label="目标值" width="80" align="center">
            <template #default="{ row }">
              <el-tooltip v-if="isTargetOutOfRange(row)" content="目标值不在 [下限, 上限] 范围内" placement="top">
                <span class="value-warning">{{ row.targetValue ?? '-' }}</span>
              </el-tooltip>
              <span v-else :class="{ 'value-null': row.targetValue == null && row.targetValue !== 0 }">{{ row.targetValue ?? '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="upperLimit" label="上限" width="80" align="center">
            <template #default="{ row }">
              <el-tooltip v-if="isLimitReversed(row)" content="上限不应小于下限" placement="top">
                <span class="value-error">{{ row.upperLimit ?? '-' }}</span>
              </el-tooltip>
              <span v-else :class="{ 'value-null': row.upperLimit == null }">{{ row.upperLimit ?? '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="lowerLimit" label="下限" width="80" align="center">
            <template #default="{ row }">
              <el-tooltip v-if="isLimitReversed(row)" content="下限不应大于上限" placement="top">
                <span class="value-error">{{ row.lowerLimit ?? '-' }}</span>
              </el-tooltip>
              <span v-else :class="{ 'value-null': row.lowerLimit == null }">{{ row.lowerLimit ?? '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="unit" label="单位" width="60" align="center">
            <template #default="{ row }">
              <span :class="{ 'value-null': !row.unit }">{{ row.unit || '-' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 加载中占位 -->
      <div v-else-if="loadingStandard" class="preview-loading">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-if="processEmpty && !fetching" class="process-empty-hint">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>
            <span>当前代码在检验标准中暂无工序，</span>
            <el-link type="primary" :underline="false" @click="goCreateStandard()">去检验标准维护新建</el-link>
          </template>
        </el-alert>
      </div>

      <!-- 方案 C：手填了标准表里不存在的工序 → 引导去为该代码新增该工序 -->
      <div v-if="processNotInStandard && !fetching" class="process-empty-hint">
        <el-alert type="warning" :closable="false" show-icon>
          <template #title>
            <span>工序「{{ processNotInStandardName }}」不在代码「{{ form.itemCode }}」的标准绑定工序中，该变更触发将无检验参数模板，</span>
            <el-link type="primary" :underline="false" @click="goCreateStandard(processNotInStandardName)">去检验标准维护为「{{ form.itemCode }}」新增「{{ processNotInStandardName }}」工序</el-link>
          </template>
        </el-alert>
      </div>

      <el-form-item label="触发原因" prop="triggerReason">
        <el-input v-model="form.triggerReason" type="textarea" :rows="2" placeholder="请输入触发原因" />
      </el-form-item>
      <el-form-item>
        <div class="drawer-footer">
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
        </div>
      </el-form-item>
    </el-form>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useFaiStore } from '@/stores/fai'
import type { CreateChangeTriggerRequest, FaiChangeTrigger, FaiStandardItem } from '@/types/fai'
import type { ItemType } from '@/stores/itemType'
import { getStandardProcessesApi, getLatestStandardByItemApi, createChangeTriggerApi, updateChangeTriggerApi } from '@/api/fai'
import { getItemByBarcodeApi, searchItemsByBarcodeApi } from '@/api/trace'
import type { TraceItemSearchResult } from '@/api/trace'

const props = defineProps<{
  modelValue: boolean
  /** 更正来源：已建单的记录，新建更正单时预填数据 */
  correctFrom?: FaiChangeTrigger | null
  /** 模式：create=新建, edit=直接修改原记录 */
  mode?: 'create' | 'edit'
  /** 编辑来源：待修改的变更触发原记录 */
  editingRow?: FaiChangeTrigger | null
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const store = useFaiStore()
const router = useRouter()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const fetching = ref(false)

// 顶部分类选择器（与 ChangeTriggerList 同源，恒为 PRODUCT/MATERIAL）
const faiItemType = inject<Ref<ItemType>>('faiItemType', ref<ItemType>('MATERIAL'))

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const triggerTypes = ['换模具', '升级系统', '换批次', '换设备', '材料批次']
const processes = ref<{ processCode: string; processName: string }[]>([])
const processEmpty = ref(false)
// 方案 C：手填了标准表里不存在的工序时，展示「去标准维护新增」引导块
const processNotInStandard = ref(false)
const processNotInStandardName = ref('')

// 标准维护保存成功后回写的信号：自动回填刚保存的工序并选中
const standardSavedResult = inject<Ref<{ itemCode: string; processCode: string; processName: string } | null>>('standardSavedResult', ref(null))
// 跳转检验标准维护并预填代码/名称/工序的信号 + 当前激活 tab
const pendingStandardCreate = inject<Ref<{ itemType?: ItemType; itemCode: string; itemName: string; processName?: string } | null>>('pendingStandardCreate', ref(null))
const activeTab = inject<Ref<string>>('activeTab', ref('trigger'))

/** 当前所选工序对应的检验标准参数项 */
const standardItems = ref<FaiStandardItem[]>([])
const loadingStandard = ref(false)

const form = reactive<CreateChangeTriggerRequest>({
  triggerType: '',
  itemType: faiItemType.value,
  itemCode: '',
  itemName: '',
  itemBarcode: '',
  materialCode: '',
  materialName: '',
  batchNo: '',
  processName: '',
  processCode: '',
  triggerReason: '',
})

const rules: FormRules<CreateChangeTriggerRequest> = {
  triggerType: [{ required: true, message: '请选择变更类型', trigger: 'change' }],
  itemType: [{ required: true, message: '请选择分类', trigger: 'change' }],
  processName: [{ required: true, message: '请选择工序', trigger: 'change' }],
}

let barcodeTimer: ReturnType<typeof setTimeout> | null = null
let lastCandidates: TraceItemSearchResult[] = []

function resetForm() {
  form.triggerType = ''
  form.itemType = faiItemType.value
  form.itemCode = ''
  form.itemName = ''
  form.itemBarcode = ''
  form.materialCode = ''
  form.materialName = ''
  form.batchNo = ''
  form.processName = ''
  form.processCode = ''
  form.triggerReason = ''
  form.remark = ''
  standardItems.value = []
  processNotInStandard.value = false
  processNotInStandardName.value = ''
  formRef.value?.clearValidate()
}

// 全局分类切换时，清空已填写的条码/代码/工序等字段（分类变化导致数据源不同）
watch(faiItemType, () => {
  form.itemType = faiItemType.value
  form.itemBarcode = ''
  form.itemCode = ''
  form.itemName = ''
  form.batchNo = ''
  form.processCode = ''
  form.processName = ''
  standardItems.value = []
  processNotInStandard.value = false
  loadProcesses()
})

let codeTimer: ReturnType<typeof setTimeout> | null = null
/** 输入产品/物料代码后，按代码加载其绑定的工序，无结果则提示新增标准 */
function onItemCodeInput() {
  // 代码变化，清空已选工序，避免串数据
  form.processCode = ''
  form.processName = ''
  standardItems.value = []
  processNotInStandard.value = false
  if (codeTimer) clearTimeout(codeTimer)
  codeTimer = setTimeout(() => loadProcesses(), 300)
}

/** 更正模式：从已有记录预填表单，自动加 remark */
watch(
  () => props.correctFrom,
  (from) => {
    if (from) {
      form.itemCode = from.itemCode || ''
      form.itemName = from.itemName || ''
      form.batchNo = from.batchNo || ''
      form.processCode = from.processCode || ''
      form.processName = from.processName || ''
      form.triggerType = from.triggerType || ''
      form.triggerReason = ''
      form.remark = `更正自 #${from.id}`
      // 更正模式下预填了工序，加载参数预览
      if (form.processCode && form.processName && form.itemCode) loadStandardPreview()
    }
  },
  { immediate: true },
)

/** 标准维护保存成功后：回填刚保存的工序（仅当当前表单代码与保存信号一致时） */
watch(standardSavedResult, async (val) => {
  if (!val) return
  const curCode = (form.itemCode || '').trim()
  if (!curCode || curCode !== val.itemCode) return
  await loadProcesses()
  // 自动选中刚保存的工序
  form.processCode = val.processCode
  form.processName = val.processName
  loadStandardPreview()
})

/** 编辑模式：从原记录完整回填表单（含条码/代码/名称/工序/原因/备注），可修改后直接保存 */
watch(
  () => props.editingRow,
  (row) => {
    if (props.mode === 'edit' && row) {
      form.triggerType = row.triggerType || ''
      form.itemType = (row.itemType as 'PRODUCT' | 'MATERIAL') || faiItemType.value
      form.itemCode = row.itemCode || ''
      form.itemName = row.itemName || ''
      form.itemBarcode = row.itemBarcode || ''
      form.materialCode = row.materialCode || ''
      form.materialName = row.materialName || ''
      form.batchNo = row.batchNo || ''
      form.processCode = row.processCode || ''
      form.processName = row.processName || ''
      form.triggerReason = row.triggerReason || ''
      form.remark = row.remark || ''
      // 编辑预填了工序，加载参数预览
      if (form.processCode && form.processName && form.itemCode) loadStandardPreview()
    }
  },
  { immediate: true },
)

function fillFromItem(info: { itemCode: string; itemName: string; batchNo: string }) {
  form.itemCode = info.itemCode
  form.itemName = info.itemName
  form.batchNo = info.batchNo
  // 冗余兼容列同步
  form.materialCode = info.itemCode
  form.materialName = info.itemName
  // 若已选工序，联动刷新参数预览
  if (form.processCode && form.processName) loadStandardPreview()
}

function onBarcodeSelect(item: TraceItemSearchResult) {
  form.itemBarcode = item.barcode
  fillFromItem(item)
}

// el-autocomplete 远程模糊搜索：输入部分条码即下拉候选
function querySearchAsync(queryString: string, cb: (results: TraceItemSearchResult[]) => void) {
  const keyword = (queryString || '').trim()
  if (!keyword || !form.itemType) {
    cb([])
    return
  }
  if (barcodeTimer) clearTimeout(barcodeTimer)
  barcodeTimer = setTimeout(async () => {
    fetching.value = true
    try {
      const res = await searchItemsByBarcodeApi(form.itemType as 'PRODUCT' | 'MATERIAL', keyword)
      const list = res.data || []
      lastCandidates = list
      cb(list)
    } catch (e) {
      cb([])
    } finally {
      fetching.value = false
    }
  }, 300)
}

// 兼容：直接手填/粘贴完整条码并失焦时，优先命中最近模糊候选，否则按精确接口带出代码/名称/批次
function onBarcodeBlur() {
  const barcode = (form.itemBarcode || '').trim()
  if (!barcode || !form.itemType) return
  const hit = lastCandidates.find((c) => c.barcode === barcode)
  if (hit) {
    fillFromItem(hit)
    return
  }
  getItemByBarcodeApi(form.itemType as 'PRODUCT' | 'MATERIAL', barcode)
    .then((res) => {
      if (res.data) fillFromItem(res.data)
    })
    .catch(() => {})
}

function onProcessChange(code: string) {
  const proc = processes.value.find((p) => p.processCode === code)
  // 命中标准表已有工序则取名称；自由输入（allow-create）时名称等于输入值
  form.processName = proc?.processName || code || ''
  // 从下拉选中即为标准内工序，清除非标准引导
  processNotInStandard.value = false
  // 选择工序后自动加载该物料-工序对应的检验标准参数
  loadStandardPreview()
}

/** 自由输入（allow-create）失焦时，若当前值不在标准工序列表中，将输入值同时作为工序名 */
function onProcessBlur() {
  if (!form.processCode) {
    form.processName = ''
    processNotInStandard.value = false
    return
  }
  const hit = processes.value.find((p) => p.processCode === form.processCode)
  if (!hit) {
    // 方案 C：手填了标准表里不存在的工序 → 展示「去标准维护新增」引导
    const code = (form.itemCode || '').trim()
    const typed = form.processCode
    if (code) {
      processNotInStandard.value = true
      processNotInStandardName.value = typed
    }
    form.processName = typed
  } else {
    processNotInStandard.value = false
  }
  loadStandardPreview()
}

/** 加载当前物料+工序对应的最新有效标准参数项 */
async function loadStandardPreview() {
  standardItems.value = []
  const itemType = form.itemType as 'PRODUCT' | 'MATERIAL'
  const itemCode = form.itemCode?.trim()
  const processName = form.processName?.trim()
  if (!itemType || !itemCode || !processName) return

  loadingStandard.value = true
  try {
    const res = await getLatestStandardByItemApi(itemType, itemCode, processName)
    const standard = res.data
    if (standard?.items && Array.isArray(standard.items) && standard.items.length > 0) {
      standardItems.value = standard.items as FaiStandardItem[]
    }
  } catch {
    // 静默失败：无标准或未配置参数时仅不展示预览
  } finally {
    loadingStandard.value = false
  }
}

/** 上下限颠倒：下限 > 上限 视为不合理 */
function isLimitReversed(item: FaiStandardItem): boolean {
  const lo = item.lowerLimit
  const hi = item.upperLimit
  return lo != null && hi != null && lo > hi
}

/** 目标值越界：目标值不在 [下限, 上限] 区间内视为不合理 */
function isTargetOutOfRange(item: FaiStandardItem): boolean {
  const lo = item.lowerLimit
  const hi = item.upperLimit
  const t = item.targetValue
  if (lo == null || hi == null || t == null) return false
  return t < lo || t > hi
}

onMounted(() => {
  loadProcesses()
})

/** 从检验标准维护获取当前分类+代码下已维护的工序（去重）。
 *  代码为空时返回该分类全部工序；代码非空但无匹配工序，提示去新增标准。 */
async function loadProcesses() {
  if (!form.itemType) return
  const itemCode = (form.itemCode || '').trim()
  // 代码为空时清空工序列表，禁用工序下拉
  if (!itemCode) {
    processes.value = []
    processEmpty.value = true
    return
  }
  fetching.value = true
  try {
    const res = await getStandardProcessesApi(form.itemType as 'PRODUCT' | 'MATERIAL', itemCode)
    processes.value = res.data || []
    processEmpty.value = processes.value.length === 0
    // 输入了代码但查无对应工序：提示去检验标准维护新增
    if (processes.value.length === 0) {
      ElMessage.warning(`检验标准维护中未找到代码「${itemCode}」绑定的工序，请先新增标准`)
    }
  } finally {
    fetching.value = false
  }
}

/** 跳转到检验标准维护页：预选分类并携带当前代码/名称（可选工序），供自动打开新建弹窗预填 */
function goCreateStandard(processName?: string) {
  // 设置信号（StandardMaintenance 一次性消费，自动预填代码/名称/工序并打开新建）
  pendingStandardCreate.value = {
    itemType: faiItemType.value,
    itemCode: (form.itemCode || '').trim(),
    itemName: (form.itemName || '').trim(),
    processName: processName || undefined,
  }
  // 直接切到检验标准维护 tab（已挂载组件，无需路由导航）
  activeTab.value = 'standard'
  visible.value = false
}

function onClosed() {
  resetForm()
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      if (props.mode === 'edit' && props.editingRow?.id) {
        // 直接修改原记录
        if (form.itemBarcode && !form.materialCode) form.materialCode = form.itemBarcode
        if (form.itemBarcode && !form.materialName) form.materialName = form.itemName
        await updateChangeTriggerApi(props.editingRow.id, { ...form })
        ElMessage.success('变更触发修改成功')
      } else {
        await createChangeTriggerApi({ ...form })
        ElMessage.success('变更触发创建成功')
      }
      emit('saved')
      visible.value = false
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败')
    } finally {
      submitting.value = false
    }
  })
}
</script>

<style scoped>
.drawer-body {
  padding: 0 8px;
}
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}
.barcode-option {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.barcode-option__code {
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.barcode-option__meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.process-empty-hint {
  margin-bottom: 18px;
}
.standard-preview {
  margin-bottom: 18px;
}
.preview-divider-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}
.preview-loading {
  margin-bottom: 18px;
  padding: 0 4px;
}
.value-null {
  color: var(--el-text-color-placeholder);
}
.value-warning {
  color: #e6a23c;
  font-weight: 600;
  cursor: help;
}
.value-error {
  color: #f56c6c;
  font-weight: 600;
  cursor: help;
}
</style>

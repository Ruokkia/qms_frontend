<template>
  <div class="standard-maintenance">
    <div class="toolbar">
      <el-button type="primary" :icon="Plus" @click="openCreate">新增标准</el-button>
      <span class="tip">按「物料 + 工序」维护 AQL / 关键尺寸 / 性能参数 标准；首件检验录入时自动调取对应工序标准。</span>
    </div>

    <el-table :data="list" v-loading="loading" border stripe height="calc(100vh - 280px)">
      <el-table-column prop="materialCode" label="物料代码" width="120" />
      <el-table-column prop="materialName" label="物料名称" min-width="140" />
      <el-table-column prop="processName" label="工序" width="100">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ row.processName }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="stdVersion" label="版本" width="70" align="center" />
      <el-table-column label="是否激活" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isActive === '是' ? 'success' : 'info'" size="small">
            {{ row.isActive === '是' ? '激活' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
      <el-table-column label="参数项" width="80" align="center">
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="previewItems(row)">{{ (row.items || []).length }} 项</el-link>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

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
            <el-form-item label="物料代码" prop="materialCode">
              <el-input v-model="form.materialCode" placeholder="如 M001" :disabled="!!form.id" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="物料名称" prop="materialName">
              <el-input v-model="form.materialName" placeholder="如 测试主轴" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="工序" prop="processCode">
              <el-select v-model="form.processCode" placeholder="选择工序" :disabled="!!form.id" style="width: 100%" @change="onProcessChange">
                <el-option v-for="p in processOptions" :key="p.processCode" :label="p.processName" :value="p.processCode" />
              </el-select>
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
          <el-col :span="16">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div class="items-header">
        <span class="items-title">首件检验项目配置</span>
        <div>
          <el-button size="small" type="success" plain :icon="Plus" @click="addSpcItem">添加 SPC 数值项目</el-button>
        </div>
      </div>

      <el-alert title="SPC 数值项目的单位、目标值、上下限和 n 均来自 SPC 参数配置；本页只选择引用，不重复维护。" type="success" :closable="false" show-icon style="margin-bottom: 12px" />
      <el-table :data="spcItems" border size="small" empty-text="暂无 SPC 数值项目">
        <el-table-column label="SPC 参数" min-width="220">
          <template #default="{ row }">
            <el-select v-model="row.spcParameterId" placeholder="选择当前工序 SPC 参数" style="width: 100%" @change="(id: number) => onSpcParameterChange(row, id)">
              <el-option v-for="p in spcParameters" :key="p.id" :label="`${p.paramName} (${p.paramCode}) · ${p.unit || '-'} · n=${p.subgroupSize}`" :value="p.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="paramCode" label="参数编码" width="120" />
        <el-table-column prop="standardValue" label="目标值" width="110" />
        <el-table-column prop="upperLimit" label="USL" width="90" />
        <el-table-column prop="lowerLimit" label="LSL" width="90" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column label="必检" width="90">
          <template #default="{ row }">
            <el-select v-model="row.isRequired" style="width: 100%"><el-option label="是" value="是" /><el-option label="否" value="否" /></el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="60" fixed="right"><template #default="{ row }"><el-button link type="danger" :icon="Delete" @click="removeItem(row)" /></template></el-table-column>
      </el-table>

      <div v-if="false" class="items-header manual-header">
        <span class="items-title">首件独立项目（不进入 SPC）</span>
      </div>
      <el-table v-if="false" :data="manualItems" border size="small" empty-text="暂无首件独立项目">
        <el-table-column label="参数名称" min-width="150">
          <template #default="{ row }">
            <el-input v-if="row.spcEnabled !== '是'" v-model="row.paramName" placeholder="如 主轴外径" />
            <span v-else>{{ row.paramName }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类别" width="120">
          <template #default="{ row }">
            <el-select v-model="row.paramCategory" placeholder="类别" style="width: 100%">
              <el-option v-for="c in categoryOptions" :key="c" :label="c" :value="c" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="参数编码" width="110">
          <template #default="{ row }">
            <el-input v-if="row.spcEnabled !== '是'" v-model="row.paramCode" placeholder="如 OD" />
            <span v-else>{{ row.paramCode }}</span>
          </template>
        </el-table-column>
        <el-table-column label="标准值" width="110">
          <template #default="{ row }">
            <el-input v-if="row.spcEnabled !== '是'" v-model="row.standardValue" placeholder="如 50" />
            <span v-else>{{ row.standardValue }}</span>
          </template>
        </el-table-column>
        <el-table-column label="上限" width="90">
          <template #default="{ row }">
            <el-input v-if="row.spcEnabled !== '是'" v-model="row.upperLimit" placeholder="如 50.02" />
            <span v-else>{{ row.upperLimit }}</span>
          </template>
        </el-table-column>
        <el-table-column label="下限" width="90">
          <template #default="{ row }">
            <el-input v-if="row.spcEnabled !== '是'" v-model="row.lowerLimit" placeholder="如 49.98" />
            <span v-else>{{ row.lowerLimit }}</span>
          </template>
        </el-table-column>
        <el-table-column label="单位" width="80">
          <template #default="{ row }">
            <el-input v-if="row.spcEnabled !== '是'" v-model="row.unit" placeholder="如 mm" />
            <span v-else>{{ row.unit }}</span>
          </template>
        </el-table-column>
        <el-table-column label="必检" width="90">
          <template #default="{ row }">
            <el-select v-model="row.isRequired" style="width: 100%">
              <el-option label="是" value="是" />
              <el-option label="否" value="否" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="60" fixed="right">
          <template #default="{ row, $index }">
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
    <el-dialog v-model="previewVisible" title="标准参数项明细" width="760px">
      <el-table :data="previewData" border stripe>
        <el-table-column prop="paramName" label="参数名称" min-width="150" />
        <el-table-column label="类别" width="110">
          <template #default="{ row }">
            <el-tag :type="categoryTag(row.paramCategory)" size="small">{{ row.paramCategory }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="standardValue" label="标准值" width="100" />
        <el-table-column prop="upperLimit" label="上限" width="90" />
        <el-table-column prop="lowerLimit" label="下限" width="90" />
        <el-table-column prop="unit" label="单位" width="70" />
        <el-table-column prop="isRequired" label="必检" width="70" align="center" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Edit, Delete, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getParametersApi, getProcessesApi } from '@/api/spc'
import type { SpcParameter, SpcProcess } from '@/types/spc'
import type { FaiStandard, FaiStandardCategory, FaiStandardItemRequest, FaiStandardSaveRequest } from '@/types/fai'
import {
  getStandardsApi,
  createStandardApi,
  updateStandardApi,
  deleteStandardApi,
} from '@/api/fai'

const processOptions = ref<SpcProcess[]>([])
const spcParameters = ref<SpcParameter[]>([])
const spcItems = computed(() => form.items.filter((item) => item.spcEnabled === '是'))
const manualItems = computed(() => form.items.filter((item) => item.spcEnabled !== '是'))
const categoryOptions: FaiStandardCategory[] = ['AQL', '关键尺寸', '性能参数']

const list = ref<FaiStandard[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const previewVisible = ref(false)
const previewData = ref<FaiStandardItemRequest[]>([])

const formRef = ref<FormInstance>()
const form = reactive<{
  id: number | null
  materialCode: string
  materialName: string
  processName: string
  processCode: string
  isActive: string
  remark: string
  items: FaiStandardItemRequest[]
}>({
  id: null,
  materialCode: '',
  materialName: '',
  processName: '',
  processCode: '',
  isActive: '是',
  remark: '',
  items: [],
})

const rules: FormRules = {
  materialCode: [{ required: true, message: '请输入物料代码', trigger: 'blur' }],
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
    unit: '',
    isRequired: '是',
    spcEnabled: '是',
    spcParameterId: undefined,
    sortOrder: form.items.length + 1,
  }
}

function addItem() {
  form.items.push(emptyItem())
}

function addSpcItem() {
  if (!form.processCode) {
    ElMessage.warning('请先选择工序，再添加 SPC 数值项目')
    return
  }
  form.items.push({
    ...emptyItem(),
    spcEnabled: '是',
  })
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
  form.items = []
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getStandardsApi()
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  resetForm()
  dialogVisible.value = true
  addItem()
}

async function openEdit(row: FaiStandard) {
  form.id = row.id
  form.materialCode = row.materialCode
  form.materialName = row.materialName || ''
  form.processName = row.processName
  form.processCode = row.processCode
    || processOptions.value.find((p) => p.processName === row.processName)?.processCode
    || ''
  await loadSpcParameters(form.processCode)
  form.isActive = row.isActive
  form.remark = row.remark || ''
  form.items = (row.items || []).map((it) => ({
    id: it.id,
    paramName: it.paramName,
    paramCode: it.paramCode,
    paramCategory: (it.paramCategory as FaiStandardCategory) || '关键尺寸',
    standardValue: it.standardValue,
    upperLimit: it.upperLimit,
    lowerLimit: it.lowerLimit,
    unit: it.unit,
    isRequired: it.isRequired || '是',
    spcEnabled: it.spcEnabled || '否',
    spcParameterId: it.spcParameterId,
    sortOrder: it.sortOrder,
  }))
  dialogVisible.value = true
}

function previewItems(row: FaiStandard) {
  previewData.value = row.items || []
  previewVisible.value = true
}

async function onProcessChange(code: string) {
  form.processName = processOptions.value.find((p) => p.processCode === code)?.processName || ''
  await loadSpcParameters(code)
  form.items.forEach((item) => {
    if (item.spcEnabled === '是') onSpcEnabledChange(item)
  })
}

async function loadSpcParameters(code: string) {
  const process = processOptions.value.find((p) => p.processCode === code)
  const res = process ? await getParametersApi(process.id) : { data: [] }
  spcParameters.value = res.data || []
}

function onSpcEnabledChange(item: FaiStandardItemRequest) {
  if (item.spcEnabled !== '是') {
    item.spcParameterId = undefined
    return
  }
  item.spcParameterId = undefined
  item.paramName = ''
  item.paramCode = ''
  item.standardValue = ''
  item.upperLimit = undefined
  item.lowerLimit = undefined
  item.unit = ''
}

function onSpcParameterChange(item: FaiStandardItemRequest, id: number) {
  const param = spcParameters.value.find((p) => p.id === id)
  if (!param) return
  item.paramName = param.paramName
  item.paramCode = param.paramCode
  item.standardValue = param.targetValue == null ? '' : String(param.targetValue)
  item.upperLimit = param.upperSpecLimit ?? undefined
  item.lowerLimit = param.lowerSpecLimit ?? undefined
  item.unit = param.unit || ''
}

function categoryTag(c?: string): 'warning' | 'primary' | 'success' | 'info' {
  if (c === 'AQL') return 'warning'
  if (c === '关键尺寸') return 'primary'
  if (c === '性能参数') return 'success'
  return 'info'
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
    const payload: FaiStandardSaveRequest = {
      materialCode: form.materialCode.trim(),
      materialName: form.materialName.trim(),
      processName: form.processName,
      processCode: form.processCode,
      isActive: form.isActive,
      remark: form.remark.trim(),
      items: form.items.map((it, idx) => ({
        id: it.id,
        paramName: it.paramName?.trim(),
        paramCode: it.paramCode?.trim(),
        paramCategory: it.paramCategory,
        standardValue: it.standardValue?.toString().trim(),
        upperLimit: normalizeNumber(it.upperLimit),
        lowerLimit: normalizeNumber(it.lowerLimit),
        unit: it.unit?.trim(),
        isRequired: it.isRequired || '是',
        spcEnabled: it.spcEnabled || '否',
        spcParameterId: it.spcParameterId,
        sortOrder: idx + 1,
      })),
    }
    saving.value = true
    try {
      if (form.id) {
        await updateStandardApi(form.id, payload)
        ElMessage.success('更新成功')
      } else {
        await createStandardApi(payload)
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
      await fetchList()
    } finally {
      saving.value = false
    }
  })
}

async function remove(row: FaiStandard) {
  try {
    await ElMessageBox.confirm(
      `确认删除标准「${row.materialCode} / ${row.processName}（V${row.stdVersion}）」？该操作仅逻辑删除。`,
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
  const [standards, processes] = await Promise.all([getStandardsApi(), getProcessesApi()])
  list.value = standards.data || []
  processOptions.value = processes.data || []
})
</script>

<style scoped>
.standard-maintenance {
  padding: 4px 0;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.toolbar .tip {
  color: #8a94a6;
  font-size: 12px;
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
</style>

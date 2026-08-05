<template>
  <el-dialog
    v-model="visible"
    title="新增变更触发"
    width="560px"
    @closed="onClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-form-item label="变更类型" prop="triggerType">
        <el-select v-model="form.triggerType" placeholder="请选择" style="width: 100%">
          <el-option v-for="t in triggerTypes" :key="t" :label="t" :value="t" />
        </el-select>
      </el-form-item>

      <el-form-item label="分类" prop="itemType">
        <el-radio-group v-model="form.itemType" @change="onItemTypeChange">
          <el-radio-button value="PRODUCT">产品</el-radio-button>
          <el-radio-button value="MATERIAL">物料</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <template v-if="form.itemType === 'PRODUCT'">
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
        <el-form-item label="产品代码" prop="itemCode">
          <el-input v-model="form.itemCode" placeholder="产品代码（可手填或带出）" />
        </el-form-item>
        <el-form-item label="产品名称" prop="itemName">
          <el-input v-model="form.itemName" placeholder="产品名称（可手填或带出）" />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input v-model="form.batchNo" placeholder="由条码自动带出，可手动修改" />
        </el-form-item>
      </template>

      <template v-else-if="form.itemType === 'MATERIAL'">
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
        <el-form-item label="物料代码" prop="itemCode">
          <el-input v-model="form.itemCode" placeholder="物料代码（可手填或带出）" />
        </el-form-item>
        <el-form-item label="物料名称" prop="itemName">
          <el-input v-model="form.itemName" placeholder="物料名称（可手填或带出）" />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input v-model="form.batchNo" placeholder="由条码自动带出，可手动修改" />
        </el-form-item>
      </template>

      <el-form-item label="工序" prop="processName">
        <el-select v-model="form.processCode" placeholder="请选择" style="width: 100%" @change="onProcessChange">
          <el-option v-for="p in processes" :key="p.processCode" :label="p.processName" :value="p.processCode" />
        </el-select>
      </el-form-item>
      <el-form-item label="触发原因" prop="triggerReason">
        <el-input v-model="form.triggerReason" type="textarea" :rows="2" placeholder="请输入触发原因" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref, type Ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useFaiStore } from '@/stores/fai'
import type { CreateChangeTriggerRequest } from '@/types/fai'
import type { ItemType } from '@/stores/itemType'
import { getProcessesApi } from '@/api/spc'
import { getItemByBarcodeApi, searchItemsByBarcodeApi } from '@/api/trace'
import type { TraceItemSearchResult } from '@/api/trace'
import type { SpcProcess } from '@/types/spc'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const store = useFaiStore()
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
const processes = ref<SpcProcess[]>([])

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
  formRef.value?.clearValidate()
}

function onItemTypeChange() {
  // 切换分类时清空条码带出结果，避免串数据
  form.itemBarcode = ''
  form.itemCode = ''
  form.itemName = ''
  form.batchNo = ''
}

function fillFromItem(info: { itemCode: string; itemName: string; batchNo: string }) {
  form.itemCode = info.itemCode
  form.itemName = info.itemName
  form.batchNo = info.batchNo
  // 冗余兼容列同步
  form.materialCode = info.itemCode
  form.materialName = info.itemName
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
  form.processName = processes.value.find((p) => p.processCode === code)?.processName || ''
}

onMounted(async () => {
  const res = await getProcessesApi()
  processes.value = res.data || []
})

function onClosed() {
  resetForm()
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await store.createChangeTrigger({ ...form })
      ElMessage.success('变更触发创建成功')
      emit('saved')
      visible.value = false
    } finally {
      submitting.value = false
    }
  })
}
</script>

<style scoped>
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
</style>

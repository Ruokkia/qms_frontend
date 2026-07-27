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
      <el-form-item label="工单号" prop="workOrderNo">
        <el-input v-model="form.workOrderNo" placeholder="请输入工单号" />
      </el-form-item>
      <el-form-item label="物料代码" prop="materialCode">
        <el-input v-model="form.materialCode" placeholder="请输入物料代码" />
      </el-form-item>
      <el-form-item label="物料名称" prop="materialName">
        <el-input v-model="form.materialName" placeholder="请输入物料名称" />
      </el-form-item>
      <el-form-item label="批次号" prop="batchNo">
        <el-input v-model="form.batchNo" placeholder="请输入批次号" />
      </el-form-item>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useFaiStore } from '@/stores/fai'
import type { CreateChangeTriggerRequest } from '@/types/fai'
import { getProcessesApi } from '@/api/spc'
import type { SpcProcess } from '@/types/spc'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const store = useFaiStore()
const formRef = ref<FormInstance>()
const submitting = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const triggerTypes = ['换模具', '升级系统', '换批次', '换设备', '材料批次']
const processes = ref<SpcProcess[]>([])

const form = reactive<CreateChangeTriggerRequest>({
  triggerType: '',
  workOrderNo: '',
  materialCode: '',
  materialName: '',
  batchNo: '',
  processName: '',
  processCode: '',
  triggerReason: '',
})

const rules: FormRules<CreateChangeTriggerRequest> = {
  triggerType: [{ required: true, message: '请选择变更类型', trigger: 'change' }],
  processName: [{ required: true, message: '请选择工序', trigger: 'change' }],
}

function resetForm() {
  form.triggerType = ''
  form.workOrderNo = ''
  form.materialCode = ''
  form.materialName = ''
  form.batchNo = ''
  form.processName = ''
  form.processCode = ''
  form.triggerReason = ''
  formRef.value?.clearValidate()
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

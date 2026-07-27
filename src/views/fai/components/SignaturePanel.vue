<template>
  <el-dialog v-model="visible" title="电子签名" width="480px" @closed="onClosed">
    <el-alert type="info" :closable="false" class="tip">
      电子签名将写入独立合规表 fai_signature，仅存储 SHA-256 摘要，不留存明文。
    </el-alert>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="84px" class="sign-form">
      <el-form-item label="签名人">
        <el-input :model-value="signerName" disabled />
      </el-form-item>
      <el-form-item label="签名类型" prop="signType">
        <el-select v-model="form.signType" placeholder="请选择" style="width: 100%">
          <el-option label="检验签" value="检验签" />
          <el-option label="审核签" value="审核签" />
        </el-select>
      </el-form-item>
      <el-form-item label="密码确认" prop="password">
        <el-input v-model="form.password" type="password" show-password placeholder="请输入登录密码确认" />
      </el-form-item>
      <el-form-item label="签名原因" prop="signReason">
        <el-input v-model="form.signReason" type="textarea" :rows="2" placeholder="请输入签名原因" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">确认签名</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useFaiStore } from '@/stores/fai'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ modelValue: boolean; inspectionId: number }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  signed: []
}>()

const store = useFaiStore()
const auth = useAuthStore()
const formRef = ref<FormInstance>()
const submitting = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const signerName = computed(() => auth.user?.realName || auth.user?.account || '')

const form = reactive({
  signType: '检验签',
  password: '',
  signReason: '',
})

const rules: FormRules = {
  signType: [{ required: true, message: '请选择签名类型', trigger: 'change' }],
  password: [{ required: true, message: '请输入密码确认', trigger: 'blur' }],
  signReason: [{ required: true, message: '请输入签名原因', trigger: 'blur' }],
}

function onClosed() {
  form.password = ''
  form.signReason = ''
  form.signType = '检验签'
  formRef.value?.clearValidate()
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await store.submitSignature(props.inspectionId, {
        faiRecordId: props.inspectionId,
        signerId: String(auth.user?.userId || auth.user?.account || ''),
        signerName: signerName.value,
        signType: form.signType,
        signReason: form.signReason,
        password: form.password,
      })
      ElMessage.success('电子签名成功')
      emit('signed')
      visible.value = false
    } finally {
      submitting.value = false
    }
  })
}
</script>

<style scoped>
.tip {
  margin-bottom: 14px;
}
.sign-form {
  margin-top: 4px;
}
</style>

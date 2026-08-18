<template>
  <el-dialog
    v-model="visible"
    title="新建供应商物料变更申请"
    width="720px"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="resetForm"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      class="change-form"
    >
      <el-divider content-position="left">基础信息</el-divider>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="供应商" prop="supplierCode">
            <el-select
              v-model="form.supplierCode"
              filterable
              placeholder="搜索选择供应商"
              style="width: 100%"
              @change="onSupplierChange"
            >
              <el-option
                v-for="s in suppliers"
                :key="s.id"
                :label="`${s.supplierName}（${s.supplierCode}）`"
                :value="s.supplierCode"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="供应商名称">
            <el-input v-model="form.supplierName" placeholder="随供应商自动带出" disabled />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="物料编码" prop="materialCode">
            <el-input v-model="form.materialCode" placeholder="请输入物料编码" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="物料名称" prop="materialName">
            <el-input v-model="form.materialName" placeholder="请输入物料名称" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="变更类型" prop="changeType">
        <el-radio-group v-model="form.changeType">
          <el-radio-button value="SPEC">规格变更</el-radio-button>
          <el-radio-button value="PROCESS">工艺变更</el-radio-button>
          <el-radio-button value="ORIGIN">产地变更</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-divider content-position="left">变更评估</el-divider>
      <el-form-item label="变更说明" prop="changeDesc">
        <el-input
          v-model="form.changeDesc"
          type="textarea"
          :rows="3"
          placeholder="请描述变更内容及原因"
        />
      </el-form-item>
      <el-form-item label="验证报告">
        <el-input
          v-model="form.validationReport"
          type="textarea"
          :rows="2"
          placeholder="验证方案、验证结果及结论（可选）"
        />
      </el-form-item>
      <el-form-item label="风险评估">
        <el-input
          v-model="form.riskAssessment"
          type="textarea"
          :rows="2"
          placeholder="变更对质量/工艺/交付的影响评估（可选）"
        />
      </el-form-item>

      <el-divider content-position="left">加严检验配置</el-divider>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="加严子组样本数">
            <el-input-number v-model="form.tightenedSubgroupSize" :min="1" :max="50" style="width: 100%" />
            <div class="field-tip">批准后按此样本数执行首批加严检验</div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联动 SPC">
            <el-switch v-model="form.spcEnabled" active-text="是" inactive-text="否" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">联合审批人</el-divider>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="质量" label-width="60px" prop="qualityApproverId">
            <el-select v-model="form.qualityApproverId" filterable placeholder="质量审批人" style="width: 100%">
              <el-option v-for="u in approvers" :key="u.id" :label="u.realName" :value="u.id" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="采购" label-width="60px" prop="purchaseApproverId">
            <el-select v-model="form.purchaseApproverId" filterable placeholder="采购审批人" style="width: 100%">
              <el-option v-for="u in approvers" :key="u.id" :label="u.realName" :value="u.id" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="研发" label-width="60px" prop="rdApproverId">
            <el-select v-model="form.rdApproverId" filterable placeholder="研发审批人" style="width: 100%">
              <el-option v-for="u in approvers" :key="u.id" :label="u.realName" :value="u.id" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="提交后自动生成质量/采购/研发三角色并行会签，全部通过才生效，任一驳回即整体驳回。"
      />
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">提交申请</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { getSupplierListApi, type Supplier } from '@/api/supplier'
import { getAdminUsers } from '@/api/admin'
import type { AdminUser } from '@/types'
import { createChangeApi, type ChangeCreateParams } from '@/api/supplierMaterialChange'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'created'): void }>()

const auth = useAuthStore()
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const formRef = ref<FormInstance>()
const submitting = ref(false)
const suppliers = ref<Supplier[]>([])
const approvers = ref<AdminUser[]>([])

const form = reactive({
  supplierCode: '',
  supplierName: '',
  materialCode: '',
  materialName: '',
  changeType: 'SPEC',
  changeDesc: '',
  validationReport: '',
  riskAssessment: '',
  tightenedSubgroupSize: 5 as number | undefined,
  spcEnabled: true,
  qualityApproverId: undefined as number | undefined,
  purchaseApproverId: undefined as number | undefined,
  rdApproverId: undefined as number | undefined,
})

const rules: FormRules = {
  supplierCode: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  materialCode: [{ required: true, message: '请输入物料编码', trigger: 'blur' }],
  materialName: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
  changeType: [{ required: true, message: '请选择变更类型', trigger: 'change' }],
  changeDesc: [{ required: true, message: '请输入变更说明', trigger: 'blur' }],
  qualityApproverId: [{ required: true, message: '请选择质量审批人', trigger: 'change' }],
  purchaseApproverId: [{ required: true, message: '请选择采购审批人', trigger: 'change' }],
  rdApproverId: [{ required: true, message: '请选择研发审批人', trigger: 'change' }],
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) loadOptions()
  },
)

async function loadOptions() {
  try {
    const [supRes, userRes] = await Promise.all([getSupplierListApi({ page: 1, size: 500 }), getAdminUsers()])
    if (supRes.code === 0) suppliers.value = supRes.data?.list ?? []
    if (userRes.code === 0) {
      approvers.value = (userRes.data ?? []).filter(
        (u) => u.status === 1 && u.plantCode === auth.user?.plantCode,
      )
    }
  } catch (e) {
    console.error('加载下拉数据失败', e)
  }
}

function onSupplierChange(code: string) {
  const s = suppliers.value.find((x) => x.supplierCode === code)
  form.supplierName = s?.supplierName ?? ''
}

function resetForm() {
  formRef.value?.resetFields()
  Object.assign(form, {
    supplierCode: '',
    supplierName: '',
    materialCode: '',
    materialName: '',
    changeType: 'SPEC',
    changeDesc: '',
    validationReport: '',
    riskAssessment: '',
    tightenedSubgroupSize: 5,
    spcEnabled: true,
    qualityApproverId: undefined,
    purchaseApproverId: undefined,
    rdApproverId: undefined,
  })
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const payload: ChangeCreateParams = {
      supplierCode: form.supplierCode,
      supplierName: form.supplierName,
      materialCode: form.materialCode,
      materialName: form.materialName,
      changeType: form.changeType,
      changeDesc: form.changeDesc,
      validationReport: form.validationReport,
      riskAssessment: form.riskAssessment,
      tightenedSubgroupSize: form.tightenedSubgroupSize,
      spcEnabled: form.spcEnabled,
      qualityApproverId: form.qualityApproverId!,
      purchaseApproverId: form.purchaseApproverId!,
      rdApproverId: form.rdApproverId!,
    }
    const res = await createChangeApi(payload)
    if (res.code === 0) {
      ElMessage.success('变更申请已提交')
      visible.value = false
      emit('created')
    } else {
      ElMessage.error(res.message || '提交失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.change-form :deep(.el-divider__text) {
  font-weight: 600;
  color: #163c5b;
}
.field-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  margin-top: 4px;
}
</style>

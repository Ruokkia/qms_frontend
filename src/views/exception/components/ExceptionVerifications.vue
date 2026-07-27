<template>
  <div class="verifications-panel">
    <div class="panel-header">
      <span class="panel-title">验证记录</span>
      <el-button v-if="!readonly" type="primary" size="small" @click="openForm()">新增验证</el-button>
    </div>

    <el-table :data="records" size="small" stripe class="verify-table">
      <el-table-column type="index" label="序号" width="55" align="center" />
      <el-table-column prop="verifyType" label="验证方式" width="100" />
      <el-table-column prop="result" label="结果" width="80" align="center">
        <template #default="{ row }">
          <span class="result-tag" :style="{ color: resultColor(row.result), background: resultColor(row.result) + '18', borderColor: resultColor(row.result) + '40' }">
            {{ row.result }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="verifierName" label="验证人" width="90" />
      <el-table-column prop="verifyDate" label="验证日期" width="110" />
      <el-table-column prop="evidence" label="验证证据" min-width="120" show-overflow-tooltip />
      <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      <el-table-column v-if="!readonly" label="操作" width="140" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openForm(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑验证' : '新增验证'" width="500">
      <el-form :model="form" label-width="80px">
        <el-form-item label="验证方式">
          <el-select v-model="form.verifyType" placeholder="请选择" style="width: 100%">
            <el-option label="供应商自证" value="供应商自证" />
            <el-option label="内部确认" value="内部确认" />
            <el-option label="连续N批" value="连续N批" />
          </el-select>
        </el-form-item>
        <el-form-item label="验证结果">
          <el-radio-group v-model="form.result">
            <el-radio-button value="通过">通过</el-radio-button>
            <el-radio-button value="不通过">不通过</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="验证人">
          <el-input v-model="form.verifierName" placeholder="请输入验证人姓名" />
        </el-form-item>
        <el-form-item label="验证人ID">
          <el-input-number v-model="form.verifierId" :min="1" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="验证日期">
          <el-date-picker v-model="form.verifyDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="验证证据">
          <el-input v-model="form.evidence" type="textarea" :rows="2" placeholder="附件链接或描述" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// ===== M2: 验证记录管理组件 =====
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createVerificationRecordApi,
  updateVerificationRecordApi,
  deleteVerificationRecordApi,
} from '@/api/verification-record'
import { VERIFY_RESULT_COLORS } from '@/enums/exception'
import type { VerificationRecord } from '@/types/exception'

const props = defineProps<{
  exceptionId: number
  records: VerificationRecord[]
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'changed'): void
}>()

const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)

const defaultForm = {
  id: undefined as number | undefined,
  exceptionId: props.exceptionId,
  verifyType: '内部确认',
  result: '通过' as string,
  verifierId: undefined as number | undefined,
  verifierName: '',
  verifyDate: '',
  evidence: '',
  remark: '',
}

const form = ref({ ...defaultForm })


function openForm(row?: VerificationRecord) {
  isEdit.value = !!row
  if (row) {
    form.value = {
      id: row.id,
      exceptionId: props.exceptionId,
      verifyType: row.verifyType,
      result: row.result as '通过' | '不通过',
      verifierId: row.verifierId,
      verifierName: row.verifierName || '',
      verifyDate: row.verifyDate || '',
      evidence: row.evidence || '',
      remark: row.remark || '',
    }
  } else {
    form.value = { ...defaultForm, exceptionId: props.exceptionId }
  }
  dialogVisible.value = true
}

async function submit() {
  if (!form.value.verifyType) {
    ElMessage.warning('请选择验证方式')
    return
  }
  submitLoading.value = true
  try {
    const payload = { ...form.value }
    let res
    if (isEdit.value) {
      res = await updateVerificationRecordApi(payload.id!, payload)
    } else {
      res = await createVerificationRecordApi(payload)
    }
    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
      dialogVisible.value = false
      emit('changed')
    }
  } catch (e) {
    console.error('保存验证记录失败', e)
  } finally {
    submitLoading.value = false
  }
}

async function remove(row: VerificationRecord) {
  try {
    await ElMessageBox.confirm('确认删除该验证记录？', '提示', { type: 'warning' })
    const res = await deleteVerificationRecordApi(row.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      emit('changed')
    }
  } catch (e) {
    if (e !== 'cancel') console.error('删除验证记录失败', e)
  }
}

function resultColor(v: string) {
  return VERIFY_RESULT_COLORS[v] || '#8C9BA8'
}
</script>

<style scoped>
.verifications-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5b;
}
.result-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid;
}
</style>

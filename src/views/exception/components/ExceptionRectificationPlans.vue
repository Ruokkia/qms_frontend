<template>
  <div class="plans-panel">
    <div class="panel-header">
      <span class="panel-title">整改计划</span>
      <el-button v-if="!readonly" type="primary" size="small" @click="openForm()">新增计划</el-button>
    </div>

    <el-table :data="plans" size="small" stripe class="plan-table">
      <el-table-column prop="planNo" label="计划编号" width="110" />
      <el-table-column prop="planName" label="计划名称" min-width="140" show-overflow-tooltip />
      <el-table-column prop="objective" label="整改目标" min-width="160" show-overflow-tooltip />
      <el-table-column prop="ownerName" label="负责人" width="90" />
      <el-table-column label="计划周期" width="190">
        <template #default="{ row }">
          {{ row.planStartDate || '-' }} ~ {{ row.planEndDate || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <span class="status-tag" :style="{ color: statusColor(row.status), background: statusColor(row.status) + '18', borderColor: statusColor(row.status) + '40' }">
            {{ row.status }}
          </span>
        </template>
      </el-table-column>
      <el-table-column v-if="!readonly" label="操作" width="140" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openForm(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <span class="empty-tip">暂无整改计划，点击「新增计划」录入整体整改安排</span>
      </template>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑整改计划' : '新增整改计划'" width="520">
      <el-form :model="form" label-width="80px">
        <el-form-item label="计划名称">
          <el-input v-model="form.planName" placeholder="如：供应商来料不良整改计划" />
        </el-form-item>
        <el-form-item label="整改目标">
          <el-input v-model="form.objective" type="textarea" :rows="2" placeholder="请输入整改目标" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="form.ownerName" placeholder="请输入负责人姓名" />
        </el-form-item>
        <el-form-item label="负责人ID">
          <el-input-number v-model="form.ownerId" :min="1" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="计划开始">
          <el-date-picker v-model="form.planStartDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="计划结束">
          <el-date-picker v-model="form.planEndDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio-button value="待执行">待执行</el-radio-button>
            <el-radio-button value="执行中">执行中</el-radio-button>
            <el-radio-button value="已完成">已完成</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="可选" />
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
// ===== M2: 整改计划管理组件（与改善措施区分的独立对象） =====
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createRectificationPlanApi,
  updateRectificationPlanApi,
  deleteRectificationPlanApi,
} from '@/api/rectification-plan'
import { RECTIFICATION_PLAN_STATUS_COLORS } from '@/enums/exception'
import type { RectificationPlan } from '@/types/exception'

const props = defineProps<{
  exceptionId: number
  plans: RectificationPlan[]
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
  planNo: '',
  planName: '',
  objective: '',
  ownerId: undefined as number | undefined,
  ownerName: '',
  planStartDate: '',
  planEndDate: '',
  status: '待执行' as string,
  remark: '',
}

const form = ref({ ...defaultForm })

function openForm(row?: RectificationPlan) {
  isEdit.value = !!row
  if (row) {
    form.value = {
      id: row.id,
      exceptionId: props.exceptionId,
      planNo: row.planNo || '',
      planName: row.planName,
      objective: row.objective || '',
      ownerId: row.ownerId,
      ownerName: row.ownerName || '',
      planStartDate: row.planStartDate || '',
      planEndDate: row.planEndDate || '',
      status: row.status as string,
      remark: row.remark || '',
    }
  } else {
    form.value = { ...defaultForm, exceptionId: props.exceptionId }
  }
  dialogVisible.value = true
}

async function submit() {
  if (!form.value.planName.trim()) {
    ElMessage.warning('请输入计划名称')
    return
  }
  submitLoading.value = true
  try {
    const payload = { ...form.value }
    let res
    if (isEdit.value && payload.id) {
      res = await updateRectificationPlanApi(payload.id, payload)
    } else {
      res = await createRectificationPlanApi(payload)
    }
    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
      dialogVisible.value = false
      emit('changed')
    }
  } catch (e) {
    console.error('保存整改计划失败', e)
  } finally {
    submitLoading.value = false
  }
}

async function remove(row: RectificationPlan) {
  try {
    await ElMessageBox.confirm('确认删除该整改计划？', '提示', { type: 'warning' })
    const res = await deleteRectificationPlanApi(row.id!)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      emit('changed')
    }
  } catch (e) {
    if (e !== 'cancel') console.error('删除整改计划失败', e)
  }
}

function statusColor(v: string) {
  return RECTIFICATION_PLAN_STATUS_COLORS[v] || '#8C9BA8'
}
</script>

<style scoped>
.plans-panel {
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
.status-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid;
}
.empty-tip {
  font-size: 12px;
  color: #8c9ba8;
}
</style>

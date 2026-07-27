<template>
  <div class="actions-panel">
    <div class="panel-header">
      <span class="panel-title">改善措施</span>
      <el-button v-if="!readonly" type="primary" size="small" @click="openForm()">新增措施</el-button>
    </div>

    <el-table :data="actions" size="small" stripe class="action-table">
      <el-table-column type="index" label="序号" width="55" align="center" />
      <el-table-column label="类型" width="90" align="center">
        <template #default="{ row }">
          <span class="type-tag" :style="{ color: typeColor(row.actionType), background: typeColor(row.actionType) + '18', borderColor: typeColor(row.actionType) + '40' }">
            {{ row.actionType }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="措施内容" min-width="160" show-overflow-tooltip />
      <el-table-column prop="ownerName" label="负责人" width="90" />
      <el-table-column prop="dueDate" label="截止日" width="100" />
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <span class="status-tag" :style="{ color: statusColor(row.status), background: statusColor(row.status) + '18', borderColor: statusColor(row.status) + '40' }">
            {{ row.status === 'DONE' ? '已完成' : '进行中' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="completedAt" label="完成时间" width="140" />
      <el-table-column v-if="!readonly" label="操作" width="140" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openForm(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑措施' : '新增措施'" width="500">
      <el-form :model="form" label-width="80px">
        <el-form-item label="措施类型">
          <el-select v-model="form.actionType" placeholder="请选择" style="width: 100%">
            <el-option label="临时措施" value="临时措施" />
            <el-option label="纠正措施" value="纠正措施" />
            <el-option label="预防措施" value="预防措施" />
          </el-select>
        </el-form-item>
        <el-form-item label="措施内容">
          <el-input v-model="form.content" type="textarea" :rows="3" placeholder="请输入措施内容" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="form.ownerName" placeholder="请输入负责人姓名" />
        </el-form-item>
        <el-form-item label="负责人ID">
          <el-input-number v-model="form.ownerId" :min="1" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="截止日">
          <el-date-picker v-model="form.dueDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio-button value="PENDING">进行中</el-radio-button>
            <el-radio-button value="DONE">已完成</el-radio-button>
          </el-radio-group>
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
// ===== M2: 改善措施管理组件 =====
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createImprovementActionApi,
  updateImprovementActionApi,
  deleteImprovementActionApi,
} from '@/api/improvement-action'
import { ACTION_TYPE_COLORS, ACTION_STATUS_COLORS } from '@/enums/exception'
import type { ImprovementAction } from '@/types/exception'

const props = defineProps<{
  exceptionId: number
  actions: ImprovementAction[]
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
  actionType: '纠正措施',
  content: '',
  ownerId: undefined as number | undefined,
  ownerName: '',
  dueDate: '',
  status: 'PENDING' as string,
  completedAt: undefined as string | undefined,
}

const form = ref({ ...defaultForm })


function openForm(row?: ImprovementAction) {
  isEdit.value = !!row
  if (row) {
    form.value = {
      id: row.id,
      exceptionId: props.exceptionId,
      actionType: row.actionType,
      content: row.content,
      ownerId: row.ownerId,
      ownerName: row.ownerName || '',
      dueDate: row.dueDate || '',
      status: row.status as 'PENDING' | 'DONE',
      completedAt: row.completedAt,
    }
  } else {
    form.value = { ...defaultForm, exceptionId: props.exceptionId }
  }
  dialogVisible.value = true
}

async function submit() {
  if (!form.value.content.trim()) {
    ElMessage.warning('请输入措施内容')
    return
  }
  submitLoading.value = true
  try {
    const payload = { ...form.value }
    if (payload.status === 'DONE' && !payload.completedAt) {
      payload.completedAt = new Date().toISOString().slice(0, 19)
    }
    let res
    if (isEdit.value) {
      res = await updateImprovementActionApi(payload.id!, payload)
    } else {
      res = await createImprovementActionApi(payload)
    }
    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
      dialogVisible.value = false
      emit('changed')
    }
  } catch (e) {
    console.error('保存措施失败', e)
  } finally {
    submitLoading.value = false
  }
}

async function remove(row: ImprovementAction) {
  try {
    await ElMessageBox.confirm('确认删除该改善措施？', '提示', { type: 'warning' })
    const res = await deleteImprovementActionApi(row.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      emit('changed')
    }
  } catch (e) {
    if (e !== 'cancel') console.error('删除措施失败', e)
  }
}

function typeColor(v: string) {
  return ACTION_TYPE_COLORS[v] || '#8C9BA8'
}
function statusColor(v: string) {
  return ACTION_STATUS_COLORS[v] || '#8C9BA8'
}
</script>

<style scoped>
.actions-panel {
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
.type-tag,
.status-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid;
}
</style>

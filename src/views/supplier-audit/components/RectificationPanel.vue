<template>
  <div class="rectify-panel">
    <div class="toolbar">
      <el-select v-model="status" placeholder="状态" clearable style="width: 140px" @change="loadFindings">
        <el-option label="待整改" value="待整改" />
        <el-option label="整改中" value="整改中" />
        <el-option label="待验证" value="待验证" />
        <el-option label="已闭环" value="已闭环" />
      </el-select>
      <el-input
        v-model="keyword"
        placeholder="供应商/问题"
        clearable
        style="width: 220px"
        @keyup.enter="loadFindings"
        @clear="loadFindings"
      />
      <el-button @click="loadFindings">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="supplierName" label="供应商" width="150" />
      <el-table-column prop="level" label="级别" width="90">
        <template #default="{ row }">
          <el-tag :type="levelType(row.level)">{{ row.level }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="问题" min-width="200" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === '待整改' || row.status === '整改中'"
            link
            type="primary"
            @click="openRectify(row)"
          >整改</el-button>
          <el-button
            v-if="row.status === '待验证'"
            link
            type="success"
            @click="openVerify(row)"
          >验证</el-button>
          <span v-if="row.status === '已闭环'" class="done">已闭环</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="size"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      @current-change="loadFindings"
      @size-change="loadFindings"
    />

    <el-dialog v-model="rectifyVisible" title="提交整改措施" width="560px">
      <el-form :model="rectifyForm" label-width="90px">
        <el-form-item label="整改措施" required>
          <el-input v-model="rectifyForm.measure" type="textarea" :rows="3" placeholder="整改措施说明" />
        </el-form-item>
        <el-form-item label="责任人">
          <el-input v-model="rectifyForm.owner" placeholder="整改责任人" />
        </el-form-item>
        <el-form-item label="完成期限">
          <el-date-picker v-model="rectifyForm.dueDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rectifyVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitRectify">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="verifyVisible" title="验证结果" width="560px">
      <el-form :model="verifyForm" label-width="90px">
        <el-form-item label="验证结果" required>
          <el-input v-model="verifyForm.verifyResult" type="textarea" :rows="3" placeholder="验证结论" />
        </el-form-item>
        <el-form-item label="验证人">
          <el-input v-model="verifyForm.verifiedBy" placeholder="验证人" />
        </el-form-item>
        <el-form-item label="闭环结论">
          <el-radio-group v-model="verifyPassed">
            <el-radio :value="true">通过（闭环）</el-radio>
            <el-radio :value="false">不通过（退回整改）</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verifyVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitVerify">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  listFindingsApi,
  rectifyApi,
  verifyApi,
  type SupplierAuditFinding,
} from '@/api/supplier-audit'

const loading = ref(false)
const rows = ref<SupplierAuditFinding[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const status = ref('')
const keyword = ref('')

const rectifyVisible = ref(false)
const verifyVisible = ref(false)
const saving = ref(false)
const currentId = ref<number | null>(null)
const verifyPassed = ref(true)

const rectifyForm = reactive({ measure: '', owner: '', dueDate: '' })
const verifyForm = reactive({ verifyResult: '', verifiedBy: '' })

function levelType(l?: string) {
  if (l === '严重') return 'danger'
  if (l === '一般') return 'warning'
  return 'info'
}
function statusType(s?: string) {
  if (s === '已闭环') return 'success'
  if (s === '待验证') return 'warning'
  if (s === '整改中') return 'primary'
  return 'info'
}

async function loadFindings() {
  loading.value = true
  try {
    const res = await listFindingsApi({
      page: page.value,
      size: size.value,
      status: status.value || undefined,
      keyword: keyword.value || undefined,
    })
    if (res.code === 0 && res.data) {
      rows.value = res.data.list
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

function openRectify(row: SupplierAuditFinding) {
  currentId.value = row.id
  rectifyForm.measure = ''
  rectifyForm.owner = ''
  rectifyForm.dueDate = ''
  rectifyVisible.value = true
}

function openVerify(row: SupplierAuditFinding) {
  currentId.value = row.id
  verifyForm.verifyResult = ''
  verifyForm.verifiedBy = ''
  verifyPassed.value = true
  verifyVisible.value = true
}

async function submitRectify() {
  if (!rectifyForm.measure) {
    ElMessage.warning('请填写整改措施')
    return
  }
  saving.value = true
  try {
    const res = await rectifyApi(currentId.value!, { ...rectifyForm })
    if (res.code === 0) {
      ElMessage.success('整改已提交，已通知责任人')
      rectifyVisible.value = false
      loadFindings()
    }
  } finally {
    saving.value = false
  }
}

async function submitVerify() {
  if (!verifyForm.verifyResult) {
    ElMessage.warning('请填写验证结果')
    return
  }
  saving.value = true
  try {
    const res = await verifyApi(currentId.value!, {
      ...verifyForm,
      verifyResult: verifyPassed.value ? `通过：${verifyForm.verifyResult}` : `不通过：${verifyForm.verifyResult}`,
    })
    if (res.code === 0) {
      ElMessage.success(verifyPassed.value ? '验证通过，已闭环' : '已退回整改')
      verifyVisible.value = false
      loadFindings()
    }
  } finally {
    saving.value = false
  }
}

onMounted(loadFindings)
</script>

<style scoped>
.rectify-panel { padding: 8px 0; }
.toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.el-pagination { margin-top: 12px; justify-content: flex-end; }
.done { color: #10b981; font-size: 13px; }
</style>

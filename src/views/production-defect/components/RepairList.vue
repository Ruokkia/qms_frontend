<template>
  <div class="repair-list">
    <div class="toolbar">
      <el-form :inline="true" @submit.prevent>
        <el-form-item label="关键字">
          <el-input v-model="kw" placeholder="维修编号/产品/工单" clearable style="width: 180px" @keyup.enter="reload" />
        </el-form-item>
        <el-form-item label="不良现象">
          <el-input v-model="pheno" placeholder="不良现象" clearable style="width: 150px" @keyup.enter="reload" />
        </el-form-item>
        <el-form-item label="工序">
          <el-input v-model="proc" placeholder="工序" clearable style="width: 130px" @keyup.enter="reload" />
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input v-model="pname" placeholder="产品名称" clearable style="width: 150px" @keyup.enter="reload" />
        </el-form-item>
        <el-form-item label="产品批号">
          <el-input v-model="pbatch" placeholder="产品批号/SN" clearable style="width: 150px" @keyup.enter="reload" />
        </el-form-item>
        <el-form-item label="产品编号">
          <el-input v-model="pno" placeholder="产品编号" clearable style="width: 150px" @keyup.enter="reload" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="reload">查询</el-button>
          <el-button @click="onResetFilter">重置</el-button>
        </el-form-item>
      </el-form>
      <div class="tool-actions">
        <el-button v-if="canEdit" type="primary" @click="openCreate">新增记录</el-button>
        <el-button v-if="canManage" type="success" @click="importVis = true">Excel 导入</el-button>
      </div>
    </div>

    <el-table :data="rows" border stripe size="small" v-loading="loading" empty-text="暂无维修记录">
      <el-table-column prop="repairNo" label="维修编号" width="160" show-overflow-tooltip>
        <template #default="{ row }"><span class="font-mono">{{ row.repairNo || '—' }}</span></template>
      </el-table-column>
      <el-table-column prop="productName" label="产品名称" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.productName || row.productNo || '—' }}</template>
      </el-table-column>
      <el-table-column prop="productBatchOrSn" label="产品批号/序列号" min-width="150" show-overflow-tooltip>
        <template #default="{ row }"><span class="font-mono">{{ row.productBatchOrSn || '—' }}</span></template>
      </el-table-column>
      <el-table-column prop="repairer" label="维修员" width="110" show-overflow-tooltip />
      <el-table-column prop="defectPhenomenon" label="不良现象" min-width="180" show-overflow-tooltip />
      <el-table-column label="维修状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.repairDone === 1 ? 'success' : 'info'" size="small" effect="light">
            {{ row.repairDone === 1 ? '已维修' : '未维修' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">详细</el-button>
          <el-button link type="primary" size="small" v-if="canEdit" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" v-if="canEdit" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pager"
      v-model:current-page="page"
      v-model:page-size="size"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      @current-change="reload"
      @size-change="reload"
    />

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="dialogVis"
      :title="editing ? '编辑维修记录' : '新增维修记录'"
      width="760px"
      @close="resetForm"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="维修编号" prop="repairNo">
              <el-input v-model="form.repairNo" :disabled="!!editing" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="不良数量" prop="defectQty">
              <el-input-number v-model="form.defectQty" :min="0.001" :step="1" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品编号">
              <el-input v-model="form.productNo" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品名称">
              <el-input v-model="form.productName" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格型号">
              <el-input v-model="form.specModel" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产工单">
              <el-input v-model="form.workOrderNo" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="批次/SN">
              <el-input v-model="form.productBatchOrSn" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工序" prop="process">
              <el-input v-model="form.process" placeholder="自然语言，如 老化测试" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="不良代码">
              <el-input v-model="form.defectCode" placeholder="不良代码（可空）" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="送修日期">
              <el-date-picker v-model="form.sendRepairDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="维修日期">
              <el-date-picker v-model="form.repairDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="维修状态">
              <el-input v-model="form.repairStatus" placeholder="自由文本，如 已审核" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="维修判定">
              <el-input v-model="form.repairJudgmentResult" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="送修人">
              <el-input v-model="form.sendRepairer" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="维修人">
              <el-input v-model="form.repairer" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="审核人">
              <el-input v-model="form.auditor" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="审核状态">
              <el-input v-model="form.auditStatus" placeholder="待审核/已审核" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="不良现象">
          <el-input v-model="form.defectPhenomenon" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="维修记录">
          <el-input v-model="form.repairRecord" type="textarea" :rows="2" placeholder="维修人填写" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVis = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>

    <ImportDialog v-model="importVis" @success="reload" />
    <RepairDetailDialog v-model="detailVis" :detail="current" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  getRepairsApi,
  createRepairApi,
  updateRepairApi,
  deleteRepairApi,
} from '@/api/production-defect'
import type {
  ProductionRepair,
  RepairSaveRequest,
} from '@/types/production-defect'
import ImportDialog from './ImportDialog.vue'
import RepairDetailDialog from './RepairDetailDialog.vue'

const auth = useAuthStore()
// 导入（批量）：仅 R04/R06
const canManage = auth.roleId === 'R04' || auth.roleId === 'R06'
// 维修记录 CRUD：模块查看者（R02/R03/R04/R06）均可操作
const canEdit = auth.hasModule('productionDefect')

const rows = ref<ProductionRepair[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const size = ref(20)
const kw = ref('')
const proc = ref('')
const pheno = ref('')
const pname = ref('')
const pbatch = ref('')
const pno = ref('')

async function reload() {
  loading.value = true
  try {
    const res = await getRepairsApi({
      page: page.value,
      size: size.value,
      keyword: kw.value || undefined,
      defectPhenomenon: pheno.value || undefined,
      process: proc.value || undefined,
      productName: pname.value || undefined,
      productBatchOrSn: pbatch.value || undefined,
      productNo: pno.value || undefined,
    })
    rows.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

function onResetFilter() {
  kw.value = ''
  pheno.value = ''
  proc.value = ''
  pname.value = ''
  pbatch.value = ''
  pno.value = ''
  page.value = 1
  reload()
}

// ---- 详情 ----
const detailVis = ref(false)
const current = ref<ProductionRepair | null>(null)
function openDetail(row: ProductionRepair) {
  current.value = row
  detailVis.value = true
}

// ---- 表单 ----
const dialogVis = ref(false)
const importVis = ref(false)
const editing = ref<ProductionRepair | null>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()

function emptyForm(): RepairSaveRequest {
  return {
    repairNo: '',
    productNo: '',
    productName: '',
    specModel: '',
    workOrderNo: '',
    productBatchOrSn: '',
    process: '',
    defectQty: 1,
    defectPhenomenon: '',
    defectCode: '',
    sendRepairDate: '',
    repairDate: '',
    repairStatus: '',
    repairJudgmentResult: '',
    repairRecord: '',
    sendRepairer: '',
    repairer: '',
    auditor: '',
    auditStatus: '',
    remark: '',
  }
}

const form = reactive<RepairSaveRequest>(emptyForm())

const rules: FormRules = {
  repairNo: [{ required: true, message: '请输入维修编号', trigger: 'blur' }],
  process: [{ required: true, message: '请输入工序', trigger: 'blur' }],
  defectQty: [{ required: true, message: '请输入不良数量', trigger: 'blur' }],
}

function openCreate() {
  editing.value = null
  Object.assign(form, emptyForm())
  dialogVis.value = true
}

function openEdit(row: ProductionRepair) {
  editing.value = row
  Object.assign(form, {
    repairNo: row.repairNo,
    productNo: row.productNo || '',
    productName: row.productName || '',
    specModel: row.specModel || '',
    workOrderNo: row.workOrderNo || '',
    productBatchOrSn: row.productBatchOrSn || '',
    process: row.process || '',
    defectQty: row.defectQty,
    defectPhenomenon: row.defectPhenomenon || '',
    defectCode: row.defectCode || '',
    sendRepairDate: row.sendRepairDate || '',
    repairDate: row.repairDate || '',
    repairStatus: row.repairStatus || '',
    repairJudgmentResult: row.repairJudgmentResult || '',
    repairRecord: row.repairRecord || '',
    sendRepairer: row.sendRepairer || '',
    repairer: row.repairer || '',
    auditor: row.auditor || '',
    auditStatus: row.auditStatus || '',
    remark: row.remark || '',
  })
  dialogVis.value = true
}

function resetForm() {
  Object.assign(form, emptyForm())
  formRef.value?.clearValidate()
}

async function onSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (ok) => {
    if (!ok) return
    saving.value = true
    try {
      if (editing.value) {
        await updateRepairApi(editing.value.id, { ...form })
        ElMessage.success('更新成功')
      } else {
        await createRepairApi({ ...form })
        ElMessage.success('新增成功')
      }
      dialogVis.value = false
      await reload()
    } finally {
      saving.value = false
    }
  })
}

async function onDelete(row: ProductionRepair) {
  try {
    await ElMessageBox.confirm(`确认删除维修记录「${row.repairNo}」？`, '提示', { type: 'warning' })
    await deleteRepairApi(row.id)
    ElMessage.success('删除成功')
    await reload()
  } catch {
    // 用户取消确认或请求失败，不做处理
  }
}

onMounted(() => {
  reload()
})
</script>

<style scoped>
.repair-list {
  padding: 4px 0;
}
.toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.tool-actions {
  display: flex;
  gap: 8px;
}
.pager {
  margin-top: 12px;
  justify-content: flex-end;
}
.font-mono {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}
</style>

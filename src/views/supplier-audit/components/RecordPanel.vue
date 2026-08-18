<template>
  <div class="record-panel">
    <div class="toolbar">
      <el-button type="primary" @click="openCreate">新建审核记录</el-button>
      <el-input
        v-model="keyword"
        placeholder="报告号/供应商"
        clearable
        style="width: 220px"
        @keyup.enter="loadRecords"
        @clear="loadRecords"
      />
      <el-button @click="loadRecords">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="reportNo" label="报告号" width="160" />
      <el-table-column prop="supplierName" label="供应商" min-width="160" />
      <el-table-column prop="auditDate" label="审核日期" width="130" />
      <el-table-column prop="auditor" label="审核人" width="100" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openReport(row)">查看报告</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="size"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      @current-change="loadRecords"
      @size-change="loadRecords"
    />

    <el-dialog v-model="createVisible" title="新建审核记录" width="640px">
      <el-alert
        v-if="extraRequirement"
        type="warning"
        :closable="false"
        show-icon
        class="extra-tip"
        title="高风险物料额外资料要求"
        :description="extraRequirement"
      />
      <el-form :model="form" label-width="90px">
        <el-form-item label="供应商" required>
          <el-select v-model="form.supplierId" filterable placeholder="选择供应商" style="width: 100%" @change="onSupplierChange">
            <el-option v-for="s in suppliers" :key="s.id" :label="`${s.supplierName}（${s.supplierCode}）`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="审核日期" required>
          <el-date-picker v-model="form.auditDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="审核人" required>
          <el-select
            v-model="form.auditor"
            filterable
            allow-create
            default-first-option
            placeholder="选择审核人"
            style="width: 100%"
          >
            <el-option
              v-for="a in auditors"
              :key="a.id"
              :label="a.realName || a.account"
              :value="a.realName || a.account"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="审核摘要">
          <el-input v-model="form.auditSummary" type="textarea" :rows="3" placeholder="现场审核情况摘要" />
        </el-form-item>
        <el-divider>不符合项</el-divider>
        <div v-for="(f, i) in form.findings" :key="i" class="finding-row">
          <el-select v-model="f.level" placeholder="级别" style="width: 110px">
            <el-option label="严重" value="严重" />
            <el-option label="一般" value="一般" />
            <el-option label="观察项" value="观察项" />
          </el-select>
          <el-input v-model="f.description" placeholder="问题描述" style="flex: 1" />
          <FileUpload v-model="f.photoUrls" :limit="4" />
          <el-button text type="danger" @click="form.findings.splice(i, 1)">删</el-button>
        </div>
        <el-button link type="primary" @click="addFinding">+ 添加不符合项</el-button>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reportVisible" title="供应商现场审核报告" width="680px">
      <div v-if="report" class="report">
        <p><b>报告号：</b>{{ report.record.reportNo }}</p>
        <p><b>供应商：</b>{{ report.record.supplierName }}（{{ report.record.supplierCode }}）</p>
        <p><b>审核日期：</b>{{ report.record.auditDate }}　<b>审核人：</b>{{ report.record.auditor }}</p>
        <p><b>摘要：</b>{{ report.record.auditSummary }}</p>
        <el-divider>不符合项清单</el-divider>
        <el-table :data="report.findings" border>
          <el-table-column prop="finding.level" label="级别" width="90">
            <template #default="{ row }">
              <el-tag :type="levelType(row.finding.level)">{{ row.finding.level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="finding.description" label="问题" min-width="180" />
          <el-table-column prop="measure" label="整改措施" min-width="140" />
          <el-table-column prop="owner" label="责任人" width="90" />
          <el-table-column label="闭环" width="80">
            <template #default="{ row }">
              <el-tag :type="row.closed ? 'success' : 'info'">{{ row.closed ? '已闭环' : '进行中' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  listRecordsApi,
  createRecordApi,
  getReportApi,
  listAuditorsApi,
  type SupplierAuditRecord,
  type SupplierAuditReport,
  type SupplierAuditAuditor,
} from '@/api/supplier-audit'
import { getSupplierListApi, type Supplier } from '@/api/supplier'
import { listSupplierHighRiskApi } from '@/api/supplier-high-risk'
import { useAuthStore } from '@/stores/auth'
import FileUpload from './FileUpload.vue'

const emit = defineEmits<{ (e: 'created'): void }>()

const props = defineProps<{ defaultSupplierId?: number }>()

const loading = ref(false)
const rows = ref<SupplierAuditRecord[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const keyword = ref('')
const suppliers = ref<Supplier[]>([])
const auditors = ref<SupplierAuditAuditor[]>([])
const authStore = useAuthStore()

const createVisible = ref(false)
const saving = ref(false)
const extraRequirement = ref<string | null>(null)
const form = reactive({
  supplierId: undefined as number | undefined,
  auditDate: '',
  auditor: '',
  auditSummary: '',
  findings: [] as { level: string; description: string; photoUrls: string[] }[],
})

const reportVisible = ref(false)
const report = ref<SupplierAuditReport | null>(null)

function levelType(l?: string) {
  if (l === '严重') return 'danger'
  if (l === '一般') return 'warning'
  return 'info'
}

async function loadRecords() {
  loading.value = true
  try {
    const res = await listRecordsApi({
      page: page.value,
      size: size.value,
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

function addFinding() {
  form.findings.push({ level: '一般', description: '', photoUrls: [] })
}

async function loadExtraRequirement(supplierId?: number) {
  if (!supplierId) {
    extraRequirement.value = null
    return
  }
  const res = await listSupplierHighRiskApi(supplierId)
  const items = res.data ?? []
  if (items.length === 0) {
    extraRequirement.value = null
    return
  }
  extraRequirement.value = items.map((i) => `【${i.materialName}】${i.extraRequirement}`).join('\n')
}

function onSupplierChange(val: number) {
  loadExtraRequirement(val)
}

function openCreate() {
  if (props.defaultSupplierId && suppliers.value.some((s) => s.id === props.defaultSupplierId)) {
    form.supplierId = props.defaultSupplierId
  } else {
    form.supplierId = undefined
  }
  form.auditDate = ''
  form.auditSummary = ''
  form.findings = []
  // 默认带出当前登录用户作为审核人
  form.auditor = authStore.user?.realName || authStore.user?.account || ''
  extraRequirement.value = null
  if (form.supplierId) {
    void loadExtraRequirement(form.supplierId)
  }
  createVisible.value = true
}

async function submit() {
  if (!form.supplierId) {
    ElMessage.warning('请选择供应商')
    return
  }
  if (!form.auditDate) {
    ElMessage.warning('请选择审核日期')
    return
  }
  if (!form.auditor) {
    ElMessage.warning('请选择审核人')
    return
  }
  saving.value = true
  try {
    const res = await createRecordApi({
      supplierId: form.supplierId,
      auditDate: form.auditDate,
      auditor: form.auditor,
      auditSummary: form.auditSummary,
      findings: form.findings.map((f) => ({
        level: f.level,
        description: f.description,
        photoUrls: f.photoUrls,
      })),
    })
    if (res.code === 0) {
      ElMessage.success('审核记录已保存')
      createVisible.value = false
      emit('created')
      loadRecords()
    }
  } finally {
    saving.value = false
  }
}

async function openReport(row: SupplierAuditRecord) {
  const res = await getReportApi(row.id)
  if (res.code === 0 && res.data) {
    report.value = res.data
    reportVisible.value = true
  }
}

onMounted(async () => {
  loadRecords()
  const sup = await getSupplierListApi({ page: 1, size: 200 })
  suppliers.value = sup.data?.list ?? []
  const aud = await listAuditorsApi()
  auditors.value = aud.data ?? []
})
</script>

<style scoped>
.record-panel { padding: 8px 0; }
.toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.finding-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.el-pagination { margin-top: 12px; justify-content: flex-end; }
.report p { margin: 4px 0; color: #374151; }
</style>

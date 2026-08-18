<template>
  <div class="audit-linkage">
    <div class="linkage-toolbar">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="本视图按所选供应商联动展示其审核计划 / 审核记录 / 不符合项。"
      />
      <el-button type="primary" @click="goModule">前往现场审核模块</el-button>
    </div>

    <!-- 审核计划 -->
    <section class="block">
      <div class="block-head">
        <span class="block-title">审核计划</span>
        <span class="block-count">共 {{ planTotal }} 条</span>
      </div>
      <el-table :data="plans" border stripe size="small" v-loading="loadingPlans">
        <el-table-column prop="auditType" label="类型" width="90" />
        <el-table-column prop="planYear" label="年度" width="80" />
        <el-table-column prop="frequency" label="频次" width="100" />
        <el-table-column prop="plannedDate" label="计划日期" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="planStatusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="auditor" label="审核人" width="100" />
      </el-table>
      <el-empty v-if="!loadingPlans && plans.length === 0" description="暂无审核计划" :image-size="60" />
    </section>

    <!-- 审核记录 -->
    <section class="block">
      <div class="block-head">
        <span class="block-title">审核记录</span>
        <span class="block-count">共 {{ recordTotal }} 条</span>
      </div>
      <el-table :data="records" border stripe size="small" v-loading="loadingRecords">
        <el-table-column prop="reportNo" label="报告号" width="170" />
        <el-table-column prop="auditDate" label="审核日期" width="120" />
        <el-table-column prop="auditor" label="审核人" width="100" />
        <el-table-column prop="auditSummary" label="摘要" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openReport(row)">查看报告</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loadingRecords && records.length === 0" description="暂无审核记录" :image-size="60" />
    </section>

    <!-- 不符合项 / 整改 -->
    <section class="block">
      <div class="block-head">
        <span class="block-title">不符合项 / 整改</span>
        <span class="block-count">共 {{ findingTotal }} 条</span>
      </div>
      <el-table :data="findings" border stripe size="small" v-loading="loadingFindings">
        <el-table-column label="级别" width="90">
          <template #default="{ row }">
            <el-tag :type="levelType(row.level)" size="small">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="问题描述" min-width="180" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="findingStatusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loadingFindings && findings.length === 0" description="暂无不符合项" :image-size="60" />
    </section>

    <el-dialog v-model="reportVisible" title="供应商现场审核报告" width="680px">
      <div v-if="report" class="report">
        <p><b>报告号：</b>{{ report.record.reportNo }}</p>
        <p><b>审核日期：</b>{{ report.record.auditDate }}　<b>审核人：</b>{{ report.record.auditor }}</p>
        <p><b>摘要：</b>{{ report.record.auditSummary }}</p>
        <el-divider>不符合项清单</el-divider>
        <el-table :data="report.findings" border size="small">
          <el-table-column label="级别" width="90">
            <template #default="{ row }">
              <el-tag :type="levelType(row.finding.level)" size="small">{{ row.finding.level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="finding.description" label="问题" min-width="160" />
          <el-table-column prop="measure" label="整改措施" min-width="120" />
          <el-table-column prop="owner" label="责任人" width="90" />
          <el-table-column label="闭环" width="80">
            <template #default="{ row }">
              <el-tag :type="row.closed ? 'success' : 'info'" size="small">{{ row.closed ? '已闭环' : '进行中' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  listPlansApi,
  listRecordsApi,
  listFindingsApi,
  getReportApi,
  type SupplierAuditPlan,
  type SupplierAuditRecord,
  type SupplierAuditFinding,
  type SupplierAuditReport,
} from '@/api/supplier-audit'

const props = defineProps<{ supplierId: number }>()
const router = useRouter()

const plans = ref<SupplierAuditPlan[]>([])
const records = ref<SupplierAuditRecord[]>([])
const findings = ref<SupplierAuditFinding[]>([])
const planTotal = ref(0)
const recordTotal = ref(0)
const findingTotal = ref(0)
const loadingPlans = ref(false)
const loadingRecords = ref(false)
const loadingFindings = ref(false)
const reportVisible = ref(false)
const report = ref<SupplierAuditReport | null>(null)

function planStatusType(s?: string) {
  if (s === '已完成') return 'success'
  if (s === '已排期') return 'warning'
  return 'info'
}
function levelType(l?: string) {
  if (l === '严重') return 'danger'
  if (l === '一般') return 'warning'
  return 'info'
}
function findingStatusType(s?: string) {
  if (s === '已闭环') return 'success'
  if (s === '待验证') return 'warning'
  if (s === '整改中') return 'primary'
  return 'info'
}

async function loadPlans() {
  loadingPlans.value = true
  try {
    const res = await listPlansApi({ page: 1, size: 50, supplierId: props.supplierId })
    if (res.code === 0 && res.data) {
      plans.value = res.data.list
      planTotal.value = res.data.total
    }
  } finally {
    loadingPlans.value = false
  }
}
async function loadRecords() {
  loadingRecords.value = true
  try {
    const res = await listRecordsApi({ page: 1, size: 50, supplierId: props.supplierId })
    if (res.code === 0 && res.data) {
      records.value = res.data.list
      recordTotal.value = res.data.total
    }
  } finally {
    loadingRecords.value = false
  }
}
async function loadFindings() {
  loadingFindings.value = true
  try {
    const res = await listFindingsApi({ page: 1, size: 50, supplierId: props.supplierId })
    if (res.code === 0 && res.data) {
      findings.value = res.data.list
      findingTotal.value = res.data.total
    }
  } finally {
    loadingFindings.value = false
  }
}

async function openReport(row: SupplierAuditRecord) {
  const res = await getReportApi(row.id)
  if (res.code === 0 && res.data) {
    report.value = res.data
    reportVisible.value = true
  }
}

function goModule() {
  router.push({ path: '/supplier-audit', query: { supplierId: String(props.supplierId) } })
}

watch(
  () => props.supplierId,
  () => {
    loadPlans()
    loadRecords()
    loadFindings()
  },
)

onMounted(() => {
  loadPlans()
  loadRecords()
  loadFindings()
})
</script>

<style scoped>
.audit-linkage { padding: 4px 0; }
.linkage-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.linkage-toolbar .el-alert { flex: 1; }
.block { margin-bottom: 18px; }
.block-head { display: flex; align-items: baseline; gap: 10px; margin: 6px 0; }
.block-title { font-size: 15px; font-weight: 600; color: #1f2937; }
.block-count { font-size: 13px; color: #6b7280; }
.report p { margin: 4px 0; color: #374151; }
</style>

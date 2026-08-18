<template>
  <div class="change-list">
    <div class="toolbar">
      <template v-if="mode === 'all'">
        <el-button type="primary" @click="formVisible = true">新建变更申请</el-button>
        <el-input
          v-model="keyword"
          placeholder="单号 / 供应商 / 物料"
          clearable
          style="width: 220px"
          @keyup.enter="reload"
          @clear="reload"
        />
        <el-select v-model="status" placeholder="状态" clearable style="width: 130px" @change="reload">
          <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
        <el-select v-model="changeType" placeholder="变更类型" clearable style="width: 130px" @change="reload">
          <el-option label="规格变更" value="SPEC" />
          <el-option label="工艺变更" value="PROCESS" />
          <el-option label="产地变更" value="ORIGIN" />
        </el-select>
        <el-button @click="reload">查询</el-button>
      </template>
      <div v-else class="mine-tip">
        待我审批的变更申请（质量 / 采购 / 研发）
      </div>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe class="change-table">
      <el-table-column label="变更单号" width="195">
        <template #default="{ row }">
          <span class="change-no">{{ row.change.changeNo }}</span>
        </template>
      </el-table-column>
      <el-table-column label="供应商" min-width="150">
        <template #default="{ row }">{{ row.change.supplierName }}</template>
      </el-table-column>
      <el-table-column label="物料" min-width="140">
        <template #default="{ row }">{{ row.change.materialName }}</template>
      </el-table-column>
      <el-table-column label="变更类型" width="95">
        <template #default="{ row }">
          <span class="type-chip" :class="`type-${row.change.changeType?.toLowerCase()}`">
            {{ typeLabel(row.change.changeType) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusType(row.change.status)" effect="light" size="small">
            {{ statusLabel(row.change.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="申请人" width="90">
        <template #default="{ row }">{{ row.change.applicant || '-' }}</template>
      </el-table-column>
      <el-table-column label="申请时间" width="160">
        <template #default="{ row }">{{ formatTime(row.change.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button v-if="canApprove(row)" link type="success" @click="openDetail(row)">审批</el-button>
          <el-button v-if="canVoid(row)" link type="danger" @click="voidChange(row)">作废</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无数据" :image-size="80" />
      </template>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="load"
        @size-change="reload"
      />
    </div>

    <!-- 详情抽屉 -->
    <el-drawer v-model="drawerVisible" title="变更单详情" size="640px">
      <template v-if="current">
        <el-descriptions :column="2" border size="small" class="detail-desc">
          <el-descriptions-item label="变更单号" :span="2">{{ current.change.changeNo }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ current.change.supplierName }}</el-descriptions-item>
          <el-descriptions-item label="供应商编码">{{ current.change.supplierCode }}</el-descriptions-item>
          <el-descriptions-item label="物料">{{ current.change.materialName }}</el-descriptions-item>
          <el-descriptions-item label="物料编码">{{ current.change.materialCode }}</el-descriptions-item>
          <el-descriptions-item label="变更类型">{{ typeLabel(current.change.changeType) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(current.change.status)" size="small">{{ statusLabel(current.change.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请人">{{ current.change.applicant || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ formatTime(current.change.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <div class="section">
          <h4 class="section-title">变更说明</h4>
          <p class="section-body">{{ current.change.changeDesc || '—' }}</p>
        </div>
        <div class="section" v-if="current.change.validationReport">
          <h4 class="section-title">验证报告</h4>
          <p class="section-body">{{ current.change.validationReport }}</p>
        </div>
        <div class="section" v-if="current.change.riskAssessment">
          <h4 class="section-title">风险评估</h4>
          <p class="section-body">{{ current.change.riskAssessment }}</p>
        </div>
        <div class="section">
          <h4 class="section-title">加严检验配置</h4>
          <p class="section-body">
            加严子组样本数：<b>{{ current.change.tightenedSubgroupSize || '未配置' }}</b>
            ｜ 联动 SPC：{{ current.change.spcEnabled === 1 ? '是' : '否' }}
          </p>
        </div>
        <div class="section" v-if="current.change.rejectReason">
          <h4 class="section-title">驳回原因</h4>
          <p class="section-body reject">{{ current.change.rejectReason }}</p>
        </div>

        <div class="section">
          <h4 class="section-title">审批进度</h4>
          <el-timeline class="approval-timeline">
            <el-timeline-item
              v-for="a in current.approvals"
              :key="a.id"
              :type="approvalTimelineType(a.approvalStatus)"
              :hollow="a.approvalStatus === 'PENDING'"
            >
              <div class="approval-item">
                <div class="approval-head">
                  <span class="approval-role">{{ roleLabel(a.approvalRole) }}</span>
                  <el-tag :type="approvalStatusType(a.approvalStatus)" size="small" effect="light">
                    {{ approvalStatusLabel(a.approvalStatus) }}
                  </el-tag>
                  <span class="approval-approver">{{ a.approver || '待分配' }}</span>
                </div>
                <div v-if="a.opinion" class="approval-opinion">意见：{{ a.opinion }}</div>
                <div v-if="a.approvedAt" class="approval-time">审批时间：{{ formatTime(a.approvedAt) }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- 审批操作区 -->
        <div v-if="canApprove(current)" class="approval-actions">
          <el-divider content-position="left">审批操作（{{ roleLabel(current.myApprovalRole!) }}）</el-divider>
          <el-input
            v-model="opinion"
            type="textarea"
            :rows="3"
            placeholder="审批意见（通过时可填，驳回时必填原因）"
          />
          <div class="action-btns">
            <el-button type="success" :loading="acting" @click="approve">通过</el-button>
            <el-button type="danger" :loading="acting" @click="reject">驳回</el-button>
          </div>
        </div>
      </template>
    </el-drawer>

    <ChangeForm v-model="formVisible" @created="reload" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveChangeApi,
  listChangesApi,
  myApprovalsApi,
  rejectChangeApi,
  voidChangeApi,
  type SupplierMaterialChangeDetail,
} from '@/api/supplierMaterialChange'
import { useAuthStore } from '@/stores/auth'
import ChangeForm from './ChangeForm.vue'

const props = defineProps<{ mode: 'all' | 'mine' }>()

const auth = useAuthStore()
const loading = ref(false)
const rows = ref<SupplierMaterialChangeDetail[]>([])
const page = ref(1)
const size = ref(10)
const total = ref(0)

const keyword = ref('')
const status = ref('')
const changeType = ref('')

const formVisible = ref(false)
const drawerVisible = ref(false)
const current = ref<SupplierMaterialChangeDetail | null>(null)
const opinion = ref('')
const acting = ref(false)

const statusOptions = [
  { value: 'PENDING', label: '审批中' },
  { value: 'APPROVED', label: '已批准' },
  { value: 'REJECTED', label: '已驳回' },
  { value: 'VOID', label: '已作废' },
  { value: 'DRAFT', label: '草稿' },
]

onMounted(load)

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, size: size.value }
    const res =
      props.mode === 'all'
        ? await listChangesApi({
            ...params,
            keyword: keyword.value || undefined,
            status: status.value || undefined,
            changeType: changeType.value || undefined,
          })
        : await myApprovalsApi(params)
    if (res.code === 0) {
      rows.value = res.data?.list ?? []
      total.value = res.data?.total ?? 0
    } else {
      ElMessage.error(res.message || '加载失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  load()
}

function openDetail(row: SupplierMaterialChangeDetail) {
  current.value = row
  opinion.value = ''
  drawerVisible.value = true
}

function canApprove(row: SupplierMaterialChangeDetail) {
  return !!row.myApprovalRole && row.change.status === 'PENDING'
}

function canVoid(row: SupplierMaterialChangeDetail) {
  const c = row.change
  const isDraftOrPending = c.status === 'PENDING' || c.status === 'DRAFT'
  const isApplicant = auth.user?.userId === c.applicantId
  const isAdmin = auth.user?.roleCode === 'R06'
  return isDraftOrPending && (isApplicant || isAdmin)
}

async function approve() {
  if (!current.value?.myApprovalRole) return
  acting.value = true
  try {
    const res = await approveChangeApi(current.value.change.id, {
      approvalRole: current.value.myApprovalRole,
      opinion: opinion.value,
    })
    if (res.code === 0) {
      ElMessage.success('已通过')
      drawerVisible.value = false
      load()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    acting.value = false
  }
}

async function reject() {
  if (!current.value?.myApprovalRole) return
  if (!opinion.value.trim()) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  acting.value = true
  try {
    const res = await rejectChangeApi(current.value.change.id, {
      approvalRole: current.value.myApprovalRole,
      rejectReason: opinion.value.trim(),
    })
    if (res.code === 0) {
      ElMessage.success('已驳回')
      drawerVisible.value = false
      load()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    acting.value = false
  }
}

async function voidChange(row: SupplierMaterialChangeDetail) {
  try {
    await ElMessageBox.confirm(
      `确定作废变更单「${row.change.changeNo}」吗？作废后不可恢复。`,
      '作废确认',
      { type: 'warning', confirmButtonText: '作废', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    const res = await voidChangeApi(row.change.id)
    if (res.code === 0) {
      ElMessage.success('已作废')
      load()
    } else {
      ElMessage.error(res.message || '作废失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '作废失败')
  }
}

function typeLabel(t: string) {
  return { SPEC: '规格变更', PROCESS: '工艺变更', ORIGIN: '产地变更' }[t] ?? t
}
function statusLabel(s: string) {
  return { DRAFT: '草稿', PENDING: '审批中', APPROVED: '已批准', REJECTED: '已驳回', VOID: '已作废' }[s] ?? s
}
function statusType(s: string): 'info' | 'warning' | 'success' | 'danger' | 'primary' {
  return (
    { DRAFT: 'info', PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger', VOID: 'info' }[s] as any
  ) ?? 'info'
}
function roleLabel(r: string) {
  return { QUALITY: '质量', PURCHASE: '采购', RD: '研发' }[r] ?? r
}
function approvalStatusLabel(s: string) {
  return { PENDING: '待审批', APPROVED: '已通过', REJECTED: '已驳回', CANCELLED: '已取消' }[s] ?? s
}
function approvalStatusType(s: string): 'info' | 'success' | 'danger' | 'warning' {
  return ({ PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger', CANCELLED: 'info' }[s] as any) ?? 'info'
}
function approvalTimelineType(s: string): 'primary' | 'success' | 'danger' | 'info' {
  return ({ PENDING: 'primary', APPROVED: 'success', REJECTED: 'danger', CANCELLED: 'info' }[s] as any) ?? 'info'
}
function formatTime(t?: string) {
  if (!t) return '-'
  return String(t).replace('T', ' ').slice(0, 19)
}
</script>

<style scoped>
.change-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.mine-tip {
  color: #71808a;
  font-size: 13px;
}
.change-no {
  font-family: 'SFMono-Regular', Consolas, monospace;
  color: #163c5b;
  font-weight: 600;
}
.type-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
.type-spec {
  background: #eef6fd;
  color: #25728a;
}
.type-process {
  background: #f0f5ff;
  color: #409eff;
}
.type-origin {
  background: #fdf3ee;
  color: #e6a23c;
}
.pagination {
  display: flex;
  justify-content: flex-end;
}
.detail-desc {
  margin-bottom: 6px;
}
.section {
  margin-top: 16px;
}
.section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #163c5b;
}
.section-body {
  margin: 0;
  font-size: 13px;
  color: #263746;
  line-height: 1.7;
  white-space: pre-wrap;
}
.section-body.reject {
  color: #f56c6c;
}
.approval-timeline {
  padding-left: 4px;
}
.approval-item {
  font-size: 13px;
}
.approval-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.approval-role {
  font-weight: 600;
  color: #163c5b;
}
.approval-approver {
  color: #71808a;
}
.approval-opinion {
  margin-top: 4px;
  color: #263746;
}
.approval-time {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}
.approval-actions {
  margin-top: 20px;
}
.action-btns {
  margin-top: 12px;
  display: flex;
  gap: 12px;
}
</style>

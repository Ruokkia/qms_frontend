<template>
  <div class="change-table">
    <div class="toolbar" v-if="canEdit">
      <el-button type="primary" @click="openCreate">新建变更申请</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="change.materialName" label="物料" min-width="130" />
      <el-table-column prop="change.changeType" label="变更类型" width="120" />
      <el-table-column label="影响SOP" width="80" align="center">
        <template #default="{ row }">{{ row.change.affectSop === 1 ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="首批加严" width="90" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.change.firstLotStrict === 1" type="warning" effect="light">加严</el-tag>
          <span v-else>否</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.change.status)" effect="light">{{ row.change.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="change.applicant" label="申请人" width="100" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情/审批</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="size"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      @current-change="load"
      @size-change="load"
    />

    <el-dialog v-model="createVisible" title="新建物料变更申请" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="物料编码"><el-input v-model="form.materialCode" /></el-form-item>
        <el-form-item label="物料名称"><el-input v-model="form.materialName" /></el-form-item>
        <el-form-item label="变更类型" required>
          <el-select v-model="form.changeType" style="width:100%">
            <el-option label="物料变更" value="物料变更" />
            <el-option label="工艺变更" value="工艺变更" />
            <el-option label="关键物料变更" value="关键物料变更" />
          </el-select>
        </el-form-item>
        <el-form-item label="变更原因"><el-input v-model="form.reason" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="变更前"><el-input v-model="form.beforeDesc" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="变更后"><el-input v-model="form.afterDesc" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="影响SOP/标准"><el-switch v-model="form.affectSop" /></el-form-item>
        <el-form-item label="首批加严检验"><el-switch v-model="form.firstLotStrict" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitCreate">保存草稿</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="物料变更详情 / 联合审批" width="680px">
      <div v-if="current">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="供应商">{{ current.change.supplierName }}</el-descriptions-item>
          <el-descriptions-item label="物料">{{ current.change.materialName }}（{{ current.change.materialCode }}）</el-descriptions-item>
          <el-descriptions-item label="变更类型">{{ current.change.changeType }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(current.change.status)">{{ current.change.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="影响SOP">{{ current.change.affectSop === 1 ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="首批加严">{{ current.change.firstLotStrict === 1 ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="变更前" :span="2">{{ current.change.beforeDesc || '-' }}</el-descriptions-item>
          <el-descriptions-item label="变更后" :span="2">{{ current.change.afterDesc || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>联合审批（采购 / 质量 / 技术）</el-divider>
        <el-table :data="current.approvals" border size="small">
          <el-table-column prop="role" label="角色" width="90" />
          <el-table-column prop="approver" label="审批人" width="100" />
          <el-table-column prop="decision" label="决定" width="90">
            <template #default="{ row }">
              <el-tag :type="row.decision === 'approve' ? 'success' : 'danger'" effect="light">
                {{ row.decision === 'approve' ? '同意' : '驳回' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="opinion" label="意见" />
          <el-table-column prop="time" label="时间" width="140" />
        </el-table>

        <div class="actions">
          <el-button v-if="current.change.status === '草稿'" type="primary" @click="doSubmit">提交审批</el-button>
          <template v-if="current.change.status === '审批中'">
            <el-input v-model="approveOpinion" placeholder="审批意见" style="width:200px" />
            <el-button type="success" @click="doApprove('approve')">同意</el-button>
            <el-button type="danger" @click="doApprove('reject')">驳回</el-button>
          </template>
          <el-button v-if="current.change.status === '已批准'" type="warning" @click="doImplement">实施（SOP/检验标准更新、首批加严）</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  pageChangesApi,
  getChangeApi,
  createChangeApi,
  submitChangeApi,
  approveChangeApi,
  implementChangeApi,
  type MaterialChangeVO,
  type CreateChangeDTO,
} from '@/api/supplier-material-change'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ supplierId?: number; canEdit?: boolean }>()
const auth = useAuthStore()

const list = ref<MaterialChangeVO[]>([])
const loading = ref(false)
const page = ref(1)
const size = ref(10)
const total = ref(0)

const createVisible = ref(false)
const saving = ref(false)
const form = ref<CreateChangeDTO>({
  supplierId: 0,
  materialCode: '',
  materialName: '',
  changeType: '物料变更',
  reason: '',
  beforeDesc: '',
  afterDesc: '',
  affectSop: false,
  firstLotStrict: false,
})

const detailVisible = ref(false)
const current = ref<MaterialChangeVO | null>(null)
const approveOpinion = ref('')

function statusType(s: string) {
  if (s === '已实施') return 'success'
  if (s === '已批准') return 'primary'
  if (s === '审批中') return 'warning'
  if (s === '已驳回') return 'danger'
  if (s === '草稿') return 'info'
  return 'info'
}

async function load() {
  if (!props.supplierId) {
    list.value = []
    return
  }
  loading.value = true
  try {
    const res = await pageChangesApi({ page: page.value, size: size.value, supplierId: props.supplierId })
    list.value = res.data?.list ?? []
    total.value = res.data?.total ?? 0
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = {
    supplierId: props.supplierId!,
    materialCode: '',
    materialName: '',
    changeType: '物料变更',
    reason: '',
    beforeDesc: '',
    afterDesc: '',
    affectSop: false,
    firstLotStrict: false,
  }
  createVisible.value = true
}

async function submitCreate() {
  if (!form.value.changeType) {
    ElMessage.warning('请选择变更类型')
    return
  }
  saving.value = true
  try {
    await createChangeApi(form.value)
    ElMessage.success('已保存草稿')
    createVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function openDetail(row: MaterialChangeVO) {
  const res = await getChangeApi(row.change.id)
  current.value = res.data ?? null
  approveOpinion.value = ''
  detailVisible.value = true
}

async function doSubmit() {
  if (!current.value) return
  await submitChangeApi(current.value.change.id)
  ElMessage.success('已提交审批')
  await refreshDetail()
}

async function doApprove(decision: string) {
  if (!current.value) return
  await approveChangeApi(current.value.change.id, {
    role: auth.user?.roleName || '质量',
    opinion: approveOpinion.value,
    decision,
  })
  ElMessage.success(decision === 'approve' ? '已同意' : '已驳回')
  await refreshDetail()
}

async function doImplement() {
  if (!current.value) return
  await implementChangeApi(current.value.change.id)
  ElMessage.success('已实施（SOP/检验标准更新、首批加严已标记）')
  await refreshDetail()
}

async function refreshDetail() {
  if (!current.value) return
  const res = await getChangeApi(current.value.change.id)
  current.value = res.data ?? null
  await load()
}

watch(() => props.supplierId, load)
onMounted(load)
</script>

<style scoped>
.toolbar { margin-bottom: 12px; }
.actions { margin-top: 12px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
</style>

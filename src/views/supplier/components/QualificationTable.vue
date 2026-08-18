<template>
  <div class="qualification-table">
    <div class="toolbar">
      <el-button type="primary" :icon="Plus" @click="openCreate">新增资质</el-button>
      <el-tag v-if="expiredCount > 0" type="danger" effect="dark">
        已过期/临期 {{ expiredCount }} 项
      </el-tag>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="qualification.certType" label="资质类型" min-width="130" />
      <el-table-column prop="qualification.certNo" label="证照编号" min-width="140" />
      <el-table-column prop="qualification.issuer" label="发证机构" min-width="120" />
      <el-table-column label="签发日期" min-width="110">
        <template #default="{ row }">{{ row.qualification.issueDate || '-' }}</template>
      </el-table-column>
      <el-table-column label="到期日期" min-width="110">
        <template #default="{ row }">
          <span v-if="row.qualification.longTerm === 1">长期有效</span>
          <span v-else>{{ row.qualification.expireDate || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="预警" min-width="110">
        <template #default="{ row }">
          <el-tag :type="warnTagType(row.warnLevel)" effect="light">{{ row.warnLevel }}</el-tag>
          <div v-if="row.daysToExpire !== null && row.qualification.longTerm !== 1" class="sub">
            剩 {{ row.daysToExpire }} 天
          </div>
        </template>
      </el-table-column>
      <el-table-column label="附件" min-width="90">
        <template #default="{ row }">
          <el-button v-if="row.qualification.fileUrls" link type="primary" @click="viewFiles(row.qualification.fileUrls)">
            查看
          </el-button>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑资质' : '新增资质'" width="560px">
      <el-form :model="form" label-width="96px">
        <el-form-item label="资质类型" required>
          <el-select v-model="form.certType" filterable allow-create placeholder="请选择或输入">
            <el-option v-for="t in certTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="证照编号">
          <el-input v-model="form.certNo" placeholder="如：91440300MA5XXXX" />
        </el-form-item>
        <el-form-item label="发证机构">
          <el-input v-model="form.issuer" />
        </el-form-item>
        <el-form-item label="签发日期">
          <el-date-picker v-model="form.issueDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="长期有效">
          <el-switch v-model="longTerm" @change="onLongTermChange" />
        </el-form-item>
        <el-form-item label="到期日期" v-if="!longTerm">
          <el-date-picker v-model="form.expireDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="附件">
          <FileUpload v-model="form.fileUrls" :sub-dir="'supplier-qualification'" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="filesVisible" title="资质附件" width="680px">
      <div class="files">
        <el-image v-for="(u, i) in fileList" :key="i" :src="u" :preview-src-list="fileList" fit="contain" class="file-img" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import FileUpload from '@/views/supplier-audit/components/FileUpload.vue'
import {
  listQualificationsApi,
  createQualificationApi,
  updateQualificationApi,
  deleteQualificationApi,
  type QualificationVO,
} from '@/api/supplier-qualification'

const props = defineProps<{ supplierId?: number }>()

const certTypes = ['营业执照', '生产许可证', 'ISO9001', 'ISO13485', '医疗器械经营许可证', '医疗器械生产许可证', '其他']

const list = ref<QualificationVO[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const filesVisible = ref(false)
const fileList = ref<string[]>([])
const longTerm = ref(false)

const form = ref<any>({
  id: undefined,
  supplierId: undefined,
  certType: '',
  certNo: '',
  issuer: '',
  issueDate: '',
  expireDate: '',
  remark: '',
  fileUrls: [] as string[],
})

const expiredCount = computed(
  () => list.value.filter((q) => q.warnLevel === '已过期' || q.warnLevel === '紧急' || q.warnLevel === '预警').length,
)

function warnTagType(level: string) {
  if (level === '已过期') return 'danger'
  if (level === '紧急') return 'danger'
  if (level === '预警') return 'warning'
  if (level === '提醒') return 'info'
  return 'success'
}

async function load() {
  if (!props.supplierId) {
    list.value = []
    return
  }
  loading.value = true
  try {
    const res = await listQualificationsApi(props.supplierId)
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = {
    id: undefined,
    supplierId: props.supplierId,
    certType: '',
    certNo: '',
    issuer: '',
    issueDate: '',
    expireDate: '',
    remark: '',
    fileUrls: [],
  }
  longTerm.value = false
  dialogVisible.value = true
}

function openEdit(row: QualificationVO) {
  const q = row.qualification
  form.value = {
    id: q.id,
    supplierId: q.supplierId,
    certType: q.certType,
    certNo: q.certNo,
    issuer: q.issuer,
    issueDate: q.issueDate,
    expireDate: q.expireDate,
    remark: q.remark,
    fileUrls: q.fileUrls ? q.fileUrls.split(',').filter(Boolean) : [],
  }
  longTerm.value = q.longTerm === 1
  dialogVisible.value = true
}

function onLongTermChange(val: boolean) {
  if (val) {
    form.value.expireDate = ''
  }
}

async function submit() {
  if (!form.value.certType) {
    ElMessage.warning('请填写资质类型')
    return
  }
  const payload = {
    supplierId: props.supplierId,
    certType: form.value.certType,
    certNo: form.value.certNo,
    issuer: form.value.issuer,
    issueDate: form.value.issueDate || undefined,
    expireDate: longTerm.value ? undefined : form.value.expireDate || undefined,
    longTerm: longTerm.value ? 1 : 0,
    remark: form.value.remark,
    fileUrls: form.value.fileUrls,
  }
  if (form.value.id) {
    await updateQualificationApi(form.value.id, payload)
    ElMessage.success('已更新')
  } else {
    await createQualificationApi(payload)
    ElMessage.success('已新增')
  }
  dialogVisible.value = false
  await load()
}

async function remove(row: QualificationVO) {
  await ElMessageBox.confirm(`确认删除资质「${row.qualification.certType}」？`, '提示', { type: 'warning' })
  await deleteQualificationApi(row.qualification.id)
  ElMessage.success('已删除')
  await load()
}

function viewFiles(urls: string) {
  fileList.value = urls.split(',').filter(Boolean)
  filesVisible.value = true
}

watch(() => props.supplierId, load)
onMounted(load)
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.sub {
  font-size: 12px;
  color: #909399;
}
.files {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.file-img {
  width: 140px;
  height: 140px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
</style>

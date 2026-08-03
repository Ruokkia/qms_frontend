<template>
  <el-dialog
    :model-value="visible"
    title="来料检验 Excel 导入"
    width="780px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
    @update:model-value="(val: boolean) => emit('update:modelValue', val)"
  >
    <!-- 步骤 1：上传 Excel + 预览 -->
    <div v-if="step === 1" class="import-step">
      <div class="upload-area">
        <el-upload
          ref="uploadRef"
          drag
          :auto-upload="false"
          :limit="1"
          accept=".xlsx,.xls"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :file-list="fileList"
        >
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="upload-text">将 Excel 文件拖到此处，或<em>点击上传</em></div>
          <template #tip>
            <div class="upload-tip">
              仅支持 .xlsx / .xls 格式，单次仅限一个文件
              <el-button type="primary" link size="small" @click="downloadTemplate">下载模板</el-button>
            </div>
          </template>
        </el-upload>
      </div>

      <!-- 预览结果 -->
      <div v-if="previewResult" class="preview-section">
        <el-divider />
        <div class="preview-header">
          <span class="preview-title">预览结果</span>
          <el-tag type="success" size="small">可导入 {{ previewResult.validCount ?? 0 }} 条</el-tag>
          <el-tag v-if="(previewResult.errorCount ?? 0) > 0" type="danger" size="small">
            失败 {{ previewResult.errorCount }} 条
          </el-tag>
        </div>

        <!-- 失败明细 -->
        <div v-if="previewResult.errors && previewResult.errors.length > 0" class="error-list">
          <div class="error-title">失败明细：</div>
          <div v-for="(err, idx) in previewResult.errors" :key="idx" class="error-item">
            <span class="error-row">第 {{ err.row }} 行：</span>
            <span class="error-msg">{{ err.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 步骤 2：导入结果 -->
    <div v-else class="import-step">
      <div class="result-area">
        <el-result
          :icon="importResult?.failureCount && importResult.failureCount > 0 ? 'warning' : 'success'"
          :title="importResult?.failureCount && importResult.failureCount > 0 ? '导入完成（部分失败）' : '导入成功'"
        >
          <template #sub>
            <div class="result-summary">
              <span>总计 {{ importResult?.totalCount ?? 0 }} 条，</span>
              <span class="success-count">成功 {{ importResult?.successCount ?? 0 }} 条</span>
              <span v-if="importResult?.failureCount && importResult.failureCount > 0" class="fail-count">
                ，失败 {{ importResult.failureCount }} 条
              </span>
            </div>
            <div v-if="importResult?.failures && importResult.failures.length > 0" class="error-list">
              <div class="error-title">失败明细：</div>
              <div v-for="(err, idx) in importResult.failures" :key="idx" class="error-item">
                <span class="error-row">第 {{ err.row }} 行：</span>
                <span class="error-msg">{{ err.reason }}</span>
              </div>
            </div>
          </template>
        </el-result>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ step === 1 ? '取消' : '关闭' }}</el-button>
        <el-button
          v-if="step === 1"
          type="primary"
          :loading="importing"
          :disabled="!selectedFile || previewing"
          @click="doImport"
        >
          确认导入
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import type { UploadFile, UploadInstance } from 'element-plus'
import {
  previewImportApi,
  importMaterialInspectionApi,
  downloadTemplateApi,
} from '@/api/incoming'
import type { MaterialInspectionImportPreviewVO, MaterialInspectionImportResultVO } from '@/types/incoming'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'success'): void
}>()

const visible = ref(props.modelValue)

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val) resetState()
  },
)

// ── 状态 ──
const step = ref(1) // 1=上传预览, 2=导入结果
const uploadRef = ref<UploadInstance>()
const fileList = ref<UploadFile[]>([])
const selectedFile = ref<File | null>(null)
const previewing = ref(false)
const importing = ref(false)
const previewResult = ref<MaterialInspectionImportPreviewVO | null>(null)
const importResult = ref<MaterialInspectionImportResultVO | null>(null)

function resetState() {
  step.value = 1
  fileList.value = []
  selectedFile.value = null
  previewing.value = false
  importing.value = false
  previewResult.value = null
  importResult.value = null
}

function handleFileChange(file: UploadFile) {
  const raw = file.raw
  if (!raw) {
    ElMessage.warning('文件读取失败，请重新选择')
    return
  }
  selectedFile.value = raw
  fileList.value = [file]
  previewFile(raw)
}

function handleFileRemove() {
  selectedFile.value = null
  previewResult.value = null
}

async function previewFile(file: File) {
  previewing.value = true
  previewResult.value = null
  try {
    const res = await previewImportApi(file)
    previewResult.value = res.data
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '预览失败')
    selectedFile.value = null
    fileList.value = []
  } finally {
    previewing.value = false
  }
}

async function doImport() {
  if (!selectedFile.value) return
  importing.value = true
  try {
    const res = await importMaterialInspectionApi({ file: selectedFile.value } as any)
    importResult.value = res.data
    step.value = 2
    if (!res.data?.failureCount || res.data.failureCount === 0) {
      ElMessage.success('导入成功')
      emit('success')
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '导入失败')
  } finally {
    importing.value = false
  }
}

async function downloadTemplate() {
  try {
    const res = await downloadTemplateApi()
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '来料检验导入模板.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('模板下载失败')
  }
}

function handleClose() {
  resetState()
  emit('update:modelValue', false)
}
</script>

<style scoped>
.import-step {
  min-height: 200px;
}

.upload-area {
  text-align: center;
}

.upload-icon {
  font-size: 48px;
  color: #c0c4cc;
}

.upload-text {
  margin-top: 8px;
  color: #606266;
}

.upload-text em {
  color: #409eff;
  font-style: normal;
}

.upload-tip {
  margin-top: 12px;
  font-size: 12px;
  color: #909399;
}

.preview-section {
  margin-top: 8px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.preview-title {
  font-weight: 600;
  color: #303133;
}

.error-list {
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
  background: #fef0f0;
  border-radius: 4px;
  padding: 12px;
}

.error-title {
  font-weight: 600;
  color: #f56c6c;
  margin-bottom: 8px;
}

.error-item {
  font-size: 13px;
  color: #f56c6c;
  line-height: 1.8;
}

.error-row {
  font-weight: 500;
}

.result-area {
  padding: 24px 0;
}

.result-summary {
  font-size: 14px;
  color: #606266;
  margin-top: 8px;
}

.success-count {
  color: #67c23a;
  font-weight: 600;
}

.fail-count {
  color: #f56c6c;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
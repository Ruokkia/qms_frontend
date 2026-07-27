<template>
  <el-dialog
    :model-value="modelValue"
    title="生产维修 Excel 导入"
    width="640px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @close="onClose"
  >
    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
      title="仅质量工程师 / 质量经理可导入"
      description="支持列：审核状态、表格名称、维修编号、产品编号、产品名称、规格型号、生产工单号、生产工序、不良数量、创建人、创建日期、审核日期、状态：、表格编号、送修日期、维修日期、维修判定结果、维修状态、送修人、维修人、审核人、产品批号/序列号、不良现象、不良代码、维修记录、备注"
    />

    <el-upload
      ref="uploadRef"
      drag
      :auto-upload="false"
      :show-file-list="true"
      accept=".xlsx,.xls"
      :limit="1"
      :on-change="onFileChange"
      :on-exceed="() => ElMessage.warning('仅支持单个文件')"
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">将 Excel 文件拖到此处，或 <em>点击选择</em></div>
      <template #tip>
        <div class="el-upload__tip">仅支持 .xlsx / .xls 格式</div>
      </template>
    </el-upload>

    <div v-if="result" class="result-box">
      <el-alert
        :type="result.failCount > 0 ? 'warning' : 'success'"
        :closable="false"
        show-icon
        :title="`导入完成：成功 ${result.successCount} 条，重复跳过 ${result.duplicateSkipCount} 条，待补全 ${result.pendingCount} 条，失败 ${result.failCount} 条（共 ${result.totalCount} 条）`"
      />
      <el-table v-if="result.failList.length" :data="result.failList" border size="small" class="fail-table" max-height="220">
        <el-table-column prop="rowIndex" label="行号" width="70" align="center" />
        <el-table-column prop="repairNo" label="维修编号" width="150" show-overflow-tooltip />
        <el-table-column prop="reason" label="失败原因" min-width="200" show-overflow-tooltip />
      </el-table>
    </div>

    <template #footer>
      <el-button @click="onClose">关闭</el-button>
      <el-button type="primary" :loading="loading" :disabled="!file" @click="onImport">开始导入</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import type { UploadFile, UploadInstance } from 'element-plus'
import { importExcelApi } from '@/api/production-defect'
import type { ImportResult } from '@/types/production-defect'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'success'): void
}>()

const uploadRef = ref<UploadInstance>()
const file = ref<File | null>(null)
const loading = ref(false)
const result = ref<ImportResult | null>(null)

function onFileChange(u: UploadFile) {
  file.value = (u.raw as File) || null
  result.value = null
}

async function onImport() {
  if (!file.value) {
    ElMessage.warning('请先选择 Excel 文件')
    return
  }
  loading.value = true
  result.value = null
  try {
    const res = await importExcelApi(file.value)
    result.value = res.data
    ElMessage.success('导入完成')
    emit('success')
  } catch (e: any) {
    ElMessage.error(e?.message || '导入失败')
  } finally {
    loading.value = false
  }
}

function onClose() {
  emit('update:modelValue', false)
}

function reset() {
  file.value = null
  result.value = null
  uploadRef.value?.clearFiles()
}

defineExpose({ reset })
</script>

<style scoped>
.result-box {
  margin-top: 14px;
}
.fail-table {
  margin-top: 10px;
}
.el-icon--upload {
  font-size: 48px;
  color: #5B7A99;
}
</style>

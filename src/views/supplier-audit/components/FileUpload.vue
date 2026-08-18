<template>
  <div class="file-upload">
    <el-upload
      v-model:file-list="fileList"
      list-type="picture-card"
      :http-request="customUpload"
      :before-upload="beforeUpload"
      :on-remove="onRemove"
      :limit="limit"
      accept="image/*"
    >
      <el-icon><Plus /></el-icon>
    </el-upload>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { UploadUserFile, UploadRequestOptions } from 'element-plus'
import { uploadFileApi } from '@/api/supplier-audit'

const props = withDefaults(
  defineProps<{
    modelValue?: string[]
    limit?: number
    subDir?: string
  }>(),
  { modelValue: () => [], limit: 6, subDir: 'supplier-audit' },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const fileList = ref<UploadUserFile[]>(
  props.modelValue.map((url) => ({ name: url.split('/').pop() || url, url })),
)

watch(
  () => props.modelValue,
  (val) => {
    fileList.value = val.map((url) => ({ name: url.split('/').pop() || url, url }))
  },
)

function beforeUpload(file: File) {
  const okType = file.type.startsWith('image/')
  if (!okType) {
    ElMessage.error('仅支持图片文件')
    return false
  }
  if (file.size / 1024 / 1024 > 10) {
    ElMessage.error('单张图片不能超过 10MB')
    return false
  }
  return true
}

async function customUpload(opts: UploadRequestOptions) {
  try {
    const res = await uploadFileApi(opts.file, props.subDir)
    if (res.code === 0 && res.data) {
      const urls = [...props.modelValue, res.data]
      emit('update:modelValue', urls)
      return { url: res.data }
    }
    ElMessage.error(res.message || '上传失败')
    throw new Error(res.message || '上传失败')
  } catch (err) {
    ElMessage.error('上传失败，请重试')
    throw err
  }
}

function onRemove(file: UploadUserFile) {
  const url = file.url
  const urls = props.modelValue.filter((u) => u !== url)
  emit('update:modelValue', urls)
}
</script>

<style scoped>
.file-upload :deep(.el-upload--picture-card) {
  width: 88px;
  height: 88px;
}
</style>

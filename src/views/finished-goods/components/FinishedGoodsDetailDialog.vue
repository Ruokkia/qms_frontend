<template>
  <el-dialog
    :model-value="modelValue"
    :title="isCreate ? '新增成品/半成品检验' : '成品/半成品检验详情'"
    width="860px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- 头部概要 -->
    <div v-if="!isCreate && form" class="detail-header">
      <div class="header-left">
        <span class="record-id font-mono">{{ form.reportNo || '-' }}</span>
        <span class="record-name">{{ form.productName || '-' }}</span>
      </div>
      <div class="header-tags">
        <el-tag
          :type="form.inspectionResult === '合格' ? 'success' : form.inspectionResult === '不合格' ? 'danger' : 'info'"
          size="small"
        >
          {{ form.inspectionResult || '-' }}
        </el-tag>
        <el-tag :type="form.qcReview === '已审核' ? 'success' : form.qcReview === '驳回' ? 'danger' : 'warning'" size="small">
          品管{{ form.qcReview || '-' }}
        </el-tag>
        <el-tag :type="form.mgrApproval === '已审核' ? 'success' : form.mgrApproval === '驳回' ? 'danger' : 'warning'" size="small">
          管代{{ form.mgrApproval || '-' }}
        </el-tag>
        <el-tag v-if="form.isUrgent === '是'" type="danger" size="small">急料</el-tag>
      </div>
    </div>

    <!-- 查看模式 -->
    <template v-if="mode === 'view' && form">
      <el-descriptions :column="2" border size="small" class="detail-descriptions">
        <el-descriptions-item label="报告编号" :span="2">
          <span class="font-mono">{{ form.reportNo || '-' }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <h4 class="section-title">基本信息</h4>
      <el-descriptions :column="2" border size="small" class="detail-descriptions">
        <el-descriptions-item label="产品名称">{{ form.productName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="型号规格">{{ form.modelSpec || '-' }}</el-descriptions-item>
        <el-descriptions-item label="物料编码">{{ form.materialCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ form.category || '-' }}</el-descriptions-item>
        <el-descriptions-item label="单位">{{ form.unit || '-' }}</el-descriptions-item>
        <el-descriptions-item label="生产订单号">{{ form.productionOrderNo || '-' }}</el-descriptions-item>
      </el-descriptions>

      <h4 class="section-title">检验批次</h4>
      <el-descriptions :column="2" border size="small" class="detail-descriptions">
        <el-descriptions-item label="生产批号/产品编号">{{ form.prodBatchOrSn || '-' }}</el-descriptions-item>
        <el-descriptions-item label="送检单号">{{ form.inspectionRequestNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="检验结果">
          <el-tag
            :type="form.inspectionResult === '合格' ? 'success' : form.inspectionResult === '不合格' ? 'danger' : 'info'"
            size="small"
          >{{ form.inspectionResult || '-' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="检验名字">{{ form.inspectorName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="送检数量">{{ form.submittedQty ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="检验数量">{{ form.inspectedQty ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="合格数量">{{ form.qualifiedQty ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="不合格数量">{{ form.unqualifiedQty ?? '-' }}</el-descriptions-item>
      </el-descriptions>

      <h4 class="section-title">时效与追溯</h4>
      <el-descriptions :column="2" border size="small" class="detail-descriptions">
        <el-descriptions-item label="生产日期">{{ form.productionDate || '-' }}</el-descriptions-item>
        <el-descriptions-item label="有效期至">{{ form.expiryDate || '-' }}</el-descriptions-item>
      </el-descriptions>

      <h4 class="section-title">审核与批准</h4>
      <el-descriptions :column="2" border size="small" class="detail-descriptions">
        <el-descriptions-item label="品管审核">{{ form.qcReview || '-' }}</el-descriptions-item>
        <el-descriptions-item label="品管复核人">{{ form.qcReviewer || '-' }}</el-descriptions-item>
        <el-descriptions-item label="品管复核时间">{{ form.qcReviewTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="管代批准">{{ form.mgrApproval || '-' }}</el-descriptions-item>
        <el-descriptions-item label="管代">{{ form.mgrRepresentative || '-' }}</el-descriptions-item>
        <el-descriptions-item label="管代批准时间">{{ form.mgrApprovalTime || '-' }}</el-descriptions-item>
      </el-descriptions>

      <h4 class="section-title">其他信息</h4>
      <el-descriptions :column="2" border size="small" class="detail-descriptions">
        <el-descriptions-item label="是否加急">{{ form.isUrgent || '-' }}</el-descriptions-item>
        <el-descriptions-item label="是否有效">{{ form.isValid || '-' }}</el-descriptions-item>
        <el-descriptions-item label="是否委托">{{ form.isEntrusted || '-' }}</el-descriptions-item>
        <el-descriptions-item label="药监批号">{{ form.drugRegNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="性能检验方式">{{ form.perfTestMethod || '-' }}</el-descriptions-item>
        <el-descriptions-item label="性能抽检批次编号">{{ form.perfSampleBatchNo || '-' }}</el-descriptions-item>
      </el-descriptions>

      <h4 class="section-title">电子签名</h4>
      <el-descriptions :column="2" border size="small" class="detail-descriptions">
        <el-descriptions-item label="签名人">{{ form.signatureUser || '-' }}</el-descriptions-item>
        <el-descriptions-item label="签名时间">{{ form.signatureTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="签名原因" :span="2">{{ form.signatureReason || '-' }}</el-descriptions-item>
      </el-descriptions>
    </template>

    <!-- 编辑 / 新增模式 -->
    <template v-if="mode === 'edit' || isCreate">
      <el-form
        ref="formRef"
        :model="form"
        label-width="130px"
        label-position="right"
        size="default"
        class="edit-form"
      >
        <h4 class="section-title">基本信息</h4>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="报告编号"><el-input v-model="form.reportNo" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品名称"><el-input v-model="form.productName" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="型号规格"><el-input v-model="form.modelSpec" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物料编码"><el-input v-model="form.materialCode" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品分类">
              <el-select v-model="form.category" style="width:100%">
                <el-option label="成品" value="成品" />
                <el-option label="半成品" value="半成品" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单位"><el-input v-model="form.unit" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产订单号"><el-input v-model="form.productionOrderNo" /></el-form-item>
          </el-col>
        </el-row>

        <h4 class="section-title">检验批次</h4>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="生产批号/产品编号"><el-input v-model="form.prodBatchOrSn" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="送检单号"><el-input v-model="form.inspectionRequestNo" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="检验结果">
              <el-select v-model="form.inspectionResult" clearable style="width:100%">
                <el-option label="合格" value="合格" />
                <el-option label="不合格" value="不合格" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="检验名字"><el-input v-model="form.inspectorName" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="送检数量">
              <el-input-number v-model="form.submittedQty" :min="0" :precision="3" style="width:100%" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="检验数量">
              <el-input-number v-model="form.inspectedQty" :min="0" :precision="3" style="width:100%" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合格数量">
              <el-input-number v-model="form.qualifiedQty" :min="0" :precision="3" style="width:100%" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="不合格数量">
              <el-input-number v-model="form.unqualifiedQty" :min="0" :precision="3" style="width:100%" controls-position="right" />
            </el-form-item>
          </el-col>
        </el-row>

        <h4 class="section-title">时效与追溯</h4>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="生产日期">
              <el-date-picker v-model="form.productionDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="有效期至">
              <el-date-picker v-model="form.expiryDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <h4 class="section-title">审核与批准</h4>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="品管审核">
              <el-select v-model="form.qcReview" clearable style="width:100%">
                <el-option label="待审核" value="待审核" />
                <el-option label="已审核" value="已审核" />
                <el-option label="驳回" value="驳回" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品管复核人"><el-input v-model="form.qcReviewer" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品管复核时间">
              <el-date-picker v-model="form.qcReviewTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="管代批准">
              <el-select v-model="form.mgrApproval" clearable style="width:100%">
                <el-option label="待审核" value="待审核" />
                <el-option label="已审核" value="已审核" />
                <el-option label="驳回" value="驳回" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="管代"><el-input v-model="form.mgrRepresentative" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="管代批准时间">
              <el-date-picker v-model="form.mgrApprovalTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <h4 class="section-title">其他信息</h4>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="是否加急">
              <el-select v-model="form.isUrgent" clearable style="width:100%">
                <el-option label="是" value="是" />
                <el-option label="否" value="否" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否有效">
              <el-select v-model="form.isValid" clearable style="width:100%">
                <el-option label="是" value="是" />
                <el-option label="否" value="否" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否委托">
              <el-select v-model="form.isEntrusted" clearable style="width:100%">
                <el-option label="是" value="是" />
                <el-option label="否" value="否" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="药监批号"><el-input v-model="form.drugRegNo" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性能检验方式"><el-input v-model="form.perfTestMethod" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性能抽检批次编号"><el-input v-model="form.perfSampleBatchNo" /></el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </template>

    <!-- 底部 -->
    <template #footer>
      <div class="dialog-footer">
        <template v-if="mode === 'view'">
          <el-button @click="handleClose">关闭</el-button>
          <el-button v-if="!readonly" type="primary" @click="mode = 'edit'">编辑</el-button>
        </template>
        <template v-else>
          <el-button @click="cancelEdit">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">
            {{ isCreate ? '创建' : '保存' }}
          </el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { ElForm } from 'element-plus'
import type { FinishedGoodsInspection } from '@/types/finishedGoods'

const props = defineProps<{
  modelValue: boolean
  detail: FinishedGoodsInspection | null
  editMode?: boolean
  saving?: boolean
  readonly?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [data: Partial<FinishedGoodsInspection>]
}>()

const formRef = ref<InstanceType<typeof ElForm>>()
const mode = ref<'view' | 'edit'>('view')

const isCreate = ref(false)

/** 空表单 */
function emptyForm(): FinishedGoodsInspection {
  return {
    id: 0,
    isUrgent: '否',
    qcReview: '待审核',
    mgrApproval: '待审核',
    isValid: '是',
    inspectionResult: '',
    reportNo: '',
    inspectionRequestNo: '',
    productionOrderNo: '',
    materialCode: '',
    productName: '',
    modelSpec: '',
    prodBatchOrSn: '',
    productionDate: '',
    expiryDate: '',
    submittedQty: 0,
    inspectedQty: 0,
    qualifiedQty: 0,
    unqualifiedQty: 0,
    unit: '',
    inspectorName: '',
    category: '成品',
    qcReviewer: '',
    qcReviewTime: '',
    mgrRepresentative: '',
    mgrApprovalTime: '',
    isEntrusted: '否',
    drugRegNo: '',
    perfTestMethod: '',
    perfSampleBatchNo: '',
    signatureUser: '',
    signatureTime: '',
    signatureReason: '',
  }
}

const form = reactive<FinishedGoodsInspection>(emptyForm())

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      isCreate.value = !props.detail
      if (props.detail) {
        Object.assign(form, props.detail)
        mode.value = props.editMode ? 'edit' : 'view'
      } else {
        Object.assign(form, emptyForm())
        mode.value = 'edit'
      }
    }
  },
  { immediate: true },
)

function cancelEdit() {
  if (isCreate.value) {
    handleClose()
    return
  }
  // 恢复原始值
  if (props.detail) Object.assign(form, props.detail)
  mode.value = 'view'
}

function handleClose() {
  emit('update:modelValue', false)
}

function handleSave() {
  const payload = { ...form }
  if (isCreate.value) {
    // 新增不传 id
    delete (payload as any).id
  }
  emit('saved', payload as Partial<FinishedGoodsInspection>)
}
</script>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #1b3a5b, #2a5a7e);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 18px;
}
.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.record-id {
  color: #a8b5c4;
  font-size: 12px;
}
.record-name {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}
.header-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.section-title {
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5b;
  padding-left: 10px;
  border-left: 3px solid #b8763e;
}
.detail-descriptions {
  margin-bottom: 4px;
}
.font-mono {
  font-family: 'JetBrains Mono', monospace;
}
.edit-form {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 4px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

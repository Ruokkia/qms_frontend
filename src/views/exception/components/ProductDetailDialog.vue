<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="(val: boolean) => emit('update:modelValue', val)"
    :title="dialogTitle"
    width="750px"
    :close-on-click-modal="false"
    destroy-on-close
    class="product-detail-dialog"
  >
    <div class="detail-body">
      <!-- ========= 来料不良 ========= -->
      <template v-if="sourceType === '来料不良' && materialInspection">
        <div class="detail-section">
          <div class="section-title">基本信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="记录编号">{{ materialInspection.recordNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="物料代码"><span class="font-mono">{{ materialInspection.materialCode || '-' }}</span></el-descriptions-item>
            <el-descriptions-item label="物料名称">{{ materialInspection.materialName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="规格型号">{{ materialInspection.specModel || '-' }}</el-descriptions-item>
            <el-descriptions-item label="物料批号">{{ materialInspection.materialBatchNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="物料分类">{{ materialInspection.materialCategory || '-' }}</el-descriptions-item>
            <el-descriptions-item label="单位">{{ materialInspection.unit || '-' }}</el-descriptions-item>
            <el-descriptions-item label="是否急料">{{ materialInspection.isUrgent || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <div class="section-title">采购入库</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="采购订单">{{ materialInspection.purchaseOrder || '-' }}</el-descriptions-item>
            <el-descriptions-item label="入库单号">{{ materialInspection.inboundNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="送检单号">{{ materialInspection.inspectionRequestNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="MES检验单号">{{ materialInspection.mesInspectionNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="来料日期">{{ materialInspection.arrivalDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="收料单号">{{ materialInspection.receivingNo || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <div class="section-title">检验信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="检验日期">{{ materialInspection.inspectionDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="检验结束日期">{{ materialInspection.inspectionEndDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="判定日期">{{ materialInspection.judgementDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="检验人员">{{ materialInspection.inspector || '-' }}</el-descriptions-item>
            <el-descriptions-item label="判定人">{{ materialInspection.judge || '-' }}</el-descriptions-item>
            <el-descriptions-item label="检验分类">{{ materialInspection.inspectionCategory || '-' }}</el-descriptions-item>
            <el-descriptions-item label="检验结果">
              <el-tag :type="materialInspection.inspectionResult === '不合格' ? 'danger' : 'success'" size="small">
                {{ materialInspection.inspectionResult || '-' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="送检数量">{{ materialInspection.submittedQty ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="合格数量"><span class="text-green">{{ materialInspection.qualifiedQty ?? '-' }}</span></el-descriptions-item>
            <el-descriptions-item label="不合格数量"><span class="text-red">{{ materialInspection.unqualifiedQty ?? '-' }}</span></el-descriptions-item>
            <el-descriptions-item label="损耗数">{{ materialInspection.lossQty ?? '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <div class="section-title">供应商</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="供应商名称">{{ materialInspection.supplierName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="供应商编号"><span class="font-mono">{{ materialInspection.supplierCode || '-' }}</span></el-descriptions-item>
            <el-descriptions-item label="送检人">{{ materialInspection.submitter || '-' }}</el-descriptions-item>
            <el-descriptions-item label="送检日期">{{ materialInspection.submitDate || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section" v-if="materialInspection.defectDesc">
          <div class="section-title">不良处理</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="不合格描述" :span="2">{{ materialInspection.defectDesc || '-' }}</el-descriptions-item>
            <el-descriptions-item label="处理方式">{{ materialInspection.handlingMethod || '-' }}</el-descriptions-item>
            <el-descriptions-item label="不合格最终状态">{{ materialInspection.unqualifiedFinalStatus || '-' }}</el-descriptions-item>
            <el-descriptions-item label="不合格评审">{{ materialInspection.unqualifiedReview || '-' }}</el-descriptions-item>
            <el-descriptions-item label="不合格评审单号"><span class="font-mono">{{ materialInspection.unqualifiedReviewNo || '-' }}</span></el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <div class="section-title">审核与签名</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="审核状态">
              <el-tag size="small">{{ materialInspection.reviewStatus || '-' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="审核人">{{ materialInspection.reviewer || '-' }}</el-descriptions-item>
            <el-descriptions-item label="审核日期">{{ materialInspection.reviewDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="签名人">{{ materialInspection.signatureUser || '-' }}</el-descriptions-item>
            <el-descriptions-item label="签名时间">{{ materialInspection.signatureTime || '-' }}</el-descriptions-item>
            <el-descriptions-item label="签名事由">{{ materialInspection.signatureReason || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </template>

      <!-- ========= 成品不良 ========= -->
      <template v-if="sourceType === '成品不良' && finishedGoodsInspection">
        <div class="detail-section">
          <div class="section-title">基本信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="报告编号" :span="2"><span class="font-mono">{{ finishedGoodsInspection.reportNo || '-' }}</span></el-descriptions-item>
            <el-descriptions-item label="产品名称">{{ finishedGoodsInspection.productName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="型号规格">{{ finishedGoodsInspection.modelSpec || '-' }}</el-descriptions-item>
            <el-descriptions-item label="物料编码"><span class="font-mono">{{ finishedGoodsInspection.materialCode || '-' }}</span></el-descriptions-item>
            <el-descriptions-item label="分类">{{ finishedGoodsInspection.category || '-' }}</el-descriptions-item>
            <el-descriptions-item label="单位">{{ finishedGoodsInspection.unit || '-' }}</el-descriptions-item>
            <el-descriptions-item label="生产订单号">{{ finishedGoodsInspection.productionOrderNo || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <div class="section-title">检验批次</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="生产批号/编号">{{ finishedGoodsInspection.prodBatchOrSn || '-' }}</el-descriptions-item>
            <el-descriptions-item label="送检单号">{{ finishedGoodsInspection.inspectionRequestNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="检验结果">
              <el-tag :type="finishedGoodsInspection.inspectionResult === '不合格' ? 'danger' : 'success'" size="small">
                {{ finishedGoodsInspection.inspectionResult || '-' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="检验人员">{{ finishedGoodsInspection.inspectorName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="送检数量">{{ finishedGoodsInspection.submittedQty ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="检验数量">{{ finishedGoodsInspection.inspectedQty ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="合格数量"><span class="text-green">{{ finishedGoodsInspection.qualifiedQty ?? '-' }}</span></el-descriptions-item>
            <el-descriptions-item label="不合格数量"><span class="text-red">{{ finishedGoodsInspection.unqualifiedQty ?? '-' }}</span></el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <div class="section-title">时效与追溯</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="生产日期">{{ finishedGoodsInspection.productionDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="有效期至">{{ finishedGoodsInspection.expiryDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="是否加急">
              <el-tag :type="finishedGoodsInspection.isUrgent === '是' ? 'warning' : 'info'" size="small">{{ finishedGoodsInspection.isUrgent || '-' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="是否委托">{{ finishedGoodsInspection.isEntrusted || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <div class="section-title">审核与批准</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="品管审核">
              <el-tag size="small">{{ finishedGoodsInspection.qcReview || '-' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="管代批准">
              <el-tag size="small">{{ finishedGoodsInspection.mgrApproval || '-' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="品管复核人">{{ finishedGoodsInspection.qcReviewer || '-' }}</el-descriptions-item>
            <el-descriptions-item label="品管复核时间">{{ finishedGoodsInspection.qcReviewTime || '-' }}</el-descriptions-item>
            <el-descriptions-item label="管代">{{ finishedGoodsInspection.mgrRepresentative || '-' }}</el-descriptions-item>
            <el-descriptions-item label="管代批准时间">{{ finishedGoodsInspection.mgrApprovalTime || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <div class="section-title">签名信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="签名人">{{ finishedGoodsInspection.signatureUser || '-' }}</el-descriptions-item>
            <el-descriptions-item label="签名时间">{{ finishedGoodsInspection.signatureTime || '-' }}</el-descriptions-item>
            <el-descriptions-item label="签名事由" :span="2">{{ finishedGoodsInspection.signatureReason || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </template>

      <!-- ========= 首件不良 ========= -->
      <template v-if="sourceType === '首件不良' && faiInspection">
        <div class="detail-section">
          <div class="section-title">基本信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="首件编号"><span class="font-mono">{{ faiInspection.faiNo || '-' }}</span></el-descriptions-item>
            <el-descriptions-item label="物料代码"><span class="font-mono">{{ faiInspection.materialCode || '-' }}</span></el-descriptions-item>
            <el-descriptions-item label="物料名称">{{ faiInspection.materialName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="产品/物料代码">{{ faiInspection.itemCode || '-' }}</el-descriptions-item>
            <el-descriptions-item label="产品/物料名称">{{ faiInspection.itemName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ faiInspection.itemType || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <div class="section-title">生产信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="生产批号">{{ faiInspection.batchNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工序名称">{{ faiInspection.processName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工序代码">{{ faiInspection.processCode || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工单号">{{ faiInspection.workOrderNo || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <div class="section-title">检验结论</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="检验结果">
              <el-tag :type="faiInspection.inspectionResult === '不合格' ? 'danger' : 'success'" size="small">
                {{ faiInspection.inspectionResult || '-' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="签名状态">
              <el-tag size="small">{{ faiInspection.signatureStatus || '-' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ faiInspection.remark || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </template>

      <!-- 无数据提示 -->
      <div v-if="!hasData" class="empty-hint">
        <el-empty description="暂无关联产品数据" :image-size="80" />
      </div>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MaterialInspection } from '@/types/incoming'
import type { FinishedGoodsInspection } from '@/types/finishedGoods'
import type { FaiInspectionRecord } from '@/types/fai'

const props = defineProps<{
  modelValue: boolean
  sourceType: string
  materialInspection?: MaterialInspection | null
  faiInspection?: FaiInspectionRecord | null
  finishedGoodsInspection?: FinishedGoodsInspection | null
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
}>()

const sourceLabels: Record<string, string> = {
  '来料不良': '来料检验详情',
  '成品不良': '成品检验详情',
  '首件不良': '首件检验详情',
}

const dialogTitle = computed(() => sourceLabels[props.sourceType] || '产品详情')

const hasData = computed(() => {
  if (props.sourceType === '来料不良') return !!props.materialInspection
  if (props.sourceType === '成品不良') return !!props.finishedGoodsInspection
  if (props.sourceType === '首件不良') return !!props.faiInspection
  return false
})
</script>

<style scoped>
.product-detail-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #1a3c5e 0%, #2a5a8a 100%);
  padding: 16px 24px;
  border-bottom: none;
}
.product-detail-dialog :deep(.el-dialog__title) {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}
.product-detail-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #fff;
}

.detail-body {
  max-height: 60vh;
  overflow-y: auto;
  padding: 4px 0;
}

.detail-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  padding: 0 0 8px 12px;
  border-left: 3px solid #b8763e;
  margin-bottom: 8px;
  line-height: 1.2;
}

.font-mono {
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  color: #1a3c5e;
}

.text-green {
  color: #67c23a;
  font-weight: 600;
}

.text-red {
  color: #f56c6c;
  font-weight: 600;
}

.empty-hint {
  padding: 40px 0;
}

:deep(.el-descriptions__label) {
  width: 120px;
}
</style>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="isCreate ? '新增来料检验记录' : '来料检验详情'"
    width="860px"
    top="2vh"
    class="incoming-detail-dialog"
    append-to-body
    destroy-on-close
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @closed="onClosed"
  >
    <div v-if="isCreate || formData" class="id-body">
      <!-- 头部 -->
      <div class="id-header">
        <div class="id-title">
          <span v-if="formData.recordNo" class="id-no font-mono">{{ formData.recordNo }}</span>
          <span v-else class="id-no font-mono">{{ isCreate ? '新记录' : '—' }}</span>
          <span class="id-sub">物料：{{ formData.materialName || '—' }}</span>
        </div>
        <div class="id-tags">
          <el-tag :type="resultTag(formData.inspectionResult)" effect="dark" size="small">
            {{ formData.inspectionResult || '未判定' }}
          </el-tag>
          <el-tag :type="reviewTag(formData.reviewStatus)" effect="plain" size="small">
            {{ formData.reviewStatus || '待审核' }}
          </el-tag>
          <el-tag v-if="formData.signatureStatus === '已签'" type="success" effect="plain" size="small">已签</el-tag>
          <el-tag v-if="formData.isUrgent === '是'" type="danger" effect="plain" size="small">急料</el-tag>
        </div>
      </div>

      <el-scrollbar class="id-scroll" :max-height="520">
        <template v-if="isEditing">
          <!-- 编辑模式：表单 -->
          <el-form ref="formRef" :model="formData" label-width="110px" label-position="top" size="small">
            <!-- 基本信息 -->
            <section class="id-section">
              <div class="id-section-title">基本信息</div>
              <div class="id-form-grid">
                <el-form-item label="记录编号"><el-input v-model="formData.recordNo" placeholder="记录编号" /></el-form-item>
                <el-form-item label="处理单号"><el-input v-model="formData.processNo" placeholder="处理单号" /></el-form-item>
                <el-form-item label="表单版本"><el-input v-model="formData.formVersion" placeholder="表单版本" /></el-form-item>
                <el-form-item label="物料代码"><el-input v-model="formData.materialCode" placeholder="物料代码" /></el-form-item>
                <el-form-item label="物料名称"><el-input v-model="formData.materialName" placeholder="物料名称" /></el-form-item>
                <el-form-item label="规格型号"><el-input v-model="formData.specModel" placeholder="规格型号" /></el-form-item>
                <el-form-item label="物料批号"><el-input v-model="formData.materialBatchNo" placeholder="物料批号" /></el-form-item>
                <el-form-item label="物料分类"><el-input v-model="formData.materialCategory" placeholder="物料分类" /></el-form-item>
                <el-form-item label="单位"><el-input v-model="formData.unit" placeholder="单位" /></el-form-item>
                <el-form-item label="是否急料">
                  <el-select v-model="formData.isUrgent" style="width:100%">
                    <el-option label="否" value="否" /><el-option label="是" value="是" />
                  </el-select>
                </el-form-item>
                <el-form-item label="是否客供料">
                  <el-select v-model="formData.isCustomerSupplied" style="width:100%">
                    <el-option label="否" value="否" /><el-option label="是" value="是" />
                  </el-select>
                </el-form-item>
                <el-form-item label="是否有效">
                  <el-select v-model="formData.isValid" style="width:100%">
                    <el-option label="是" value="是" /><el-option label="否" value="否" />
                  </el-select>
                </el-form-item>
              </div>
            </section>

            <!-- 采购入库 -->
            <section class="id-section">
              <div class="id-section-title">采购入库</div>
              <div class="id-form-grid">
                <el-form-item label="采购订单"><el-input v-model="formData.purchaseOrder" placeholder="采购订单" /></el-form-item>
                <el-form-item label="采购订单行号"><el-input v-model="formData.poLineNo" placeholder="采购订单行号" /></el-form-item>
                <el-form-item label="入库单号"><el-input v-model="formData.inboundNo" placeholder="入库单号" /></el-form-item>
                <el-form-item label="收料单号"><el-input v-model="formData.receivingNo" placeholder="收料单号" /></el-form-item>
                <el-form-item label="收货单行号"><el-input v-model="formData.receivingLineNo" placeholder="收货单行号" /></el-form-item>
                <el-form-item label="送检单号"><el-input v-model="formData.inspectionRequestNo" placeholder="送检单号" /></el-form-item>
                <el-form-item label="MES检验单号"><el-input v-model="formData.mesInspectionNo" placeholder="MES检验单号" /></el-form-item>
                <el-form-item label="来料日期">
                  <el-date-picker v-model="formData.arrivalDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
              </div>
            </section>

            <!-- 检验信息 -->
            <section class="id-section">
              <div class="id-section-title">检验信息</div>
              <div class="id-form-grid">
                <el-form-item label="检验日期">
                  <el-date-picker v-model="formData.inspectionDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
                <el-form-item label="检验结束日期">
                  <el-date-picker v-model="formData.inspectionEndDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
                <el-form-item label="判定日期">
                  <el-date-picker v-model="formData.judgementDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
                <el-form-item label="检验人员"><el-input v-model="formData.inspector" placeholder="检验人员" /></el-form-item>
                <el-form-item label="判定人"><el-input v-model="formData.judge" placeholder="判定人" /></el-form-item>
                <el-form-item label="检验分类"><el-input v-model="formData.inspectionCategory" placeholder="检验分类" /></el-form-item>
                <el-form-item label="检验结果">
                  <el-select v-model="formData.inspectionResult" style="width:100%">
                    <el-option label="合格" value="合格" /><el-option label="不合格" value="不合格" />
                  </el-select>
                </el-form-item>
                <el-form-item label="送检数量">
                  <el-input-number v-model="formData.submittedQty" :min="0" :precision="3" style="width:100%" controls-position="right" />
                </el-form-item>
                <el-form-item label="合格数量">
                  <el-input-number v-model="formData.qualifiedQty" :min="0" :precision="3" style="width:100%" controls-position="right" />
                </el-form-item>
                <el-form-item label="不合格数量">
                  <el-input-number v-model="formData.unqualifiedQty" :min="0" :precision="3" style="width:100%" controls-position="right" />
                </el-form-item>
                <el-form-item label="损耗数">
                  <el-input-number v-model="formData.lossQty" :min="0" :precision="3" style="width:100%" controls-position="right" />
                </el-form-item>
              </div>
            </section>

            <!-- 供应商/送检 -->
            <section class="id-section">
              <div class="id-section-title">供应商与送检</div>
              <div class="id-form-grid">
                <el-form-item label="供应商名称"><el-input v-model="formData.supplierName" placeholder="供应商名称" /></el-form-item>
                <el-form-item label="供应商编号"><el-input v-model="formData.supplierCode" placeholder="供应商编号" /></el-form-item>
                <el-form-item label="送检人"><el-input v-model="formData.submitter" placeholder="送检人" /></el-form-item>
                <el-form-item label="送检日期">
                  <el-date-picker v-model="formData.submitDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
                <el-form-item label="保质期(天)">
                  <el-input-number v-model="formData.shelfLifeDays" :min="0" style="width:100%" controls-position="right" />
                </el-form-item>
              </div>
            </section>

            <!-- 不良处理 -->
            <section class="id-section">
              <div class="id-section-title">不良处理</div>
              <div class="id-form-grid">
                <el-form-item label="不合格描述" :span="2">
                  <el-input v-model="formData.defectDesc" type="textarea" :rows="2" placeholder="不合格描述" />
                </el-form-item>
                <el-form-item label="处理方式">
                  <el-select v-model="formData.handlingMethod" style="width:100%">
                    <el-option label="退货" value="退货" /><el-option label="挑选" value="挑选" />
                    <el-option label="特采" value="特采" /><el-option label="报废" value="报废" />
                  </el-select>
                </el-form-item>
                <el-form-item label="不合格最终状态"><el-input v-model="formData.unqualifiedFinalStatus" placeholder="不合格最终状态" /></el-form-item>
                <el-form-item label="不合格评审"><el-input v-model="formData.unqualifiedReview" placeholder="不合格评审" /></el-form-item>
                <el-form-item label="不合格评审单号"><el-input v-model="formData.unqualifiedReviewNo" placeholder="不合格评审单号" /></el-form-item>
                <el-form-item label="重检备注"><el-input v-model="formData.reinspectRemark" placeholder="重检备注" /></el-form-item>
              </div>
            </section>

            <!-- 审核与标识 -->
            <section class="id-section">
              <div class="id-section-title">审核与标识</div>
              <div class="id-form-grid">
                <el-form-item label="审核状态">
                  <el-select v-model="formData.reviewStatus" style="width:100%">
                    <el-option label="待审核" value="待审核" /><el-option label="已审核" value="已审核" /><el-option label="驳回" value="驳回" />
                  </el-select>
                </el-form-item>
                <el-form-item label="审核人"><el-input v-model="formData.reviewer" placeholder="审核人" /></el-form-item>
                <el-form-item label="审核日期">
                  <el-date-picker v-model="formData.reviewDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
                <el-form-item label="签名状态">
                  <el-select v-model="formData.signatureStatus" style="width:100%">
                    <el-option label="未签" value="未签" /><el-option label="已签" value="已签" />
                  </el-select>
                </el-form-item>
                <el-form-item label="数据记录标识">
                  <el-select v-model="formData.dataRecordFlag" style="width:100%">
                    <el-option label="否" value="否" /><el-option label="是" value="是" />
                  </el-select>
                </el-form-item>
                <el-form-item label="是否失效">
                  <el-select v-model="formData.isInvalid" style="width:100%">
                    <el-option label="否" value="否" /><el-option label="是" value="是" />
                  </el-select>
                </el-form-item>
                <el-form-item label="报告生成">
                  <el-select v-model="formData.reportGenerated" style="width:100%">
                    <el-option label="否" value="否" /><el-option label="是" value="是" />
                  </el-select>
                </el-form-item>
              </div>
            </section>

            <!-- 电子签名 -->
            <section class="id-section">
              <div class="id-section-title">电子签名</div>
              <div class="id-form-grid">
                <el-form-item label="签名人"><el-input v-model="formData.signatureUser" placeholder="签名人" /></el-form-item>
                <el-form-item label="签名时间">
                  <el-date-picker v-model="formData.signatureTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
                </el-form-item>
                <el-form-item label="签名事由" :span="2">
                  <el-input v-model="formData.signatureReason" placeholder="签名事由" />
                </el-form-item>
              </div>
            </section>

            <!-- 备注 -->
            <section class="id-section">
              <div class="id-section-title">备注</div>
              <div class="id-form-grid">
                <el-form-item label="备忘录" :span="2">
                  <el-input v-model="formData.memo" type="textarea" :rows="2" placeholder="备忘录" />
                </el-form-item>
                <el-form-item label="备注" :span="2">
                  <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="备注" />
                </el-form-item>
              </div>
            </section>
          </el-form>
        </template>

        <template v-else>
          <!-- 查看模式：el-descriptions（与 RepairDetailDialog 一致风格） -->
          <!-- 基本信息 -->
          <section class="id-section">
            <div class="id-section-title">基本信息</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="记录编号"><span class="font-mono">{{ fmt(formData.recordNo) }}</span></el-descriptions-item>
              <el-descriptions-item label="处理单号">{{ fmt(formData.processNo) }}</el-descriptions-item>
              <el-descriptions-item label="表单版本">{{ fmt(formData.formVersion) }}</el-descriptions-item>
              <el-descriptions-item label="物料代码"><span class="font-mono">{{ fmt(formData.materialCode) }}</span></el-descriptions-item>
              <el-descriptions-item label="物料名称">{{ fmt(formData.materialName) }}</el-descriptions-item>
              <el-descriptions-item label="规格型号">{{ fmt(formData.specModel) }}</el-descriptions-item>
              <el-descriptions-item label="物料批号"><span class="font-mono">{{ fmt(formData.materialBatchNo) }}</span></el-descriptions-item>
              <el-descriptions-item label="物料分类">{{ fmt(formData.materialCategory) }}</el-descriptions-item>
              <el-descriptions-item label="单位">{{ fmt(formData.unit) }}</el-descriptions-item>
              <el-descriptions-item label="是否急料">{{ fmt(formData.isUrgent) }}</el-descriptions-item>
              <el-descriptions-item label="是否客供料">{{ fmt(formData.isCustomerSupplied) }}</el-descriptions-item>
              <el-descriptions-item label="是否有效">{{ fmt(formData.isValid) }}</el-descriptions-item>
            </el-descriptions>
          </section>

          <!-- 采购入库 -->
          <section class="id-section">
            <div class="id-section-title">采购入库</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="采购订单">{{ fmt(formData.purchaseOrder) }}</el-descriptions-item>
              <el-descriptions-item label="采购订单行号">{{ fmt(formData.poLineNo) }}</el-descriptions-item>
              <el-descriptions-item label="入库单号"><span class="font-mono">{{ fmt(formData.inboundNo) }}</span></el-descriptions-item>
              <el-descriptions-item label="收料单号">{{ fmt(formData.receivingNo) }}</el-descriptions-item>
              <el-descriptions-item label="收货单行号">{{ fmt(formData.receivingLineNo) }}</el-descriptions-item>
              <el-descriptions-item label="送检单号">{{ fmt(formData.inspectionRequestNo) }}</el-descriptions-item>
              <el-descriptions-item label="MES检验单号">{{ fmt(formData.mesInspectionNo) }}</el-descriptions-item>
              <el-descriptions-item label="来料日期">{{ fmt(formData.arrivalDate) }}</el-descriptions-item>
            </el-descriptions>
          </section>

          <!-- 检验信息 -->
          <section class="id-section">
            <div class="id-section-title">检验信息</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="检验日期">{{ fmt(formData.inspectionDate) }}</el-descriptions-item>
              <el-descriptions-item label="检验结束日期">{{ fmt(formData.inspectionEndDate) }}</el-descriptions-item>
              <el-descriptions-item label="判定日期">{{ fmt(formData.judgementDate) }}</el-descriptions-item>
              <el-descriptions-item label="检验人员">{{ fmt(formData.inspector) }}</el-descriptions-item>
              <el-descriptions-item label="判定人">{{ fmt(formData.judge) }}</el-descriptions-item>
              <el-descriptions-item label="检验分类">{{ fmt(formData.inspectionCategory) }}</el-descriptions-item>
              <el-descriptions-item label="检验结果">
                <el-tag :type="resultTag(formData.inspectionResult)" size="small" effect="light">
                  {{ formData.inspectionResult || '—' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="送检数量"><span class="font-mono">{{ fmtNum(formData.submittedQty) }}</span></el-descriptions-item>
              <el-descriptions-item label="合格数量"><span class="font-mono" style="color:#3E7A4E">{{ fmtNum(formData.qualifiedQty) }}</span></el-descriptions-item>
              <el-descriptions-item label="不合格数量"><span class="font-mono" style="color:#B84B3E">{{ fmtNum(formData.unqualifiedQty) }}</span></el-descriptions-item>
              <el-descriptions-item label="损耗数"><span class="font-mono">{{ fmtNum(formData.lossQty) }}</span></el-descriptions-item>
            </el-descriptions>
          </section>

          <!-- 供应商/送检 -->
          <section class="id-section">
            <div class="id-section-title">供应商与送检</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="供应商名称">{{ fmt(formData.supplierName) }}</el-descriptions-item>
              <el-descriptions-item label="供应商编号"><span class="font-mono">{{ fmt(formData.supplierCode) }}</span></el-descriptions-item>
              <el-descriptions-item label="送检人">{{ fmt(formData.submitter) }}</el-descriptions-item>
              <el-descriptions-item label="送检日期">{{ fmt(formData.submitDate) }}</el-descriptions-item>
              <el-descriptions-item label="保质期(天)" :span="2">{{ fmtNum(formData.shelfLifeDays) }}</el-descriptions-item>
            </el-descriptions>
          </section>

          <!-- 不良处理 -->
          <section class="id-section">
            <div class="id-section-title">不良处理</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="不合格描述" :span="2">
                <div class="id-pre">{{ formData.defectDesc || '—' }}</div>
              </el-descriptions-item>
              <el-descriptions-item label="处理方式">{{ fmt(formData.handlingMethod) }}</el-descriptions-item>
              <el-descriptions-item label="不合格最终状态">{{ fmt(formData.unqualifiedFinalStatus) }}</el-descriptions-item>
              <el-descriptions-item label="不合格评审">{{ fmt(formData.unqualifiedReview) }}</el-descriptions-item>
              <el-descriptions-item label="不合格评审单号">{{ fmt(formData.unqualifiedReviewNo) }}</el-descriptions-item>
              <el-descriptions-item label="重检备注" :span="2">{{ fmt(formData.reinspectRemark) }}</el-descriptions-item>
            </el-descriptions>
          </section>

          <!-- 审核与标识 -->
          <section class="id-section">
            <div class="id-section-title">审核与标识</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="审核状态">
                <el-tag :type="reviewTag(formData.reviewStatus)" size="small" effect="light">
                  {{ fmt(formData.reviewStatus) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="审核人">{{ fmt(formData.reviewer) }}</el-descriptions-item>
              <el-descriptions-item label="审核日期" :span="2">{{ fmt(formData.reviewDate) }}</el-descriptions-item>
              <el-descriptions-item label="签名状态">
                <el-tag :type="formData.signatureStatus === '已签' ? 'success' : 'info'" size="small" effect="light">
                  {{ fmt(formData.signatureStatus) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="数据记录标识">{{ fmt(formData.dataRecordFlag) }}</el-descriptions-item>
              <el-descriptions-item label="是否失效">{{ fmt(formData.isInvalid) }}</el-descriptions-item>
              <el-descriptions-item label="报告生成">{{ fmt(formData.reportGenerated) }}</el-descriptions-item>
            </el-descriptions>
          </section>

          <!-- 电子签名 -->
          <section v-if="hasSignature" class="id-section">
            <div class="id-section-title">电子签名</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="签名人">{{ fmt(formData.signatureUser) }}</el-descriptions-item>
              <el-descriptions-item label="签名时间">{{ fmt(formData.signatureTime) }}</el-descriptions-item>
              <el-descriptions-item label="签名事由" :span="2">{{ fmt(formData.signatureReason) }}</el-descriptions-item>
            </el-descriptions>
          </section>

          <!-- 备注 -->
          <section class="id-section">
            <div class="id-section-title">备注</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="备忘录" :span="2">
                <div class="id-pre">{{ formData.memo || '—' }}</div>
              </el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">
                <div class="id-pre">{{ formData.remark || '—' }}</div>
              </el-descriptions-item>
              <el-descriptions-item label="最后修改人">{{ fmt(formData.lastModifiedBy) }}</el-descriptions-item>
              <el-descriptions-item label="记录ID">{{ formData.id || '—' }}</el-descriptions-item>
            </el-descriptions>
          </section>
        </template>
      </el-scrollbar>
    </div>

    <template #footer>
      <div class="id-footer">
        <span v-if="!isCreate && !isEditing" class="id-hint">点击"编辑"可修改字段值</span>
        <span v-else></span>
        <div class="id-footer-btns">
          <template v-if="isEditing">
            <el-button @click="cancelEdit">取消</el-button>
            <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
          </template>
          <template v-else-if="isCreate">
            <el-button @click="emit('update:modelValue', false)">取消</el-button>
            <el-button type="primary" :loading="saving" @click="handleSave">创建</el-button>
          </template>
          <template v-else>
            <el-button @click="emit('update:modelValue', false)">关闭</el-button>
            <el-button type="primary" @click="enterEdit">编辑</el-button>
          </template>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { MaterialInspection } from '@/types/incoming'
import type { TagProps, FormInstance } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  detail?: MaterialInspection | null
  mode?: 'create' | 'view'
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: [data: Partial<MaterialInspection>]
}>()

const isCreate = computed(() => props.mode === 'create')
const isEditing = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()

// 深拷贝表单数据
const formData = reactive<Record<string, any>>({
  id: undefined,
  recordNo: '',
  processNo: '',
  formVersion: '',
  isCustomerSupplied: '否',
  memo: '',
  materialCategory: '',
  isValid: '是',
  reviewStatus: '待审核',
  signatureStatus: '未签',
  isUrgent: '否',
  dataRecordFlag: '否',
  isInvalid: '否',
  reportGenerated: '否',
  purchaseOrder: '',
  inboundNo: '',
  inspectionRequestNo: '',
  mesInspectionNo: '',
  inspectionDate: '',
  judgementDate: '',
  inspector: '',
  inspectionResult: '',
  supplierName: '',
  supplierCode: '',
  materialCode: '',
  materialName: '',
  specModel: '',
  materialBatchNo: '',
  qualifiedQty: null as number | null,
  unqualifiedQty: null as number | null,
  submittedQty: null as number | null,
  lossQty: null as number | null,
  unit: '',
  defectDesc: '',
  handlingMethod: '',
  unqualifiedFinalStatus: '',
  unqualifiedReview: '',
  unqualifiedReviewNo: '',
  inspectionCategory: '',
  arrivalDate: '',
  receivingNo: '',
  poLineNo: '',
  receivingLineNo: '',
  shelfLifeDays: null as number | null,
  reinspectRemark: '',
  judge: '',
  inspectionEndDate: '',
  reviewer: '',
  reviewDate: '',
  submitter: '',
  submitDate: '',
  remark: '',
  lastModifiedBy: '',
  signatureUser: '',
  signatureTime: '',
  signatureReason: '',
  plantCode: '',
  plantName: '',
})

function resetForm() {
  Object.assign(formData, {
    id: undefined,
    recordNo: '', processNo: '', formVersion: '', isCustomerSupplied: '否', memo: '',
    materialCategory: '', isValid: '是', reviewStatus: '待审核', signatureStatus: '未签',
    isUrgent: '否', dataRecordFlag: '否', isInvalid: '否', reportGenerated: '否',
    purchaseOrder: '', inboundNo: '', inspectionRequestNo: '', mesInspectionNo: '',
    inspectionDate: '', judgementDate: '', inspector: '', inspectionResult: '',
    supplierName: '', supplierCode: '', materialCode: '', materialName: '', specModel: '',
    materialBatchNo: '', qualifiedQty: null, unqualifiedQty: null, submittedQty: null,
    lossQty: null, unit: '', defectDesc: '', handlingMethod: '',
    unqualifiedFinalStatus: '', unqualifiedReview: '', unqualifiedReviewNo: '',
    inspectionCategory: '', arrivalDate: '', receivingNo: '', poLineNo: '',
    receivingLineNo: '', shelfLifeDays: null, reinspectRemark: '', judge: '',
    inspectionEndDate: '', reviewer: '', reviewDate: '', submitter: '', submitDate: '',
    remark: '', lastModifiedBy: '', signatureUser: '', signatureTime: '', signatureReason: '',
    plantCode: '', plantName: '',
  })
}

function loadDetail(d: MaterialInspection) {
  Object.assign(formData, {
    id: d.id, recordNo: d.recordNo, processNo: d.processNo ?? '',
    formVersion: d.formVersion ?? '', isCustomerSupplied: d.isCustomerSupplied ?? '否',
    memo: d.memo ?? '', materialCategory: d.materialCategory ?? '',
    isValid: d.isValid ?? '是', reviewStatus: d.reviewStatus ?? '待审核',
    signatureStatus: d.signatureStatus ?? '未签', isUrgent: d.isUrgent ?? '否',
    dataRecordFlag: d.dataRecordFlag ?? '否', isInvalid: d.isInvalid ?? '否',
    reportGenerated: d.reportGenerated ?? '否', purchaseOrder: d.purchaseOrder ?? '',
    inboundNo: d.inboundNo ?? '', inspectionRequestNo: d.inspectionRequestNo ?? '',
    mesInspectionNo: d.mesInspectionNo ?? '', inspectionDate: d.inspectionDate ?? '',
    judgementDate: d.judgementDate ?? '', inspector: d.inspector ?? '',
    inspectionResult: d.inspectionResult ?? '', supplierName: d.supplierName ?? '',
    supplierCode: d.supplierCode ?? '', materialCode: d.materialCode ?? '',
    materialName: d.materialName ?? '', specModel: d.specModel ?? '',
    materialBatchNo: d.materialBatchNo ?? '', qualifiedQty: d.qualifiedQty ?? null,
    unqualifiedQty: d.unqualifiedQty ?? null, submittedQty: d.submittedQty ?? null,
    lossQty: d.lossQty ?? null, unit: d.unit ?? '', defectDesc: d.defectDesc ?? '',
    handlingMethod: d.handlingMethod ?? '', unqualifiedFinalStatus: d.unqualifiedFinalStatus ?? '',
    unqualifiedReview: d.unqualifiedReview ?? '', unqualifiedReviewNo: d.unqualifiedReviewNo ?? '',
    inspectionCategory: d.inspectionCategory ?? '', arrivalDate: d.arrivalDate ?? '',
    receivingNo: d.receivingNo ?? '', poLineNo: d.poLineNo ?? '',
    receivingLineNo: d.receivingLineNo ?? '', shelfLifeDays: d.shelfLifeDays ?? null,
    reinspectRemark: d.reinspectRemark ?? '', judge: d.judge ?? '',
    inspectionEndDate: d.inspectionEndDate ?? '', reviewer: d.reviewer ?? '',
    reviewDate: d.reviewDate ?? '', submitter: d.submitter ?? '',
    submitDate: d.submitDate ?? '', remark: d.remark ?? '',
    lastModifiedBy: d.lastModifiedBy ?? '', signatureUser: d.signatureUser ?? '',
    signatureTime: d.signatureTime ?? '', signatureReason: d.signatureReason ?? '',
    plantCode: d.plantCode ?? '', plantName: d.plantName ?? '',
  })
}

// 监听外部 detail 变化
watch(
  () => props.detail,
  (d) => {
    if (d && !isCreate.value) {
      loadDetail(d)
    }
  },
  { immediate: true },
)

// 监听弹窗打开/关闭
watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      isEditing.value = isCreate.value
      if (isCreate.value) {
        resetForm()
      } else if (props.detail) {
        loadDetail(props.detail)
      }
    }
  },
)

const hasSignature = computed(
  () => !!(formData.signatureUser || formData.signatureTime || formData.signatureReason),
)

function resultTag(r: string): TagProps['type'] {
  return r === '合格' ? 'success' : r === '不合格' ? 'danger' : 'info'
}

function reviewTag(s: string): TagProps['type'] {
  if (s === '已审核') return 'success'
  if (s === '驳回') return 'danger'
  if (s === '待审核') return 'warning'
  return 'info'
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string' && v.trim() === '') return '—'
  if (typeof v === 'number') return String(v)
  return String(v)
}

function fmtNum(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'string' ? Number(v) : v
  return Number.isNaN(n) ? '—' : String(n)
}

function enterEdit() {
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  if (props.detail) loadDetail(props.detail)
}

async function handleSave() {
  saving.value = true
  try {
    // 构建提交数据（过滤空字符串为 undefined 但保留原值）
    const data: Record<string, any> = {}
    for (const [k, v] of Object.entries(formData)) {
      data[k] = v
    }
    emit('saved', data)
  } finally {
    saving.value = false
  }
}

function onClosed() {
  isEditing.value = false
}
</script>

<style scoped>
.incoming-detail-dialog :deep(.el-dialog__body) {
  padding: 0;
}
.id-body {
  padding: 0;
}
.id-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #1b3a5b 0%, #2c4f78 100%);
  color: #fff;
}
.id-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.id-no {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.id-sub {
  font-size: 12px;
  opacity: 0.85;
}
.id-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.id-scroll {
  padding: 16px 20px 4px;
}
.id-section {
  margin-bottom: 18px;
}
.id-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5b;
  padding-left: 9px;
  border-left: 3px solid #b8763e;
  margin-bottom: 10px;
  line-height: 1.2;
}
.id-pre {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  color: #333;
}
.font-mono {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

/* 表单网格 */
.id-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}
.id-form-grid :deep(.el-form-item) {
  margin-bottom: 12px;
}
.id-form-grid :deep(.el-form-item__label) {
  font-size: 12px;
  color: #5b6770;
  padding-bottom: 2px;
}

/* 底部栏 */
.id-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.id-hint {
  font-size: 12px;
  color: #8c9ba8;
}
.id-footer-btns {
  display: flex;
  gap: 8px;
}
</style>

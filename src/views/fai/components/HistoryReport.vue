<template>
  <div class="history-report">
    <div class="toolbar">
      <el-form :inline="true" class="search-form">
        <el-form-item label="首件编号">
          <el-input v-model="filters.faiNo" placeholder="编号/模糊" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="物料名称">
          <el-input v-model="filters.materialName" placeholder="模糊" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input v-model="filters.batchNo" placeholder="精确" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="load">查询</el-button>
          <el-button :icon="RefreshLeft" @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="store.inspectionList" v-loading="store.loading" border stripe height="400">
      <el-table-column prop="faiNo" label="首件编号" width="190" />
      <el-table-column prop="materialName" label="物料名称" min-width="140" />
      <el-table-column prop="batchNo" label="批次号" width="130" />
      <el-table-column prop="processName" label="工序" width="90" />
      <el-table-column label="判定结果" width="100">
        <template #default="{ row }">
          <el-tag :type="resultTag(row.inspectionResult)" effect="light">{{ row.inspectionResult }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="签名状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.signatureStatus === '已签' ? 'success' : 'info'" effect="plain">
            {{ row.signatureStatus }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link :icon="Document" @click="openReport(row.id)">查看报告</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 报告详情 -->
    <el-dialog v-model="detailVisible" title="首件检验报告" width="780px">
      <div v-if="report" v-loading="reportLoading">
        <InspectionResult :record="report" class="block-alert" />

        <el-descriptions :column="2" border size="small" class="block-alert">
          <el-descriptions-item label="首件编号">{{ report.faiNo }}</el-descriptions-item>
          <el-descriptions-item label="物料名称">{{ report.materialName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="批次号">{{ report.batchNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="工序">{{ report.processName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ report.createdBy || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ report.createdAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="签名状态">{{ report.signatureStatus || '-' }}</el-descriptions-item>
          <el-descriptions-item label="签名人数">{{ (report.signatures || []).length }}</el-descriptions-item>
        </el-descriptions>

        <div class="section-title">检验参数明细</div>
        <el-table :data="report.items" border stripe size="small">
          <el-table-column prop="paramName" label="参数名称" min-width="130" />
          <el-table-column prop="standardValue" label="标准值" width="100" />
          <el-table-column prop="lowerLimit" label="下限" width="90" />
          <el-table-column prop="upperLimit" label="上限" width="90" />
          <el-table-column prop="actualValue" label="实际值" width="100" />
          <el-table-column prop="unit" label="单位" width="70" />
          <el-table-column label="判定" width="90">
            <template #default="{ row }">
              <el-tag :type="resultTag(row.result)" effect="light">{{ row.result }}</el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div class="section-title">电子签名记录</div>
        <el-table :data="report.signatures" border stripe size="small" empty-text="暂无签名">
          <el-table-column prop="signerName" label="签名人" width="140" />
          <el-table-column prop="signType" label="类型" width="100" />
          <el-table-column prop="signReason" label="原因" min-width="160" />
          <el-table-column prop="signedAt" label="签名时间" width="180" />
          <el-table-column prop="signatureHash" label="SHA-256 摘要" min-width="260" show-overflow-tooltip />
        </el-table>

        <div v-if="spcData.length" class="section-title">SPC 联动基准数据</div>
        <el-table v-if="spcData.length" :data="spcData" border stripe size="small">
          <el-table-column prop="paramCode" label="参数编码" width="120" />
          <el-table-column prop="paramName" label="参数名称" min-width="140" />
          <el-table-column prop="value" label="实际值" width="120" />
          <el-table-column prop="sampleTime" label="采样时间" width="180" />
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Search, RefreshLeft, Document } from '@element-plus/icons-vue'
import { useFaiStore } from '@/stores/fai'
import { getInspectionReportApi, getSpcBaselineApi } from '@/api/fai'
import InspectionResult from './InspectionResult.vue'
import type { FaiReportResponse, FaiSpcBaselineVO } from '@/types/fai'

const store = useFaiStore()
const filters = reactive({
  faiNo: '',
  materialName: '',
  batchNo: '',
})
const detailVisible = ref(false)
const report = ref<FaiReportResponse | null>(null)
const reportLoading = ref(false)
const spcData = ref<FaiSpcBaselineVO[]>([])

function resultTag(r: string) {
  if (r === '合格') return 'success'
  if (r === '不合格') return 'danger'
  return 'warning'
}

async function load() {
  await store.fetchInspections({ ...filters })
}

function reset() {
  filters.faiNo = ''
  filters.materialName = ''
  filters.batchNo = ''
  load()
}

async function openReport(id: number) {
  detailVisible.value = true
  report.value = null
  spcData.value = []
  reportLoading.value = true
  try {
    const res = await getInspectionReportApi(id)
    report.value = res.data || null
    const spc = await getSpcBaselineApi(id)
    spcData.value = spc.data || []
  } finally {
    reportLoading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  margin-bottom: 14px;
}
.search-form :deep(.el-form-item) {
  margin-bottom: 8px;
}
.block-alert {
  margin-bottom: 14px;
}
.section-title {
  font-weight: 600;
  color: #1b3a5b;
  margin: 14px 0 8px;
}
</style>

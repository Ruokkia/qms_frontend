<template>
  <el-form :inline="true" :model="form" class="an-filter" @submit.prevent>
    <el-form-item label="时间范围">
      <el-date-picker
        v-model="form.dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="~"
        start-placeholder="开始"
        end-placeholder="结束"
        :clearable="false"
        style="width: 240px"
      />
    </el-form-item>
    <el-form-item label="指标">
      <el-select v-model="form.metric" style="width: 130px">
        <el-option label="不良数量" value="defectQty" />
        <el-option label="维修条数" value="repairCount" />
        <el-option label="报废数量" value="scrapQty" />
      </el-select>
    </el-form-item>
    <el-form-item label="维度">
      <el-select v-model="form.dim" style="width: 130px">
        <el-option label="生产工序" value="process" />
        <el-option label="不良代码" value="defectCode" />
        <el-option label="不良现象" value="defectPhenomenon" />
      </el-select>
    </el-form-item>
    <el-form-item label="粒度">
      <el-select v-model="form.granularity" style="width: 110px">
        <el-option label="月" value="MONTH" />
        <el-option label="周" value="WEEK" />
        <el-option label="季" value="QUARTER" />
      </el-select>
    </el-form-item>
    <el-form-item label="环比">
      <el-select v-model="form.momMode" style="width: 150px">
        <el-option label="自动上一周期" value="auto" />
        <el-option label="自定义对比期" value="custom" />
      </el-select>
    </el-form-item>
    <el-form-item v-if="form.momMode === 'custom'" label="对比起始">
      <el-date-picker
        v-model="form.momStart"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="对比期起始"
        style="width: 150px"
      />
    </el-form-item>
    <el-form-item label="同比回溯(年)">
      <el-input-number
        v-model="form.yoyYearsAgo"
        :min="1"
        :max="10"
        :step="1"
        controls-position="right"
        style="width: 110px"
      />
    </el-form-item>
    <el-form-item label="排除草稿">
      <el-switch v-model="form.excludeDraft" />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="emitSearch">查询</el-button>
      <el-button @click="reset">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { DefectAnalyticsQuery } from '@/types/production-defect'

const emit = defineEmits<{ (e: 'search', q: DefectAnalyticsQuery): void }>()

function defaultRange(): [string, string] {
  const y = new Date().getFullYear()
  return [`${y}-01-01`, `${y}-12-31`]
}

const form = reactive({
  dateRange: defaultRange() as [string, string],
  metric: 'defectQty' as DefectAnalyticsQuery['metric'],
  dim: 'process' as DefectAnalyticsQuery['dim'],
  granularity: 'MONTH' as DefectAnalyticsQuery['granularity'],
  momMode: 'auto' as DefectAnalyticsQuery['momMode'],
  momStart: '',
  yoyYearsAgo: 1,
  excludeDraft: true,
})

function buildQuery(): DefectAnalyticsQuery {
  const q: DefectAnalyticsQuery = {
    start: form.dateRange?.[0],
    end: form.dateRange?.[1],
    metric: form.metric,
    dim: form.dim,
    granularity: form.granularity,
    momMode: form.momMode,
    yoyYearsAgo: form.yoyYearsAgo,
    excludeDraft: form.excludeDraft,
  }
  if (form.momMode === 'custom' && form.momStart) q.momStart = form.momStart
  return q
}

function emitSearch() {
  emit('search', buildQuery())
}

function reset() {
  form.dateRange = defaultRange()
  form.metric = 'defectQty'
  form.dim = 'process'
  form.granularity = 'MONTH'
  form.momMode = 'auto'
  form.momStart = ''
  form.yoyYearsAgo = 1
  form.excludeDraft = true
  emitSearch()
}

defineExpose({ emitSearch })
</script>

<style scoped>
.an-filter {
  background: #f7f5f2;
  border: 1px solid #e6e0d8;
  border-radius: 8px;
  padding: 12px 16px 0;
  margin-bottom: 12px;
}
</style>

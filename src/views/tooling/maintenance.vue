<template>
  <div class="page">
    <header><h1>工装维修和保养</h1><p>查看周/月/年保养到期提醒及工装高频故障根因分析。</p></header>
    <div class="toolbar"><el-button type="primary" @click="loadReminders">到期保养提醒</el-button><el-button @click="loadFailures">故障统计图</el-button></div>
    <div ref="chart" class="chart"></div>
    <el-table :data="rows" stripe empty-text="点击按钮加载保养提醒或故障统计"><el-table-column prop="dueDate" label="到期日/统计"/><el-table-column prop="faultDescription" label="故障类型"/><el-table-column prop="rootCause" label="根本原因"/><el-table-column prop="status" label="状态/次数"/></el-table>
  </div>
</template>
<script setup lang="ts">
import { nextTick, ref } from 'vue'
import * as echarts from 'echarts'
import { getToolingFailureStats, getToolingReminders } from '@/api/supplierTooling'
const rows = ref<any[]>([]), chart = ref<HTMLElement>()
async function loadReminders() { const r = await getToolingReminders(); if (r.code === 0) rows.value = r.data }
async function loadFailures() { const r = await getToolingFailureStats(); if (r.code !== 0) return; rows.value = r.data.map(item => ({ dueDate: '故障统计', faultDescription: item.faultType, rootCause: item.rootCause, status: `${item.count} 次` })); await nextTick(); echarts.init(chart.value!).setOption({ tooltip: {}, xAxis: { type: 'category', data: r.data.map(item => item.faultType) }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: r.data.map(item => item.count), itemStyle: { color: '#25728a' } }] }) }
</script>
<style scoped>.page{max-width:1440px;margin:0 auto;padding:24px 32px}.toolbar{display:flex;gap:10px;margin:16px 0}.chart{height:300px}</style>

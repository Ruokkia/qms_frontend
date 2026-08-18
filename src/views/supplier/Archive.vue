<template>
  <div class="supplier-archive-page">
    <!-- 题头 -->
    <header class="page-header">
      <div class="header-left">
        <h1 class="header-title">供应商档案管理</h1>
        <p class="header-sub">
          按供应商聚合来料与来料异常数据 · {{ auth.user?.plantName }}分公司
        </p>
      </div>
      <div class="header-actions">
        <el-tag v-if="selectedSupplier" type="primary" effect="plain" size="large">
          {{ selectedSupplier.supplierName }}（{{ selectedSupplier.supplierCode }}）
        </el-tag>
      </div>
    </header>

    <!-- 供应商列表：可浏览 + 分页查询 -->
    <section class="list-card">
      <SupplierList :selected-id="selectedSupplier?.id" @select="onSupplierSelect" />
    </section>

    <!-- 未选择供应商：空态引导 -->
    <section v-if="!selectedSupplier" class="empty-state">
      <el-empty description="请在上方供应商列表中选择一家，查看其来料与来料异常档案" />
    </section>

    <template v-else>
      <!-- 供应商基础信息卡 -->
      <section class="info-card">
        <div class="info-head">
          <div>
            <div class="info-name">{{ selectedSupplier.supplierName }}</div>
            <div class="info-code">编号：{{ selectedSupplier.supplierCode || '—' }}</div>
          </div>
          <div class="info-tags">
            <el-tag :type="riskTagType" effect="dark" size="small">{{ selectedSupplier.riskLevel || '未评级' }}</el-tag>
            <el-tag :type="selectedSupplier.status === '停用' ? 'info' : 'success'" size="small">
              {{ selectedSupplier.status || '未知' }}
            </el-tag>
          </div>
        </div>
        <div class="info-meta">
          <span>联系人：{{ selectedSupplier.contactPerson || '—' }}</span>
          <span>电话：{{ selectedSupplier.contactPhone || '—' }}</span>
          <span>地址：{{ selectedSupplier.address || '—' }}</span>
        </div>
      </section>

      <!-- 四大节点 Tab -->
      <el-tabs v-model="activeTab" class="archive-tabs">
        <el-tab-pane label="来料" name="incoming">
          <IncomingTable :supplier="selectedSupplier" />
        </el-tab-pane>
        <el-tab-pane label="来料异常" name="exception">
          <ExceptionTable :supplier="selectedSupplier" />
        </el-tab-pane>
        <el-tab-pane label="资质证照" name="qualification">
          <QualificationTable v-if="auditSupplierId" :supplier-id="auditSupplierId" />
        </el-tab-pane>
        <el-tab-pane label="高风险物料" name="risk">
          <SupplierRiskMaterial v-if="auditSupplierId" :supplier-id="auditSupplierId" :can-edit="auth.isAdmin || auth.isQualityManager" />
        </el-tab-pane>
        <el-tab-pane label="审核计划" name="audit">
          <SupplierAuditLinkage v-if="auditSupplierId" :supplier-id="auditSupplierId" />
        </el-tab-pane>
        <el-tab-pane label="物料变更" name="change">
          <SupplierChangeTable v-if="auditSupplierId" :supplier-id="auditSupplierId" :can-edit="auth.isAdmin || auth.isQualityManager" />
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { Supplier } from '@/api/supplier'
import SupplierList from './components/SupplierList.vue'
import IncomingTable from './components/IncomingTable.vue'
import ExceptionTable from './components/ExceptionTable.vue'
import ComingSoon from './components/ComingSoon.vue'
import SupplierAuditLinkage from './components/SupplierAuditLinkage.vue'
import QualificationTable from './components/QualificationTable.vue'
import SupplierRiskMaterial from './components/SupplierRiskMaterial.vue'
import SupplierChangeTable from './components/SupplierChangeTable.vue'

const auth = useAuthStore()

const selectedSupplier = ref<Supplier | null>(null)

const activeTab = ref<'incoming' | 'exception' | 'qualification' | 'risk' | 'audit' | 'change'>('incoming')

const auditSupplierId = computed(() => selectedSupplier.value?.id ?? undefined)

const riskTagType = computed<'danger' | 'warning' | ''>(() => {
  if (selectedSupplier.value?.riskLevel === '高') return 'danger'
  if (selectedSupplier.value?.riskLevel === '中') return 'warning'
  return ''
})

function onSupplierSelect(supplier: Supplier) {
  selectedSupplier.value = supplier
  activeTab.value = 'incoming'
}
</script>

<style scoped>
.supplier-archive-page {
  padding: 4px 8px 24px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.header-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}
.header-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
}
.empty-state {
  background: #fff;
  border-radius: 12px;
  padding: 48px 0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}
.list-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}
.info-card {
  background: linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}
.info-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.info-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}
.info-code {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
}
.info-tags {
  display: flex;
  gap: 8px;
}
.info-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 12px;
  font-size: 13px;
  color: #4b5563;
}
.archive-tabs {
  background: #fff;
  border-radius: 12px;
  padding: 8px 16px 16px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}
</style>

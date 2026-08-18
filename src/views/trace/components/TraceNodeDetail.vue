<template>
  <FinishedGoodsDetailDialog v-model="finishedVisible" :detail="finishedDetail" :edit-mode="false" readonly />
  <IncomingDetailDialog v-model="incomingVisible" :detail="incomingDetail" mode="view" readonly />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getFinishedGoodsDetailApi, getFinishedGoodsByBarcodeApi } from '@/api/finishedGoods'
import { getMaterialInspectionDetailApi, getMaterialInspectionByBarcodeApi } from '@/api/incoming'
import type { TraceNode } from '@/types/trace'
import type { FinishedGoodsInspection } from '@/types/finishedGoods'
import type { MaterialInspection } from '@/types/incoming'
import { resolveTraceDetailTarget } from '@/utils/trace-detail-target'
import FinishedGoodsDetailDialog from '@/views/finished-goods/components/FinishedGoodsDetailDialog.vue'
import IncomingDetailDialog from '@/views/incoming/components/IncomingDetailDialog.vue'

const props = defineProps<{ visible: boolean; node: TraceNode | null }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()
const finishedVisible = ref(false), incomingVisible = ref(false)
const finishedDetail = ref<FinishedGoodsInspection | null>(null)
const incomingDetail = ref<MaterialInspection | null>(null)

async function openBusinessDetail() {
  const node = props.node
  if (!node) return
  try {
    const target = resolveTraceDetailTarget(node.id, node.nodeType, node.sonLotNo)
    if (!target) {
      ElMessage.warning('该节点未关联成品或来料业务明细')
      return
    }
    if (target.kind === 'finished') {
      const res = 'barcode' in target ? await getFinishedGoodsByBarcodeApi(target.barcode) : await getFinishedGoodsDetailApi(target.id)
      if (res.code !== 0 || !res.data) throw new Error(res.message || '未找到成品明细')
      finishedDetail.value = res.data; finishedVisible.value = true
    } else {
      const res = 'barcode' in target ? await getMaterialInspectionByBarcodeApi(target.barcode) : await getMaterialInspectionDetailApi(target.id)
      if (res.code !== 0 || !res.data) throw new Error(res.message || '未找到来料明细')
      incomingDetail.value = res.data; incomingVisible.value = true
    }
  } catch (error: any) { ElMessage.error(error?.message || '加载详细信息失败') }
  finally { emit('update:visible', false) }
}
watch(() => props.visible, visible => { if (visible) openBusinessDetail() })
</script>

<template>
  <div class="trigger-list">
    <div class="toolbar">
      <el-form :inline="true" class="search-form">
        <el-form-item label="变更类型">
          <el-select v-model="filters.triggerType" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="t in triggerTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item :label="codeLabel">
          <el-input v-model="filters.materialCode" :placeholder="codeLabel" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input v-model="filters.batchNo" placeholder="精确" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="s in statuses" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="showVoided" @change="load">显示已作废</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="load">查询</el-button>
          <el-button :icon="RefreshLeft" @click="reset">重置</el-button>
          <el-button type="warning" :icon="Plus" @click="openNewForm">新增变更触发</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="displayList" v-loading="store.loading" border stripe :max-height="tableMaxHeight" :row-class-name="rowClass">
      <el-table-column type="index" label="#" width="50" />
      <el-table-column prop="triggerType" label="变更类型" width="110" />
      <el-table-column :label="codeLabel" prop="itemCode" width="120">
        <template #default="{ row }">
          {{ row.itemCode || row.materialCode || '-' }}
        </template>
      </el-table-column>
      <el-table-column :label="nameLabel" prop="itemName" min-width="140">
        <template #default="{ row }">
          {{ row.itemName || row.materialName || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="batchNo" label="批次号" width="130" />
      <el-table-column prop="processName" label="工序" width="90" />
      <el-table-column prop="triggerReason" label="触发原因" min-width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)" effect="light">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="180" fixed="right">
        <template #default="{ row }">
          <!-- 场景1：草稿态（待检验 + 未建单）→ 可编辑 + 可生成检验单 + 可作废 -->
          <template v-if="!row.hasInspection && row.status === '待检验'">
            <el-button type="primary" link :icon="Edit" @click="editTrigger(row)">编辑</el-button>
            <el-button type="success" link :icon="Finished" @click="generate(row)">生成首件检验</el-button>
            <el-button type="danger" link :icon="CircleClose" @click="voidTrigger(row)">作废</el-button>
          </template>
          <!-- 场景2：已作废 → 灰标 -->
          <el-tag v-else-if="row.status === '已作废'" type="danger" effect="plain" size="small">
            已作废{{ row.voidReason ? `：${row.voidReason}` : '' }}
          </el-tag>
          <!-- 场景3：已建单/已检验 → 不可删不可作废，仅提供更正入口 -->
          <template v-else>
            <el-tag type="info" effect="plain" size="small">已建单·不可作废</el-tag>
            <el-button type="primary" link :icon="Edit" @click="correctTrigger(row)" style="margin-left:6px">新建更正单</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <ChangeTriggerForm
      v-model="showForm"
      :correct-from="correctFromRow"
      :mode="formMode"
      :editing-row="editingRow"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, reactive, ref, watch, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, RefreshLeft, Plus, Finished, CircleClose, Edit } from '@element-plus/icons-vue'
import { useFaiStore } from '@/stores/fai'
import { useAuthStore } from '@/stores/auth'
import ChangeTriggerForm from './ChangeTriggerForm.vue'
import type { FaiChangeTrigger } from '@/types/fai'
import type { ItemType } from '@/stores/itemType'

const emit = defineEmits<{
  inspectionCreated: []
}>()

const store = useFaiStore()
const auth = useAuthStore()
const showForm = ref(false)
/** 更正来源：传给 ChangeTriggerForm 用于预填上一个触发记录 */
const correctFromRow = ref<FaiChangeTrigger | null>(null)
/** 编辑模式与编辑来源：直接修改原记录 */
const formMode = ref<'create' | 'edit'>('create')
const editingRow = ref<FaiChangeTrigger | null>(null)

// 全局分类选择器（来自 FAI 父页面，强制二选一且持久化，恒为 PRODUCT/MATERIAL）
const faiItemType = inject<Ref<ItemType>>('faiItemType', ref<ItemType>('PRODUCT'))

const triggerTypes = ['换模具', '升级系统', '换批次', '换设备', '材料批次']
const statuses = ['待检验', '已检验', '关闭', '已作废']

// 表格高度自适应视口，避免整页上下滚动
const tableMaxHeight = ref(460)
function calcTableHeight() {
  tableMaxHeight.value = Math.max(300, window.innerHeight - 270)
}
onMounted(() => {
  calcTableHeight()
  window.addEventListener('resize', calcTableHeight)
})
onUnmounted(() => {
  window.removeEventListener('resize', calcTableHeight)
})

const showVoided = ref(false)

const filters = reactive<{
  triggerType: string
  materialCode: string
  batchNo: string
  status: string
}>({
  triggerType: '',
  materialCode: '',
  batchNo: '',
  status: '',
})

// 分类由顶部选择器唯一决定，切换后立即按新分类重新拉取
watch(() => faiItemType.value, () => load(), { immediate: true })

// 列头标签随分类精确切换（强制二选一后不存在混合态）
const typeLabel = computed(() => (faiItemType.value === 'PRODUCT' ? '产品' : '物料'))
const codeLabel = computed(() => `${typeLabel.value}代码`)
const nameLabel = computed(() => `${typeLabel.value}名称`)

/** 列表展示数据：默认隐藏已作废记录，勾选"显示已作废"后包含 */
const displayList = computed(() => {
  if (showVoided.value) return store.changeTriggerList
  return store.changeTriggerList.filter(row => row.status !== '已作废')
})

function statusTag(status: string) {
  if (status === '待检验') return 'warning'
  if (status === '已检验') return 'primary'
  if (status === '已作废') return 'danger'
  return 'info'
}

/** 已作废行置灰 */
function rowClass({ row }: { row: FaiChangeTrigger }) {
  return row.status === '已作废' ? 'voided-row' : ''
}

async function load() {
  // itemType 始终随顶部选择器透传，保证后端按分类过滤，产品与物料不再混排
  await store.fetchChangeTriggers({ ...filters, itemType: faiItemType.value })
}

function reset() {
  // 不重置分类：分类归顶部选择器统一管理，避免与其脱钩
  filters.triggerType = ''
  filters.materialCode = ''
  filters.batchNo = ''
  filters.status = ''
  showVoided.value = false
  load()
}

async function generate(row: FaiChangeTrigger) {
  try {
    await store.createInspection(row.id)
    ElMessage.success('首件检验单已生成，请在「首件检验执行」中录入')
    await load()
    emit('inspectionCreated')
  } catch {
    // 错误已由拦截器提示
  }
}

/** 场景1：作废变更触发（草稿态，未建单） */
async function voidTrigger(row: FaiChangeTrigger) {
  try {
    const { value: reason } = await ElMessageBox.prompt(
      `确定作废该变更触发记录吗？此操作不可撤销。`,
      '作废确认',
      {
        confirmButtonText: '确认作废',
        cancelButtonText: '取消',
        inputPlaceholder: '请填写作废原因',
        inputValidator(val: string) {
          if (!val || !val.trim()) return '作废原因不能为空'
          return true
        },
        type: 'warning',
      },
    )
    await store.voidChangeTrigger(row.id, reason!.trim())
    ElMessage.success('已作废')
    await load()
  } catch {
    // 用户取消或接口报错均静默
  }
}

/** 场景2：新建更正单（已建单的记录录入错误时走更正流程） */
function correctTrigger(row: FaiChangeTrigger) {
  correctFromRow.value = row
  showForm.value = true
}

/** 普通新增：清空更正来源 */
function openNewForm() {
  correctFromRow.value = null
  editingRow.value = null
  formMode.value = 'create'
  showForm.value = true
}

/** 编辑：直接修改原记录（草稿态），将原记录完整回填到表单 */
function editTrigger(row: FaiChangeTrigger) {
  correctFromRow.value = null
  editingRow.value = row
  formMode.value = 'edit'
  showForm.value = true
}

function onSaved() {
  showForm.value = false
  correctFromRow.value = null
  editingRow.value = null
  formMode.value = 'create'
  load()
}
</script>

<style scoped>
.toolbar {
  margin-bottom: 14px;
}
.search-form :deep(.el-form-item) {
  margin-bottom: 8px;
}
:deep(.voided-row) {
  background-color: #f8f8f8;
}
</style>

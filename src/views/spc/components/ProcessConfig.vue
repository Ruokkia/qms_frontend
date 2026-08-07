<template>
  <div class="process-config">
    <el-row :gutter="16">
      <!-- 左侧：工序列表 -->
      <el-col :span="9">
        <el-card shadow="never" class="cfg-card">
          <template #header>
            <div class="card-head">
              <span class="card-title">工序定义</span>
              <el-button type="primary" size="small" @click="openProcessDialog()">新增工序</el-button>
            </div>
          </template>
          <el-table
            :data="store.processList"
            highlight-current-row
            :current-row-key="selectedProcessId"
            @current-change="onProcessChange"
            height="460"
            size="small"
          >
            <el-table-column prop="processCode" label="编码" width="90" />
            <el-table-column prop="processName" label="工序" width="90" />
            <el-table-column prop="description" label="描述" show-overflow-tooltip />
            <el-table-column prop="isActive" label="状态" width="60">
              <template #default="{ row }">
                <el-tag :type="row.isActive === '否' ? 'info' : 'success'" size="small">{{ row.isActive === '否' ? '停用' : '启用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click.stop="openProcessDialog(row)">编辑</el-button>
                <el-popconfirm title="确认删除该工序？" @confirm="onDeleteProcess(row)">
                  <template #reference>
                    <el-button link type="danger" size="small" @click.stop>删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 右侧：参数列表 -->
      <el-col :span="15">
        <el-card shadow="never" class="cfg-card">
          <template #header>
            <div class="card-head">
              <span class="card-title">
                关键参数
                <span v-if="selectedProcess" class="sub-title">（{{ selectedProcess.processName }}）</span>
              </span>
              <el-button
                type="primary"
                size="small"
                :disabled="!selectedProcessId"
                @click="openParamDialog()"
              >新增参数</el-button>
            </div>
          </template>
          <el-table :data="paramsOfProcess" height="460" size="small" empty-text="请选择左侧工序">
            <el-table-column prop="paramCode" label="参数编码" width="100" />
            <el-table-column prop="paramName" label="参数名称" width="110" />
            <el-table-column prop="paramType" label="类型" width="70" />
            <el-table-column prop="unit" label="单位" width="60" />
            <el-table-column prop="decimalPlaces" label="小数位" width="70">
              <template #default="{ row }">
                <span>{{ row.decimalPlaces != null ? row.decimalPlaces : '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="isCritical" label="关键特性" width="85">
              <template #default="{ row }">
                <el-tag :type="row.isCritical === '是' ? 'danger' : 'info'" size="small">{{ row.isCritical === '是' ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click.stop="openParamDialog(row)">编辑</el-button>
                <el-popconfirm title="确认删除该参数？" @confirm="onDeleteParam(row)">
                  <template #reference>
                    <el-button link type="danger" size="small" @click.stop>删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 工序表单弹窗 -->
    <el-dialog v-model="processVisible" :title="processForm.id ? '编辑工序' : '新增工序'" width="460px">
      <el-form :model="processForm" label-width="80px" ref="processFormRef">
        <el-form-item label="工序编码" required>
          <el-input v-model="processForm.processCode" placeholder="如 ASM / WDG / INS" />
        </el-form-item>
        <el-form-item label="工序名称" required>
          <el-input v-model="processForm.processName" placeholder="输入工序名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="processForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch
            v-model="processForm.isActive"
            active-value="是"
            inactive-value="否"
            active-text="启用"
            inactive-text="停用"
          />
        </el-form-item>
        <el-form-item label="变更备注">
          <el-input v-model="processForm.changeRemark" type="textarea" :rows="2" placeholder="本次变更原因或说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitProcess">保存</el-button>
      </template>
    </el-dialog>

    <!-- 参数表单弹窗（字典层：仅管理参数基础信息；USL/LSL/目标/n/控制图归物料‑工序‑参数标准层配置） -->
    <el-dialog v-model="paramVisible" :title="paramForm.id ? '编辑参数' : '新增参数'" width="520px">
      <el-form :model="paramForm" label-width="96px" ref="paramFormRef">
        <el-form-item label="参数编码" required>
          <el-input v-model="paramForm.paramCode" placeholder="如 AX-DIA" />
        </el-form-item>
        <el-form-item label="参数名称" required>
          <el-input v-model="paramForm.paramName" />
        </el-form-item>
        <el-form-item label="参数类型">
          <el-select
            v-model="paramForm.paramType"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入参数类型"
            style="width:100%"
          >
            <el-option v-for="t in paramTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="单位">
              <el-input v-model="paramForm.unit" placeholder="mm / °C / MPa" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="小数位数">
              <el-input-number v-model="paramForm.decimalPlaces" :min="0" :max="6" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="关键特性">
              <el-switch
                v-model="paramForm.isCritical"
                active-value="是"
                inactive-value="否"
                active-text="是"
                inactive-text="否"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="启用状态">
              <el-switch
                v-model="paramForm.isActive"
                active-value="是"
                inactive-value="否"
                active-text="启用"
                inactive-text="停用"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="变更备注">
          <el-input v-model="paramForm.changeRemark" type="textarea" :rows="2" placeholder="本次变更原因或说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paramVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitParam">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useSpcStore } from '@/stores/spc'
import type { SpcProcess, SpcParameter } from '@/types/spc'

const store = useSpcStore()
const paramTypes = ['尺寸', '温度', '压力', '扭矩', '电压']
// 工序编码格式：2~5 位大写字母（与后端校验一致），用于提交前即时拦截脏编码
const PROCESS_CODE_RE = /^[A-Z]{2,5}$/
// 参数编码格式：大写字母+数字+连字符，2~15 位（如 AX-DIA / WDG-TEMP / INS-VOLT）
const PARAM_CODE_RE = /^[A-Z0-9][A-Z0-9-]{1,14}$/

const selectedProcessId = ref<number | null>(null)
const selectedProcess = computed(() =>
  store.processList.find((p) => p.id === selectedProcessId.value) || null,
)
const paramsOfProcess = computed(() =>
  store.parameterList.filter((p) => p.processId === selectedProcessId.value),
)
const processVisible = ref(false)
const paramVisible = ref(false)
const saving = ref(false)

const blankProcess: SpcProcess & { version?: number } = {
  id: 0, processCode: '', processName: '', description: '',
  isActive: '是', changeRemark: '',
  plantCode: '', plantName: '', version: undefined,
}
const processForm = ref<SpcProcess & { version?: number }>({ ...blankProcess })

const blankParam: SpcParameter & { version?: number } = {
  id: 0, processId: 0, paramCode: '', paramName: '', paramType: '', unit: '',
  subgroupSize: 5, chartType: 'Xbar-R',
  isActive: '是', decimalPlaces: 3, isCritical: '否', changeRemark: '',
  plantCode: '', plantName: '', version: undefined,
}
const paramForm = ref<SpcParameter & { version?: number }>({ ...blankParam })

async function onProcessChange(row: SpcProcess | null) {
  if (!row) return
  selectedProcessId.value = row.id
  await store.fetchParameters(row.id)
}

function openProcessDialog(row?: SpcProcess) {
  if (row) {
    processForm.value = { ...row, version: (row as any).version }
  } else {
    processForm.value = { ...blankProcess }
  }
  processVisible.value = true
}

async function submitProcess() {
  const f = processForm.value
  if (!f.processCode || !f.processName) {
    ElMessage.warning('请填写工序编码与名称')
    return
  }
  if (!PROCESS_CODE_RE.test(f.processCode)) {
    ElMessage.warning('工序编码须为 2~5 位大写字母（如 ASM / WDG / INS）')
    return
  }
  saving.value = true
  try {
    if (f.id) {
      await store.updateProcess(f.id, {
        processCode: f.processCode, processName: f.processName, description: f.description,
        isActive: f.isActive, changeRemark: f.changeRemark, version: f.version,
      })
      ElMessage.success('工序已更新')
    } else {
      const res = await store.createProcess({
        processCode: f.processCode, processName: f.processName, description: f.description,
        isActive: f.isActive, changeRemark: f.changeRemark,
      })
      ElMessage.success('工序已创建')
      const newId = (res as any)?.data?.id
      processVisible.value = false
      await store.fetchProcesses()
      // 新建成功后自动选中新工序，直接联动右侧参数编辑，省去手动点击
      if (newId != null) {
        selectedProcessId.value = newId
        await store.fetchParameters(newId)
      }
      return
    }
    processVisible.value = false
    await store.fetchProcesses()
  } finally {
    saving.value = false
  }
}

async function onDeleteProcess(row: SpcProcess) {
  await store.removeProcess(row.id)
  ElMessage.success('工序已删除')
  if (selectedProcessId.value === row.id) selectedProcessId.value = null
  await store.fetchProcesses()
  await store.fetchParameters() // 同步清除已级联删除的参数
}

function openParamDialog(row?: SpcParameter) {
  if (!selectedProcessId.value) return
  if (row) {
    paramForm.value = { ...row, decimalPlaces: row.decimalPlaces ?? 3, version: (row as any).version }
  } else {
    paramForm.value = { ...blankParam, processId: selectedProcessId.value }
  }
  paramVisible.value = true
}

async function submitParam() {
  const f = paramForm.value
  // 改进③：参数编码格式校验
  if (!f.paramCode) {
    ElMessage.warning('请输入参数编码')
    return
  }
  if (!PARAM_CODE_RE.test(f.paramCode)) {
    ElMessage.warning('参数编码须为 2~15 位，由大写字母/数字/连字符组成（如 AX-DIA）')
    return
  }
  if (!f.paramName) {
    ElMessage.warning('请输入参数名称')
    return
  }

  saving.value = true
  try {
    const payload = {
      processId: selectedProcessId.value as number,
      paramCode: f.paramCode,
      paramName: f.paramName,
      paramType: f.paramType,
      unit: f.unit,
      isActive: f.isActive,
      decimalPlaces: f.decimalPlaces != null ? Number(f.decimalPlaces) : 3,
      isCritical: f.isCritical,
      changeRemark: f.changeRemark,
      version: f.version,
    }
    if (f.id) {
      await store.updateParameter(f.id, payload)
      ElMessage.success('参数已更新')
    } else {
      await store.createParameter(payload)
      ElMessage.success('参数已创建')
    }
    paramVisible.value = false
    await store.fetchParameters(selectedProcessId.value as number)
  } finally {
    saving.value = false
  }
}

async function onDeleteParam(row: SpcParameter) {
  await store.removeParameter(row.id)
  ElMessage.success('参数已删除')
  await store.fetchParameters(selectedProcessId.value as number)
}

onMounted(async () => {
  await store.fetchProcesses()
  await store.fetchParameters()
})
</script>

<style scoped>
.process-config { padding: 4px; }
.cfg-card { border: 1px solid #ECE7E1; }
.card-head { display: flex; align-items: center; justify-content: space-between; }
.card-title { font-weight: 600; color: #1B3A5B; }
.sub-title { font-weight: 400; color: #8C9BA8; font-size: 12px; }
.num { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #5B7A99; font-variant-numeric: tabular-nums; }
</style>

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
            <el-table-column label="USL/LSL" width="150">
              <template #default="{ row }">
                <span class="num">{{ fmt(row.upperSpecLimit) }} / {{ fmt(row.lowerSpecLimit) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="subgroupSize" label="n" width="50" />
            <el-table-column prop="chartType" label="控制图" width="80" />
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
    <el-dialog v-model="processVisible" :title="processForm.id ? '编辑工序' : '新增工序'" width="420px">
      <el-form :model="processForm" label-width="80px" ref="processFormRef">
        <el-form-item label="工序编码" required>
          <el-input v-model="processForm.processCode" placeholder="如 ASM / WDG / INS" />
        </el-form-item>
        <el-form-item label="工序名称" required>
          <el-select
            v-model="processForm.processName"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入工序名称"
            style="width:100%"
          >
            <el-option label="装配" value="装配" />
            <el-option label="焊接" value="焊接" />
            <el-option label="检测" value="检测" />
            <el-option label="点胶" value="点胶" />
            <el-option label="老化" value="老化" />
            <el-option label="测试" value="测试" />
            <el-option label="喷涂" value="喷涂" />
            <el-option label="冲压" value="冲压" />
            <el-option label="注塑" value="注塑" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="processForm.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitProcess">保存</el-button>
      </template>
    </el-dialog>

    <!-- 参数表单弹窗 -->
    <el-dialog v-model="paramVisible" :title="paramForm.id ? '编辑参数' : '新增参数'" width="520px">
      <el-form :model="paramForm" label-width="96px" ref="paramFormRef">
        <el-form-item label="参数编码" required>
          <el-input v-model="paramForm.paramCode" placeholder="如 AX-DIA" />
        </el-form-item>
        <el-form-item label="参数名称" required>
          <el-input v-model="paramForm.paramName" />
        </el-form-item>
        <el-form-item label="参数类型">
          <el-select v-model="paramForm.paramType" style="width:100%">
            <el-option v-for="t in paramTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="paramForm.unit" placeholder="mm / °C / MPa" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="USL" label-width="50px">
              <el-input-number v-model="paramForm.upperSpecLimit" :controls="false" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="LSL" label-width="50px">
              <el-input-number v-model="paramForm.lowerSpecLimit" :controls="false" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="目标" label-width="50px">
              <el-input-number v-model="paramForm.targetValue" :controls="false" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="子组大小 n" required>
              <el-input-number v-model="paramForm.subgroupSize" :min="2" :max="12" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="控制图" required>
              <el-select v-model="paramForm.chartType" style="width:100%">
                <el-option label="Xbar-R（n=2~10）" value="Xbar-R" />
                <el-option label="Xbar-s（n≥11）" value="Xbar-s" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
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
  plantCode: '', plantName: '', version: undefined,
}
const processForm = ref<SpcProcess & { version?: number }>({ ...blankProcess })

const blankParam: SpcParameter & { version?: number } = {
  id: 0, processId: 0, paramCode: '', paramName: '', paramType: '', unit: '',
  upperSpecLimit: null, lowerSpecLimit: null, targetValue: null,
  subgroupSize: 5, chartType: 'Xbar-R', isActive: '是', plantCode: '', plantName: '',
  version: undefined,
}
const paramForm = ref<SpcParameter & { version?: number }>({ ...blankParam })

function fmt(v: number | null | undefined): string {
  return v == null ? '—' : String(v)
}

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
      await store.updateProcess(f.id, { processCode: f.processCode, processName: f.processName, description: f.description, version: f.version })
      ElMessage.success('工序已更新')
    } else {
      const res = await store.createProcess({ processCode: f.processCode, processName: f.processName, description: f.description })
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
    paramForm.value = { ...row, version: (row as any).version }
  } else {
    paramForm.value = { ...blankParam, processId: selectedProcessId.value }
  }
  paramVisible.value = true
}

async function submitParam() {
  const f = paramForm.value
  if (!f.paramCode || !f.paramName) {
    ElMessage.warning('请填写参数编码与名称')
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
      upperSpecLimit: f.upperSpecLimit,
      lowerSpecLimit: f.lowerSpecLimit,
      targetValue: f.targetValue,
      subgroupSize: f.subgroupSize,
      chartType: f.chartType,
      isActive: f.isActive,
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
.num { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #5B7A99; }
</style>

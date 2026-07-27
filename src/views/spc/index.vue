<template>
  <div class="spc-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <h2 class="page-title">SPC 过程能力分析</h2>
        <div class="page-sub">关键工序（装配 / 焊接 / 检测）过程控制与能力评估 · {{ plantName }}</div>
      </div>
      <div class="head-param">
        <span class="lbl">分析参数</span>
        <el-select v-model="selectedParamId" placeholder="选择关键参数" clearable style="width: 320px">
          <el-option-group
            v-for="grp in groupedParams"
            :key="grp.processName"
            :label="grp.processName"
          >
            <el-option
              v-for="p in grp.params"
              :key="p.id"
              :label="`${p.paramName}（${p.paramCode} · n=${p.subgroupSize} · ${p.chartType}）`"
              :value="p.id"
            />
          </el-option-group>
        </el-select>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="spc-tabs">
      <el-tab-pane label="参数配置" name="config">
        <ProcessConfig />
      </el-tab-pane>

      <el-tab-pane label="数据采集" name="entry">
        <DataEntry v-model="selectedParamId" :param-list="store.parameterList" @saved="onSaved" />
      </el-tab-pane>

      <el-tab-pane label="控制图" name="chart">
        <div v-if="!selectedParamId" class="need-param">请先在右上角选择分析参数</div>
        <template v-else>
          <el-alert
            v-if="currentParam"
            :title="`${currentParam.paramName}（${currentParam.chartType}）控制图`"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 12px"
          />
          <el-alert
            v-if="xbarSParams.length"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 12px"
          >
            <template #default>
              本系统 Xbar-s 控制图（适用 n≥11）仅以下参数可用：
              <el-link
                v-for="p in xbarSParams"
                :key="p.id"
                type="primary"
                :underline="false"
                class="xbar-s-link"
                @click="selectedParamId = p.id"
              >{{ p.paramName }}（{{ p.subgroupSize }}）</el-link>
              。点击即可切换查看。
            </template>
          </el-alert>
          <el-card shadow="never" class="chart-card" v-if="chartTypeOfSelected === 'Xbar-s'">
            <XbarSChart :param-id="selectedParamId" />
          </el-card>
          <el-card shadow="never" class="chart-card" v-else>
            <XbarRChart :param-id="selectedParamId" />
          </el-card>
        </template>
      </el-tab-pane>

      <el-tab-pane label="过程能力" name="capability">
        <div v-if="!selectedParamId" class="need-param">请先在右上角选择分析参数</div>
        <template v-else>
          <el-row :gutter="16">
            <el-col :span="14">
              <el-card shadow="never" class="cap-card">
                <CapabilityPanel :param-id="selectedParamId" />
              </el-card>
            </el-col>
            <el-col :span="10">
              <el-card shadow="never" class="cap-card">
                <CapabilityTrend :param-id="selectedParamId" />
              </el-card>
            </el-col>
          </el-row>
          <el-card shadow="never" class="cap-card" style="margin-top: 16px">
            <CapabilityHistogram :param-id="selectedParamId" />
          </el-card>
        </template>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSpcStore } from '@/stores/spc'
import { useAuthStore } from '@/stores/auth'
import ProcessConfig from './components/ProcessConfig.vue'
import DataEntry from './components/DataEntry.vue'
import XbarRChart from './components/XbarRChart.vue'
import XbarSChart from './components/XbarSChart.vue'
import CapabilityPanel from './components/CapabilityPanel.vue'
import CapabilityTrend from './components/CapabilityTrend.vue'
import CapabilityHistogram from './components/CapabilityHistogram.vue'

const store = useSpcStore()
const auth = useAuthStore()

const activeTab = ref('config')
const selectedParamId = ref<number | null>(null)

const plantName = computed(() => auth.plantCode === 'MZ' ? '梅州' : '深圳')

const groupedParams = computed(() => {
  const map = new Map<string, any[]>()
  for (const p of store.parameterList) {
    const proc = store.processList.find((x) => x.id === p.processId)
    const name = proc?.processName || '未分组'
    if (!map.has(name)) map.set(name, [])
    map.get(name)!.push(p)
  }
  return Array.from(map.entries()).map(([processName, params]) => ({ processName, params }))
})

const currentParam = computed(() =>
  store.parameterList.find((p) => p.id === selectedParamId.value) || null,
)
const chartTypeOfSelected = computed(() => currentParam.value?.chartType || 'Xbar-R')
const xbarSParams = computed(() =>
  store.parameterList.filter((p) => p.chartType === 'Xbar-s'),
)

function onSaved() {
  // 数据采集变更后，控制图 / 能力面板会在切换 tab 时按 paramId 重新拉取
}

onMounted(async () => {
  await store.fetchProcesses()
  await store.fetchParameters()
  if (store.parameterList.length) {
    selectedParamId.value = store.parameterList[0].id
  }
})
</script>

<style scoped>
.spc-page { padding: 16px 20px; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 14px; }
.page-title { margin: 0; font-size: 20px; color: #1B3A5B; font-weight: 700; }
.page-sub { font-size: 12px; color: #8C9BA8; margin-top: 4px; }
.head-param { display: flex; align-items: center; gap: 8px; }
.head-param .lbl { font-size: 13px; color: #5B7A99; }
.spc-tabs { --el-color-primary: #1B3A5B; }
.chart-card, .cap-card { border: 1px solid #ECE7E1; }
.need-param {
  text-align: center; color: #8C9BA8; padding: 60px 0; font-size: 14px;
  border: 1px dashed #ECE7E1; border-radius: 8px; background: #FAF8F5;
}
.xbar-s-link { margin: 0 6px; font-size: 13px; }
</style>

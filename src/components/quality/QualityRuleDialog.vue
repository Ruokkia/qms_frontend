<template>
  <div class="rule-entry">
    <el-button class="rule-button" @click="open('rules')">
      判定与报警规则
    </el-button>
    <el-button class="measure-button" @click="open('measures')">
      处理方法与措施
    </el-button>

    <el-dialog
      v-model="visible"
      width="820px"
      top="5vh"
      class="quality-rule-dialog"
      destroy-on-close
    >
      <template #header>
        <div class="dialog-heading">
          <div>
            <span class="eyebrow">IQC RULEBOOK · {{ catalog?.version || '1A-2A-3A' }}</span>
            <h2>来料异常规则与处置手册</h2>
          </div>
          <span class="source-badge">{{ catalog?.dataSource || '仅使用来料检验入库审核表' }}</span>
        </div>
      </template>

      <div v-loading="loading" class="rulebook">
        <div class="rule-tabs" role="tablist" aria-label="规则与措施">
          <button :class="{ active: activeTab === 'rules' }" @click="activeTab = 'rules'">判定与报警规则</button>
          <button :class="{ active: activeTab === 'measures' }" @click="activeTab = 'measures'">处理方法与措施</button>
        </div>

        <template v-if="activeTab === 'rules'">
          <section class="rule-section">
            <div class="section-label"><b>01</b><span>严重程度与流程分流</span></div>
            <div class="rule-list">
              <article v-for="item in catalog?.severityRules || []" :key="item.title" class="rule-row">
                <div><strong>{{ item.title }}</strong><small>{{ item.condition }}</small></div>
                <span class="result-chip" :class="{ severe: item.result === '严重' }">{{ item.result }}</span>
                <p>{{ item.systemAction }}</p>
              </article>
            </div>
          </section>

          <section class="rule-section">
            <div class="section-label"><b>02</b><span>通知范围</span></div>
            <div class="rule-list compact">
              <article v-for="item in catalog?.notificationRules || []" :key="item.title" class="rule-row">
                <div><strong>{{ item.title }}</strong><small>{{ item.condition }}</small></div>
                <span class="result-chip">{{ item.result }}</span>
                <p>{{ item.systemAction }}</p>
              </article>
            </div>
          </section>

          <section class="rule-section">
            <div class="section-label"><b>03</b><span>重复问题升级</span></div>
            <p class="fingerprint">重复识别键：{{ catalog?.repeatKey }}</p>
            <div class="escalation-track">
              <article v-for="(item, index) in catalog?.escalationRules || []" :key="item.title">
                <i>{{ index + 1 }}</i><strong>{{ item.title }}</strong><span>{{ item.condition }}</span><p>{{ item.systemAction }}</p>
              </article>
            </div>
          </section>
        </template>

        <template v-else>
          <section class="measure-hero">
            <span>批次先控制，原因再查清，措施必须验证。</span>
            <p>以下方法由系统统一展示，异常单仍需记录实际执行人、完成时间和证据。</p>
          </section>
          <div class="measure-grid">
            <section>
              <div class="section-label"><b>A</b><span>批次处理方法</span></div>
              <ol><li v-for="item in catalog?.handlingMethods || []" :key="item">{{ item }}</li></ol>
            </section>
            <section>
              <div class="section-label"><b>B</b><span>一般不良 · CAPA</span></div>
              <ol><li v-for="item in catalog?.generalMeasures || []" :key="item">{{ item }}</li></ol>
            </section>
            <section class="severe-measures">
              <div class="section-label"><b>C</b><span>严重不良 · 8D</span></div>
              <ol><li v-for="item in catalog?.severeMeasures || []" :key="item">{{ item }}</li></ol>
            </section>
          </div>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getQualityRuleCatalogApi } from '@/api/exception'
import type { QualityRuleCatalog } from '@/types/exception'

const visible = ref(false)
const loading = ref(false)
const activeTab = ref<'rules' | 'measures'>('rules')
const catalog = ref<QualityRuleCatalog | null>(null)

async function open(tab: 'rules' | 'measures') {
  activeTab.value = tab
  visible.value = true
  if (catalog.value) return
  loading.value = true
  try {
    const res = await getQualityRuleCatalogApi()
    if (res.code === 0) catalog.value = res.data
  } catch (error) {
    ElMessage.error('规则加载失败，请稍后重试')
    console.error('加载来料异常规则失败', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.rule-entry{display:flex;gap:8px}.rule-button,.measure-button{border-color:#9eb1c0;color:#17374e;background:#f8fbfd}.measure-button{border-color:#d3a06e;color:#8f4e19;background:#fffaf4}.dialog-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;padding-right:28px}.dialog-heading h2{margin:3px 0 0;color:#123047;font-size:23px}.eyebrow{font-family:JetBrains Mono,monospace;color:#718397;font-size:10px;letter-spacing:.12em}.source-badge{padding:6px 10px;border:1px solid #c6d4df;border-radius:4px;background:#f4f8fa;color:#49677d;font-size:12px}.rulebook{min-height:420px}.rule-tabs{display:flex;margin-bottom:22px;border-bottom:1px solid #dce4ea}.rule-tabs button{padding:11px 18px;border:0;border-bottom:3px solid transparent;background:none;color:#6d8192;font-weight:600;cursor:pointer}.rule-tabs button.active{border-color:#c56a2d;color:#123047}.rule-section{margin-bottom:24px}.section-label{display:flex;align-items:center;gap:10px;margin-bottom:11px;color:#123047}.section-label b{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;background:#123047;color:#fff;font-family:JetBrains Mono,monospace;font-size:11px}.section-label span{font-size:15px;font-weight:700}.rule-list{border-top:1px solid #dce4ea}.rule-row{display:grid;grid-template-columns:180px 64px 1fr;align-items:center;gap:12px;padding:13px 8px;border-bottom:1px solid #e6edf2}.rule-row div strong,.rule-row div small{display:block}.rule-row div small{margin-top:3px;color:#748797;font-size:11px}.rule-row p{margin:0;color:#526b7e;font-size:12px;line-height:1.55}.result-chip{justify-self:start;padding:3px 8px;border:1px solid #b9cad7;border-radius:3px;background:#f3f8fb;color:#456b87;font-size:11px;font-weight:700}.result-chip.severe{border-color:#e5aaa3;background:#fff3f1;color:#ae3f35}.fingerprint{margin:-3px 0 12px 38px;color:#718397;font-family:JetBrains Mono,monospace;font-size:11px}.escalation-track{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.escalation-track article{position:relative;padding:14px;border:1px solid #dce4ea;border-radius:6px;background:#f8fafb}.escalation-track i{position:absolute;right:10px;top:8px;color:#d6e0e7;font-family:JetBrains Mono,monospace;font-size:26px;font-style:normal;font-weight:700}.escalation-track strong,.escalation-track span{display:block}.escalation-track span{margin:6px 0;color:#b45d28;font-size:12px;font-weight:700}.escalation-track p{margin:0;color:#607588;font-size:11px;line-height:1.55}.measure-hero{margin-bottom:18px;padding:18px 21px;background:#123047;color:#fff}.measure-hero span{font-size:18px;font-weight:700}.measure-hero p{margin:7px 0 0;color:#c9d7e1;font-size:12px}.measure-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.measure-grid section{padding:16px;border:1px solid #dce4ea;border-radius:6px}.measure-grid .severe-measures{grid-column:1/-1;border-left:4px solid #b84b3e}.measure-grid ol{margin:0;padding-left:22px;color:#526b7e;font-size:12px;line-height:1.7}.measure-grid li+li{margin-top:7px}@media(max-width:760px){.rule-entry{flex-wrap:wrap}.dialog-heading{align-items:flex-start;flex-direction:column}.rule-row{grid-template-columns:1fr 60px}.rule-row p{grid-column:1/-1}.escalation-track,.measure-grid{grid-template-columns:1fr}.measure-grid .severe-measures{grid-column:auto}}
</style>

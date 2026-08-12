# SPC 数据采集弹窗实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 SPC 手动样本录入从底部固定 Dock 改为由主页面触发的弹窗式录入，且不改变现有保存 API 契约。

**架构：** `DataEntry.vue` 保留产品、批次、条码、工序与参数的选择逻辑；新增仅控制弹窗开关的本地状态。样本数组、规格反馈、Enter 跳转、批量粘贴、上组复用和 `onSubmit` 全部沿用原逻辑并移动到 `el-dialog` 内。

**技术栈：** Vue 3 Composition API、TypeScript、Element Plus、Vite/Vue TSC。

---

## 文件结构

- 修改：`src/views/spc/components/DataEntry.vue` — 改变样本输入区域的承载方式，保留现有校验和提交函数。
- 验证：`npm run build` — 检查 Vue 模板、类型检查和生产构建。

### 任务 1：将手动录入改为弹窗

**文件：**
- 修改：`src/views/spc/components/DataEntry.vue`

- [ ] **步骤 1：定义弹窗状态和入口行为**

```ts
const entryDialogVisible = ref(false)

function openEntryDialog() {
  if (!currentParam.value) {
    ElMessage.warning('请先选择参数')
    return
  }
  entryDialogVisible.value = true
  nextTick(() => sampleInputRefs.value[0]?.focus())
}
```

- [ ] **步骤 2：将固定 Dock 替换为打开弹窗的操作条**

```vue
<el-button type="primary" :disabled="!currentParam" @click="openEntryDialog">
  录入样本
</el-button>
```

- [ ] **步骤 3：在 `el-dialog` 内复用样本输入、规格状态、清空、复用和提交**

```vue
<el-dialog v-model="entryDialogVisible" title="录入 SPC 样本数据" append-to-body>
  <div v-for="i in currentParam.subgroupSize" :key="i">
    <el-input v-model="sampleValues[i - 1]" @keydown.enter="onSampleEnter(i)" />
  </div>
  <template #footer>
    <el-button @click="resetSamples">清空</el-button>
    <el-button type="primary" @click="onSubmit">提交子组</el-button>
  </template>
</el-dialog>
```

- [ ] **步骤 4：提交成功后关闭弹窗**

```ts
lastSubmittedValues.value = [...vals]
resetSamples()
entryDialogVisible.value = false
```

- [ ] **步骤 5：运行构建验证**

运行：`npm run build`

预期：命令以退出码 0 结束，并输出 `built in`。


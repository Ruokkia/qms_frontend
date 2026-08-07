# 供应商合格率分段扇形图实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将来料数据管理的供应商合格率柱状图改为可点击的分段环形图，并展示区间内供应商精确的不合格率。

**架构：** 后端继续使用现有 `material_inspection` 聚合查询，仅扩展返回统计字段；前端在现有来料看板内按合格率分段聚合，并通过图表事件打开明细弹窗。不新增表结构或新接口。

**技术栈：** Spring Boot、MyBatis XML、PostgreSQL、Vue 3、TypeScript、ECharts、Element Plus、Vitest。

---

## 文件清单

- 修改：`cornley-qms-server/qms-domain/src/main/java/com/kangli/qms/domain/incoming/vo/SupplierRankItemVO.java`，增加精确批次和不合格率字段。
- 修改：`cornley-qms-server/qms-domain/src/main/resources/mapper/MaterialInspectionMapper.xml`，补充供应商聚合统计列。
- 修改：`cornley-qms-web/src/types/incoming.ts`，同步前端统计类型。
- 修改：`cornley-qms-web/src/views/incoming/components/SupplierRankChart.vue`，替换为分段环形图并发出区间点击事件。
- 修改：`cornley-qms-web/src/views/incoming/index.vue`，接收区间事件并增加供应商明细弹窗。
- 创建：`cornley-qms-web/src/views/incoming/components/SupplierRankChart.test.ts`，覆盖区间边界和聚合行为。

### 任务 1：补充后端供应商精确统计字段

**文件：**
- 修改：`cornley-qms-server/qms-domain/src/main/java/com/kangli/qms/domain/incoming/vo/SupplierRankItemVO.java`
- 修改：`cornley-qms-server/qms-domain/src/main/resources/mapper/MaterialInspectionMapper.xml`

- [ ] **步骤 1：增加 VO 字段**

在现有字段后增加：

```java
private Integer qualifiedBatches;
private Integer unqualifiedBatches;
private BigDecimal unqualifiedRate;
```

- [ ] **步骤 2：补充 SQL 聚合列**

在 `selectSupplierRank` 中增加：

```sql
COUNT(*) FILTER (WHERE inspection_result = '合格') AS qualifiedBatches,
COUNT(*) FILTER (WHERE inspection_result = '不合格') AS unqualifiedBatches,
ROUND(
    COUNT(*) FILTER (WHERE inspection_result = '不合格') * 100.0 / NULLIF(COUNT(*), 0),
    2
) AS unqualifiedRate
```

- [ ] **步骤 3：运行后端编译**

运行：

```text
mvn.cmd -pl qms-domain -am -DskipTests compile
```

预期：`BUILD SUCCESS`。

### 任务 2：同步前端类型并先写区间聚合测试

**文件：**
- 修改：`cornley-qms-web/src/types/incoming.ts`
- 创建：`cornley-qms-web/src/views/incoming/components/SupplierRankChart.test.ts`

- [ ] **步骤 1：扩展 `SupplierRankItem`**

增加可选字段以兼容旧接口响应：

```ts
qualifiedBatches?: number
unqualifiedBatches?: number
unqualifiedRate?: number
```

- [ ] **步骤 2：抽取并测试区间函数**

区间函数必须满足：

```ts
100       -> '100%'
99.99     -> '90%～99.99%'
90        -> '90%～99.99%'
89.99     -> '80%～89.99%'
60        -> '60%～69.99%'
59.99     -> '60%以下'
```

- [ ] **步骤 3：运行前端测试确认失败/通过**

运行：

```text
npm run test -- src/views/incoming/components/SupplierRankChart.test.ts
```

预期：新增区间边界测试通过。

### 任务 3：替换供应商排名图表

**文件：**
- 修改：`cornley-qms-web/src/views/incoming/components/SupplierRankChart.vue`

- [ ] **步骤 1：按区间聚合供应商**

去重仍使用供应商编号优先、名称兜底；每个供应商只进入一个区间。区间数据结构包含 `range`、`count`、`items` 和平均合格率。

- [ ] **步骤 2：将 ECharts 柱状图改为环形图**

使用：

```ts
series: [{
  type: 'pie',
  radius: ['48%', '74%'],
  avoidLabelOverlap: true,
  data: ranges.map((item) => ({ name: item.range, value: item.count })),
}]
```

100% 使用独立颜色，其余区间从绿色到红色渐变。无数据时显示空状态。

- [ ] **步骤 3：增加点击事件**

声明：

```ts
const emit = defineEmits<{
  (event: 'range-click', payload: { range: string; items: SupplierRankItem[] }): void
}>()
```

在 `chart.on('click', ...)` 中发出对应区间及供应商列表。

### 任务 4：增加区间供应商明细弹窗

**文件：**
- 修改：`cornley-qms-web/src/views/incoming/index.vue`

- [ ] **步骤 1：绑定图表点击事件**

将组件改为：

```vue
<SupplierRankChart
  :data="supplierRankData"
  :loading="rankLoading"
  @range-click="openSupplierRange"
/>
```

- [ ] **步骤 2：增加弹窗状态和打开方法**

保存当前区间名称和供应商数组，按 `passRate` 升序排列；取消或关闭时清理状态。

- [ ] **步骤 3：增加明细表格**

展示列：供应商名称、供应商编号、总批次、合格批次、不合格批次、合格率、不合格率。缺失旧字段时显示 `—`，不阻塞弹窗。

### 任务 5：集成验证与提交

**文件：**
- 以上后端和前端文件。

- [ ] **步骤 1：运行后端测试和打包**

运行：

```text
mvn.cmd -pl qms-bootstrap -am test
mvn.cmd -pl qms-bootstrap -am package -DskipTests
```

- [ ] **步骤 2：运行前端相关测试和类型检查**

运行：

```text
npm run test -- src/views/incoming/components/SupplierRankChart.test.ts
npm run build
```

预期：新增测试通过；若存在项目既有非本功能错误，单独记录错误文件和错误信息。

- [ ] **步骤 3：浏览器人工验证**

验证供应商排名图表、100% 独立分段、边界值、扇区点击弹窗、空数据、日期范围切换和分公司切换。

- [ ] **步骤 4：提交前检查**

运行 `git diff --check`，确认只包含本功能文件后分别提交前后端改动。

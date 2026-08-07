# 成品与来料列表精简实施计划

**目标：** 将成品和来料数据管理列表收敛为业务浏览所需的字段，默认每页展示 10 条，并保持详情、筛选、操作、权限和追溯行为不变。

**方案：** 前端移除仅适合详情展示的表格列；成品直接复用现有字段。来料由列表接口批量读取同分公司的关键物料绑定清单，将同一物料编码对应的有效物料条码去重拼接后填入只读展示字段，避免 N+1 请求。

**涉及文件：**

- 修改 `src/views/finished-goods/index.vue`：保留指定列，默认分页改为 10。
- 修改 `src/views/incoming/index.vue`：保留指定列并显示物料条码，默认分页改为 10。
- 修改 `src/types/incoming.ts`：声明只读的 `materialBarcode` 列表展示字段。
- 修改 `qms-domain/src/main/java/com/kangli/qms/domain/incoming/entity/MaterialInspection.java`：声明不落库的 `materialBarcode` 字段。
- 修改 `qms-service/src/main/java/com/kangli/qms/service/incoming/MaterialInspectionService.java` 与 `impl/MaterialInspectionServiceImpl.java`：批量补充来料列表的条码字段。
- 修改 `qms-api/src/main/java/com/kangli/qms/api/incoming/MaterialInspectionController.java`：列表改用补全条码后的查询方法。

### 任务 1：先验证现有列表字段与分页默认值

- [ ] 记录成品当前 14 个数据列、来料当前 9 个数据列均来自页面模板；确认详情弹窗不在本次文件改动范围。
- [ ] 通过前端构建校验 Vue 模板与类型检查。

### 任务 2：补充来料列表物料条码

- [ ] 为 `MaterialInspection` 增加 `@TableField(exist = false)` 的 `materialBarcode` 字段，不改变数据库表结构。
- [ ] 在来料列表查询完成后，按当前页所有物料编码一次查询同分公司的有效关键物料绑定清单。
- [ ] 以物料编码分组、条码去重并用 `、` 拼接，将结果写入当前页记录；没有绑定时保留空值，由前端显示 `-`。
- [ ] 为此补充服务级测试，覆盖多条码去重、空物料编码和无绑定三种情况。

### 任务 3：精简两个看板列表

- [ ] 成品保留产品名称、产品分类、型号规格、生产批号/产品编号、检验结果、过期日期和操作列；默认分页为 10。
- [ ] 来料保留物料/批次、供应商、物料条码、检验结果、检验日期和操作列；默认分页为 10。
- [ ] 不改详情页、筛选项、列表接口路径、操作按钮和追溯路由。

### 任务 4：验证

- [ ] 运行新增的后端服务测试。
- [ ] 运行 `npm.cmd run build`，确认 Vue 类型检查与生产构建成功。
- [ ] 使用差异检查确认不包含详情页或数据库迁移改动。

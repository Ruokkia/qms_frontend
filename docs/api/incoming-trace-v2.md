# 来料追溯 V2 图模型 API

Base URL：`/api/v2/incoming-trace`。所有接口均需要 `Authorization: Bearer <token>`。

## 数据模型

- `trace_node`：统一节点，类型为 `FINISHED_GOOD`、`SEMI_FINISHED`、`MATERIAL`。
- `trace_relation`：父产品/半成品到子半成品/物料的有向关系。
- 物料节点必须携带 `materialCode` 与 `materialBatchNo`；条码 `barcode` 全局唯一。

## 查询追溯树

`GET /tree?rootBarcode={barcodeOrBatch}&direction=DOWN|UP|BATCH_IMPACT`

- `DOWN`：从成品或半成品向下展开。
- `UP`：从物料或半成品向上展开。
- `BATCH_IMPACT`：传入来料批号，先收集同批所有物料，再向上展开所有受影响产品链。

示例：

```text
GET /api/v2/incoming-trace/tree?rootBarcode=LOT-20260721&direction=BATCH_IMPACT
```

## 节点详情与摘要

```text
GET /nodes/{id}
GET /summary
```

节点详情返回直接父节点与子节点；摘要返回节点、成品、半成品和物料批次数。

## 手动录入

新增节点：`POST /nodes`

```json
{
  "nodeType": "MATERIAL",
  "barcode": "MAT-EXAMPLE-LOT-20260722",
  "name": "示例物料",
  "materialCode": "10.09.200119",
  "materialBatchNo": "LOT-20260722",
  "specification": "5kg/袋"
}
```

建立关系：`POST /relations`

```json
{
  "parentNodeId": 2,
  "childNodeId": 13,
  "quantity": 1,
  "workOrderNo": "WO-TEST",
  "processName": "组件装配"
}
```

服务端拒绝自连接、重复关系和任何会形成递归环路的关系。

## 自测

执行 `integration-trace-v2.ps1`，传入登录 JWT：

```powershell
powershell -ExecutionPolicy Bypass -File integration-trace-v2.ps1 -Token '<access-token>' -BaseUrl 'http://127.0.0.1:8081'
```

脚本验证种子数据、成品向下树、批次扩散、手动节点与关系录入、反查命中以及环路拒绝。

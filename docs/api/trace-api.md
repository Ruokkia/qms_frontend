# 康立 QMS 系统 — RESTful API 接口文档

> 版本：1.1.0  
> 日期：2026-07-16  
> 适用技术栈：Java (Spring Boot / Spring MVC)  

---

## 一、通用约定

### 1.1 Base URL

```
/api/v1
```

### 1.2 统一响应结构

所有接口返回 JSON，统一结构如下：

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 0=成功，非0=失败 |
| message | string | 描述信息 |
| data | object/array/null | 业务数据 |

### 1.3 认证方式

请求头携带 JWT Token：

```
Authorization: Bearer <token>
```

Token 在登录接口返回，服务端从 Token 中解析用户身份（userId、role、areaCode），**不需要客户端传地区参数**——服务端根据用户身份自动过滤数据。

### 1.4 分页参数

所有列表接口统一使用 Query 参数：

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | int | 1 | 页码，从1开始 |
| size | int | 5 | 每页条数 |

### 1.5 分页响应结构

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [ ... ],
    "total": 10,
    "page": 1,
    "size": 5
  }
}
```

---

## 二、认证模块

> 基于真实数据库 `qms.sys_user` / `qms.sys_role` / `qms.sys_login_log` 表结构设计。
> 密码使用 BCrypt 哈希存储，种子数据统一密码为 `123456`（上线前须重置为强密码）。

### 2.1 登录

```
POST /api/v1/auth/login
```

**请求体：**

```json
{
  "account": "sz_op01",
  "password": "123456",
  "plantCode": "SZ"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| account | string | 是 | 登录账号，如 `sz_op01`、`mz_mgr01`（见下方账号列表） |
| password | string | 是 | 密码（种子数据统一为 `123456`） |
| plantCode | string | 是 | 分公司编码：`SZ`=深圳 / `MZ`=梅州 |

**种子账号列表（12 个测试用户）：**

| 分公司 | 账号 | 姓名 | 角色编码 | 角色名称 |
|--------|------|------|----------|----------|
| SZ 深圳 | sz_op01 | 张三 | R01 | 操作工 |
| SZ 深圳 | sz_insp01 | 李四 | R02 | 检验员 |
| SZ 深圳 | sz_lead01 | 王五 | R03 | 班组长 |
| SZ 深圳 | sz_qe01 | 赵六 | R04 | 质量工程师 |
| SZ 深圳 | sz_sqe01 | 钱七 | R05 | SQE供应商质量 |
| SZ 深圳 | sz_mgr01 | 孙八 | R06 | 质量经理 |
| MZ 梅州 | mz_op01 | 陈一 | R01 | 操作工 |
| MZ 梅州 | mz_insp01 | 周二 | R02 | 检验员 |
| MZ 梅州 | mz_lead01 | 吴三 | R03 | 班组长 |
| MZ 梅州 | mz_qe01 | 郑四 | R04 | 质量工程师 |
| MZ 梅州 | mz_sqe01 | 冯五 | R05 | SQE供应商质量 |
| MZ 梅州 | mz_mgr01 | 褚六 | R06 | 质量经理 |

**成功响应：**

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "tokenExpireIn": 7200,
    "userInfo": {
      "userId": 1,
      "account": "sz_op01",
      "realName": "张三",
      "roleCode": "R01",
      "roleName": "操作工",
      "plantCode": "SZ",
      "plantName": "深圳"
    }
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| token | string | JWT Access Token，有效期 2 小时（7200s），后续请求放入 `Authorization: Bearer <token>` |
| refreshToken | string | Refresh Token（UUID），有效期 7 天，用于无感刷新 access token |
| tokenExpireIn | int | Access Token 过期时间（秒），`7200`=2小时 |
| userInfo.userId | long | 用户主键 ID（`sys_user.id`） |
| userInfo.account | string | 登录账号 |
| userInfo.realName | string | 真实姓名 |
| userInfo.roleCode | string | 角色编码 R01~R06 |
| userInfo.roleName | string | 角色中文名称 |
| userInfo.plantCode | string | 分公司编码 `SZ` / `MZ` |
| userInfo.plantName | string | 分公司名称 "深圳" / "梅州" |

> JWT Payload 中包含 `userId`、`account`、`roleCode`、`plantCode` 四个字段，
> 后端接口从 JWT 中解析用户身份，无需客户端重复传递地区参数。

**失败响应：**

| code | message | 触发条件 |
|------|---------|----------|
| 1001 | 账号或密码错误 | 账号不存在 / 密码不匹配 |
| 1002 | 账号已锁定，请 N 分钟后重试 | 连续 5 次失败触发锁定（30分钟） |
| 1003 | 账号已禁用 | `status=0` |
| 1004 | 分公司不匹配 | 用户所属分公司与请求 `plantCode` 不一致 |

统一响应结构：
```json
{
  "code": 1001,
  "message": "账号或密码错误",
  "data": null
}
```

### 2.2 刷新 Token

```
POST /api/v1/auth/refresh
```

> 无需携带 `Authorization` 头，通过请求体传递 refreshToken。

**请求体：**

```json
{
  "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**成功响应：** 与登录成功响应结构一致，返回新的 `token` + `refreshToken`（旧的 refreshToken 即时失效，采用滚动刷新策略）。

**失败响应：**

| code | message | 触发条件 |
|------|---------|----------|
| 1005 | Refresh Token 无效或已过期 | token 不存在 / 已过期（7天）/ 已被使用 |

### 2.3 退出登录

```
POST /api/v1/auth/logout
```

**请求头：** `Authorization: Bearer <token>`（必填）

**说明：**
- 服务端将当前 access token 加入黑名单（或 Redis 标记失效），后续携带该 token 的请求返回 401。
- 同时失效该用户对应的 refresh token。
- 写入 `sys_login_log`（logout 操作不记录，仅登录时记录）。

**成功响应：**
```json
{
  "code": 0,
  "message": "已退出登录",
  "data": null
}
```

### 2.4 获取当前用户信息

```
GET /api/v1/auth/me
```

**请求头：** `Authorization: Bearer <token>`（必填）

**成功响应：** 从 JWT 中解析用户身份，查询 `sys_user` + `sys_role` 返回用户信息：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": 1,
    "account": "sz_op01",
    "realName": "张三",
    "roleCode": "R01",
    "roleName": "操作工",
    "plantCode": "SZ",
    "plantName": "深圳",
    "status": 1,
    "lastLoginAt": "2026-07-17 10:30:00"
  }
}
```

### 2.5 账号锁定规则

| 参数 | 值 | 说明 |
|------|-----|------|
| 最大失败次数 | 5 次 | 15 分钟窗口内连续失败计数 |
| 失败窗口 | 15 分钟 | 滚动窗口，由 Redis 控制 |
| 锁定时长 | 30 分钟 | 到达最大失败次数后自动锁定 |
| 锁定存储 | Redis（主控）+ `sys_user.locked_until`（兜底） | Redis 不可用时降级到 DB 检查 |

所有登录失败均写入 `qms.sys_login_log` 表，`login_status='失败'`，`fail_reason` 记录具体原因。

---

## 三、来料追溯模块

### 3.1 数据模型

#### FinishRecord（成品入库记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | long | 主键ID |
| workOrder | string | 生产工单 |
| batchNo | string | 生产批号/产品编号 |
| materialCode | string | 物料编码 |
| productName | string | 产品名称 |
| specModel | string | 型号规格 |
| produceDate | string | 生产日期（yyyy-MM-dd） |
| inspectResult | string | 检验结果（合格/不合格/让步接收/待检验） |
| inspector | string | 检验名字 |
| reportNo | string | 报告编号 |
| expireDate | string | 过期日期 |

#### BindRecord（物料绑定记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | long | 主键ID |
| workOrder | string | 工单号 |
| productBarcode | string | 生产条码 |
| productNo | string | 产品料号 |
| materialCode | string | 物料代码 |
| materialBarcode | string | 物料条码 |
| materialName | string | 物料名称 |
| specModel | string | 规格型号 |
| processName | string | 工序名称 |
| scanner | string | 扫描人 |
| effective | string | 是否生效（生效/未生效） |
| orderQty | int | 工单数量 |
| scanTime | string | 扫描时间（yyyy-MM-dd HH:mm） |
| processCode | string | 工序编码 |

#### IqcRecord（IQC 物料校验入库记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | long | 主键ID |
| materialCode | string | 物料代码 |
| materialBatch | string | 物料批号 |
| materialName | string | 物料名称 |
| specModel | string | 规格型号 |
| supplierName | string | 供应商名称 |
| inspectResult | string | 检验结果（合格/不合格/让步接收/待检验） |
| passQty | int | 合格数量 |
| judgePerson | string | 判定人 |
| reportGenerated | string | 报告生成（已生成/未生成） |
| inspectNo | string | 送检单号 |
| inspectQty | int | 送检数量 |
| failDesc | string | 不合格描述 |
| supplierCode | string | 供应商编号 |
| incomingDate | string | 来料日期 |

#### 数据关联关系

```
FinishRecord.workOrder  =  BindRecord.workOrder         (成品 → 绑定)
BindRecord.materialCode =  IqcRecord.materialCode       (绑定 → IQC)
```

---

### 3.2 统计看板

```
GET /api/v1/trace/dashboard
```

服务端从 Token 解析用户地区，返回该地区的统计数据。

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "finishCount": 10,
    "bindCount": 10,
    "iqcCount": 10,
    "failCount": 1
  }
}
```

---

### 3.3 供应商质量看板

```
GET /api/v1/trace/supplierDashboard
```

返回供应商维度的聚合数据，包括趋势、缺陷分布、来料量分布。

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "suppliers": [
      {
        "name": "深圳市华芯电子有限公司",
        "code": "SUP-SZ-001",
        "totalQty": 1500,
        "passQty": 1470,
        "failQty": 30,
        "passRate": 98.0
      }
    ],
    "trend": [
      {
        "date": "2024-07-03",
        "supplier": "深圳市华芯电子有限公司",
        "totalQty": 380,
        "passQty": 380,
        "failQty": 0
      }
    ],
    "defectDist": [
      { "name": "损耗角正切值偏上限", "value": 1 },
      { "name": "插拔力测试不合格", "value": 1 }
    ],
    "volumeDist": [
      { "name": "深圳市华芯电子有限公司", "value": 1500 }
    ]
  }
}
```

---

### 3.4 正向追溯

```
POST /api/v1/trace/forward
```

输入批次号或工单号，正向追溯：成品 → 物料绑定 → IQC校验，返回树形结构。

**请求体：**

```json
{
  "batchNo": "SZ-LOT-2024-001"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| batchNo | string | 是 | 生产批号或工单号 |

**响应（TraceTreeNode 树形结构）：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "level": 0,
    "type": "finish",
    "data": { "id": 1, "workOrder": "SZ-WO-2024-001", "batchNo": "SZ-LOT-2024-001", ... },
    "children": [
      {
        "level": 1,
        "type": "bind",
        "data": { "id": 1, "workOrder": "SZ-WO-2024-001", "materialCode": "MAT-SZ-001", ... },
        "children": [
          {
            "level": 2,
            "type": "iqc",
            "data": { "id": 1, "materialCode": "MAT-SZ-001", "supplierName": "...", ... }
          }
        ]
      }
    ]
  }
}
```

---

### 3.5 反向追溯

```
POST /api/v1/trace/reverse
```

输入物料条码，反向追溯：IQC → 物料绑定 → 成品，返回树形结构。

**请求体：**

```json
{
  "materialBarcode": "SZ-MB-2024-001"
}
```

**响应：** 与正向追溯结构相同，但 Level 0 为 IQC，Level 2 为 Finish。

---

### 3.6 成品入库列表

```
GET /api/v1/trace/finishList?page=1&size=5
```

**响应：** 标准分页结构，list 元素为 FinishRecord。

---

### 3.7 物料绑定列表

```
GET /api/v1/trace/bindList?page=1&size=5
```

**响应：** 标准分页结构，list 元素为 BindRecord。

---

### 3.8 IQC 校验入库列表

```
GET /api/v1/trace/iqcList?page=1&size=5
```

**响应：** 标准分页结构，list 元素为 IqcRecord。

---

### 3.9 成品详情

```
GET /api/v1/trace/detail/{id}
```

返回成品记录及其关联的物料绑定和 IQC 检验记录。

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "finish": { ... },
    "binds": [ { ... }, { ... } ],
    "iqcs": [ { ... }, { ... } ]
  }
}
```

---

### 3.10 IQC 详情

```
GET /api/v1/trace/iqcDetail/{id}
```

返回 IQC 记录及其关联的物料绑定和成品记录。

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "iqc": { ... },
    "binds": [ { ... }, { ... } ],
    "finishes": [ { ... } ]
  }
}
```

---

### 3.11 来料批次简单列表

```
GET /api/v1/trace/list?page=1&size=5
```

简单列表视图，使用 TraceRecord 数据模型（8 个标准字段）。

### 3.12 来料批次 CRUD

```
GET    /api/v1/trace/{id}          # 详情
POST   /api/v1/trace               # 新增
PUT    /api/v1/trace/{id}          # 更新
DELETE /api/v1/trace/{id}          # 删除
```

---

## 四、权限矩阵

| 角色编码 | 角色名称 | SZ 账号 | MZ 账号 | 可访问模块 | 备注 |
|----------|----------|---------|---------|------------|------|
| R01 | 操作工 | sz_op01 | mz_op01 | 来料追溯 | 仅本分公司 |
| R02 | 检验员 | sz_insp01 | mz_insp01 | 来料追溯、首件检验、来料异常整改 | 仅本分公司 |
| R03 | 班组长 | sz_lead01 | mz_lead01 | 全部 5 个模块 | 仅本分公司 |
| R04 | 质量工程师 | sz_qe01 | mz_qe01 | 全部 5 个模块 | 仅本分公司 |
| R05 | SQE供应商质量 | sz_sqe01 | mz_sqe01 | 供应商审核、物料变更管理、来料异常整改 | 仅本分公司 |
| R06 | 质量经理 | sz_mgr01 | mz_mgr01 | 全部 5 个模块 | 可切换分公司（SZ/MZ），前端提供切换控件 |

---

## 五、后续模块 API 预告

其余4个模块（供应商审核、物料变更管理、来料异常整改、首件检验）的 API 结构与来料追溯的简单列表一致：

```
GET    /api/v1/{module}/list?page=1&size=5
GET    /api/v1/{module}/{id}
POST   /api/v1/{module}
PUT    /api/v1/{module}/{id}
DELETE /api/v1/{module}/{id}
```

其中 `{module}` 为：`supplier`、`material`、`exception`、`fai`。

数据模型同样包含 8 个标准字段：批次编号、物料名称、型号规格、供应商、处理状态、处理人员、处理日期、备注。

---

## 六、接口总览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/auth/login | 登录 |
| POST | /api/v1/auth/refresh | 刷新 Token |
| POST | /api/v1/auth/logout | 退出登录 |
| GET | /api/v1/auth/me | 获取当前用户 |
| GET | /api/v1/trace/dashboard | 统计看板 |
| GET | /api/v1/trace/supplierDashboard | 供应商质量看板 |
| POST | /api/v1/trace/forward | 正向追溯 |
| POST | /api/v1/trace/reverse | 反向追溯 |
| GET | /api/v1/trace/finishList | 成品入库列表 |
| GET | /api/v1/trace/bindList | 物料绑定列表 |
| GET | /api/v1/trace/iqcList | IQC校验入库列表 |
| GET | /api/v1/trace/detail/{id} | 成品详情 |
| GET | /api/v1/trace/iqcDetail/{id} | IQC详情 |
| GET | /api/v1/trace/list | 来料批次简单列表 |
| GET | /api/v1/trace/{id} | 来料批次详情 |
| POST | /api/v1/trace | 来料批次新增 |
| PUT | /api/v1/trace/{id} | 来料批次更新 |
| DELETE | /api/v1/trace/{id} | 来料批次删除 |

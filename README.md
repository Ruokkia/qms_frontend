# qms-frontend

康立质量管理系统（QMS）前端工程

## 技术栈
- Vue 3.5 + TypeScript 5.6
- Vite 5.4
- Element Plus 2.8（UI 组件）
- Pinia 2.2（状态管理）
- Vue Router 4.4（路由）
- ECharts 5.5（图表/SPC/追溯可视化）
- Axios 1.7（HTTP 客户端 + 自定义 Mock 适配器）

## 规范约束
- 编码遵循 `D:\CodeBuddy_project\QMS-代码规范文档-V1.0.md`（V1.0-redline）
- 多智能体协作遵循 `D:\CodeBuddy_project\QMS-多智能体开发提示词-V1.0.md`
- 前端**不写业务计算逻辑**、**不硬编码枚举值**
- 工序枚举**固化红线**：装配(P-A) / 焊接(P-W) / 检测(P-I)，禁止新增

## 目录结构
```
src/
├── api/           # 接口封装（request.ts + 各模块 api）
│   ├── request.ts # axios 实例 + Token/区域自动注入
│   ├── auth.ts    # 登录鉴权 API
│   └── trace.ts   # 来料追溯 API（17 接口）
├── mock/          # Mock 数据 + 自定义 axios 适配器
│   ├── index.ts   # 请求拦截器（setupMock 一键切换真实后端）
│   └── data/      # 深圳/梅州各 10 条独立数据
├── types/         # TypeScript 类型 + 枚举集中管控
│   └── index.ts   # ApiResult / PageResult / RoleEnum / ProcessEnum
├── stores/        # Pinia 状态管理
│   └── auth.ts    # 用户/权限/区域切换 Store
├── router/        # Vue Router + 权限守卫
├── views/         # 页面（按模块 M0~M8）
│   ├── trace/     # 来料追溯（已完成）— KPI/看板/树状追溯/分页列表
│   ├── supplier/  # 供应商审核 M7（占位）
│   ├── material/  # 物料变更 M8（占位）
│   ├── exception/ # 异常整改 M2（占位）
│   └── fai/       # 首件检验 M3（占位）
├── layouts/       # 主框架布局
├── config/        # 导航菜单/角色权限矩阵
└── main.ts        # 入口
```

## 启动
```bash
npm install
npm run dev          # 端口 5173，Mock 模式
```

## 生产构建与部署

```bash
npm run build
```

构建产物输出到 `dist/`。将该目录部署到静态 Web 服务器即可；生产环境请通过 `VITE_API_BASE_URL` 配置后端 API 地址。

## 切换真实后端
编辑 `src/main.ts`，注释 `setupMock(request)` 即可。
真实后端 Base URL 在 `src/api/request.ts` 中修改 `VITE_API_BASE_URL`。

## API 文档
- `docs/api/trace-api.md`：来料追溯 17 个 RESTful 接口（第 §五 章预告其他模块 API）

/**
 * QMS 系统通用类型定义
 */

/** 统一 API 响应结构 */
export interface ApiResult<T = any> {
  code: number
  message: string
  data: T
}

/** 分页查询参数 */
export interface PageParams {
  page: number
  size: number
}

/** 分页响应结构 */
export interface PageResult<T = any> {
  list: T[]
  total: number
  page: number
  size: number
}

/** 用户角色枚举 */
export enum RoleEnum {
  R00 = 'R00',
  /** 操作工 */
  R01 = 'R01',
  /** 检验员 */
  R02 = 'R02',
  /** 班组长 */
  R03 = 'R03',
  /** 质量工程师 */
  R04 = 'R04',
  /** SQE 供应商质量 */
  R05 = 'R05',
  /** 质量经理 */
  R06 = 'R06',
}

/** 分公司编码 */
export type PlantCode = 'SZ' | 'MZ'

/** 用户信息（存储在 sessionStorage / Pinia） */
export interface UserInfo {
  userId: number          // 用户主键 ID（sys_user.id）
  account: string         // 登录账号，如 sz_op01
  realName: string        // 真实姓名，如 张三
  roleCode: string        // 角色编码 R01~R06
  roleName: string        // 角色名称，如 操作工
  plantCode: PlantCode    // 分公司编码 SZ=深圳 / MZ=梅州
  plantName: string       // 分公司名称，如 深圳
  canSwitchArea: boolean  // 是否具备全部分公司数据范围
  status?: number         // 状态 1=启用 0=禁用（/auth/me 返回）
  lastLoginAt?: string    // 最后登录时间（/auth/me 返回）
  modulePermissions?: ModuleKey[] // 后端授权的可见菜单，登录后生效
}

/** 登录响应（含 JWT） */
export interface LoginResponse {
  token: string           // JWT Access Token，2h 有效期
  refreshToken: string    // Refresh Token（UUID），7 天有效期
  tokenExpireIn: number   // Token 过期时间（秒），7200
  userInfo: UserInfo      // 用户信息
}

/** 登录请求参数 */
export interface LoginParams {
  account: string
  password: string
  /** 分公司编码（可选，登录不再强制要求，默认按账号所属公司） */
  plantCode?: PlantCode
}

/** 刷新 Token 请求参数 */
export interface RefreshParams {
  refreshToken: string
}

export interface LoginDirectoryUser {
  account: string
  realName: string
  roleCode: string
  plantCode: PlantCode
  plantName: string
}

/** 来料追溯记录的完整类型定义已迁移至 src/types/trace.ts（对齐 M0 真实后端接口契约） */

/** 业务模块枚举 */
export type ModuleKey =
  | 'systemAdmin'
  | 'incoming'   // 来料数据管理 M1
  | 'trace'      // 来料追溯 M0
  | 'exception'  // 异常管理与整改 M2
  | 'fai'        // 首件检验 M3（归属于过程数据采集模块）
  | 'spc'        // SPC 过程能力分析 M4（归属于过程数据采集模块）
  | 'productionDefect' // 生产不良数据统计与多维趋势分析 M1-生产维修
  | 'processTools'     // 过程工具 M6（FMEA 风险跟踪 / 鱼骨图分析，独立模板模块）
  | 'finishedGoods'    // 成品数据管理 M1-成品入库检验审核

/** 固化工序枚举（红线：禁止新增其它工序） */
export enum ProcessEnum {
  /** 装配 */
  ASSEMBLY = '装配',
  /** 焊接 */
  WELDING = '焊接',
  /** 检测 */
  INSPECTION = '检测',
}

/** 工序编码映射（与 processName 严格对应） */
export const PROCESS_CODE_MAP: Record<ProcessEnum, string> = {
  [ProcessEnum.ASSEMBLY]: 'P-A',
  [ProcessEnum.WELDING]: 'P-W',
  [ProcessEnum.INSPECTION]: 'P-I',
}

/** 导航菜单项 */
export interface NavItem {
  key: ModuleKey | 'dashboard'
  title: string
  icon: string
  path: string
  roles: string[]  // 可访问的角色ID列表
}

export interface AdminUser { id: number; account: string; realName: string; roleCode: string; plantCode: PlantCode; plantName: string; status: number; authVersion: number; lastLoginAt?: string }
export interface PermissionDisplay { code: string; name: string; description: string }
export interface RolePermission { roleCode: string; roleName: string; dataScope: 'OWN_PLANT' | 'ALL_PLANTS'; dataScopeName?: string; dataScopeDescription?: string; version: number; permissions: string[]; permissionDetails?: PermissionDisplay[] }
export interface AdminAudit { id: number; operationType: string; operatorName: string; afterData?: string; ipAddress?: string; operationTime?: string; reason?: string }

/** 角色配置 */
export interface RoleConfig {
  roleCode: string        // 角色编码 R01~R06
  acct: string            // 示例账号，如 sz_op01
  name: string            // 示例姓名，如 张三
  roleName: string        // 角色名称，如 操作工
  desc: string            // 角色描述
}

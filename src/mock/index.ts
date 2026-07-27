/**
 * Mock 拦截器 — 模拟后端 RESTful API
 *
 * 工作原理：
 * 1. 在 axios 实例上注册自定义 adapter
 * 2. 匹配请求 URL 和 method，返回 mock 数据
 * 3. 从 sessionStorage 读取 areaCode 和用户信息，实现数据地区隔离 + 权限过滤
 * 4. 后端就绪后删除 src/mock/index.ts 的 setupMock() 调用即可切换到真实 API
 *
 * 注：trace（来料追溯）模块已切换至真实后端 M0 接口，不再走 Mock。
 *     auth 模块亦走真实后端。此处仅保留 supplier/material/exception/fai 占位。
 */

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResult } from '@/types'
import {
  mockMaterialInspectionList,
  mockMaterialInspectionStats,
  mockMaterialInspectionDetail,
} from './incoming'
import {
  mockExceptionList,
  mockExceptionDetail,
  mockExceptionStats,
  mockExceptionAnalysis,
  mockEscalationCheck,
} from './exception'

// ── 路由匹配 ────────────────────────────────────────────────

interface MockRoute {
  method: string
  pattern: RegExp
  handler: (config: InternalAxiosRequestConfig, match: RegExpMatchArray) => Promise<ApiResult>
}

const routes: MockRoute[] = []

/** 注册 mock 路由 */
function route(method: string, pattern: string, handler: MockRoute['handler']) {
  routes.push({ method: method.toUpperCase(), pattern: new RegExp(pattern), handler })
}

// ── M1 来料数据管理 ─────────────────────────────────────────

route('GET', '^/api/v1/material-inspections$', async (config) => mockMaterialInspectionList(config.params || {}))
route('GET', '^/api/v1/material-inspections/stats$', async () => mockMaterialInspectionStats())
route('GET', '^/api/v1/material-inspections/\\d+$', async (config, match) => {
  const id = Number(match[0].split('/').pop())
  return mockMaterialInspectionDetail(id)
})

// ── M2 异常与整改 ───────────────────────────────────────────

route('GET', '^/api/v1/exceptions$', async (config) => mockExceptionList(config.params || {}))
route('GET', '^/api/v1/exceptions/stats$', async () => mockExceptionStats())
route('GET', '^/api/v1/exceptions/analysis$', async (config) =>
  mockExceptionAnalysis((config.params || {}).dimension || 'defectDesc'),
)
route('GET', '^/api/v1/exceptions/\\d+$', async (config, match) => {
  const id = Number(match[0].split('/').pop())
  return mockExceptionDetail(id)
})
route('POST', '^/api/v1/exceptions/\\d+/close$', async () => ({
  code: 0,
  message: '闭环成功',
  data: null,
} as ApiResult<null>))

// ── M2 供应商升级 ───────────────────────────────────────────

route('POST', '^/api/v1/escalations/check$', async () => mockEscalationCheck())

// ── 安装 Mock ────────────────────────────────────────────────

/** 是否已安装 mock */
let installed = false

/**
 * 在 axios 实例上安装 mock 拦截器
 * 仅开发环境使用；生产环境不调用此函数即可走真实 API
 */
export function setupMock(instance: AxiosInstance) {
  if (installed) return
  installed = true

  // 保存原始 adapter（兼容 axios 1.x 浏览器环境下 defaults.adapter 可能为 undefined 的情况）
  const originalAdapter = instance.defaults.adapter || (axios as any).defaults.adapter

  instance.defaults.adapter = async function (config: InternalAxiosRequestConfig) {
    const method = (config.method || 'GET').toUpperCase()
    const url = (config.baseURL || '') + (config.url || '')

    // 尝试匹配 mock 路由
    for (const r of routes) {
      if (r.method !== method) continue
      const match = url.match(r.pattern)
      if (match) {
        const result = await r.handler(config, match)
        // 构造模拟 axios response
        return {
          data: result,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: {},
        }
      }
    }

    // 没有匹配到 mock 路由，走真实 API
    // 方案1: 原始 adapter 可用时直接调用（最优路径）
    if (originalAdapter && typeof originalAdapter === 'function') return originalAdapter(config)

    // 方案2: 用顶层 axios 实例发请求（其 adapter 未被覆盖，100% 可用）
    // 注意：必须解构 config 避免循环引用 adapter
    const { baseURL, url: reqUrl, method: reqMethod, params, data, headers, timeout, signal } = config
    return axios({ baseURL, url: reqUrl, method: reqMethod, params, data, headers, timeout, signal })
  }
}

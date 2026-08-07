/**
 * D10：实时通知 WebSocket 客户端（STOMP over SockJS）。
 *
 * 鉴权：token 不再拼接到 URL query（避免泄露到访问日志/浏览器历史/Referer），
 * 改在 STOMP CONNECT 帧的 Authorization 头中携带，经已建立的数据通道传输，
 * 由后端 StompAuthChannelInterceptor 校验（含 authVersion，改密后旧连接无法重建）。
 *
 * 连接生命周期：
 *  - connectNotificationSocket() 在登录态可用时调用一次；
 *  - onNotification(fn) 注册实时消息回调（通知中心用于弹窗 + 未读数 +1）；
 *  - disconnectNotificationSocket() 在登出/组件卸载时调用，主动断开并停止重连。
 *
 * 重连策略（单一机制，防重连风暴）：
 *  - 已禁用 stompjs 内建 reconnectDelay，重连仅由 scheduleReconnect 统一驱动；
 *  - 指数退避 + 上限 + 随机抖动：min(30s, 5s * 2^n) + jitter(0~1s)；
 *  - token 缺失/已过期（本地解码 exp 判断）→ 不重连，等待 HTTP 层静默刷新后由页面重新触发；
 *  - 服务端回 ERROR 帧且为鉴权失败（WS-AUTH-FAILED）→ 不重连。
 */
import { Client, type IMessage, type IFrame } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

type NotificationHandler = (payload: any) => void

/** 后端 StompAuthChannelInterceptor 鉴权失败 ERROR 帧的 message 前缀 */
const AUTH_FAIL_PREFIX = 'WS-AUTH-FAILED'
/** 重连退避基数 / 上限（毫秒） */
const RECONNECT_BASE_MS = 5000
const RECONNECT_MAX_MS = 30000
/** token 剩余有效期不足该值（毫秒）视为不可用，不发起连接 */
const TOKEN_EXPIRY_MARGIN_MS = 30000

let client: Client | null = null
let handler: NotificationHandler | null = null
let reconnectTimer: number | null = null
let manualClose = false
let authFailed = false
let reconnectAttempts = 0

function getToken(): string | null {
  return sessionStorage.getItem('qms_token')
}

/** 本地解码 JWT exp（不校验签名，仅用于避免拿着已过期 token 反复重连） */
function isTokenUsable(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  let payload: { exp?: number }
  try {
    payload = JSON.parse(atob(parts[1].replaceAll('-', '+').replaceAll('_', '/')))
  } catch {
    return false
  }
  if (typeof payload.exp !== 'number') return true
  return payload.exp * 1000 - Date.now() > TOKEN_EXPIRY_MARGIN_MS
}

/** 注册实时通知回调（仅保留最新一个，即通知中心） */
export function onNotification(fn: NotificationHandler): void {
  handler = fn
}

export function connectNotificationSocket(): void {
  // 显式调用即代表恢复连接意图（如登出后重新登录），重置手动关闭标志
  manualClose = false
  if (client?.connected) return
  const token = getToken()
  if (!token || !isTokenUsable(token)) {
    // token 缺失/过期：不重连，避免死循环；HTTP 层静默刷新成功后由通知中心重新连接
    console.warn('[WS] token 缺失或已过期，跳过连接（等待刷新后重试）')
    return
  }
  // 替换旧实例前先停用，避免残留 socket 泄漏
  if (client) {
    client.deactivate()
    client = null
  }
  authFailed = false

  client = new Client({
    // token 不进 URL：SockJS 仅裸连 /ws，凭证放 CONNECT 帧头
    webSocketFactory: () => new SockJS('/ws') as unknown as WebSocket,
    connectHeaders: { Authorization: `Bearer ${token}` },
    // 禁用 stompjs 内建重连：重连统一由 scheduleReconnect 驱动，避免双机制叠加风暴
    reconnectDelay: 0,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      reconnectAttempts = 0
      client?.subscribe('/user/queue/notifications', (message: IMessage) => {
        try {
          const payload = JSON.parse(message.body)
          handler?.(payload)
        } catch (e) {
          console.error('[WS] 通知消息解析失败', e)
        }
      })
    },
    onStompError: (frame: IFrame) => {
      const msg = frame.headers['message'] ?? ''
      if (msg.includes(AUTH_FAIL_PREFIX)) {
        // 鉴权失败（token 无效/黑名单/authVersion 不符）：停止重连
        authFailed = true
        console.warn('[WS] 鉴权失败，停止重连：', msg)
      } else {
        console.error('[WS] STOMP 错误', msg, frame.body)
      }
    },
    onWebSocketClose: () => {
      if (!manualClose && !authFailed) scheduleReconnect()
    },
    onWebSocketError: () => {
      if (!manualClose && !authFailed) scheduleReconnect()
    },
  })
  client.activate()
}

/** 指数退避 + 随机抖动的唯一重连入口 */
function scheduleReconnect(): void {
  if (reconnectTimer != null || manualClose || authFailed) return
  const token = getToken()
  if (!token || !isTokenUsable(token)) {
    console.warn('[WS] token 缺失或已过期，停止重连')
    return
  }
  const backoff = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** reconnectAttempts)
  // 抖动仅用于错峰重连，非安全场景，使用 Math.random 是安全的
  const delay = backoff + Math.floor(Math.random() * 1000) // NOSONAR typescript:S2245
  reconnectAttempts += 1
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    if (!manualClose && !authFailed) connectNotificationSocket()
  }, delay)
}

export function disconnectNotificationSocket(): void {
  manualClose = true
  if (reconnectTimer != null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  reconnectAttempts = 0
  client?.deactivate()
  client = null
  handler = null
}

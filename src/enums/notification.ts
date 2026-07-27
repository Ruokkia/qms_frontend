/**
 * M2-3 通知底座枚举定义
 *
 * 来源：qms-backend Notification 实体 + 接口文档
 */

/** 通知类型 */
export enum NotificationTypeEnum {
  EXCEPTION_CREATED = 'EXCEPTION_CREATED',
  EXCEPTION_STATUS_CHANGED = 'EXCEPTION_STATUS_CHANGED',
  ESCALATION_TRIGGERED = 'ESCALATION_TRIGGERED',
}

/** 通知业务类型 */
export enum NotificationBusinessTypeEnum {
  EXCEPTION_ORDER = 'EXCEPTION_ORDER',
  ESCALATION = 'ESCALATION',
}

/** 通知类型 → 显示标签 */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  [NotificationTypeEnum.EXCEPTION_CREATED]: '异常创建',
  [NotificationTypeEnum.EXCEPTION_STATUS_CHANGED]: '状态变更',
  [NotificationTypeEnum.ESCALATION_TRIGGERED]: '升级触发',
}

/** 通知类型 → 状态色 */
export const NOTIFICATION_TYPE_COLORS: Record<string, string> = {
  [NotificationTypeEnum.EXCEPTION_CREATED]: '#B84B3E',
  [NotificationTypeEnum.EXCEPTION_STATUS_CHANGED]: '#3E6B95',
  [NotificationTypeEnum.ESCALATION_TRIGGERED]: '#B8763E',
}

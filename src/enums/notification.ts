/**
 * M2-3 通知底座枚举定义
 *
 * 来源：qms-backend NotificationTypeEnum + 接口文档
 */

/** 通知类型（共 11 种，与后端 NotificationTypeEnum 一一对应） */
export enum NotificationTypeEnum {
  EXCEPTION_CREATED = 'EXCEPTION_CREATED',
  EXCEPTION_STATUS_CHANGED = 'EXCEPTION_STATUS_CHANGED',
  EXCEPTION_CLOSED = 'EXCEPTION_CLOSED',
  ESCALATION_TRIGGERED = 'ESCALATION_TRIGGERED',
  EIGHT_D_LEADER_ASSIGNED = 'EIGHT_D_LEADER_ASSIGNED',
  EIGHT_D_TEAM_PENDING_REVIEW = 'EIGHT_D_TEAM_PENDING_REVIEW',
  EIGHT_D_TEAM_APPROVED = 'EIGHT_D_TEAM_APPROVED',
  ACTION_OWNER_ASSIGNED = 'ACTION_OWNER_ASSIGNED',
  PLAN_OWNER_ASSIGNED = 'PLAN_OWNER_ASSIGNED',
  ESCALATION_OWNER_ASSIGNED = 'ESCALATION_OWNER_ASSIGNED',
}

/** 通知业务类型 */
export enum NotificationBusinessTypeEnum {
  EXCEPTION_ORDER = 'EXCEPTION_ORDER',
  ESCALATION = 'ESCALATION',
  IMPROVEMENT_ACTION = 'IMPROVEMENT_ACTION',
  RECTIFICATION_PLAN = 'RECTIFICATION_PLAN',
}

/** 通知类型 → 显示标签 */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  [NotificationTypeEnum.EXCEPTION_CREATED]: '异常创建',
  [NotificationTypeEnum.EXCEPTION_STATUS_CHANGED]: '状态变更',
  [NotificationTypeEnum.EXCEPTION_CLOSED]: '异常闭环',
  [NotificationTypeEnum.ESCALATION_TRIGGERED]: '升级触发',
  [NotificationTypeEnum.EIGHT_D_LEADER_ASSIGNED]: '整改负责人指派',
  [NotificationTypeEnum.EIGHT_D_TEAM_PENDING_REVIEW]: '8D团队待审核',
  [NotificationTypeEnum.EIGHT_D_TEAM_APPROVED]: '8D团队审核通过',
  [NotificationTypeEnum.ACTION_OWNER_ASSIGNED]: '改善措施指派',
  [NotificationTypeEnum.PLAN_OWNER_ASSIGNED]: '整改计划指派',
  [NotificationTypeEnum.ESCALATION_OWNER_ASSIGNED]: '升级措施指派',
}

/** 通知类型 → 状态色 */
export const NOTIFICATION_TYPE_COLORS: Record<string, string> = {
  [NotificationTypeEnum.EXCEPTION_CREATED]: '#B84B3E',
  [NotificationTypeEnum.EXCEPTION_STATUS_CHANGED]: '#3E6B95',
  [NotificationTypeEnum.EXCEPTION_CLOSED]: '#4A8C3F',
  [NotificationTypeEnum.ESCALATION_TRIGGERED]: '#B8763E',
  [NotificationTypeEnum.EIGHT_D_LEADER_ASSIGNED]: '#6B3EB8',
  [NotificationTypeEnum.EIGHT_D_TEAM_PENDING_REVIEW]: '#B8683E',
  [NotificationTypeEnum.EIGHT_D_TEAM_APPROVED]: '#3E8C6B',
  [NotificationTypeEnum.ACTION_OWNER_ASSIGNED]: '#3E6BB8',
  [NotificationTypeEnum.PLAN_OWNER_ASSIGNED]: '#5B8C3E',
  [NotificationTypeEnum.ESCALATION_OWNER_ASSIGNED]: '#B83E8C',
}

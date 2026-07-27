/**
 * M1 来料数据管理枚举定义
 *
 * 来源：qms-backend 实体字段 + QMS-代码规范文档
 * 与后端 Java 字段值严格一致，前端禁止硬编码枚举值。
 */

/** 检验结果 */
export enum InspectionResultEnum {
  PASS = '合格',
  FAIL = '不合格',
}

/** 审核状态 */
export enum ReviewStatusEnum {
  PENDING = '待审核',
  APPROVED = '已审核',
  REJECTED = '驳回',
}

/** 处理方式 */
export enum HandlingMethodEnum {
  RETURN = '退货',
  SORT = '挑选',
  CONCESSION = '特采',
  SCRAP = '报废',
}

/** 签名状态 */
export enum SignatureStatusEnum {
  SIGNED = '已签',
  UNSIGNED = '未签',
}

/** 是否急料 */
export enum UrgentEnum {
  YES = '是',
  NO = '否',
}

/** 是否客供料 */
export enum CustomerSuppliedEnum {
  YES = '是',
  NO = '否',
}

/** 检验结果 → 状态色 */
export const INSPECTION_RESULT_COLORS: Record<string, string> = {
  [InspectionResultEnum.PASS]: '#3E7A4E',
  [InspectionResultEnum.FAIL]: '#B84B3E',
}

/** 审核状态 → 状态色 */
export const REVIEW_STATUS_COLORS: Record<string, string> = {
  [ReviewStatusEnum.PENDING]: '#B8763E',
  [ReviewStatusEnum.APPROVED]: '#3E7A4E',
  [ReviewStatusEnum.REJECTED]: '#B84B3E',
}

/** 处理方式 → 状态色 */
export const HANDLING_METHOD_COLORS: Record<string, string> = {
  [HandlingMethodEnum.RETURN]: '#B84B3E',
  [HandlingMethodEnum.SORT]: '#B8763E',
  [HandlingMethodEnum.CONCESSION]: '#3E6B95',
  [HandlingMethodEnum.SCRAP]: '#8C9BA8',
}

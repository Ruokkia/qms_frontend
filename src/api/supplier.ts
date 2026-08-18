/**
 * M2-1 供应商档案管理 API 封装
 *
 * 路径前缀：/api/v1/suppliers
 * 聚合视图按供应商维度复用现有来料 / 异常接口，仅补充供应商列表查询。
 * 严格对齐 SupplierController / MaterialInspectionController / ExceptionController 接口契约。
 */
import { apiGet } from './request'
import type { ApiResult, PageResult } from '@/types'
import type { MaterialInspection, MaterialInspectionListParams } from '@/types/incoming'
import type { ExceptionOrder, ExceptionListParams, SupplierExceptionSummary } from '@/types/exception'

/** 供应商基础信息（对齐 qms.supplier 表，只读展示用投影） */
export interface Supplier {
  id: number
  supplierCode?: string
  supplierName?: string
  contactPerson?: string
  contactPhone?: string
  address?: string
  /** 风险等级：高/中/低 */
  riskLevel?: string
  /** 状态：启用/停用 */
  status?: string
  remark?: string
  plantCode?: string
  plantName?: string
  createdAt?: string
  updatedAt?: string
}

/** 供应商分页列表查询参数 */
export interface SupplierListParams {
  page: number
  size: number
  keyword?: string
}

/** 供应商分页列表 */
export function getSupplierListApi(
  params: SupplierListParams,
): Promise<ApiResult<PageResult<Supplier>>> {
  return apiGet<PageResult<Supplier>>('/suppliers', { params })
}

/**
 * 某供应商来料检验明细（复用 M1 物料检验列表，按 supplierCode 过滤）。
 */
export function getSupplierIncomingApi(
  params: MaterialInspectionListParams,
): Promise<ApiResult<PageResult<MaterialInspection>>> {
  return apiGet<PageResult<MaterialInspection>>('/material-inspections', { params })
}

/**
 * 某供应商来料异常明细（复用 M2 异常列表，按 supplierId 过滤）。
 */
export function getSupplierExceptionsApi(
  params: ExceptionListParams,
): Promise<ApiResult<PageResult<ExceptionOrder>>> {
  return apiGet<PageResult<ExceptionOrder>>('/exceptions', { params })
}

/**
 * 某供应商来料不良频次汇总（异常概览卡片数据）。
 */
export function getSupplierExceptionSummaryApi(params: {
  supplierId?: number
  startDate?: string
  endDate?: string
  minCount?: number
}): Promise<ApiResult<SupplierExceptionSummary[]>> {
  return apiGet<SupplierExceptionSummary[]>('/exceptions/supplier-summary', { params })
}

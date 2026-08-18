import { apiGet, apiPost, apiPut } from './request'
import type { ApiResult, PageResult } from '@/types'

export interface AfterSalesOrder { id?: number; orderNo?: string; customerName: string; customerContact?: string; customerPhone?: string; serviceType: '安装' | '维修' | '咨询' | '投诉'; productCode?: string; productName?: string; productBatchNo?: string; faultDescription?: string; serviceAddress?: string; assigneeName?: string; status?: string; visitRecord?: string; closeSignature?: string; closeTime?: string; createdAt?: string }
export interface Satisfaction { id?: number; workOrderId?: number; score: number; reasonDimension?: string; followUpResult?: string; responsibleName?: string; followUpTime?: string; capaNo?: string }
export interface OrderLog { id: number; beforeStatus?: string; afterStatus: string; operatorName?: string; remark?: string; createdAt?: string }
export interface AfterSalesStats { total: number; closed: number; averageScore?: number; lowScoreCount: number; byServiceType: Record<string, number>; monthlyTrend: Record<string,number>; lowScoreReasons: Record<string,number> }
export const getAfterSalesOrders = (params: { page: number; size: number; keyword?: string; status?: string; serviceType?: string }) => apiGet<PageResult<AfterSalesOrder>>('/after-sales', { params })
export const createAfterSalesOrder = (data: AfterSalesOrder) => apiPost<AfterSalesOrder>('/after-sales', data)
export const updateAfterSalesOrder = (id: number, data: AfterSalesOrder) => apiPut<AfterSalesOrder>(`/after-sales/${id}`, data)
export const transitionAfterSalesOrder = (id: number, targetStatus: string, remark?: string) => apiPost<AfterSalesOrder>(`/after-sales/${id}/transition`, undefined, { params: { targetStatus, remark } })
export const getAfterSalesLogs = (id: number) => apiGet<OrderLog[]>(`/after-sales/${id}/logs`)
export const getSatisfaction = (id: number) => apiGet<Satisfaction>(`/after-sales/${id}/satisfaction`)
export const saveSatisfaction = (id: number, data: Satisfaction) => apiPost<Satisfaction>(`/after-sales/${id}/satisfaction`, data)
export const updateSatisfactionFollowUp = (id:number,data:Satisfaction)=>apiPut<Satisfaction>(`/after-sales/${id}/satisfaction/follow-up`,data)
export const getAfterSalesStats = () => apiGet<AfterSalesStats>('/after-sales/stats')
export const createAfterSalesCapa=(id:number)=>apiPost<{exceptionId:number;capaNo:string}>(`/after-sales/${id}/capa`)

import service, { apiDelete, apiGet, apiPost, apiPut } from './request'
import type { PageResult } from '@/types'
export interface Instrument { id?:number; instrumentCode:string; instrumentName:string; model?:string; specification?:string; accuracyGrade?:string; measurementRange?:string; departmentName?:string; storageLocation?:string; keeperName?:string; status?:string; calibrationCycleMonths?:number; calibrationAgency?:string; nextCalibrationDate?:string; remark?:string; qrCode?:string }
export interface Calibration { id?:number; calibrationDate?:string; result:string; agency?:string; certificateNo?:string; validUntil?:string; remark?:string }
export const getInstruments=(params:{page:number;size:number;keyword?:string;status?:string})=>apiGet<PageResult<Instrument>>('/measurement',{params})
export const createInstrument=(data:Instrument)=>apiPost<Instrument>('/measurement',data)
export const updateInstrument=(id:number,data:Instrument)=>apiPut<Instrument>(`/measurement/${id}`,data)
export const deleteInstrument=(id:number)=>apiDelete(`/measurement/${id}`)
export const addCalibration=(id:number,data:Calibration)=>apiPost<Calibration>(`/measurement/${id}/calibrations`,data)
export const addUsage=(id:number,data:Record<string,unknown>)=>apiPost(`/measurement/${id}/usage`,data)
export const lendInstrument=(id:number,data:Record<string,unknown>)=>apiPost(`/measurement/${id}/lend`,data)
export const returnInstrument=(recordId:number,appearance?:string)=>apiPost(`/measurement/lendings/${recordId}/return`,undefined,{params:{appearance}})
export const returnInstrumentByInstrument=(id:number,appearance?:string)=>apiPost(`/measurement/${id}/return`,undefined,{params:{appearance}})
export const repairInstrument=(id:number,data:Record<string,unknown>)=>apiPost(`/measurement/${id}/repair`,data)
export const scrapInstrument=(id:number,data:Record<string,unknown>)=>apiPost(`/measurement/${id}/scrap`,data)
export const getInstrumentHistory=(id:number)=>apiGet<Record<string,any[]>>(`/measurement/${id}/history`)
export const getMeasurementReminders=()=>apiGet<Record<string,any[]>>('/measurement/reminders')
export const getScrapApplications=()=>apiGet<any[]>('/measurement/scraps')
export const approveScrap=(recordId:number,stage:'METROLOGY'|'QUALITY')=>apiPost(`/measurement/scraps/${recordId}/approve`,undefined,{params:{stage}})
export const completeRepair=(recordId:number,data:Record<string,unknown>)=>apiPost(`/measurement/maintenance/${recordId}/complete`,data)
export const getMeasurementStats=()=>apiGet<Record<string,any>>('/measurement/stats')
export const getUsageTrace=(params:{productBatchNo?:string;operatorName?:string})=>apiGet<any[]>('/measurement/usage-trace',{params})
export const getCalibrationAgencies=()=>apiGet<any[]>('/measurement/agencies')
export const createCalibrationAgency=(data:Record<string,unknown>)=>apiPost('/measurement/agencies',data)
export const updateCalibrationAgency=(id:number,data:Record<string,unknown>)=>apiPut(`/measurement/agencies/${id}`,data)
export const importInstruments=(file:File)=>{const form=new FormData();form.append('file',file);return apiPost<{created:number;updated:number}>('/measurement/import',form,{headers:{'Content-Type':'multipart/form-data'}})}
export const exportInstruments=()=>service.get('/measurement/export',{responseType:'blob'}) as any

// e:\linghui\Purchase-Bidding-Demo\src\api\confirm.ts
import request from '@/utils/request'
import type { PageResult, Quotation } from '@/types'

/** 采购排名及确认 - 查询参数 */
export interface ConfirmQuery {
  pageNum?: number
  pageSize?: number
  reqNo?: string
  quoteNo?: string
  supplier?: string
  status?: string
}

/** 排名列表分页查询 */
export function getConfirmList(query: ConfirmQuery): Promise<PageResult<Quotation>> {
  return request.get('/confirm/list', { params: query })
}

/** 报价单详情（含商品明细） */
export function getConfirmDetail(quotationId: number): Promise<Quotation> {
  return request.get(`/confirm/${quotationId}`)
}

/** 确认中标 */
export function awardQuotation(quotationIds: number[]): Promise<void> {
  return request.post('/confirm/award', { quotationIds: quotationIds })
}

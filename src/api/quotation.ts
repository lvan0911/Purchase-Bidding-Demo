import request from '@/utils/request'
import type { PageResult, PendingItem, Quotation, QuotationQuery } from '@/types'

/** 我的报价历史分页 */
export function getQuotationPage(query: QuotationQuery): Promise<PageResult<Quotation>> {
  return request.get('/quotations', { params: query })
}

/** 待报价需求列表 */
export function getPendingList(): Promise<PendingItem[]> {
  return request.get('/quotations/pending-list')
}

/** 报价编辑数据（需求详情 + 已有报价） */
export function getEditData(requirementId: number): Promise<{
  reqNo: string
  quoteDeadline: string
  deliverDate: string
  remark: string
  items: Array<{
    requirementItemId: number
    partNo: string
    partName: string
    quantity: number
    unit: string
    spec: string
    purchaseRemark: string
    price: number
    moq: number
    quoted: boolean
  }>
}> {
  return request.get('/quotations/edit-data', { params: { requirementId } })
}

/** 报价详情 */
export function getQuotationDetail(id: number): Promise<Quotation> {
  return request.get(`/quotations/${id}`)
}

/** 提交报价 */
export function submitQuotation(data: {
  requirementId: number
  quotePerson: string
  confirmDeliverDate: string
  quoteRemark?: string
  items: Array<{
    requirementItemId: number
    partNo: string
    price: number
    moq?: number
    quoteRemark?: string
  }>
}): Promise<void> {
  return request.post('/quotations', data)
}

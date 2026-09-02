import request from '@/utils/request'
import type { PageResult, PurchaseRequirement, RequirementQuery } from '@/types'

/** 分页查询需求 */
export function getRequirementPage(query: RequirementQuery): Promise<PageResult<PurchaseRequirement>> {
  return request.get('/requirements', { params: query })
}

/** 获取需求详情 */
export function getRequirementDetail(id: number): Promise<PurchaseRequirement> {
  return request.get(`/requirements/${id}`)
}

/** 预生成需求单号 */
export function getNextReqNo(): Promise<string> {
  return request.get('/requirements/next-no')
}

/** 发布/保存需求（id为空新增，否则编辑） */
export function saveRequirement(data: Partial<PurchaseRequirement> & { items: PurchaseRequirement['items'] }): Promise<void> {
  return request.post('/requirements', data)
}

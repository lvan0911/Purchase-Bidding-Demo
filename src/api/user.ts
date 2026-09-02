import request from '@/utils/request'
import type { PageResult, UserAccount, UserQuery } from '@/types'

/** 分页查询用户 */
export function getUserPage(query: UserQuery): Promise<PageResult<UserAccount>> {
  return request.get('/users', { params: query })
}

/** 新增用户 */
export function createUser(data: Omit<UserAccount, 'id' | 'createTime'>): Promise<void> {
  return request.post('/users', data)
}

/** 编辑用户 */
export function updateUser(id: number, data: Partial<UserAccount>): Promise<void> {
  return request.put(`/users/${id}`, data)
}

/** 删除用户 */
export function deleteUser(id: number): Promise<void> {
  return request.delete(`/users/${id}`)
}

/** 手机号是否被占用 */
export function isPhoneExists(phone: string, excludeId?: number): Promise<boolean> {
  return request.get('/users/phone-exists', { params: { phone, excludeId } })
}

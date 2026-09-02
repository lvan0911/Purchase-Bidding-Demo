import request from '@/utils/request'
import type { LoginResult, UserProfile } from '@/types'

/** 登录 */
export function login(data: { username: string; password: string }): Promise<LoginResult> {
  return request.post('/auth/login', data)
}

/** 退出登录 */
export function logout(): Promise<void> {
  return request.post('/auth/logout')
}

/** 获取当前用户信息 */
export function getCurrentUser(): Promise<UserProfile> {
  return request.get('/auth/info')
}
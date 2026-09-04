import axios from 'axios'
import { message } from 'ant-design-vue'
import { authStorage } from './storage'

/** 后端统一响应体 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/** 创建 axios 实例 */
const service = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

/** 请求拦截器：注入 token */
service.interceptors.request.use(
  (config) => {
    const token = authStorage.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

/** 响应拦截器：统一处理 */
service.interceptors.response.use(
  (response): any => {
    const res = response.data as ApiResponse
    // 成功码为 0（从 Swagger 示例值确认）
    if (res.code !== 0) {
      message.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res.data
  },
  (error) => {
    if (error.response?.status === 401) {
      authStorage.clear()
      message.error('登录已过期，请重新登录')
      const redirect = window.location.hash.replace('#', '')
      window.location.hash = `#/login?redirect=${encodeURIComponent(redirect)}`
    } else {
      message.error(error.message || '网络异常')
    }
    return Promise.reject(error)
  },
)

export default service
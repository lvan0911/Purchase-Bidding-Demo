import { createRouter, createWebHashHistory } from 'vue-router'
import { authStorage, userStorage } from '@/utils/storage'
import type { UserRole } from '@/types'

/** 扩展 meta 类型 */
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** 允许访问的角色，不配置则全部角色可访问 */
    roles?: UserRole[]
  }
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/purchase' },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@pages/login/index.vue'),
      meta: { title: '登录' },
    },
    {
      path: '/',
      component: () => import('@components/AppLayout.vue'),
      children: [
        {
          path: 'purchase',
          name: 'Purchase',
          component: () => import('@pages/purchase/index.vue'),
          meta: { title: '采购需求发布' },
        },
        {
          path: 'purchase/edit',
          name: 'PurchaseEdit',
          component: () => import('@pages/purchase/edit.vue'),
          meta: { title: '发布采购需求' },
        },
        {
          path: 'quotation',
          name: 'Quotation',
          component: () => import('@pages/quotation/index.vue'),
          meta: { title: '供应商报价', roles: ['admin', 'supplier'] },
        },
        {
          path: 'quotation/edit',
          name: 'QuotationEdit',
          component: () => import('@pages/quotation/edit.vue'),
          meta: { title: '供应商报价', roles: ['admin', 'supplier'] },
        },
        {
          path: 'confirm',
          name: 'Confirm',
          component: () => import('@pages/confirm/index.vue'),
          meta: { title: '采购排名及确认', roles: ['admin', 'purchaser'] },
        },
        {
          path: 'user',
          name: 'User',
          component: () => import('@pages/user/index.vue'),
          meta: { title: '用户管理', roles: ['admin'] },
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  document.title = `${String(to.meta.title ?? '')} - 松林科技采购竞价系统`
  const loggedIn = !!authStorage.getToken()
  if (to.path !== '/login' && !loggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && loggedIn) {
    return { path: '/purchase' }
  }
  /** 角色权限校验 */
  const requiredRoles = to.meta.roles
  if (requiredRoles && requiredRoles.length > 0) {
    const role = userStorage.get()?.role
    if (!role || !requiredRoles.includes(role)) {
      // 无权限，根据角色跳到默认首页
      const fallback =
        role === 'supplier' ? '/purchase'
        : role === 'purchaser' ? '/purchase'
        : '/purchase'
      return { path: fallback }
    }
  }
  return true
})

export default router

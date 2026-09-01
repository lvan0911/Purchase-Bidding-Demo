import { createRouter, createWebHashHistory } from 'vue-router'
import { userStorage } from '@/utils/storage'

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
          meta: { title: '供应商报价' },
        },
        {
          path: 'quotation/edit',
          name: 'QuotationEdit',
          component: () => import('@pages/quotation/edit.vue'),
          meta: { title: '供应商报价' },
        },
        {
          path: 'confirm',
          name: 'Confirm',
          component: () => import('@pages/confirm/index.vue'),
          meta: { title: '采购排名及确认' },
        },
        {
          path: 'user',
          name: 'User',
          component: () => import('@pages/user/index.vue'),
          meta: { title: '用户管理' },
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  document.title = `${String(to.meta.title ?? '')} - 松林科技采购竞价系统`
  const loggedIn = userStorage.get() !== null
  if (to.path !== '/login' && !loggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && loggedIn) {
    return { path: '/purchase' }
  }
  return true
})

export default router

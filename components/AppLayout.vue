<template>
  <a-layout class="app-layout">
    <a-layout-header class="app-header">
      <div class="app-header-inner">
        <div class="app-brand" @click="router.push('/purchase')">
          <span class="app-brand-logo">采</span>
          <span class="app-brand-title">松林科技采购竞价系统</span>
        </div>
        <a-menu
          theme="dark"
          mode="horizontal"
          :selected-keys="selectedKeys"
          class="app-menu"
          @click="onMenuClick"
        >
          <a-menu-item
            v-for="m in visibleMenus"
            :key="m.key"
          >{{ m.label }}</a-menu-item>
        </a-menu>
        <div class="app-user">
          <a-dropdown>
            <span class="app-user-name">
              <UserOutlined />
              {{ username }}
            </span>
            <template #overlay>
              <a-menu @click="onUserMenuClick">
                <a-menu-item key="logout">退出登录</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
    </a-layout-header>
    <a-layout-content class="app-content">
      <router-view />
    </a-layout-content>
  </a-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined } from '@ant-design/icons-vue'
import { authStorage, userStorage } from '@/utils/storage'
import { logout } from '@/api/auth'
import type { UserRole } from '@/types'

const route = useRoute()
const router = useRouter()

const currentUser = userStorage.get()
const username = ref(currentUser?.name || currentUser?.username || '用户')
const userRole: UserRole | undefined = currentUser?.role

/** 完整菜单定义 */
interface MenuItem { key: string; label: string; roles: UserRole[] }
const allMenus: MenuItem[] = [
  { key: '/purchase',  label: '采购需求发布', roles: ['admin', 'purchaser', 'supplier'] },
  { key: '/quotation', label: '供应商报价',   roles: ['admin', 'supplier'] },
  { key: '/confirm',   label: '排名及采购确认', roles: ['admin', 'purchaser'] },
  { key: '/user',      label: '用户管理',     roles: ['admin'] },
]

/** 当前角色可见的菜单 */
const visibleMenus = computed(() =>
  allMenus.filter((m) => !userRole || m.roles.includes(userRole)),
)

const selectedKeys = computed(() => [route.path])

function onMenuClick({ key }: { key: string }): void {
  router.push(key)
}

async function onUserMenuClick({ key }: { key: string }): Promise<void> {
  if (key === 'logout') {
    try {
      await logout()
    } catch {
      // 退出接口失败不影响前端清除
    }
    authStorage.clear()
    message.success('已退出登录')
    router.push('/login')
  }
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0;
  background: #001529;
}

.app-header-inner {
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  margin-right: 40px;
  user-select: none;
}

.app-brand-logo {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #1677ff;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-brand-title {
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  white-space: nowrap;
}

.app-menu {
  flex: 1;
  min-width: 0;
  background: transparent;
  border-bottom: none;
  line-height: 64px;
}

.app-user {
  margin-left: 16px;
}

.app-user-name {
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.app-content {
  min-height: calc(100vh - 64px);
  padding: 24px 0;
}
</style>

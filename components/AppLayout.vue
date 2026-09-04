<template>
  <a-layout class="app-layout">
    <a-layout-header class="app-header">
      <!-- 顶部高光装饰线 -->
      <div class="app-header-glow" />
      <div class="app-header-inner">
        <div class="app-brand" @click="router.push('/purchase')">
          <div class="app-brand-logo">
            <span class="logo-inner">采</span>
            <span class="logo-shine" />
          </div>
          <div class="app-brand-text">
            <span class="app-brand-title">松林科技采购竞价</span>
            <span class="app-brand-subtitle">Bidding System</span>
          </div>
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
          >
            <span class="menu-label">{{ m.label }}</span>
          </a-menu-item>
        </a-menu>
        <div class="app-user">
          <a-dropdown placement="bottomRight">
            <div class="app-user-trigger">
              <a-avatar :size="36" class="app-avatar">
                <template #icon><UserOutlined /></template>
              </a-avatar>
              <div class="app-user-info">
                <span class="app-user-name">{{ username }}</span>
                <span class="app-user-role">{{ roleLabel }}</span>
              </div>
            </div>
            <template #overlay>
              <a-menu @click="onUserMenuClick" class="user-dropdown-menu">
                <div class="dropdown-user-card">
                  <a-avatar :size="44" class="dropdown-avatar">
                    <template #icon><UserOutlined /></template>
                  </a-avatar>
                  <div class="dropdown-user-detail">
                    <div class="dropdown-user-name">{{ username }}</div>
                    <div class="dropdown-user-role-tag">{{ roleLabel }}</div>
                  </div>
                </div>
                <a-menu-divider style="margin: 8px 0" />
                <a-menu-item key="logout">
                  <LogoutOutlined style="margin-right: 8px; color: #ff4d4f" />
                  <span>退出登录</span>
                </a-menu-item>
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
import { computed, ref, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { UserOutlined, LogoutOutlined } from '@ant-design/icons-vue'
import { authStorage, userStorage } from '@/utils/storage'
import { logout } from '@/api/auth'
import type { UserRole } from '@/types'

const route = useRoute()
const router = useRouter()

const currentUser = userStorage.get()
const username = ref(currentUser?.name || currentUser?.username || '用户')
const userRole: UserRole | undefined = currentUser?.role

/** 角色中文名 */
const roleLabel = computed(() => {
  const map: Record<UserRole, string> = {
    admin: '系统管理员',
    purchaser: '采购员',
    supplier: '供应商',
  }
  return (userRole ? map[userRole] : '访客')
})

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
    Modal.confirm({
      centered: true,
      wrapClassName: 'logout-confirm-modal',
      icon: h(LogoutOutlined, { style: { color: '#ff4d4f', fontSize: 24 } }),
      title: '确认退出登录？',
      content: '退出后需要重新登录才能继续使用系统。',
      okText: '确认退出',
      cancelText: '取消',
      okButtonProps: { danger: true, size: 'large' },
      cancelButtonProps: { size: 'large' },
      onOk: async () => {
        try {
          await logout()
        } catch {
          // 退出接口失败不影响前端清除
        }
        authStorage.clear()
        message.success('已退出登录')
        router.push('/login')
      },
    })
  }
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

/* ===== Header 基础 ===== */
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0;
  /* background: linear-gradient(135deg, #0a192f 0%, #0f2d5c 50%, #0a192f 100%); */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  /* box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35); */
}

/* 顶部高光装饰线 */
.app-header-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #1677ff 20%, #69b1ff 50%, #1677ff 80%, transparent);
  opacity: 0.8;
}

.app-header-inner {
  position: relative;
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  height: 68px;
  display: flex;
  align-items: center;
  padding: 0 28px;
}

/* ===== Brand 品牌区 ===== */
.app-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  margin-right: 48px;
  user-select: none;
  transition: transform 0.25s ease;
}

.app-brand:hover {
  transform: scale(1.02);
}

.app-brand-logo {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1677ff 0%, #0958d9 60%, #003eb3 100%);
  /* box-shadow: 0 4px 14px rgba(22, 119, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2); */
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo-inner {
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

/* Logo 高光扫光效果 */
.logo-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 40%,
    rgba(255, 255, 255, 0.15) 50%,
    transparent 60%
  );
  transform: translateX(-100%);
  animation: logoShine 4s ease-in-out infinite;
}

@keyframes logoShine {
  0%, 90%, 100% { transform: translateX(-100%); }
  95% { transform: translateX(100%); }
}

.app-brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.app-brand-title {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.app-brand-subtitle {
  color: rgba(105, 177, 255, 0.75);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-top: 3px;
}

/* ===== Menu 导航菜单 ===== */
.app-menu {
  flex: 1;
  min-width: 0;
  /* background: transparent !important; */
  border-bottom: none !important;
  line-height: 68px;
}

/* 穿透 Ant Design 默认样式 */
.app-menu :deep(.ant-menu-item) {
  position: relative;
  height: 50px;
  line-height: 50px;
  margin: 5px 4px !important;
  border-radius: 8px !important;
  color: rgba(255, 255, 255, 0.75) !important;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* Hover 态 - 胶囊背景 */
.app-menu :deep(.ant-menu-item:hover) {
  color: #fff !important;
  /* background: rgba(22, 119, 255, 0.18) !important; */
}

/* 选中态 - 渐变胶囊 + 底部光晕 */
.app-menu :deep(.ant-menu-item-selected) {
  color: #fff !important;
  /* background: linear-gradient(135deg, rgba(22, 119, 255, 0.55) 0%, rgba(9, 88, 217, 0.7) 100%) !important;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15); */
}

.app-menu :deep(.ant-menu-item-selected::after) {
  display: none !important;
}

.menu-label {
  position: relative;
  display: inline-block;
}

/* ===== User 用户区 ===== */
.app-user {
  margin-left: 8px;
}

.app-user-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border-radius: 24px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.25s ease;
}

.app-user-trigger:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(22, 119, 255, 0.5);
  /* box-shadow: 0 0 12px rgba(22, 119, 255, 0.2); */
}

.app-avatar {
  background: linear-gradient(135deg, #1677ff, #0958d9) !important;
  border: 2px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.app-user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.app-user-name {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.app-user-role {
  color: rgba(105, 177, 255, 0.8);
  font-size: 10px;
  font-weight: 500;
  margin-top: 2px;
}

/* ===== Dropdown 下拉菜单卡片 ===== */
.dropdown-user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px 4px;
}

.dropdown-avatar {
  background: linear-gradient(135deg, #1677ff, #0958d9) !important;
}

.dropdown-user-detail {
  display: flex;
  flex-direction: column;
}

.dropdown-user-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.dropdown-user-role-tag {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  color: #1677ff;
  background: #e6f4ff;
  border-radius: 10px;
  width: fit-content;
}

/* ===== Content ===== */
.app-content {
  min-height: calc(100vh - 68px);
  padding: 24px 0;
}
</style>

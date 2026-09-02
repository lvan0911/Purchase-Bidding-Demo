<template>
  <div class="login-page">
    <div class="login-box">
      <div class="login-brand">
        <span class="login-logo">采</span>
        <h1 class="login-title">松林科技采购竞价系统</h1>
        <p class="login-subtitle">采购需求发布 · 供应商报价 · 中标确认</p>
      </div>
      <a-form
        ref="formRef"
        :model="form"
        :rules="rules"
        layout="vertical"
        @finish="handleLogin"
      >
        <a-form-item label="用户名" name="username">
          <a-input
            v-model:value="form.username"
            placeholder="请输入用户名"
            size="large"
            allow-clear
          >
            <template #prefix><UserOutlined /></template>
          </a-input>
        </a-form-item>
        <a-form-item label="密码" name="password">
          <a-input-password
            v-model:value="form.password"
            placeholder="请输入密码"
            size="large"
          >
            <template #prefix><LockOutlined /></template>
          </a-input-password>
        </a-form-item>
        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
          >
            登 录
          </a-button>
        </a-form-item>
      </a-form>
      <p class="login-tip">Demo 演示环境：任意用户名密码均可登录</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { authStorage, userStorage } from '@/utils/storage'
import { login } from '@/api/auth'

const route = useRoute()
const router = useRouter()

const formRef = ref()
const loading = ref(false)
const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin(): Promise<void> {
  loading.value = true
  try {
    const result = await login({ username: form.username, password: form.password })
    authStorage.setToken(result.token)
    userStorage.save({ username: result.name || result.username })
    message.success(`欢迎登录，${result.name || result.username}`)
    const redirect = (route.query.redirect as string) || '/purchase'
    router.push(redirect)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #001529 0%, #1677ff 100%);
  padding: 24px;
}

.login-box {
  width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 40px 36px 28px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}

.login-brand {
  text-align: center;
  margin-bottom: 28px;
}

.login-logo {
  display: inline-flex;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: #1677ff;
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  align-items: center;
  justify-content: center;
}

.login-title {
  margin: 14px 0 6px;
  font-size: 22px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.login-subtitle {
  margin: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.login-tip {
  margin: 4px 0 0;
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>

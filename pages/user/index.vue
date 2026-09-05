<template>
  <div class="page-container">
    <div class="page-header">
      <span class="page-title">用户管理</span>
    </div>

    <!-- 搜索条件区域 -->
    <a-card class="page-card search-card">
      <a-form layout="inline" :model="query">
        <a-form-item label="账号（手机号）">
          <a-input
            v-model:value="query.phone"
            placeholder="请输入手机号"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item label="姓名">
          <a-input
            v-model:value="query.name"
            placeholder="请输入姓名"
            allow-clear
            style="width: 150px"
          />
        </a-form-item>
        <a-form-item label="角色">
          <a-select
            v-model:value="query.role"
            placeholder="全部"
            allow-clear
            style="width: 120px"
          >
            <a-select-option value="admin">管理员</a-select-option>
            <a-select-option value="purchaser">采购员</a-select-option>
            <a-select-option value="supplier">供应商</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="query.enabled"
            placeholder="全部"
            allow-clear
            style="width: 110px"
          >
            <a-select-option :value="true">启用</a-select-option>
            <a-select-option :value="false">禁用</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 列表区域 -->
    <a-card class="page-card list-card" title="用户列表">
      <template #extra>
        <a-button type="primary" @click="openModal()">
          <template #icon><PlusOutlined /></template>
          新增用户
        </a-button>
      </template>
      <a-table
        :columns="columns"
        :data-source="accounts"
        row-key="id"
        size="middle"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1000 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="record.enabled ? 'green' : 'red'">
              {{ record.enabled ? '启用' : '禁用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'role'">
            <a-tag :color="roleColor(record.role)">{{ roleText(record.role) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openModal(record)">编辑</a-button>
              <a-popconfirm
                title="确定删除该用户吗？"
                ok-text="删除"
                cancel-text="取消"
                @confirm="removeUser(record)"
              >
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新增 / 编辑用户 -->
    <a-modal
      v-model:open="modalOpen"
      :title="editing ? '编辑用户' : '新增用户'"
      ok-text="保存"
      cancel-text="取消"
      width="780px"
      wrap-class-name="detail-modal-wrap"
      @ok="handleSave"
      @cancel="closeModal"
    >
      <a-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :label-col="{ style: { width: '120px' } }"
        :wrapper-col="{ style: { width: 'calc(100% - 120px)' } }"
      >
        <a-form-item label="账号（手机号）" name="phone">
          <a-input
            v-model:value="form.phone"
            :maxlength="11"
            placeholder="请输入 11 位手机号（必填）"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="姓名" name="name">
          <a-input v-model:value="form.name" placeholder="请输入姓名（必填）" allow-clear />
        </a-form-item>
        <a-form-item label="角色" name="role">
          <a-select v-model:value="form.role" placeholder="请选择角色（必填）">
            <a-select-option value="admin">管理员</a-select-option>
            <a-select-option value="purchaser">采购员</a-select-option>
            <a-select-option value="supplier">供应商</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态" name="enabled">
          <a-radio-group v-model:value="form.enabled">
            <a-radio :value="true">启用</a-radio>
            <a-radio :value="false">禁用</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="密码" name="password">
          <a-input-password
            v-model:value="form.password"
            :placeholder="editing ? '留空表示不修改密码' : '请输入初始密码（默认 123456）'"
          />
        </a-form-item>
        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="form.email" placeholder="请输入邮箱（必填）" allow-clear />
        </a-form-item>
        <a-form-item label="公司名称" name="company">
          <a-input v-model:value="form.company" placeholder="请输入公司名称（必填）" allow-clear />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { createUser, deleteUser, getUserPage, isPhoneExists, updateUser } from '@/api/user'
import type { UserAccount, UserRole } from '@/types'

const accounts = ref<UserAccount[]>([])
const loading = ref(false)

const query = reactive({
  phone: '',
  name: '',
  role: undefined as UserRole | undefined,
  enabled: undefined as number | undefined,
})

const roleTextMap: Record<UserRole, string> = {
  admin: '管理员',
  purchaser: '采购员',
  supplier: '供应商',
}
const roleColorMap: Record<UserRole, string> = {
  admin: 'red',
  purchaser: 'blue',
  supplier: 'green',
}
function roleText(role: UserRole): string {
  return roleTextMap[role] ?? role
}
function roleColor(role: UserRole): string {
  return roleColorMap[role] ?? 'default'
}

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
  onChange: (page: number, pageSize: number) => {
    pagination.current = page
    pagination.pageSize = pageSize
    fetchList()
  },
})

async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const res = await getUserPage({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      phone: query.phone || undefined,
      name: query.name || undefined,
      role: query.role,
      enabled: query.enabled,
    })
    accounts.value = res.list
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

const columns = [
  { title: '序号', key: 'index', width: 70, align: 'center' as const },
  { title: '状态', key: 'enabled',  align: 'center' as const },
  { title: '角色', key: 'role',  align: 'center' as const },
  { title: '账号（手机号）', dataIndex: 'phone', align: 'center' as const },
  { title: '姓名', dataIndex: 'name', align: 'center' as const },
  { title: '邮箱', dataIndex: 'email', align: 'center' as const },
  { title: '公司名称', dataIndex: 'company', align: 'center' as const },
  { title: '操作', key: 'action', width: 120, align: 'center' as const, fixed: 'right' as const },
]

function handleSearch(): void {
  pagination.current = 1
  fetchList()
}

function handleReset(): void {
  query.phone = ''
  query.name = ''
  query.role = undefined
  query.enabled = undefined
  pagination.current = 1
  fetchList()
}

/* ---------- 新增 / 编辑 ---------- */
const modalOpen = ref(false)
const editing = ref<UserAccount | null>(null)
const formRef = ref()
const form = reactive({
  id: 0 as number,
  phone: '',
  name: '',
  email: '',
  company: '',
  role: undefined as UserRole | undefined,
  enabled: 1 as number,
  password: '',
})

const rules = {
  phone: [
    { required: true, message: '请输入账号（手机号）', trigger: 'blur' },
    {
      pattern: /^1\d{10}$/,
      message: '请输入正确的 11 位手机号',
      trigger: 'blur',
    },
  ],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  company: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
}

function openModal(account?: UserAccount): void {
  editing.value = account ?? null
  form.id = account?.id ?? 0
  form.phone = account?.phone ?? ''
  form.name = account?.name ?? ''
  form.email = account?.email ?? ''
  form.company = account?.company ?? ''
  form.role = account?.role ?? undefined
  form.enabled = account?.enabled ?? 1
  form.password = ''
  modalOpen.value = true
}

function closeModal(): void {
  modalOpen.value = false
  formRef.value?.resetFields()
}

async function handleSave(): Promise<void> {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!form.role) {
    message.error('请选择角色')
    return
  }
  // 手机号唯一性校验（调后端接口）
  const exists = await isPhoneExists(form.phone.trim(), editing.value?.id)
  if (exists) {
    message.error('该手机号已被占用')
    return
  }
  try {
    if (editing.value) {
      await updateUser(editing.value.id, {
        phone: form.phone.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        role: form.role,
        enabled: form.enabled,
        ...(form.password ? { password: form.password } : {}),
      })
      message.success('用户已更新')
    } else {
      await createUser({
        phone: form.phone.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        role: form.role,
        enabled: form.enabled,
        ...(form.password ? { password: form.password } : {}),
      })
      message.success('用户已新增')
    }
    modalOpen.value = false
    fetchList()
  } catch {
    // 错误已在拦截器中提示
  }
}

async function removeUser(account: UserAccount): Promise<void> {
  try {
    await deleteUser(account.id)
    message.success('用户已删除')
    fetchList()
  } catch {
    // 错误已在拦截器中提示
  }
}
</script>

<style scoped>
.search-card {
  margin-bottom: 16px;
  position: relative;
  border: none;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
  box-shadow: 0 2px 10px rgba(15, 34, 78, 0.06);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.search-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #1677ff, #36cfc9, #69b1ff, #1677ff);
  background-size: 200% 100%;
  animation: searchLine 6s linear infinite;
}

.search-card:hover {
  box-shadow: 0 6px 18px rgba(22, 119, 255, 0.14);
}

@keyframes searchLine {
  0% {
    background-position: 0% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.search-card :deep(.ant-form-item) {
  margin-bottom: 8px;
  margin-right: 22px;
}

.search-card :deep(.ant-form-item-label > label) {
  color: #33456b;
  font-weight: 500;
}

.search-card :deep(.ant-input),
.search-card :deep(.ant-select-selector),
.search-card :deep(.ant-picker) {
  border-radius: 8px !important;
  transition: all 0.25s ease;
}

.search-card :deep(.ant-input:hover),
.search-card :deep(.ant-select-selector:hover),
.search-card :deep(.ant-picker:hover) {
  border-color: #4096ff !important;
}

.search-card :deep(.ant-input:focus),
.search-card :deep(.ant-select-focused .ant-select-selector),
.search-card :deep(.ant-picker-focused) {
  border-color: #1677ff !important;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.1) !important;
}

.search-card :deep(.ant-btn-primary) {
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.35);
  transition: all 0.25s ease;
}

.search-card :deep(.ant-btn-primary:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(22, 119, 255, 0.45);
}

.search-card :deep(.ant-btn-default) {
  border-radius: 8px;
  transition: all 0.25s ease;
}

.search-card :deep(.ant-btn-default:hover) {
  color: #1677ff;
  border-color: #1677ff;
}

.list-card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(15, 34, 78, 0.06);
  overflow: hidden;
}

.list-card :deep(.ant-card-head) {
  padding: 14px 20px;
  border-bottom: 1px solid #eef2f9;
}

.list-card :deep(.ant-card-head-title) {
  font-weight: 600;
  font-size: 15px;
  position: relative;
  padding-left: 14px;
}

.list-card :deep(.ant-card-head-title::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: linear-gradient(180deg, #1677ff, #36cfc9);
}

.list-card :deep(.ant-card-body) {
  padding: 8px 20px 16px;
}

.list-card :deep(.ant-table-thead > tr > th) {
  background: linear-gradient(180deg, #f5f9ff, #edf3fe);
  color: #1d2b4f;
  font-weight: 600;
  border-bottom: 1px solid #e3ebf8;
  border-right: 1px solid #e3ebf8;
}

.list-card :deep(.ant-table-thead > tr > th:last-child) {
  border-right: none;
}

.list-card :deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid #f2f5fa;
  border-right: 1px solid #f2f5fa;
  transition: background-color 0.2s ease;
}

.list-card :deep(.ant-table-tbody > tr > td:last-child) {
  border-right: none;
}

.list-card :deep(.ant-table-tbody > tr:hover > td) {
  background: #f4f8ff !important;
}

.list-card :deep(.ant-tag) {
  border: none;
  border-radius: 999px;
  padding: 1px 12px 1px 10px;
  font-size: 12px;
  line-height: 20px;
}

.list-card :deep(.ant-tag::before) {
  content: '';
  display: inline-block;

  border-radius: 50%;
  background: currentColor;

  vertical-align: middle;
  margin-top: -2px;
}

.list-card :deep(.ant-btn-link) {
  padding: 2px 10px;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.list-card :deep(.ant-btn-link:not(:disabled):hover) {
  background: rgba(22, 119, 255, 0.08);
}

.list-card :deep(.ant-btn-dangerous.ant-btn-link:not(:disabled):hover) {
  background: rgba(255, 77, 79, 0.08);
}

.list-card :deep(.ant-btn-link:disabled) {
  background: transparent;
}
</style>

<style>
.detail-modal-wrap .ant-modal {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(15, 34, 78, 0.18);
}

.detail-modal-wrap .ant-modal-header {
  padding: 18px 24px 14px;
  margin-bottom: 0;
  border-bottom: 1px solid #eef2f9;
}

.detail-modal-wrap .ant-modal-title {
  font-weight: 600;
  font-size: 16px;
}

.detail-modal-wrap .ant-modal-body {
  padding: 24px 24px 20px;
  background: linear-gradient(180deg, #f7faff 0%, #ffffff 160px);
}

.detail-modal-wrap .ant-form-item-label > label {
  color: #33456b;
  font-weight: 500;
}

.detail-modal-wrap .ant-input,
.detail-modal-wrap .ant-select-selector,
.detail-modal-wrap .ant-input-password,
.detail-modal-wrap textarea.ant-input {
  border-radius: 8px !important;
  transition: all 0.25s ease;
}

.detail-modal-wrap .ant-btn-primary {
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.35);
}
</style>

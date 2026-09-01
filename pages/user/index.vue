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
        :data-source="filteredList"
        row-key="id"
        size="middle"
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
import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { accountStorage } from '@/utils/storage'
import type { UserAccount, UserRole } from '@/types'

const accounts = ref<UserAccount[]>(accountStorage.list())

const query = reactive({
  phone: '',
  name: '',
  role: undefined as UserRole | undefined,
  enabled: undefined as boolean | undefined,
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

const filteredList = computed(() => {
  return accounts.value.filter((a) => {
    if (query.phone && !a.phone.includes(query.phone.trim())) return false
    if (query.name && !a.name.includes(query.name.trim())) return false
    if (query.role && a.role !== query.role) return false
    if (query.enabled !== undefined && a.enabled !== query.enabled) return false
    return true
  })
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const columns = [
  { title: '序号', key: 'index', width: 70, align: 'center' as const },
  { title: '状态', key: 'enabled', width: 90, align: 'center' as const },
  { title: '角色', key: 'role', width: 100, align: 'center' as const },
  { title: '账号（手机号）', dataIndex: 'phone', width: 140 },
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '邮箱', dataIndex: 'email', width: 200 },
  { title: '公司名称', dataIndex: 'company' },
  { title: '操作', key: 'action', width: 120, align: 'center' as const, fixed: 'right' as const },
]

function handleSearch(): void {
  // 响应式过滤即时生效
}

function handleReset(): void {
  query.phone = ''
  query.name = ''
  query.role = undefined
  query.enabled = undefined
}

/* ---------- 新增 / 编辑 ---------- */
const modalOpen = ref(false)
const editing = ref<UserAccount | null>(null)
const formRef = ref()
const form = reactive({
  id: '',
  phone: '',
  name: '',
  email: '',
  company: '',
  role: undefined as UserRole | undefined,
  enabled: true,
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
  form.id = account?.id ?? `USER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  form.phone = account?.phone ?? ''
  form.name = account?.name ?? ''
  form.email = account?.email ?? ''
  form.company = account?.company ?? ''
  form.role = account?.role ?? undefined
  form.enabled = account?.enabled ?? true
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
  if (accountStorage.phoneExists(form.phone.trim(), form.id)) {
    message.error('该手机号已被占用')
    return
  }
  const account: UserAccount = {
    id: form.id,
    phone: form.phone.trim(),
    name: form.name.trim(),
    email: form.email.trim(),
    company: form.company.trim(),
    role: form.role,
    enabled: form.enabled,
    createTime: editing.value?.createTime ?? new Date().toLocaleString(),
  }
  accountStorage.save(account)
  accounts.value = accountStorage.list()
  modalOpen.value = false
  message.success(editing.value ? '用户已更新' : '用户已新增')
}

function removeUser(account: UserAccount): void {
  accountStorage.remove(account.id)
  accounts.value = accountStorage.list()
  message.success('用户已删除')
}
</script>

<style scoped>
.search-card {
  margin-bottom: 16px;
}

.search-card :deep(.ant-form-item) {
  margin-bottom: 8px;
}

.list-card :deep(.ant-card-head-title) {
  font-weight: 600;
}
</style>

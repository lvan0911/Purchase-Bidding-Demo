<template>
  <div class="page-container">
    <div class="page-header">
      <span class="page-title">{{ isEdit ? '编辑采购需求' : '新增发布需求' }}</span>
      <a-button @click="router.push('/purchase')">返回列表</a-button>
    </div>

    <a-card class="page-card base-card" title="基础信息">
      <a-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :label-col="{ style: { width: '110px' } }"
        :wrapper-col="{ style: { width: 'calc(100% - 110px)' } }"
      >
        <a-row :gutter="16">
          <a-col :xs="24" :md="8">
            <a-form-item label="需求单号">
              <a-input :value="reqNo" disabled />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="报价截止日期" name="quoteDeadline">
              <a-date-picker
                v-model:value="form.quoteDeadline"
                show-time
                style="width: 100%"
                placeholder="请选择报价截止日期（年-月-日 时:分:秒）"
                :disabled-date="disabledDate"
                :disabled-time="disabledTime"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="集中交货日期" name="deliverDate">
              <a-date-picker
                v-model:value="form.deliverDate"
                style="width: 100%"
                placeholder="请选择集中交货日期"
                :disabled-date="disabledDate"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="6">
            <a-form-item label="创建人">
              <a-input :value="creator" disabled />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="6">
            <a-form-item label="创建时间">
              <a-input :value="createTime" disabled />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="6">
            <a-form-item label="修改人">
              <a-input :value="modifier || '-'" disabled />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="6">
            <a-form-item label="修改时间">
              <a-input :value="modifyTime || '-'" disabled />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="24">
            <a-form-item label="需求备注" name="remark">
              <a-textarea
                v-model:value="form.remark"
                :rows="2"
                placeholder="需求单整体备注（选填）"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card class="page-card items-card" title="商品清单">
      <template #extra>
        <a-button type="primary" @click="openItemModal()">新增商品</a-button>
      </template>
      <a-table
        :columns="itemColumns"
        :data-source="items"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1100 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'quantity'">{{ record.quantity }}</template>
          <template v-else-if="column.key === 'published'">
            <a-tag :color="record.published ? 'green' : 'default'">
              {{ record.published ? '已发布' : '未发布' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button
                type="link"
                size="small"
                :disabled="record.published"
                @click="openItemModal(record)"
              >
                编辑
              </a-button>
              <a-popconfirm
                title="确定删除该商品吗？"
                :disabled="record.published"
                @confirm="removeItem(record)"
              >
                <a-button type="link" size="small" danger :disabled="record.published">
                  删除
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
        <template #footer>
          <div class="table-footer">
            <span>
              商品合计数量：<b>{{ totalQuantity }}</b>
              <a-divider type="vertical" />
              共 <b>{{ items.length }}</b> 条商品
            </span>
          </div>
        </template>
      </a-table>
    </a-card>

    <div class="publish-bar">
      <a-button type="primary" size="large" :loading="submitting" @click="handlePublish">
        发布需求
      </a-button>
    </div>
    <!-- 商品新增 / 编辑 -->
    <a-modal
      v-model:open="itemModalOpen"
      :title="editingItem ? '编辑商品' : '新增商品'"
      ok-text="保存"
      cancel-text="取消"
      wrap-class-name="detail-modal-wrap"
      @ok="saveItem"
      @cancel="closeItemModal"
    >
      <a-form
        ref="itemFormRef"
        :model="itemForm"
        :rules="itemRules"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 17 }"
      >
        <a-form-item label="配件图号" name="partNo">
          <a-input v-model:value="itemForm.partNo" placeholder="请输入配件图号（必填）" allow-clear />
        </a-form-item>
        <a-form-item label="通用/替换号" name="replaceNo">
          <a-input v-model:value="itemForm.replaceNo" placeholder="选填" allow-clear />
        </a-form-item>
        <a-form-item label="配件名称" name="partName">
          <a-input v-model:value="itemForm.partName" placeholder="请输入配件名称（必填）" allow-clear />
        </a-form-item>
        <a-form-item label="采购数量" name="quantity">
          <a-input-number
            v-model:value="itemForm.quantity"
            :min="1"
            :precision="0"
            style="width: 100%"
            placeholder="请输入采购数量（>0）"
          />
        </a-form-item>
        <a-form-item label="单位" name="unit">
          <a-select v-model:value="itemForm.unit" placeholder="请选择单位">
            <a-select-option v-for="u in units" :key="u" :value="u">{{ u }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="规格型号" name="spec">
          <a-input v-model:value="itemForm.spec" placeholder="选填" allow-clear />
        </a-form-item>
        <a-form-item label="采购备注" name="purchaseRemark">
          <a-textarea v-model:value="itemForm.purchaseRemark" :rows="2" placeholder="选填" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { getNextReqNo, getRequirementDetail, saveRequirement } from '@/api/requirement'
import type {  RequirementItem } from '@/types'

const route = useRoute()
const router = useRouter()

const units = ['个', '件', '套', '台', '只', '箱', '批', '米', '公斤']

const editId = Number(route.query.id) || 0
const isEdit = !!editId
const loading = ref(false)

const reqNo = ref('')
const creator = ref('')
const createTime = ref('')
const modifier = ref('')
const modifyTime = ref('')

const formRef = ref()
const submitting = ref(false)
const form = reactive({
  quoteDeadline: undefined as Dayjs | undefined,
  deliverDate: undefined as Dayjs | undefined,
  remark: '',
})

const rules = {
  quoteDeadline: [{ required: true, message: '请选择报价截止日期', trigger: 'change' }],
  deliverDate: [{ required: true, message: '请选择集中交货日期', trigger: 'change' }],
}

/** 生成 [start, end) 区间整数数组 */
function numberRange(start: number, end: number): number[] {
  const result: number[] = []
  for (let i = start; i < end; i++) result.push(i)
  return result
}

/** 禁用今天之前的日期 */
function disabledDate(current: Dayjs | undefined): boolean {
  if (!current) return false
  return current < dayjs().startOf('day')
}

/** 选择当天时禁用已过去的时、分、秒 */
function disabledTime(current: Dayjs | undefined) {
  const now = dayjs()
  if (!current || !current.isSame(now, 'day')) {
    return {
      disabledHours: () => [],
      disabledMinutes: () => [],
      disabledSeconds: () => [],
    }
  }
  return {
    disabledHours: () => numberRange(0, now.hour()),
    disabledMinutes: (h: number) => (h === now.hour() ? numberRange(0, now.minute()) : []),
    disabledSeconds: (h: number, m: number) =>
      h === now.hour() && m === now.minute() ? numberRange(0, now.second()) : [],
  }
}

const items = ref<RequirementItem[]>([])

/** 新增商品的唯一临时 ID 计数器（负数，与后端正数 ID 区分） */
let tempItemId = -1

/** 初始化：编辑态拉详情，新建态预生成单号 */
onMounted(async () => {
  loading.value = true
  try {
    if (isEdit) {
      const detail = await getRequirementDetail(editId)
      reqNo.value = detail.reqNo
      creator.value = detail.creator
      createTime.value = detail.createTime
      modifier.value = detail.modifier || ''
      modifyTime.value = detail.modifyTime || ''
      form.quoteDeadline = dayjs(detail.quoteDeadline)
      form.deliverDate = dayjs(detail.deliverDate)
      form.remark = detail.remark || ''
      items.value = (detail.items ?? []).map((i) => ({ ...i }))
    } else {
      reqNo.value = await getNextReqNo()
    }
  } finally {
    loading.value = false
  }
})

const pagination = {
  pageSize: 5,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
}

const itemColumns = [
  { title: '序号', key: 'index', width: 70, align: 'center'},
  { title: '配件图号', dataIndex: 'partNo', width: 130, align: 'center' },
  { title: '通用/替换号', dataIndex: 'replaceNo', width: 130, align: 'center' },
  { title: '配件名称', dataIndex: 'partName', width: 150, align: 'center' },
  { title: '采购数量', key: 'quantity', width: 100, align: 'center'  },
  { title: '单位', dataIndex: 'unit', width: 70, align: 'center' },
  { title: '规格型号', dataIndex: 'spec', width: 130, align: 'center' },
  { title: '采购备注', dataIndex: 'purchaseRemark', width: 200, align: 'center' },
  { title: '状态', key: 'published', width: 90, align: 'center'  },
  { title: '操作', key: 'action', width: 150, fixed: 'right', align: 'center' },
]

const totalQuantity = computed(() =>
  items.value.reduce((sum, i) => sum + (i.quantity || 0), 0),
)


/* ---------- 商品新增 / 编辑 ---------- */
const itemModalOpen = ref(false)
const editingItem = ref<RequirementItem | null>(null)
const itemFormRef = ref()
const itemForm = reactive({
  id: 0 as number,
  partNo: '',
  replaceNo: '',
  partName: '',
  quantity: 1,
  unit: '个',
  spec: '',
  purchaseRemark: '',
})
const itemRules = {
  partNo: [{ required: true, message: '请输入配件图号', trigger: 'blur' }],
  partName: [{ required: true, message: '请输入配件名称', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入采购数量', trigger: 'blur' }],
}

function openItemModal(item?: RequirementItem): void {
  editingItem.value = item ?? null
  itemForm.id = item?.id ?? tempItemId--
  itemForm.partNo = item?.partNo ?? ''
  itemForm.replaceNo = item?.replaceNo ?? ''
  itemForm.partName = item?.partName ?? ''
  itemForm.quantity = item?.quantity ?? 1
  itemForm.unit = item?.unit ?? '个'
  itemForm.spec = item?.spec ?? ''
  itemForm.purchaseRemark = item?.purchaseRemark ?? ''
  itemModalOpen.value = true
}

function closeItemModal(): void {
  itemModalOpen.value = false
  itemFormRef.value?.resetFields()
}

async function saveItem(): Promise<void> {
  try {
    await itemFormRef.value.validate()
  } catch {
    return
  }
  if (!itemForm.quantity || itemForm.quantity <= 0) {
    message.error('采购数量必须大于 0')
    return
  }
  const data: RequirementItem = {
    id: itemForm.id,
    partNo: itemForm.partNo.trim(),
    replaceNo: itemForm.replaceNo.trim(),
    partName: itemForm.partName.trim(),
    quantity: itemForm.quantity,
    unit: itemForm.unit,
    spec: itemForm.spec.trim(),
    purchaseRemark: itemForm.purchaseRemark.trim(),
   published: editingItem.value?.published ?? false,
  }
  const idx = items.value.findIndex((i) => i.id === data.id)
  if (idx >= 0) {
    items.value[idx] = data
  } else {
    items.value.push(data)
  }
  itemModalOpen.value = false
  message.success(editingItem.value ? '商品已更新' : '商品已新增')
}

/* ---------- 商品发布 / 删除 ---------- */
function removeItem(item: RequirementItem): void {
  items.value = items.value.filter((i) => i.id !== item.id)
  message.success('商品已删除')
}

/* ---------- 发布需求 ---------- */
async function handlePublish(): Promise<void> {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (items.value.length === 0) {
    message.error('请至少新增一条商品')
    return
  }
  for (let i = 0; i < items.value.length; i++) {
    const it = items.value[i]
    if (!it.partNo.trim() || !it.partName.trim() || !it.quantity || it.quantity <= 0) {
      message.error(`第 ${i + 1} 行商品信息不完整，请检查必填项（配件图号、配件名称、采购数量>0）`)
      return
    }
  }
  const unpublished = items.value.filter((i) => !i.published)
  const doPublish = (): void => {
    items.value.forEach((i) => {
      i.published = true
    })
    submitRequirement()
  }
  if (unpublished.length > 0) {
    Modal.confirm({
      title: '发布需求',
      content: `还有 ${unpublished.length} 条商品未发布，发布后不可再编辑或删除。确定全部发布并提交需求单吗？`,
      okText: '发布',
      cancelText: '取消',
      onOk: () => doPublish(),
    })
  } else {
    await doPublish()
  }
}

async function submitRequirement(): Promise<void> {
  submitting.value = true
  try {
    await saveRequirement({
      id: isEdit ? editId : undefined,
      reqNo: reqNo.value,
      quoteDeadline: (form.quoteDeadline as Dayjs).format('YYYY-MM-DD HH:mm:ss'),
      deliverDate: (form.deliverDate as Dayjs).format('YYYY-MM-DD'),
      remark: form.remark.trim(),
      items: items.value.map((i) => ({
        ...i,
        id: i.id || undefined,
      })),
    })
    message.success('采购需求发布成功')
    router.push('/purchase')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.base-card {
  margin-bottom: 16px;
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(15, 34, 78, 0.06);
  overflow: hidden;
}

.base-card :deep(.ant-card-head) {
  padding: 14px 20px;
  border-bottom: 1px solid #eef2f9;
}

.base-card :deep(.ant-card-head-title) {
  font-weight: 600;
  font-size: 15px;
  position: relative;
  padding-left: 14px;
}

.base-card :deep(.ant-card-head-title::before) {
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

.base-card :deep(.ant-card-body) {
  padding: 24px 20px 8px;
}

.base-card :deep(.ant-input),
.base-card :deep(.ant-select-selector),
.base-card :deep(.ant-picker),
.base-card :deep(textarea.ant-input) {
  border-radius: 8px;
  transition: all 0.25s ease;
}

.items-card {
  margin-bottom: 16px;
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(15, 34, 78, 0.06);
  overflow: hidden;
}

.items-card :deep(.ant-card-head) {
  padding: 14px 20px;
  border-bottom: 1px solid #eef2f9;
}

.items-card :deep(.ant-card-head-title) {
  font-weight: 600;
  font-size: 15px;
  position: relative;
  padding-left: 14px;
}

.items-card :deep(.ant-card-head-title::before) {
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

.items-card :deep(.ant-card-body) {
  padding: 8px 20px 16px;
}

.items-card :deep(.ant-table-thead > tr > th) {
  background: linear-gradient(180deg, #f5f9ff, #edf3fe);
  color: #1d2b4f;
  font-weight: 600;
  border-bottom: 1px solid #e3ebf8;
  border-right: 1px solid #e3ebf8;
}

.items-card :deep(.ant-table-thead > tr > th:first-child) {
  border-left: 1px solid #e3ebf8;
}

.items-card :deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid #f2f5fa;
  border-right: 1px solid #f2f5fa;
  transition: background-color 0.2s ease;
}

.items-card :deep(.ant-table-tbody > tr > td:first-child) {
  border-left: 1px solid #f2f5fa;
}

.items-card :deep(.ant-table-tbody > tr:hover > td) {
  background: #f4f8ff !important;
}
.items-card :deep(.ant-table-cell) {
  padding: 6px 8px !important;
}
.items-card :deep(.ant-tag) {
  border: none;
  border-radius: 999px;
  padding: 1px 12px 1px 10px;
  font-size: 12px;
  line-height: 20px;
}

.items-card :deep(.ant-tag::before) {
  content: '';
  display: inline-block;

  border-radius: 50%;
  background: currentColor;

  vertical-align: middle;
  margin-top: -2px;
}

.items-card :deep(.ant-btn-link) {
  padding: 2px 10px;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.items-card :deep(.ant-btn-link:not(:disabled):hover) {
  background: rgba(22, 119, 255, 0.08);
}

.items-card :deep(.ant-btn-dangerous.ant-btn-link:not(:disabled):hover) {
  background: rgba(255, 77, 79, 0.08);
}

.items-card :deep(.ant-btn-link:disabled) {
  background: transparent;
}

.table-footer b {
  color: #1677ff;
}

.publish-bar {
  display: flex;
  justify-content: center;
  padding: 8px 0 16px;
}

.publish-bar :deep(.ant-btn-primary) {
  border: none;
  border-radius: 10px;
  padding-left: 44px;
  padding-right: 44px;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  box-shadow: 0 4px 14px rgba(22, 119, 255, 0.35);
  transition: all 0.25s ease;
}

.publish-bar :deep(.ant-btn-primary:hover) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(22, 119, 255, 0.45);
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
  padding: 24px;
  background: linear-gradient(180deg, #f7faff 0%, #ffffff 160px);
}

.detail-modal-wrap .ant-form-item-label > label {
  color: #33456b;
  font-weight: 500;
}

.detail-modal-wrap .ant-input,
.detail-modal-wrap .ant-select-selector,
.detail-modal-wrap .ant-input-number,
.detail-modal-wrap textarea.ant-input {
  border-radius: 8px !important;
}

.detail-modal-wrap .ant-btn-primary {
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.35);
}
</style>

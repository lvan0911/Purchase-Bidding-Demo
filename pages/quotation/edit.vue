<template>
  <div class="page-container">
    <div class="page-header">
      <span class="page-title">供应商报价</span>
      <a-button @click="router.push('/quotation')">返回列表</a-button>
    </div>

    <a-empty
      v-if="!requirement"
      class="no-requirement"
      description="未找到对应的采购需求"
    >
      <a-button type="primary" @click="router.push('/purchase')">去查看需求</a-button>
    </a-empty>

    <template v-else>
      <a-alert
        v-if="isExpired"
        class="expired-alert"
        type="error"
        show-icon
        message="报价已截止，当前无法提交或修改报价。"
      />

      <a-card class="page-card base-card" title="基础信息">
        <a-descriptions :column="3" bordered size="small">
          <a-descriptions-item label="需求单号">{{ requirement.reqNo }}</a-descriptions-item>
          <a-descriptions-item label="报价单号">{{ quoteNo }}</a-descriptions-item>
          <a-descriptions-item label="报价截止日期">{{ requirement.quoteDeadline }}</a-descriptions-item>
          <a-descriptions-item label="集中交货日期">{{ requirement.deliverDate }}</a-descriptions-item>
          <a-descriptions-item label="确定交货日期" :span="2">
            <a-date-picker
              v-model:value="form.confirmDeliverDate"
              style="width: 100%"
              placeholder="请选择确定交货日期（必填）"
              :disabled="isExpired"
              :disabled-date="disabledDate"
            />
          </a-descriptions-item>
          <a-descriptions-item label="报价人">
            <a-input
              v-model:value="form.quotePerson"
              placeholder="请输入报价人（必填）"
              :disabled="isExpired || isSupplier"
            />
          </a-descriptions-item>
          <a-descriptions-item label="报价时间" :span="2">{{ quoteTime || '-' }}</a-descriptions-item>
           <a-descriptions-item label="修改时间">{{ modifyTime || '-' }}</a-descriptions-item>
         <!-- <a-descriptions-item label="修改人">{{ modifier || '-' }}</a-descriptions-item>
          <a-descriptions-item label="备注" :span="2">{{ requirement.remark || '-' }}</a-descriptions-item> -->
          <a-descriptions-item label="报价备注" :span="2">
            <a-textarea
              v-model:value="form.quoteRemark"
              :rows="2"
              placeholder="报价单整体备注（选填）"
              :disabled="isExpired"
            />
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <a-card class="page-card items-card" title="商品清单报价">
        <a-table
          :columns="itemColumns"
          :data-source="items"
          :pagination="pagination"
          row-key="id"
          size="middle"
          :scroll="{ x: 1250 }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'unitPrice'">
              <a-input-number
                v-model:value="record.unitPrice"
                :min="0.01"
                :precision="2"
                style="width: 100%"
                placeholder="必填"
                :disabled="isExpired"
              />
            </template>
            <template v-else-if="column.key === 'quoteRemark'">
              <a-input
                v-model:value="record.quoteRemark"
                placeholder="选填"
                :disabled="isExpired"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
                <a-button type="link" size="small" :disabled="isExpired" @click="saveDraft(record)">
                  暂存
                </a-button>
              </a-space>
            </template>
          </template>
          <template #footer>
            <div class="table-footer">
              <span>
                合计数量：<b>{{ totalQuantity }}</b>
                <a-divider type="vertical" />
                合计金额：<b class="total-amount">{{ formatMoney(totalAmount) }}</b>
              </span>
            </div>
          </template>
        </a-table>
      </a-card>

      <div class="submit-bar">
        <a-button
          type="primary"
          size="large"
          :loading="submitting"
          :disabled="isExpired"
          @click="handleSubmit"
        >
          提交报价
        </a-button>
      </div>

      <!-- 商品详情 -->
      <a-modal v-model:open="detailOpen" title="商品详情" :footer="null" wrap-class-name="detail-modal-wrap">
        <template v-if="detailItem">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="配件图号">{{ detailItem.partNo }}</a-descriptions-item>
            <a-descriptions-item label="通用/替换号">{{ detailItem.replaceNo || '-' }}</a-descriptions-item>
            <a-descriptions-item label="配件名称">{{ detailItem.partName }}</a-descriptions-item>
            <a-descriptions-item label="采购数量">{{ detailItem.quantity }} {{ detailItem.unit }}</a-descriptions-item>
            <a-descriptions-item label="规格型号">{{ detailItem.spec || '-' }}</a-descriptions-item>
            <a-descriptions-item label="采购备注">{{ detailItem.purchaseRemark || '-' }}</a-descriptions-item>
            <a-descriptions-item label="单价">
              {{ detailItem.unitPrice ? formatMoney(detailItem.unitPrice) : '未报价' }}
            </a-descriptions-item>
            <a-descriptions-item label="报价备注">{{ detailItem.quoteRemark || '-' }}</a-descriptions-item>
          </a-descriptions>
        </template>
      </a-modal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { getEditData, submitQuotation } from '@/api/quotation'
import { userStorage, quotationDraftStorage } from '@/utils/storage'
import type { QuoteItem } from '@/types'

const route = useRoute()
const router = useRouter()

const requirementId = Number(route.query.requirementId) || 0
const loading = ref(false)

const currentUser = userStorage.get()
const isSupplier = computed(() => currentUser?.role === 'supplier')

const requirement = ref<{
  reqNo: string
  quoteDeadline: string
  deliverDate: string
  remark: string
  expired?: boolean
} | null>(null)

const quoteNo = ref('')
const quoteTime = ref('')
const modifier = ref('')
const modifyTime = ref('')

const form = reactive({
  confirmDeliverDate: undefined as Dayjs | undefined,
  quotePerson: '',
  quoteRemark: '',
})

const items = ref<QuoteItem[]>([])

/** 禁用今天之前的日期 */
function disabledDate(current: Dayjs | undefined): boolean {
  if (!current) return false
  return current < dayjs().startOf('day')
}

/** 初始化：调后端获取需求详情 + 已有报价 */
onMounted(async () => {
  if (!requirementId) return
  loading.value = true
  try {
    const data = await getEditData(requirementId)
    requirement.value = {
      reqNo: data.reqNo,
      quoteDeadline: data.quoteDeadline,
      deliverDate: data.deliverDate,
      remark: data.remark,
      expired: data.expired,
    }
    quoteNo.value = data.quoteNo
    quoteTime.value = data.quoteTime || ''
    modifier.value = data.modifier || ''
    modifyTime.value = data.modifyTime || ''
    form.quotePerson = data.quotePerson
      || (isSupplier.value ? currentUser?.name || currentUser?.username || '' : '')
    form.confirmDeliverDate = data.confirmDeliverDate
      ? dayjs(data.confirmDeliverDate)
      : undefined
    form.quoteRemark = data.quoteRemark || ''
    // 已有报价回填（unitPrice 为空/0 表示未报价）
    items.value = data.items.map((it) => ({
      id: it.requirementItemId,
      requirementItemId: it.requirementItemId,
      partNo: it.partNo,
      replaceNo: it.replaceNo,
      partName: it.partName,
      quantity: it.quantity,
      unit: it.unit,
      spec: it.spec,
      purchaseRemark: it.purchaseRemark,
      unitPrice: it.unitPrice ? it.unitPrice : null,
      moq: it.moq,
      quoted: !!it.unitPrice,
      quoteRemark: it.quoteRemark || '',
    }))
    // 若存在本地暂存草稿，优先用草稿覆盖（单价、报价备注、确定交货日期、报价人、报价备注）
    const draft = quotationDraftStorage.get(requirementId)
    if (draft) {
      form.quotePerson = draft.quotePerson || form.quotePerson
      form.confirmDeliverDate = draft.confirmDeliverDate
        ? dayjs(draft.confirmDeliverDate)
        : form.confirmDeliverDate
      form.quoteRemark = draft.quoteRemark ?? form.quoteRemark
      const draftMap = new Map(draft.items.map((it) => [it.requirementItemId ?? it.id, it]))
      items.value = items.value.map((it) => {
        const d = draftMap.get(it.requirementItemId ?? it.id)
        if (!d) return it
        return {
          ...it,
          unitPrice: d.unitPrice ?? it.unitPrice,
          quoteRemark: d.quoteRemark ?? it.quoteRemark,
          quoted: !!d.unitPrice,
        }
      })
    }
  } finally {
    loading.value = false
  }
})

const isExpired = computed(() => {
  if (!requirement.value) return false
  return requirement.value.expired
    ?? dayjs().isAfter(dayjs(requirement.value.quoteDeadline))
})

const pagination = {
  pageSize: 5,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
}

const itemColumns = [
  { title: '序号', key: 'index', width: 60, align: 'center' as const },
  { title: '配件图号', dataIndex: 'partNo',  align: 'center' as const },
  { title: '通用/替换号', dataIndex: 'replaceNo',  align: 'center' as const },
  { title: '配件名称', dataIndex: 'partName',  align: 'center' as const },
  { title: '采购数量', dataIndex: 'quantity', align: 'center' as const },
  { title: '单价(￥)', key: 'unitPrice',  align: 'center' as const },
  { title: '单位', dataIndex: 'unit', align: 'center' as const },
  { title: '规格型号', dataIndex: 'spec', align: 'center' as const },
  { title: '采购备注', dataIndex: 'purchaseRemark', align: 'center' as const },
  { title: '报价备注', key: 'quoteRemark', align: 'center' as const },
  { title: '操作', key: 'action', width: 130, fixed: 'right' as const },
]

const totalQuantity = computed(() =>
  items.value.reduce((sum, i) => sum + (i.quantity || 0), 0),
)
const totalAmount = computed(() =>
  items.value.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitPrice || 0), 0),
)

function formatMoney(value: number): string {
  return `¥ ${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

/* ---------- 行内暂存 ---------- */
function saveDraft(item: QuoteItem): void {
  if (!item.unitPrice || item.unitPrice <= 0) {
    message.error(`【${item.partName}】请填写单价且必须大于 0`)
    return
  }
  item.quoted = true
  item.quoteRemark = (item.quoteRemark ?? '').trim()
  // 写入本地草稿，确保退出再进入数据不丢失
  quotationDraftStorage.save({
    requirementId,
    quotePerson: form.quotePerson.trim(),
    confirmDeliverDate: form.confirmDeliverDate
      ? form.confirmDeliverDate.format('YYYY-MM-DD')
      : null,
    quoteRemark: form.quoteRemark,
    items: items.value.map((i) => ({ ...i })),
    savedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  message.success(`【商品清单报价】已暂存`)
}

/* ---------- 商品详情 ---------- */
const detailOpen = ref(false)
const detailItem = ref<QuoteItem | null>(null)

function openDetail(item: QuoteItem): void {
  detailItem.value = item
  detailOpen.value = true
}

/* ---------- 提交报价 ---------- */
const submitting = ref(false)

async function handleSubmit(): Promise<void> {
  if (!requirementId) return
  if (!form.confirmDeliverDate) {
    message.error('请选择确定交货日期')
    return
  }
  if (!form.quotePerson.trim()) {
    message.error('请输入报价人')
    return
  }
  for (let i = 0; i < items.value.length; i++) {
    const it = items.value[i]
    if (!it.unitPrice || it.unitPrice <= 0) {
      message.error(`第 ${i + 1} 行【${it.partName}】未填写单价`)
      return
    }
  }
  submitting.value = true
  const payload = {
    requirementId,
    quotePerson: form.quotePerson.trim(),
    confirmDeliverDate: form.confirmDeliverDate.format('YYYY-MM-DD'),
    quoteRemark: form.quoteRemark.trim() || undefined,
    items: items.value.map((i) => ({
      id: i.id,
      requirementItemId: i.requirementItemId ?? 0,
      partNo: i.partNo,
      replaceNo: i.replaceNo,
      partName: i.partName,
      quantity: i.quantity,
      unit: i.unit,
      spec: i.spec,
      purchaseRemark: i.purchaseRemark,
      unitPrice: i.unitPrice ?? undefined,
      price: i.unitPrice ?? 0,
      moq: i.moq,
      quoteRemark: i.quoteRemark || undefined,
    })),
  }

  try {
    await submitQuotation(payload)
    quotationDraftStorage.remove(requirementId)
    message.success('报价提交成功')
    router.push('/quotation')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.no-requirement {
  margin-top: 80px;
}

.expired-alert {
  margin-bottom: 16px;
}

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
  padding: 20px;
}

.base-card :deep(.ant-descriptions-view) {
  border-radius: 10px;
  overflow: hidden;
}

.base-card :deep(.ant-descriptions-item-label) {
  background: #f5f9ff !important;
  color: #33456b !important;
  font-weight: 500;
}

.base-card :deep(.ant-input),
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
.items-card :deep(.ant-table-cell) {
  padding: 8px 8px !important;
}

.items-card :deep(.ant-table-tbody > tr:hover > td) {
  background: #f4f8ff !important;
}

.items-card :deep(.ant-btn-link) {
  padding: 2px 10px;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.items-card :deep(.ant-btn-link:not(:disabled):hover) {
  background: rgba(22, 119, 255, 0.08);
}

.items-card :deep(.ant-btn-link:disabled) {
  background: transparent;
}

.table-footer b {
  color: #1677ff;
}

.total-amount {
  color: #cf1322 !important;
  font-size: 15px;
}

.submit-bar {
  display: flex;
  justify-content: center;
  padding: 8px 0 16px;
}

.submit-bar :deep(.ant-btn-primary) {
  border: none;
  border-radius: 10px;
  padding-left: 44px;
  padding-right: 44px;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  box-shadow: 0 4px 14px rgba(22, 119, 255, 0.35);
  transition: all 0.25s ease;
}

.submit-bar :deep(.ant-btn-primary:hover):not(:disabled) {
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
  padding: 20px 24px 24px;
  background: linear-gradient(180deg, #f7faff 0%, #ffffff 160px);
}

.detail-modal-wrap .ant-descriptions-view {
  border-radius: 10px;
  overflow: hidden;
}

.detail-modal-wrap .ant-descriptions-item-label {
  background: #f5f9ff !important;
  color: #33456b !important;
  font-weight: 500;
}

.detail-modal-wrap .ant-form-item-label > label {
  color: #33456b;
  font-weight: 500;
}

.detail-modal-wrap .ant-input,
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

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
            />
          </a-descriptions-item>
          <a-descriptions-item label="报价人">
            <a-input
              v-model:value="form.quotePerson"
              placeholder="请输入报价人（必填）"
              :disabled="isExpired"
            />
          </a-descriptions-item>
          <a-descriptions-item label="报价时间">{{ quoteTime || '-' }}</a-descriptions-item>
          <a-descriptions-item label="修改人">{{ modifier || '-' }}</a-descriptions-item>
          <a-descriptions-item label="修改时间">{{ modifyTime || '-' }}</a-descriptions-item>
          <a-descriptions-item label="备注" :span="3">{{ requirement.remark || '-' }}</a-descriptions-item>
          <a-descriptions-item label="报价备注" :span="3">
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
                <a-button type="link" size="small" :disabled="isExpired" @click="openQuoteModal(record)">
                  报价
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

      <!-- 单行报价 -->
      <a-modal
        v-model:open="quoteModalOpen"
        title="商品报价"
        ok-text="保存报价"
        cancel-text="取消"
        @ok="saveQuote"
      >
        <template v-if="quoteTarget">
          <a-descriptions :column="2" bordered size="small" class="quote-target-desc">
            <a-descriptions-item label="配件图号">{{ quoteTarget.partNo }}</a-descriptions-item>
            <a-descriptions-item label="配件名称">{{ quoteTarget.partName }}</a-descriptions-item>
            <a-descriptions-item label="通用/替换号">{{ quoteTarget.replaceNo || '-' }}</a-descriptions-item>
            <a-descriptions-item label="采购数量">{{ quoteTarget.quantity }} {{ quoteTarget.unit }}</a-descriptions-item>
            <a-descriptions-item label="规格型号">{{ quoteTarget.spec || '-' }}</a-descriptions-item>
            <a-descriptions-item label="采购备注">{{ quoteTarget.purchaseRemark || '-' }}</a-descriptions-item>
          </a-descriptions>
          <a-form
            :label-col="{ span: 6 }"
            :wrapper-col="{ span: 17 }"
            class="quote-target-form"
          >
            <a-form-item label="单价" required>
              <a-input-number
                v-model:value="quoteForm.unitPrice"
                :min="0.01"
                :precision="2"
                style="width: 100%"
                placeholder="请输入单价（必填）"
              />
            </a-form-item>
            <a-form-item label="报价备注">
              <a-textarea
                v-model:value="quoteForm.quoteRemark"
                :rows="2"
                placeholder="该项商品报价备注（选填）"
              />
            </a-form-item>
          </a-form>
        </template>
      </a-modal>

      <!-- 商品详情 -->
      <a-modal v-model:open="detailOpen" title="商品详情" :footer="null">
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
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import {
  genQuoteNo,
  quotationStorage,
  requirementStorage,
  userStorage,
} from '@/utils/storage'
import type { PurchaseRequirement, QuoteItem, Quotation } from '@/types'

const route = useRoute()
const router = useRouter()

const requirementId = (route.query.requirementId as string) || ''
const username = ref(userStorage.get()?.username ?? '')

/** 获取当前需求：优先按 URL 参数，参数缺失或无效时取最近发布且未截止的需求 */
function resolveRequirement(): PurchaseRequirement | null {
  if (requirementId) {
    const r = requirementStorage.getById(requirementId)
    if (r) return r
  }
  return (
    requirementStorage
      .list()
      .filter((r) => dayjs().isBefore(dayjs(r.quoteDeadline)))
      .sort((a, b) => b.createTime.localeCompare(a.createTime))[0] ?? null
  )
}

const requirement = ref<PurchaseRequirement | null>(resolveRequirement())

/** 当前报价人（默认登录用户）已有报价单，用于回填与多次编辑 */
const myQuote = ref(
  requirement.value
    ? quotationStorage.findByPersonAndRequirement(username.value, requirement.value.id)
    : null,
)

const quoteNo = ref(myQuote.value?.quoteNo ?? (requirement.value ? genQuoteNo() : ''))
const quoteTime = ref(myQuote.value?.quoteTime ?? '')
const modifier = ref(myQuote.value?.modifier ?? '')
const modifyTime = ref(myQuote.value?.modifyTime ?? '')

const form = reactive({
  confirmDeliverDate: (myQuote.value?.confirmDeliverDate
    ? dayjs(myQuote.value.confirmDeliverDate)
    : undefined) as Dayjs | undefined,
  quotePerson: myQuote.value?.quotePerson ?? username.value,
  quoteRemark: myQuote.value?.quoteRemark ?? '',
})

const items = ref<QuoteItem[]>([])
function initItems(): void {
  if (!requirement.value) return
  items.value = requirement.value.items.map((ri) => {
    const existed = myQuote.value?.items.find((ei) => ei.requirementItemId === ri.id)
    return {
      id: ri.id,
      requirementItemId: ri.id,
      partNo: ri.partNo,
      replaceNo: ri.replaceNo,
      partName: ri.partName,
      quantity: ri.quantity,
      unit: ri.unit,
      spec: ri.spec,
      purchaseRemark: ri.purchaseRemark,
      unitPrice: existed?.unitPrice ?? null,
      quoteRemark: existed?.quoteRemark ?? '',
    }
  })
}
initItems()

const isExpired = computed(
  () => !!requirement.value && dayjs().isAfter(dayjs(requirement.value.quoteDeadline)),
)

const pagination = {
  pageSize: 5,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
}

const itemColumns = [
  { title: '序号', key: 'index', width: 60, align: 'center' as const },
  { title: '配件图号', dataIndex: 'partNo', width: 120 },
  { title: '通用/替换号', dataIndex: 'replaceNo', width: 120 },
  { title: '配件名称', dataIndex: 'partName', width: 140 },
  { title: '采购数量', dataIndex: 'quantity', width: 90, align: 'right' as const },
  { title: '单价(￥)', key: 'unitPrice', width: 130 },
  { title: '单位', dataIndex: 'unit', width: 65, align: 'center' as const },
  { title: '规格型号', dataIndex: 'spec', width: 110 },
  { title: '采购备注', dataIndex: 'purchaseRemark', width: 110 },
  { title: '报价备注', key: 'quoteRemark', width: 130 },
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

/* ---------- 单行报价 ---------- */
const quoteModalOpen = ref(false)
const quoteTarget = ref<QuoteItem | null>(null)
const quoteForm = reactive({
  unitPrice: undefined as number | undefined,
  quoteRemark: '',
})

function openQuoteModal(item: QuoteItem): void {
  quoteTarget.value = item
  quoteForm.unitPrice = item.unitPrice ?? undefined
  quoteForm.quoteRemark = item.quoteRemark
  quoteModalOpen.value = true
}

function saveQuote(): void {
  if (!quoteTarget.value) return
  if (!quoteForm.unitPrice || quoteForm.unitPrice <= 0) {
    message.error('请填写单价且必须大于 0')
    return
  }
  quoteTarget.value.unitPrice = quoteForm.unitPrice
  quoteTarget.value.quoteRemark = quoteForm.quoteRemark.trim()
  quoteModalOpen.value = false
  message.success(`商品【${quoteTarget.value.partName}】报价已填写`)
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
  if (!requirement.value) return
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
  const existing = quotationStorage.findByPersonAndRequirement(
    form.quotePerson.trim(),
    requirement.value.id,
  )
  submitting.value = true
  const quotation: Quotation = {
    id: existing?.id ?? `QUO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    quoteNo: existing?.quoteNo ?? quoteNo.value,
    requirementId: requirement.value.id,
    reqNo: requirement.value.reqNo,
    quoteDeadline: requirement.value.quoteDeadline,
    deliverDate: requirement.value.deliverDate,
    confirmDeliverDate: form.confirmDeliverDate.format('YYYY-MM-DD'),
    quotePerson: form.quotePerson.trim(),
    quoteTime: existing?.quoteTime ?? new Date().toLocaleString(),
    modifier: username.value,
    modifyTime: new Date().toLocaleString(),
    remark: requirement.value.remark,
    quoteRemark: form.quoteRemark.trim(),
    items: items.value.map((i) => ({ ...i })),
    totalAmount: totalAmount.value,
  }
  quotationStorage.save(quotation)
  quoteNo.value = quotation.quoteNo
  quoteTime.value = quotation.quoteTime
  modifier.value = quotation.modifier
  modifyTime.value = quotation.modifyTime
  submitting.value = false
  message.success(existing ? '报价已更新（截止日期前可多次编辑）' : '报价提交成功')
  router.push('/quotation')
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
}

.items-card {
  margin-bottom: 16px;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  color: rgba(0, 0, 0, 0.65);
}

.total-amount {
  color: #cf1322;
  font-weight: 600;
}

.submit-bar {
  display: flex;
  justify-content: center;
  padding: 8px 0 16px;
}

.quote-target-desc {
  margin-bottom: 16px;
}

.quote-target-form {
  margin-top: 16px;
}
</style>

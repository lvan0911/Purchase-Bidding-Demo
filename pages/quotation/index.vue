<template>
  <div class="page-container">
    <div class="page-header">
      <span class="page-title">供应商报价</span>
    </div>

    <!-- 搜索条件区域 -->
    <a-card class="page-card search-card">
      <a-form layout="inline" :model="query">
        <a-form-item label="需求单号">
          <a-input
            v-model:value="query.reqNo"
            placeholder="请输入需求单号"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item label="报价单号">
          <a-input
            v-model:value="query.quoteNo"
            placeholder="请输入报价单号"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="query.status"
            placeholder="全部"
            allow-clear
            style="width: 120px"
          >
            <a-select-option value="quoting">报价中</a-select-option>
            <a-select-option value="expired">已截止</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="报价时间">
          <a-range-picker v-model:value="query.quoteRange" style="width: 280px" />
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
    <a-card class="page-card list-card" title="我的历史报价单据">
      <template #extra>
        <a-button type="primary" @click="openPending">待报价需求</a-button>
      </template>
      <a-table
        :columns="columns"
        :data-source="filteredList"
        row-key="id"
        size="middle"
        :pagination="pagination"
        :scroll="{ x: 1100 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'totalAmount'">
            {{ formatMoney(record.totalAmount) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatus(record).color">{{ getStatus(record).text }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="goEdit(record)">进入报价</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 报价单详情 -->
    <a-modal
      v-model:open="detailOpen"
      :title="`报价单 ${detailQuote?.quoteNo ?? ''} 明细`"
      :footer="null"
      width="70%"
    >
      <template v-if="detailQuote">
        <a-descriptions :column="2" bordered size="small" class="detail-desc">
          <a-descriptions-item label="需求单号">{{ detailQuote.reqNo }}</a-descriptions-item>
          <a-descriptions-item label="报价人">{{ detailQuote.quotePerson }}</a-descriptions-item>
          <a-descriptions-item label="报价金额">
            <b>{{ formatMoney(detailQuote.totalAmount) }}</b>
          </a-descriptions-item>
          <a-descriptions-item label="确定交货日期">{{ detailQuote.confirmDeliverDate }}</a-descriptions-item>
          <a-descriptions-item label="报价时间">{{ detailQuote.quoteTime }}</a-descriptions-item>
          <a-descriptions-item label="修改时间">{{ detailQuote.modifyTime }}</a-descriptions-item>
          <a-descriptions-item label="报价备注" :span="2">{{ detailQuote.quoteRemark || '-' }}</a-descriptions-item>
        </a-descriptions>
        <a-table
          :columns="detailColumns"
          :data-source="detailQuote.items"
          :pagination="false"
          row-key="id"
          size="small"
          class="detail-table"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'unitPrice'">
              {{ formatMoney(record.unitPrice) }}
            </template>
            <template v-else-if="column.key === 'subtotal'">
              <b>{{ formatMoney((record.quantity || 0) * (record.unitPrice || 0)) }}</b>
            </template>
          </template>
        </a-table>
      </template>
    </a-modal>

    <!-- 待报价需求 -->
    <a-modal v-model:open="pendingOpen" title="待报价需求" :footer="null" width="70%">
      <a-table
        :columns="pendingColumns"
        :data-source="pendingList"
        row-key="id"
        size="middle"
        :pagination="pagination"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'itemCount'">{{ record.items.length }}</template>
          <template v-else-if="column.key === 'quoteStatus'">
            <a-tag :color="record.myQuote ? 'blue' : 'orange'">
              {{ record.myQuote ? '已报价' : '未报价' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="goPendingQuote(record)">去报价</a-button>
          </template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { awardStorage, quotationStorage, requirementStorage, userStorage } from '@/utils/storage'
import type { PurchaseRequirement, Quotation } from '@/types'

const router = useRouter()

const username = ref(userStorage.get()?.username ?? '')
/** 供应商只能看到自己报过的历史报价单据 */
const quotations = ref(
  quotationStorage.list().filter((q) => q.quotePerson === username.value),
)

const query = reactive({
  reqNo: '',
  quoteNo: '',
  status: undefined as string | undefined,
  quoteRange: undefined as [Dayjs, Dayjs] | undefined,
})

interface StatusInfo {
  value: string
  text: string
  color: string
}

function getStatus(q: Quotation): StatusInfo {
  if (dayjs().isAfter(dayjs(q.quoteDeadline))) {
    return { value: 'expired', text: '已截止', color: 'red' }
  }
  return { value: 'quoting', text: '报价中', color: 'blue' }
}

/** 新需求（报价单）排在前 */
const filteredList = computed(() => {
  return quotations.value
    .filter((q) => {
      if (query.reqNo && !q.reqNo.includes(query.reqNo.trim())) return false
      if (query.quoteNo && !q.quoteNo.includes(query.quoteNo.trim())) return false
      if (query.status && getStatus(q).value !== query.status) return false
      if (query.quoteRange?.length === 2) {
        const t = dayjs(q.quoteTime)
        if (
          t.isBefore(dayjs(query.quoteRange[0]).startOf('day')) ||
          t.isAfter(dayjs(query.quoteRange[1]).endOf('day'))
        ) {
          return false
        }
      }
      return true
    })
    .sort((a, b) => b.quoteTime.localeCompare(a.quoteTime))
})

const pagination = {
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
}

const columns = [
  { title: '报价单号', dataIndex: 'quoteNo', width: 160 },
  { title: '需求单号', dataIndex: 'reqNo', width: 160 },
  { title: '报价金额', key: 'totalAmount', width: 140, align: 'right' as const },
  { title: '确定交货日期', dataIndex: 'confirmDeliverDate', width: 130 },
  { title: '报价时间', dataIndex: 'quoteTime', width: 180 },
  { title: '修改时间', dataIndex: 'modifyTime', width: 180 },
  { title: '状态', key: 'status', width: 90, align: 'center' as const },
  { title: '操作', key: 'action', width: 140, align: 'center' as const },
]

const detailColumns = [
  { title: '序号', key: 'index', width: 55, align: 'center' as const },
  { title: '配件图号', dataIndex: 'partNo', width: 110 },
  { title: '通用/替换号', dataIndex: 'replaceNo', width: 110 },
  { title: '配件名称', dataIndex: 'partName', width: 130 },
  { title: '采购数量', dataIndex: 'quantity', width: 80, align: 'right' as const },
  { title: '单价(￥)', key: 'unitPrice', width: 100, align: 'right' as const },
  { title: '单位', dataIndex: 'unit', width: 60, align: 'center' as const },
  { title: '规格型号', dataIndex: 'spec', width: 100 },
  { title: '报价备注', dataIndex: 'quoteRemark' },
  { title: '小计', key: 'subtotal', width: 120, align: 'right' as const },
]

function formatMoney(value: number): string {
  return `¥ ${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

function handleSearch(): void {
  // 响应式过滤即时生效
}

function handleReset(): void {
  query.reqNo = ''
  query.quoteNo = ''
  query.status = undefined
  query.quoteRange = undefined
}

function goEdit(q: Quotation): void {
  const req = requirementStorage.getById(q.requirementId)
  if (!req) {
    router.push('/purchase')
    return
  }
  router.push(`/quotation/edit?requirementId=${q.requirementId}`)
}

/* ---------- 待报价需求（供应商在报价页面内发起报价） ---------- */
const pendingOpen = ref(false)

interface PendingRequirement extends PurchaseRequirement {
  myQuote: boolean
}

const pendingList = computed<PendingRequirement[]>(() => {
  const now = dayjs()
  return requirementStorage
    .list()
    .filter((r) => {
      // 仅展示未截止且未中标的需求
      if (now.isAfter(dayjs(r.quoteDeadline))) return false
      if (awardStorage.getByRequirement(r.id)) return false
      return true
    })
    .map((r) => ({
      ...r,
      myQuote: quotations.value.some((q) => q.requirementId === r.id),
    }))
    .sort((a, b) => b.createTime.localeCompare(a.createTime))
})

const pendingColumns = [
  { title: '需求单号', dataIndex: 'reqNo', width: 170 },
  { title: '报价截止日期', dataIndex: 'quoteDeadline', width: 180 },
  { title: '集中交货日期', dataIndex: 'deliverDate', width: 130 },
  { title: '商品数量', key: 'itemCount', width: 90, align: 'center' as const },
  { title: '报价状态', key: 'quoteStatus', width: 100, align: 'center' as const },
  { title: '操作', key: 'action', width: 90, align: 'center' as const },
]

function openPending(): void {
  pendingOpen.value = true
}

function goPendingQuote(r: PurchaseRequirement): void {
  pendingOpen.value = false
  router.push(`/quotation/edit?requirementId=${r.id}`)
}

/* ---------- 详情 ---------- */
const detailOpen = ref(false)
const detailQuote = ref<Quotation | null>(null)

function openDetail(q: Quotation): void {
  detailQuote.value = q
  detailOpen.value = true
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

.detail-desc {
  margin-bottom: 16px;
}

.detail-table {
  margin-top: 8px;
}
</style>

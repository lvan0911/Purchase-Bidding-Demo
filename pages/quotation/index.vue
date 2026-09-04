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
      <a-table
          :columns="columns"
          :data-source="quotations"
          row-key="id"
          size="middle"
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: 1100 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'quoteNo'">
              {{ record.quoteNo || '-' }}
            </template>
            <template v-else-if="column.key === 'totalAmount'">
              {{ formatMoney(record.totalAmount) }}
            </template>
            <template v-else-if="column.key === 'quoteDeadline'">
              {{ record.quoteDeadline || '-' }}
            </template>
            <template v-else-if="column.key === 'deliverDate'">
              {{ record.confirmDeliverDate || '-' }}
            </template>
            <template v-else-if="column.key === 'modifyTime'">
              {{ record.modifyTime || '-' }}
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="getStatus(record).color">{{ getStatus(record).text }}</a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
                <a-button type="link" size="small" :disabled="record.status !== 'quoting'||userStorage.get()?.role === 'admin'" @click="goEdit(record)">修改报价</a-button>
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
          :data-source="detailQuote.items ?? []"
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

  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Dayjs } from 'dayjs'
import { getQuotationDetail, getQuotationPage } from '@/api/quotation'
import type { Quotation } from '@/types'
import { userStorage } from '@/utils/storage'

const router = useRouter()

const quotations = ref<Quotation[]>([])
const loading = ref(false)

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
  switch (q.status) {
    case 'awarded':
      return { value: 'awarded', text: '已中标', color: 'green' }
    case 'expired':
      return { value: 'expired', text: '已截止', color: 'red' }
    default:
      return { value: 'quoting', text: '报价中', color: 'blue' }
  }
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

function buildQuotationRows(list: Quotation[]): Quotation[] {
  return list
}

async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const res = await getQuotationPage({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      reqNo: query.reqNo || undefined,
      quoteNo: query.quoteNo || undefined,
      status: query.status,
      quoteStart: query.quoteRange?.[0]?.format('YYYY-MM-DD'),
      quoteEnd: query.quoteRange?.[1]?.format('YYYY-MM-DD'),
    })
    quotations.value = buildQuotationRows(res.list)
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

const columns = [
  { title: '需求单号', dataIndex: 'reqNo', width: 160 , align: 'center' },
  { title: '报价单号', dataIndex: 'quoteNo', width: 160, align: 'center' },
  { title: '报价金额', key: 'totalAmount', width: 140, align: 'center'  },
  //  { title: '商品数量', dataIndex: 'itemCount', width: 160, align: 'center'  },
  { title: '报价截止时间', key: 'quoteDeadline', width: 120, align: 'center' as const },
  { title: '交货日期', dataIndex: 'confirmDeliverDate', width: 130, align: 'center'  },
  // { title: '报价时间', dataIndex: 'quoteTime', width: 180 },
  { title: '修改时间', dataIndex: 'modifyTime', width: 180 , align: 'center' },
  { title: '状态', key: 'status', width: 90, align: 'center' as const },
  { title: '操作', key: 'action', width: 140, fixed: 'right', align: 'center' as const },
]

const detailColumns = [
  { title: '序号', key: 'index', width: 55, align: 'center' as const },
  { title: '配件图号', dataIndex: 'partNo',  align: 'center' as const },
  { title: '通用/替换号', dataIndex: 'replaceNo',  align: 'center' as const },
  { title: '配件名称', dataIndex: 'partName',  align: 'center' as const },
  { title: '采购数量', dataIndex: 'quantity',  align: 'center' as const },
  { title: '单价(￥)', key: 'unitPrice',  align: 'center' as const },
  { title: '单位', dataIndex: 'unit',  align: 'center' as const },
  { title: '规格型号', dataIndex: 'spec',  align: 'center' as const },
  { title: '报价备注', dataIndex: 'quoteRemark',  align: 'center' as const },
  { title: '小计', key: 'subtotal',  align: 'center' as const },
]

function formatMoney(value: number): string {
  return `¥ ${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

function handleSearch(): void {
  pagination.current = 1
  fetchList()
}

function handleReset(): void {
  query.reqNo = ''
  query.quoteNo = ''
  query.status = undefined
  query.quoteRange = undefined
  pagination.current = 1
  fetchList()
}

function goEdit(q: Quotation): void {
  router.push(`/quotation/edit?requirementId=${q.requirementId}`)
}

/* ---------- 详情 ---------- */
const detailOpen = ref(false)
const detailQuote = ref<Quotation | null>(null)

async function openDetail(q: Quotation): Promise<void> {
  detailQuote.value = await getQuotationDetail(q.id)
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

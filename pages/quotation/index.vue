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
            <a-select-option value="awarded">已中标</a-select-option>
            <a-select-option value="lost">未中标</a-select-option>
            <a-select-option value="pending">待确认</a-select-option>
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
      wrap-class-name="detail-modal-wrap"
    >
      <template v-if="detailQuote">
        <a-descriptions :column="2" bordered size="small" class="detail-desc">
          <a-descriptions-item label="需求单号">{{ detailQuote.reqNo }}</a-descriptions-item>
          <a-descriptions-item label="状态" ><a-tag :color="getStatus(detailQuote).color">{{ getStatus(detailQuote).text }}</a-tag></a-descriptions-item>
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
      return { value: 'expired', text: '已截止', color: 'orange' }
    case 'lost':
      return { value: 'lost', text: '未中标', color: 'red' }
    case 'pending':
      return { value: 'pending', text: '待确认', color: 'orange' }
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
.page-container {
  height: calc(100vh - 116px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  flex-shrink: 0;
}
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

.list-card :deep(.ant-table-cell) {
  padding: 10px 8px !important;
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

.list-card :deep(.ant-btn-link:disabled) {
  background: transparent;
}

.detail-desc {
  margin-bottom: 16px;
}

.detail-table {
  margin-top: 8px;
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

.detail-modal-wrap .ant-modal-close {
  top: 20px;
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

.detail-modal-wrap .ant-table-thead > tr > th {
  background: linear-gradient(180deg, #f5f9ff, #edf3fe);
  color: #1d2b4f;
  font-weight: 600;
  border-bottom: 1px solid #e3ebf8;
  border-right: 1px solid #e3ebf8;
}

.detail-modal-wrap .ant-table-thead > tr > th:first-child {
  border-left: 1px solid #e3ebf8;
}

.detail-modal-wrap .ant-table-tbody > tr > td {
  border-bottom: 1px solid #f2f5fa;
  border-right: 1px solid #f2f5fa;
}

.detail-modal-wrap .ant-table-tbody > tr > td:first-child {
  border-left: 1px solid #f2f5fa;
}

.detail-modal-wrap .ant-table-tbody > tr:hover > td {
  background: #f4f8ff !important;
}
</style>

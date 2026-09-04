<template>
  <div class="page-container">
    <div class="page-header">
      <span class="page-title">采购排名及确认</span>
    </div>

    <!-- 搜索条件区域 -->
    <a-card class="page-card search-card">
      <a-form layout="inline" :model="query">
        <a-form-item label="需求单号">
          <a-input
            v-model:value="query.reqNo"
            placeholder="请输入需求单号"
            allow-clear
            style="width: 170px"
          />
        </a-form-item>
        <a-form-item label="报价单号">
          <a-input
            v-model:value="query.quoteNo"
            placeholder="请输入报价单号"
            allow-clear
            style="width: 170px"
          />
        </a-form-item>
        <a-form-item label="供应商名称">
          <a-input
            v-model:value="query.supplier"
            placeholder="请输入供应商名称"
            allow-clear
            style="width: 150px"
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
            <a-select-option value="pending">待确认</a-select-option>
            <a-select-option value="awarded">已中标</a-select-option>
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
    <a-card class="page-card list-card" title="报价单列表">
      <template #extra>
        <a-space v-if="userStorage.get()?.role !== 'admin'">
          <span class="selected-count">已选 {{ selectedRowKeys.length }} 项</span>
          <a-button
            type="primary"
            :disabled="selectedRowKeys.length === 0"
            :loading="awarding"
            @click="handleConfirm(selectedRows)"
          >
            确认中标
          </a-button>
        </a-space>
      </template>
      <a-table
        :columns="columns"
        :data-source="rows"
        row-key="id"
        size="middle"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1450 }"
        :row-selection="rowSelection"
        :row-class-name="rowClassName"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'rank'">
            <template v-if="record.rank">
              <span class="rank-number" :class="{ 'rank-first-number': record.rank === 1 }">
                {{ record.rank }}
              </span>
              <a-tag v-if="record.rank === 1" color="gold" class="rank-tag">推荐中标</a-tag>
            </template>
            <span v-else class="rank-mask">-</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatus(record).color">{{ getStatus(record).text }}</a-tag>
          </template>
          <template v-else-if="column.key === 'totalAmount'">
            <span v-if="!record.expired" class="rank-mask">***</span>
            <span v-else :class="{ 'rank-first-text': record.rank === 1 }">
              {{ formatMoney(record.totalAmount) }}
            </span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button
                type="link"
                size="small"
                :disabled="!canAward(record) || userStorage.get()?.role === 'admin'"
                @click="handleConfirm(record)"
              >
                确认中标
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 报价单详情 -->
    <a-modal
      v-model:open="detailOpen"
      :title="`报价单 ${detailQuote?.quoteNo ?? ''} 明细`"
      width="70%"
      wrap-class-name="detail-modal-wrap"
    >
      <template v-if="detailQuote">
        <a-descriptions :column="2" bordered size="small" class="detail-desc">
          <a-descriptions-item label="需求单号">{{ detailQuote.reqNo }}</a-descriptions-item>
          <a-descriptions-item label="排名">
            <template v-if="detailQuote.rank">
              <span :class="{ 'rank-first-text': detailQuote.rank === 1 }">
                第 {{ detailQuote.rank }} 名
              </span>
              <a-tag v-if="detailQuote.rank === 1" color="gold">推荐中标</a-tag>
            </template>
            <span v-else class="rank-mask">报价截止后排名</span>
          </a-descriptions-item>
          <a-descriptions-item label="供应商名称">{{ detailQuote.awardedSupplierName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="报价人">{{ detailQuote.quotePerson || '-' }}</a-descriptions-item>
          <a-descriptions-item label="报价金额">
            <template v-if="!detailQuote.expired">
              <span class="rank-mask">***</span>
            </template>
            <b v-else>{{ formatMoney(detailQuote.totalAmount) }}</b>
          </a-descriptions-item>
          <a-descriptions-item label="确定交货日期">{{ detailQuote.confirmDeliverDate }}</a-descriptions-item>
          <a-descriptions-item label="集中交货日期">{{ detailQuote.deliverDate }}</a-descriptions-item>
          <a-descriptions-item label="报价时间">{{ detailQuote.quoteTime }}</a-descriptions-item>
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
      <template #footer>
        <a-button @click="detailOpen = false">关闭</a-button>
        <a-button
          v-if="detailQuote && canAward(detailQuote)"
          type="primary"
          style="color: #fff;"
          :loading="awarding"
          :disabled="userStorage.get()?.role === 'admin' "
          @click="handleConfirm(detailQuote)"
        >
          确认中标
        </a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { awardQuotation, getConfirmDetail, getConfirmList } from '@/api/confirm'
import { userStorage } from '@/utils/storage'
import type { Quotation } from '@/types'

type RowData = Quotation

const rows = ref<RowData[]>([])
const loading = ref(false)
const awarding = ref(false)

const query = reactive({
  reqNo: '',
  quoteNo: '',
  supplier: '',
  status: undefined as string | undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const res = await getConfirmList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      reqNo: query.reqNo.trim() || undefined,
      quoteNo: query.quoteNo.trim() || undefined,
      supplier: query.supplier.trim() || undefined,
      status: query.status,
    })
    rows.value = res.list ?? []
    pagination.total = res.total ?? 0
  } finally {
    loading.value = false
  }
}

function onTableChange(p: { current?: number; pageSize?: number }): void {
  if (p.pageSize && p.pageSize !== pagination.pageSize) {
    pagination.pageSize = p.pageSize
    pagination.current = 1
  } else if (p.current) {
    pagination.current = p.current
  }
  fetchList()
}

function handleSearch(): void {
  pagination.current = 1
  fetchList()
}

function handleReset(): void {
  query.reqNo = ''
  query.quoteNo = ''
  query.supplier = ''
  query.status = undefined
  pagination.current = 1
  fetchList()
}

interface StatusInfo {
  text: string
  color: string
}

function getStatus(q: Quotation): StatusInfo {
  switch (q.status) {
    case 'awarded':
      return { text: '已中标', color: 'green' }
    case 'pending':
      return { text: '待确认', color: 'orange' }
    case 'expired':
      return { text: '已截止', color: 'red' }
    default:
      return { text: '报价中', color: 'blue' }
  }
}

const columns = [
  { title: '排名', key: 'rank', width: 110, align: 'center' as const },
  { title: '状态', key: 'status', align: 'center' as const },
  { title: '需求单号', dataIndex: 'reqNo', align: 'center' as const },
  { title: '报价单号', dataIndex: 'quoteNo', align: 'center' as const },
  { title: '供应商名称', dataIndex: 'awardedSupplierName', align: 'center' as const },
  { title: '报价人', dataIndex: 'quotePerson', align: 'center' as const },
  { title: '报价金额', key: 'totalAmount', width: 130, align: 'center' as const },
  { title: '集中交货日期', dataIndex: 'deliverDate', align: 'center' as const },
  { title: '确定交货日期', dataIndex: 'confirmDeliverDate', align: 'center' as const },
  { title: '报价时间', dataIndex: 'quoteTime', align: 'center' as const },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const },
]

const detailColumns = [
  { title: '序号', key: 'index', width: 55, align: 'center' as const },
  { title: '配件图号', dataIndex: 'partNo', align: 'center' as const },
  { title: '通用/替换号', dataIndex: 'replaceNo', align: 'center' as const },
  { title: '配件名称', dataIndex: 'partName', align: 'center' as const },
  { title: '采购数量', dataIndex: 'quantity', align: 'center' as const },
  { title: '单价(￥)', key: 'unitPrice', width: 100, align: 'center' as const },
  { title: '单位', dataIndex: 'unit', align: 'center' as const },
  { title: '规格型号', dataIndex: 'spec', align: 'center' as const },
  { title: '报价备注', dataIndex: 'quoteRemark', align: 'center' as const },
  { title: '小计', key: 'subtotal', width: 120, align: 'center' as const },
]

/** 是否可确认中标：已截止且未中标（由后端 expired + status 控制） */
function canAward(row: RowData): boolean {
  return !!row.expired && row.status === 'pending'
}

function rowClassName(record: RowData): string {
  return record.rank === 1 ? 'rank-first' : ''
}

function formatMoney(value: number): string {
  return `¥ ${(value ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

/* ---------- 行勾选（多选） ---------- */
const selectedRowKeys = ref<(string | number)[]>([])
const selectedRows = ref<RowData[]>([])

const rowSelection = computed(() => ({
  type: 'checkbox' as const,
  selectedRowKeys: selectedRowKeys.value,
  preserveSelectedRowKeys: true,
  onChange: (keys: (string | number)[], rows: RowData[]) => {
    selectedRowKeys.value = keys
    selectedRows.value = rows
  },
  getCheckboxProps: (record: RowData) => ({
    disabled: !canAward(record),
  }),
}))

/* ---------- 详情 ---------- */
const detailOpen = ref(false)
const detailQuote = ref<RowData | null>(null)
const detailLoading = ref(false)

async function openDetail(row: RowData): Promise<void> {
  detailOpen.value = true
  detailQuote.value = null
  detailLoading.value = true
  try {
    const detail = await getConfirmDetail(row.id)
    detailQuote.value = detail
  } finally {
    detailLoading.value = false
  }
}

/* ---------- 确认中标（单个 / 批量） ---------- */
function handleConfirm(target: RowData | RowData[]): void {
  const rows = Array.isArray(target) ? target : [target]

  if (rows.length === 0) {
    message.warning('请先选择要确认中标的报价单')
    return
  }

  // 过滤掉不可中标的行
  const awardable = rows.filter(r => canAward(r))
  if (awardable.length === 0) {
    message.warning('所选报价单均不可确认中标（需报价截止且未中标）')
    return
  }
  if (awardable.length !== rows.length) {
    message.warning(`有 ${rows.length - awardable.length} 条报价单不可中标，仅处理其余 ${awardable.length} 条`)
  }

  const ids = awardable.map(r => r.id)
  const isBatch = awardable.length > 1
  const first = awardable[0]
 
  Modal.confirm({
    title: isBatch ? '批量确认中标' : '确认中标',
    content: isBatch
      ? `确定为选中的 ${awardable.length} 条报价单确认中标？`
      : `确定选择【${first.quotePerson}】为中标供应商？中标价格 ${formatMoney(first.totalAmount)}，确定交货日期 ${first.confirmDeliverDate}。`,
    okText: '确认中标',
    cancelText: '取消',
    onOk: async () => {
      awarding.value = true
      try {
        await awardQuotation(ids)
        message.success(isBatch ? `已批量确认 ${awardable.length} 条中标` : '已确认中标')
        detailOpen.value = false
        selectedRowKeys.value = []
        selectedRows.value = []
        await fetchList()
      } finally {
        awarding.value = false
      }
    },
  })
}

onMounted(() => {
  fetchList()
})
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

.selected-count {
  display: inline-block;
  padding: 3px 14px;
  border-radius: 999px;
  background: rgba(22, 119, 255, 0.08);
  color: #1677ff;
  font-size: 13px;
  font-weight: 500;
}

.list-card :deep(.ant-table-thead > tr > th) {
  background: linear-gradient(180deg, #f5f9ff, #edf3fe);
  color: #1d2b4f;
  font-weight: 600;
  border-bottom: 1px solid #e3ebf8;
}

.list-card :deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid #f2f5fa;
  transition: background-color 0.2s ease;
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

.list-card :deep(.btn-link) {
  padding: 2px 10px;
  border-radius: 999px;
  transition: all 0.2s ease;
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

.rank-number {
  display: inline-block;
  min-width: 22px;
  text-align: center;
}

.rank-first-number {
  font-weight: 700;
  color: #d48806;
}

.rank-tag {
  margin-left: 6px;
}

.rank-first-text {
  color: #cf1322;
  font-weight: 600;
}

.rank-mask {
  color: rgba(0, 0, 0, 0.45);
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
}

.detail-modal-wrap .ant-table-tbody > tr > td {
  border-bottom: 1px solid #f2f5fa;
}

.detail-modal-wrap .ant-table-tbody > tr:hover > td {
  background: #f4f8ff !important;
}

.detail-modal-wrap .ant-btn-primary {
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.35);
}
</style>

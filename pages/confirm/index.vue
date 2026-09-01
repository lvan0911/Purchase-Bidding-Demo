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
        <a-button
          type="primary"
          :disabled="!selectedRow"
          @click="handleConfirm(selectedRow)"
        >
          确认中标
        </a-button>
      </template>
      <a-table
        :columns="columns"
        :data-source="filteredRows"
        row-key="id"
        size="middle"
        :pagination="pagination"
        :scroll="{ x: 1450 }"
        :row-selection="rowSelection"
        :row-class-name="rowClassName"
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
            <a-tag :color="record.status.color">{{ record.status.text }}</a-tag>
          </template>
          <template v-else-if="column.key === 'totalAmount'">
            <span v-if="record.status.value === 'quoting'" class="rank-mask">***</span>
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
                :disabled="!canAward(record)"
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
          <a-descriptions-item label="供应商名称">{{ detailQuote.quotePerson }}</a-descriptions-item>
          <a-descriptions-item label="报价人">{{ detailQuote.quotePerson }}</a-descriptions-item>
          <a-descriptions-item label="报价金额">
            <template v-if="detailQuote.status.value === 'quoting'">
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
      <template #footer>
        <a-button @click="detailOpen = false">关闭</a-button>
        <a-button
          v-if="detailQuote && canAward(detailQuote)"
          type="primary"
          @click="handleConfirm(detailQuote)"
        >
          确认中标
        </a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { awardStorage, quotationStorage } from '@/utils/storage'
import type { AwardResult, Quotation } from '@/types'

interface RowData extends Quotation {
  status: { value: string; text: string; color: string }
  /** 金额排名：仅已截止需求有效，截止前为 null（不排名） */
  rank: number | null
}

const quotations = ref<Quotation[]>(quotationStorage.list())

const query = reactive({
  reqNo: '',
  quoteNo: '',
  supplier: '',
  status: undefined as string | undefined,
})

/** 报价截止前不进行排名，采购方不可查看报价结果 */
function isExpired(quoteDeadline: string): boolean {
  return dayjs().isAfter(dayjs(quoteDeadline))
}

/** 构造列表行：状态 + 排名（截止前不排名） */
const rows = computed<RowData[]>(() => {
  // 已截止需求的报价单：按需求分组后按金额从低到高计算排名
  const rankMap = new Map<string, number>()
  const grouped = new Map<string, Quotation[]>()
  quotations.value.forEach((q) => {
    if (!isExpired(q.quoteDeadline)) return
    const arr = grouped.get(q.requirementId) ?? []
    arr.push(q)
    grouped.set(q.requirementId, arr)
  })
  grouped.forEach((list) => {
    list
      .slice()
      .sort((a, b) => a.totalAmount - b.totalAmount)
      .forEach((q, i) => rankMap.set(q.id, i + 1))
  })

  return quotations.value.map((q) => {
    const expired = isExpired(q.quoteDeadline)
    const awarded = awardStorage.getByRequirement(q.requirementId)?.quoteNo === q.quoteNo
    let status: RowData['status']
    if (!expired) {
      status = { value: 'quoting', text: '报价中', color: 'blue' }
    } else if (awarded) {
      status = { value: 'awarded', text: '已中标', color: 'green' }
    } else {
      status = { value: 'pending', text: '待确认', color: 'orange' }
    }
    return {
      ...q,
      status,
      rank: expired ? rankMap.get(q.id) ?? null : null,
    }
  })
})

/** 新的报价单排在前 */
const filteredRows = computed(() => {
  return rows.value
    .filter((r) => {
      if (query.reqNo && !r.reqNo.includes(query.reqNo.trim())) return false
      if (query.quoteNo && !r.quoteNo.includes(query.quoteNo.trim())) return false
      if (query.supplier && !r.quotePerson.includes(query.supplier.trim())) return false
      if (query.status && r.status.value !== query.status) return false
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
  { title: '排名', key: 'rank', width: 110, align: 'center' as const },
  { title: '状态', key: 'status', width: 90, align: 'center' as const },
  { title: '需求单号', dataIndex: 'reqNo', width: 150 },
  { title: '报价单号', dataIndex: 'quoteNo', width: 150 },
  { title: '供应商名称', dataIndex: 'quotePerson', width: 120 },
  { title: '报价人', dataIndex: 'quotePerson', width: 110 },
  { title: '报价金额', key: 'totalAmount', width: 130, align: 'right' as const },
  { title: '集中交货日期', dataIndex: 'deliverDate', width: 120 },
  { title: '确定交货日期', dataIndex: 'confirmDeliverDate', width: 120 },
  { title: '报价时间', dataIndex: 'quoteTime', width: 170 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const },
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

/** 是否可确认中标：已截止且未中标 */
function canAward(row: RowData): boolean {
  return row.status.value === 'pending'
}

function rowClassName(record: RowData): string {
  return record.rank === 1 ? 'rank-first' : ''
}

function formatMoney(value: number): string {
  return `¥ ${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

function handleSearch(): void {
  // 响应式过滤即时生效
}

function handleReset(): void {
  query.reqNo = ''
  query.quoteNo = ''
  query.supplier = ''
  query.status = undefined
}

/* ---------- 行勾选（单选） ---------- */
const selectedRowKeys = ref<(string | number)[]>([])
const selectedRow = ref<RowData | null>(null)

const rowSelection = computed(() => ({
  type: 'radio' as const,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[], rows: RowData[]) => {
    selectedRowKeys.value = keys
    selectedRow.value = rows[0] ?? null
  },
  getCheckboxProps: (record: RowData) => ({
    disabled: !canAward(record),
  }),
}))

/* ---------- 详情 ---------- */
const detailOpen = ref(false)
const detailQuote = ref<RowData | null>(null)

function openDetail(row: RowData): void {
  detailQuote.value = row
  detailOpen.value = true
}

/* ---------- 确认中标 ---------- */
function handleConfirm(row: RowData | null): void {
  if (!row) return
  if (!canAward(row)) {
    message.warning('该报价单当前不可确认中标（需报价截止且未中标）')
    return
  }
  Modal.confirm({
    title: '确认中标',
    content: `确定选择【${row.quotePerson}】为中标供应商？中标价格 ${formatMoney(row.totalAmount)}，确定交货日期 ${row.confirmDeliverDate}。`,
    okText: '确认中标',
    cancelText: '取消',
    onOk() {
      const result: AwardResult = {
        requirementId: row.requirementId,
        reqNo: row.reqNo,
        quoteNo: row.quoteNo,
        supplierName: row.quotePerson,
        awardPrice: row.totalAmount,
        confirmDeliverDate: row.confirmDeliverDate,
        confirmTime: new Date().toLocaleString(),
        confirmed: true,
      }
      awardStorage.save(result)
      message.success('已确认中标')
      detailOpen.value = false
      selectedRowKeys.value = []
      selectedRow.value = null
      // 刷新状态展示
      quotations.value = quotationStorage.list()
    },
  })
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

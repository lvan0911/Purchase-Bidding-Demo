<template>
  <div class="page-container">
    <div class="page-header">
      <span class="page-title">采购需求发布</span>
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
        <a-form-item label="配件关键字">
          <a-input
            v-model:value="query.keyword"
            placeholder="配件图号 / 配件名称"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item label="报价截止日期">
          <a-range-picker v-model:value="query.deadlineRange" style="width: 280px" />
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
    <a-card class="page-card list-card" title="历史发布的需求">
      <template #extra>
        <a-button type="primary" @click="router.push('/purchase/edit')" v-if="userStorage.get()?.role === 'purchaser'">
          <template #icon><PlusOutlined /></template>
          新增发布需求
        </a-button>
      </template>
      <a-table
        :columns="columns"
        :data-source="requirements"
        row-key="id"
        size="middle"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1000 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'itemCount'">
            {{ record.itemCount ?? record.items?.length ?? 0 }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatus(record).color">{{ getStatus(record).text }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space >
              <a-button type="link"  size="small"  @click="openDetail(record)">详情</a-button>
              <a-button type="link" size="small" v-if="userStorage.get()?.role === 'purchaser'" :disabled="record.status == 'awarded' || userStorage.get()?.role === 'admin'" @click="goEdit(record)">编辑</a-button>
            </a-space>
            <a-button type="link" size="small" :disabled="userStorage.get()?.role === 'admin' || record.status != 'quoting'"  v-if="userStorage.get()?.role === 'supplier' || userStorage.get()?.role === 'admin'" @click="goQuotation(record)">去报价</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 需求详情 -->
    <a-modal v-model:open="detailOpen" title="需求详情" :footer="null" width="70%" wrap-class-name="detail-modal-wrap">
      <template v-if="detail">
        <a-descriptions
          title="基础信息"
          bordered
          size="small"
          :column="2"
          style="margin-bottom: 16px"
        >
          <a-descriptions-item label="需求单号">{{ detail.reqNo }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatus(detail).color">{{ getStatus(detail).text }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="报价截止日期">{{ detail.quoteDeadline || '-' }}</a-descriptions-item>
          <a-descriptions-item label="集中交货日期">{{ detail.deliverDate || '-' }}</a-descriptions-item>
          <a-descriptions-item label="创建人" v-if="detail.status == 'quoting'&& userStorage.get()?.role === 'supplier'||userStorage.get()?.role === 'admin'">***</a-descriptions-item>
          <a-descriptions-item label="创建人" v-else>{{ detail.creator || '-' }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ detail.createTime || '-' }}</a-descriptions-item>
          <a-descriptions-item label="修改人" v-if="detail.status == 'quoting' && userStorage.get()?.role === 'supplier'||userStorage.get()?.role === 'admin'">***</a-descriptions-item>
          <a-descriptions-item label="修改人" v-else>{{ detail.modifier || '-' }}</a-descriptions-item>
          <a-descriptions-item label="修改时间">{{ detail.modifyTime || '-' }}</a-descriptions-item>
          <a-descriptions-item label="需求备注" :span="2">{{ detail.remark || '-' }}</a-descriptions-item>
        </a-descriptions>
        <a-descriptions title="商品清单" bordered size="small" :column="1">
          <a-descriptions-item>
            <a-table
              :columns="detailItemColumns"
              :data-source="detail.items ?? []"
              row-key="id"
              size="small"
              :pagination="false"
              :scroll="{ x: 800 }"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'quantity'">{{ record.quantity }}</template>
                <template v-else-if="column.key === 'replaceNo'">{{ record.replaceNo || '-' }}</template>
                <template v-else-if="column.key === 'spec'">{{ record.spec || '-' }}</template>
                <template v-else-if="column.key === 'purchaseRemark'">
                  {{ record.purchaseRemark || '-' }}
                </template>
              </template>
            </a-table>
          </a-descriptions-item>
        </a-descriptions>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Dayjs } from 'dayjs'
import { PlusOutlined } from '@ant-design/icons-vue'
import { getRequirementDetail, getRequirementPage } from '@/api/requirement'
import { userStorage } from '@/utils/storage'
import type { PurchaseRequirement } from '@/types'
const router = useRouter()

const requirements = ref<PurchaseRequirement[]>([])
const loading = ref(false)

const query = reactive({
  reqNo: '',
  keyword: '',
  deadlineRange: undefined as [Dayjs, Dayjs] | undefined,
  status: undefined as string | undefined,
})

interface StatusInfo {
  value: string
  text: string
  color: string
}

function getStatus(req: PurchaseRequirement): StatusInfo {
  switch (req.status) {
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

async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const res = await getRequirementPage({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      reqNo: query.reqNo || undefined,
      keyword: query.keyword || undefined,
      deadlineStart: query.deadlineRange?.[0]?.format('YYYY-MM-DD'),
      deadlineEnd: query.deadlineRange?.[1]?.format('YYYY-MM-DD'),
      status: query.status as PurchaseRequirement['status'] | undefined,
    })
    requirements.value = res.list
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

/** 基础列 */
const baseColumns = [
  { title: '需求单号', dataIndex: 'reqNo', width: 120 , align: 'center' as const},
  { title: '商品数量', key: 'itemCount', width: 90, align: 'center' as const },
  { title: '报价截止日期', dataIndex: 'quoteDeadline', width: 180 , align: 'center' as const},
  { title: '集中交货日期', dataIndex: 'deliverDate', width: 130 , align: 'center' as const},
  { title: '创建人', dataIndex: 'creator', width: 110 , align: 'center' as const},
  { title: '创建时间', dataIndex: 'createTime', width: 180 , align: 'center' as const},
  { title: '状态', key: 'status', width: 90, align: 'center' as const },
  { title: '操作', key: 'action', width: 200, fixed: 'right', align: 'center' as const },
]

/** supplier 角色隐藏创建人列 */
const columns = computed(() => {
  const role = userStorage.get()?.role
  if (role === 'supplier') {
    return baseColumns.filter((c) => c.dataIndex !== 'creator')
  }
  return baseColumns
})

const detailItemColumns = [
  { title: '序号', key: 'index', width: 60, align: 'center' as const },
  { title: '配件图号', dataIndex: 'partNo', width: 130 , align: 'center' as const},
  { title: '通用/替换号', dataIndex: 'replaceNo', width: 130, align: 'center' as const },
  { title: '配件名称', dataIndex: 'partName', width: 150, align: 'center' as const },
  { title: '采购数量', dataIndex: 'quantity', width: 100, align: 'center' as const },
  { title: '单位', dataIndex: 'unit', width: 70, align: 'center' as const },
  { title: '规格型号', dataIndex: 'spec', width: 130 , align: 'center' as const},
  { title: '采购备注', dataIndex: 'purchaseRemark', width: 150, align: 'center' as const },
]

const detailOpen = ref(false)
const detail = ref<PurchaseRequirement | null>(null)

async function openDetail(req: PurchaseRequirement): Promise<void> {
  // 调后端获取完整详情（含 items）
  detail.value = await getRequirementDetail(req.id)
  detailOpen.value = true
}

function handleSearch(): void {
  pagination.current = 1
  fetchList()
}

function handleReset(): void {
  query.reqNo = ''
  query.keyword = ''
  query.deadlineRange = undefined
  query.status = undefined
  pagination.current = 1
  fetchList()
}

function goEdit(req: PurchaseRequirement): void {
  router.push(`/purchase/edit?id=${req.id}`)
}

function goQuotation(req: PurchaseRequirement): void {
  router.push(`/quotation/edit?requirementId=${req.id}`)
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
  /* width: 6px;
  height: 6px; */
  border-radius: 50%;
  background: currentColor;
  /* margin-right: 6px; */
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

/* .detail-modal-wrap .ant-modal-title {
  font-weight: 600;
  font-size: 16px;
  position: relative;
  padding-left: 14px;
} */

/* .detail-modal-wrap .ant-modal-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: linear-gradient(180deg, #1677ff, #36cfc9);
} */

.detail-modal-wrap .ant-modal-close {
  top: 20px;
}

.detail-modal-wrap .ant-modal-body {
  padding: 20px 24px 24px;
  background: linear-gradient(180deg, #f7faff 0%, #ffffff 160px);
  max-height: 70vh;
  overflow: auto;
}

.detail-modal-wrap .ant-descriptions:last-child .ant-descriptions-view {
  overflow-x: auto;
}

.detail-modal-wrap .ant-descriptions-title {
  font-weight: 600;
  position: relative;
  padding-left: 12px;
}

.detail-modal-wrap .ant-descriptions-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: linear-gradient(180deg, #1677ff, #36cfc9);
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

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
        <a-button type="primary" @click="router.push('/purchase/edit')">
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
            <a-space>
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="goEdit(record)">编辑</a-button>
            </a-space>
            <a-button type="link" size="small" @click="goQuotation(record)">去报价</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 需求详情 -->
    <a-modal v-model:open="detailOpen" title="需求详情" :footer="null" width="70%">
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
          <a-descriptions-item label="报价截止日期">{{ detail.quoteDeadline }}</a-descriptions-item>
          <a-descriptions-item label="集中交货日期">{{ detail.deliverDate }}</a-descriptions-item>
          <a-descriptions-item label="创建人">{{ detail.creator }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ detail.createTime }}</a-descriptions-item>
          <a-descriptions-item label="修改人">{{ detail.modifier || '-' }}</a-descriptions-item>
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
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Dayjs } from 'dayjs'
import { PlusOutlined } from '@ant-design/icons-vue'
import { getRequirementDetail, getRequirementPage } from '@/api/requirement'
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

const columns = [
  { title: '需求单号', dataIndex: 'reqNo', width: 160 },
  { title: '商品数量', key: 'itemCount', width: 90, align: 'center' as const },
  { title: '报价截止日期', dataIndex: 'quoteDeadline', width: 180 },
  { title: '集中交货日期', dataIndex: 'deliverDate', width: 130 },
  { title: '创建人', dataIndex: 'creator', width: 110 },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  { title: '状态', key: 'status', width: 90, align: 'center' as const },
  { title: '操作', key: 'action', width: 200, align: 'center' as const },
]

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
}

.search-card :deep(.ant-form-item) {
  margin-bottom: 8px;
}

.list-card :deep(.ant-card-head-title) {
  font-weight: 600;
}
</style>

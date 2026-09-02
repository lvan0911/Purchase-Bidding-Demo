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
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="集中交货日期" name="deliverDate">
              <a-date-picker
                v-model:value="form.deliverDate"
                style="width: 100%"
                placeholder="请选择集中交货日期"
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
                :rows="3"
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

const items = ref<RequirementItem[]>([])

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
      items.value = detail.items.map((i) => ({ ...i }))
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
  itemForm.id = item?.id ?? 0
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

.publish-bar {
  display: flex;
  justify-content: center;
  padding: 8px 0 16px;
}
</style>

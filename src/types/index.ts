/** 登录用户（存储在 localStorage） */
export interface UserInfo {
  id?: number
  username: string
  name?: string
  role?: UserRole
  phone?: string
  company?: string
}

/** 登录成功返回（/api/auth/login 的 data） */
export interface LoginResult {
  token: string
  userId: number
  username: string
  name: string
  role: UserRole
  phone: string
  company: string
}

/** 当前用户详情（/api/auth/info 的 data） */
export interface UserProfile {
  id: number
  username: string
  name: string
  phone: string
  email: string
  company: string
  role: UserRole
  enabled: number
  createTime: string
}

/** 用户角色：管理员 / 采购员 / 供应商 */
export type UserRole = 'admin' | 'purchaser' | 'supplier'

/** 系统用户（用户管理 - 对齐后端） */
export interface UserAccount {
  id: number
  /** 登录账号（可选，不传默认手机号） */
  username?: string
  /** 手机号 */
  phone: string
  /** 姓名 */
  name: string
  /** 邮箱 */
  email: string
  /** 公司名称 */
  company: string
  /** 角色 */
  role: UserRole
  /** 状态：1启用 / 0禁用 */
  enabled: number
  /** 创建时间 */
  createTime?: string
  /** 新增/编辑时可选，编辑时空表示不修改密码 */
  password?: string
}

/** 用户分页查询参数 */
export interface UserQuery {
  pageNum: number
  pageSize: number
  username?: string
  phone?: string
  name?: string
  role?: UserRole
  enabled?: number
}

/** 分页返回结构 */
export interface PageResult<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
}

/** 需求商品行（对齐后端） */
export interface RequirementItem {
  id: number
  /** 配件图号 */
  partNo: string
  /** 通用/替换号 */
  replaceNo: string
  /** 配件名称 */
  partName: string
  /** 采购数量 */
  quantity: number
  /** 单位 */
  unit: string
  /** 规格型号 */
  spec: string
  /** 采购备注 */
  purchaseRemark: string
  /** 状态：是否发布 */
  published: boolean
}

/** 采购需求状态 */
export type RequirementStatus = 'quoting' | 'expired' | 'awarded'

/** 采购需求单（对齐后端） */
export interface PurchaseRequirement {
  id: number
  /** 需求单号 */
  reqNo: string
  /** 报价截止日期 YYYY-MM-DD HH:mm:ss */
  quoteDeadline: string
  /** 集中交货日期 YYYY-MM-DD */
  deliverDate: string
  /** 创建人 */
  creator: string
  /** 创建时间 */
  createTime: string
  /** 修改人 */
  modifier: string
  /** 修改时间 */
  modifyTime: string
  /** 需求单整体备注 */
  remark: string
  /** 状态：quoting报价中 / expired已截止 / awarded已中标 */
  status?: RequirementStatus
  /** 列表接口返回的商品数量（详情接口 items 才有值） */
  itemCount?: number
  /** 已收到报价数 */
  quoted?: number
  /** 商品清单（列表接口为 null，详情接口才有值） */
  items?: RequirementItem[]
}

/** 采购需求查询参数 */
export interface RequirementQuery {
  pageNum: number
  pageSize: number
  reqNo?: string
  keyword?: string
  deadlineStart?: string
  deadlineEnd?: string
  status?: RequirementStatus
  creatorFilter?: string
}

/** 报价商品行（对齐后端） */
export interface QuoteItem {
  id: number
  /** 关联的需求商品行 ID */
  requirementItemId?: number
  /** 配件图号 */
  partNo: string
  /** 通用/替换号 */
  replaceNo?: string
  /** 配件名称 */
  partName: string
  /** 采购数量 */
  quantity: number
  /** 单位 */
  unit: string
  /** 规格型号 */
  spec?: string
  /** 采购备注 */
  purchaseRemark?: string
  /** 报价单价（0 表示未报价） */
  unitPrice: number | null
  /** 最小起订量 */
  moq?: number
  /** 是否已报价 */
  quoted?: boolean
  /** 报价备注 */
  quoteRemark?: string
}

/** 报价单（对齐后端） */
export interface Quotation {
  id: number
  /** 关联需求单 ID */
  requirementId: number
  /** 需求单号 */
  reqNo: string
  /** 报价单号 */
  quoteNo: string
  /** 报价截止日期 */
  quoteDeadline: string
  /** 集中交货日期 */
  deliverDate: string
  /** 确定交货日期 */
  confirmDeliverDate: string
  /** 报价人 */
  quotePerson: string
  /** 报价时间 */
  quoteTime?: string
  /** 修改人 */
  modifier?: string
  /** 修改时间 */
  modifyTime?: string
  /** 报价单备注 */
  quoteRemark?: string
  /** 合计金额 */
  totalAmount: number
  /** 商品数量（列表接口返回） */
  itemCount?: number
  /** 状态：quoting/pending/expired/awarded */
  status?: string
  /** 是否已截止（后端返回） */
  expired?: boolean
  /** 排名（采购确认列表返回，1=推荐中标） */
  rank?: number
  /** 商品明细（详情接口才有） */
  items?: QuoteItem[]
}

/** 报价查询参数 */
export interface QuotationQuery {
  pageNum: number
  pageSize: number
  reqNo?: string
  quoteNo?: string
  status?: string
  quoteStart?: string
  quoteEnd?: string
}

/** 待报价需求项（pending-list 返回） */
export interface PendingItem {
  id: number
  reqNo: string
  partNo: string
  partName: string
  quantity: number
  unit: string
  deadline: string
}

/** 中标结果 */
export interface AwardResult {
  requirementId: string
  reqNo: string
  quoteNo: string
  /** 中标供应商（报价人） */
  supplierName: string
  /** 中标价格 */
  awardPrice: number
  /** 确定交货日期 */
  confirmDeliverDate: string
  /** 确认时间 */
  confirmTime: string
  /** 已确认状态 */
  confirmed: boolean
}

/** 登录用户 */
export interface UserInfo {
  username: string
}

/** 用户角色：管理员 / 采购员 / 供应商 */
export type UserRole = 'admin' | 'purchaser' | 'supplier'

/** 系统用户（用户管理） */
export interface UserAccount {
  id: string
  /** 账号（手机号） */
  phone: string
  /** 姓名 */
  name: string
  /** 邮箱 */
  email: string
  /** 公司名称 */
  company: string
  /** 角色 */
  role: UserRole
  /** 状态：启用 / 禁用 */
  enabled: boolean
  /** 创建时间 */
  createTime: string
}

/** 需求商品行 */
export interface RequirementItem {
  id: string
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
  /** 是否已发布 */
  published: boolean
}

/** 采购需求单 */
export interface PurchaseRequirement {
  id: string
  /** 需求单号，规则 XQ202609010000，创建时自动生成 */
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
  /** 商品清单 */
  items: RequirementItem[]
}

/** 报价商品行 */
export interface QuoteItem {
  id: string
  requirementItemId: string
  partNo: string
  replaceNo: string
  partName: string
  quantity: number
  /** 单价（报价方填写，必填） */
  unitPrice: number | null
  unit: string
  spec: string
  purchaseRemark: string
  /** 该行报价备注 */
  quoteRemark: string
}

/** 供应商报价单 */
export interface Quotation {
  id: string
  /** 报价单号，规则 BJ202609010000，自动生成 */
  quoteNo: string
  requirementId: string
  /** 需求单号（上游带过来） */
  reqNo: string
  /** 报价截止日期（上游） */
  quoteDeadline: string
  /** 集中交货日期（上游） */
  deliverDate: string
  /** 确定交货日期（报价方填写，必填） */
  confirmDeliverDate: string
  /** 报价人 */
  quotePerson: string
  /** 报价时间（首次提交时生成） */
  quoteTime: string
  /** 修改人 */
  modifier: string
  /** 修改时间 */
  modifyTime: string
  /** 备注（上游带过来） */
  remark: string
  /** 报价备注（报价方填写） */
  quoteRemark: string
  items: QuoteItem[]
  /** 合计金额 */
  totalAmount: number
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

import dayjs from 'dayjs'
import type { AwardResult, PurchaseRequirement, Quotation, UserAccount, UserInfo } from '@/types'

const KEY_USER = 'pb_demo_user'
const KEY_REQUIREMENTS = 'pb_demo_requirements'
const KEY_QUOTATIONS = 'pb_demo_quotations'
const KEY_AWARDS = 'pb_demo_awards'
const KEY_ACCOUNTS = 'pb_demo_accounts'

function read<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

/** 登录用户存储 */
export const userStorage = {
  get(): UserInfo | null {
    return read<UserInfo>(KEY_USER)
  },
  save(user: UserInfo): void {
    write(KEY_USER, user)
  },
  clear(): void {
    localStorage.removeItem(KEY_USER)
  },
}

/** 系统用户存储（用户管理） */
export const accountStorage = {
  list(): UserAccount[] {
    return read<UserAccount[]>(KEY_ACCOUNTS) ?? []
  },
  /** 新增或更新用户（按手机号判断唯一） */
  save(account: UserAccount): void {
    const list = accountStorage.list()
    const idx = list.findIndex((a) => a.id === account.id)
    if (idx >= 0) {
      list[idx] = account
    } else {
      list.push(account)
    }
    write(KEY_ACCOUNTS, list)
  },
  remove(id: string): void {
    write(
      KEY_ACCOUNTS,
      accountStorage.list().filter((a) => a.id !== id),
    )
  },
  /** 判断手机号是否已被占用（排除指定 id） */
  phoneExists(phone: string, excludeId?: string): boolean {
    return accountStorage
      .list()
      .some((a) => a.phone === phone && a.id !== excludeId)
  },
}

/** 采购需求单存储（历史列表） */
export const requirementStorage = {
  list(): PurchaseRequirement[] {
    return read<PurchaseRequirement[]>(KEY_REQUIREMENTS) ?? []
  },
  getById(id: string): PurchaseRequirement | null {
    return requirementStorage.list().find((r) => r.id === id) ?? null
  },
  save(requirement: PurchaseRequirement): void {
    const list = requirementStorage.list()
    const idx = list.findIndex((r) => r.id === requirement.id)
    if (idx >= 0) {
      list[idx] = requirement
    } else {
      list.push(requirement)
    }
    write(KEY_REQUIREMENTS, list)
  },
}

/** 供应商报价单存储 */
export const quotationStorage = {
  list(): Quotation[] {
    return read<Quotation[]>(KEY_QUOTATIONS) ?? []
  },
  /** 新增或更新报价单（同一报价单号覆盖，支持多次编辑） */
  save(quotation: Quotation): void {
    const list = quotationStorage.list()
    const idx = list.findIndex((q) => q.quoteNo === quotation.quoteNo)
    if (idx >= 0) {
      list[idx] = quotation
    } else {
      list.push(quotation)
    }
    write(KEY_QUOTATIONS, list)
  },
  listByRequirement(requirementId: string): Quotation[] {
    return quotationStorage.list().filter((q) => q.requirementId === requirementId)
  },
  /** 按报价人 + 需求查找报价单（一个报价人一份报价单，支持多次编辑回填） */
  findByPersonAndRequirement(person: string, requirementId: string): Quotation | null {
    return (
      quotationStorage
        .list()
        .find((q) => q.quotePerson === person && q.requirementId === requirementId) ?? null
    )
  },
}

/** 中标结果存储 */
export const awardStorage = {
  list(): AwardResult[] {
    return read<AwardResult[]>(KEY_AWARDS) ?? []
  },
  getByRequirement(requirementId: string): AwardResult | null {
    return awardStorage.list().find((a) => a.requirementId === requirementId) ?? null
  },
  save(award: AwardResult): void {
    const list = awardStorage.list().filter((a) => a.requirementId !== award.requirementId)
    list.push(award)
    write(KEY_AWARDS, list)
  },
}

/**
 * 发布采购需求：保存需求单，并清空该需求的历史报价与中标记录，
 * 保证 需求 -> 报价 -> 排名确认 的数据串联完整。
 */
export function publishRequirement(requirement: PurchaseRequirement): void {
  requirementStorage.save(requirement)
  const quotes = quotationStorage.list().filter((q) => q.requirementId !== requirement.id)
  write(KEY_QUOTATIONS, quotes)
  const awards = awardStorage.list().filter((a) => a.requirementId !== requirement.id)
  write(KEY_AWARDS, awards)
}

/** 生成需求单号：XQ + yyyyMMdd + 4位序号（当天序号递增） */
export function genReqNo(): string {
  const today = dayjs().format('YYYYMMDD')
  const max = requirementStorage
    .list()
    .filter((r) => r.reqNo.startsWith(`XQ${today}`))
    .reduce((m, r) => Math.max(m, Number(r.reqNo.slice(-4)) || 0), 0)
  return `XQ${today}${String(max + 1).padStart(4, '0')}`
}

/** 生成报价单号：BJ + yyyyMMdd + 4位序号（当天序号递增） */
export function genQuoteNo(): string {
  const today = dayjs().format('YYYYMMDD')
  const count = quotationStorage
    .list()
    .filter((q) => q.quoteNo.startsWith(`BJ${today}`)).length
  return `BJ${today}${String(count + 1).padStart(4, '0')}`
}

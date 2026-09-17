// 主进程与界面共用的数据类型定义

export interface Category {
  id: number
  level: 1 | 2
  parentId: number | null
  name: string
  sortOrder: number
  isBuiltin: boolean
}

export interface Transaction {
  id: number
  amountCents: number // 金额,单位:分(避免浮点误差)
  categoryId: number // 二级分类 id
  date: string // YYYY-MM-DD
  note: string
  createdAt: string
  updatedAt: string
}

// 列表展示用:带分类名称的交易记录
export interface TransactionWithCategory extends Transaction {
  subName: string // 二级分类名
  parentName: string // 一级分类名
}

export interface NewTransaction {
  amountCents: number
  categoryId: number
  date: string
  note: string
}

export interface TransactionFilters {
  month?: string // YYYY-MM
  categoryId?: number // 一级分类 id
  keyword?: string // 备注关键字
}

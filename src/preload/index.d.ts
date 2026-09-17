import type {
  Category,
  NewCategory,
  NewTransaction,
  StatsData,
  Transaction,
  TransactionFilters,
  TransactionWithCategory
} from '../shared/types'

export interface Api {
  appName: string
  listCategories: () => Promise<Category[]>
  addCategory: (data: NewCategory) => Promise<Category>
  updateCategory: (id: number, name: string) => Promise<Category>
  deleteCategory: (id: number) => Promise<void>
  addTransaction: (data: NewTransaction) => Promise<Transaction>
  updateTransaction: (id: number, data: NewTransaction) => Promise<Transaction>
  deleteTransaction: (id: number) => Promise<void>
  listTransactions: (filters?: TransactionFilters) => Promise<TransactionWithCategory[]>
  getStats: () => Promise<StatsData>
}

declare global {
  interface Window {
    api: Api
  }
}

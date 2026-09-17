import type {
  Category,
  NewTransaction,
  Transaction,
  TransactionFilters,
  TransactionWithCategory
} from '../shared/types'

export interface Api {
  appName: string
  listCategories: () => Promise<Category[]>
  addTransaction: (data: NewTransaction) => Promise<Transaction>
  updateTransaction: (id: number, data: NewTransaction) => Promise<Transaction>
  deleteTransaction: (id: number) => Promise<void>
  listTransactions: (filters?: TransactionFilters) => Promise<TransactionWithCategory[]>
}

declare global {
  interface Window {
    api: Api
  }
}

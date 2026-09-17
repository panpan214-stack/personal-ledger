import type { Category, NewTransaction, Transaction, TransactionWithCategory } from '../shared/types'

export interface Api {
  appName: string
  listCategories: () => Promise<Category[]>
  addTransaction: (data: NewTransaction) => Promise<Transaction>
  listTransactions: () => Promise<TransactionWithCategory[]>
}

declare global {
  interface Window {
    api: Api
  }
}

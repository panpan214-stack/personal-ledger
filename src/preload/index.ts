import { contextBridge, ipcRenderer } from 'electron'
import type {
  Category,
  NewTransaction,
  Transaction,
  TransactionFilters,
  TransactionWithCategory
} from '../shared/types'

// 界面与主进程之间的"安全通道":界面只能通过这些方法访问数据
const api = {
  appName: '个人记账',
  listCategories: (): Promise<Category[]> => ipcRenderer.invoke('categories:list'),
  addTransaction: (data: NewTransaction): Promise<Transaction> =>
    ipcRenderer.invoke('transactions:add', data),
  updateTransaction: (id: number, data: NewTransaction): Promise<Transaction> =>
    ipcRenderer.invoke('transactions:update', id, data),
  deleteTransaction: (id: number): Promise<void> => ipcRenderer.invoke('transactions:delete', id),
  listTransactions: (filters?: TransactionFilters): Promise<TransactionWithCategory[]> =>
    ipcRenderer.invoke('transactions:list', filters)
}

contextBridge.exposeInMainWorld('api', api)

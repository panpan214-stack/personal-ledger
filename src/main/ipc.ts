import { ipcMain } from 'electron'
import { getDb } from './db'
import type { Category, NewTransaction, Transaction, TransactionWithCategory } from '../shared/types'

export function registerIpcHandlers(): void {
  ipcMain.handle('categories:list', (): Category[] => {
    return getDb()
      .prepare(
        `SELECT id, level, parent_id AS parentId, name, sort_order AS sortOrder, is_builtin AS isBuiltin
         FROM categories ORDER BY sort_order, id`
      )
      .all() as Category[]
  })

  ipcMain.handle('transactions:add', (_event, data: NewTransaction): Transaction => {
    validateNewTransaction(data)
    const db = getDb()
    const info = db
      .prepare('INSERT INTO transactions (amount_cents, category_id, date, note) VALUES (?, ?, ?, ?)')
      .run(data.amountCents, data.categoryId, data.date, data.note)
    return db
      .prepare(
        `SELECT id, amount_cents AS amountCents, category_id AS categoryId, date, note,
                created_at AS createdAt, updated_at AS updatedAt
         FROM transactions WHERE id = ?`
      )
      .get(info.lastInsertRowid) as Transaction
  })

  ipcMain.handle('transactions:list', (): TransactionWithCategory[] => {
    return getDb()
      .prepare(
        `SELECT t.id, t.amount_cents AS amountCents, t.category_id AS categoryId, t.date, t.note,
                t.created_at AS createdAt, t.updated_at AS updatedAt,
                c.name AS subName, p.name AS parentName
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         JOIN categories p ON p.id = c.parent_id
         ORDER BY t.date DESC, t.id DESC`
      )
      .all() as TransactionWithCategory[]
  })
}

function validateNewTransaction(data: NewTransaction): void {
  if (!Number.isInteger(data.amountCents) || data.amountCents <= 0) {
    throw new Error('金额无效')
  }
  const cat = getDb()
    .prepare('SELECT level FROM categories WHERE id = ?')
    .get(data.categoryId) as { level: number } | undefined
  if (!cat || cat.level !== 2) {
    throw new Error('分类无效,请选择二级分类')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new Error('日期格式无效')
  }
}

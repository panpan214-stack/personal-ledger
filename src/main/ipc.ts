import { ipcMain } from 'electron'
import { getDb } from './db'
import type {
  Category,
  NewTransaction,
  Transaction,
  TransactionFilters,
  TransactionWithCategory
} from '../shared/types'

const SELECT_TX = `
  SELECT id, amount_cents AS amountCents, category_id AS categoryId, date, note,
         created_at AS createdAt, updated_at AS updatedAt
  FROM transactions WHERE id = ?`

const SELECT_TX_WITH_CATEGORY = `
  SELECT t.id, t.amount_cents AS amountCents, t.category_id AS categoryId, t.date, t.note,
         t.created_at AS createdAt, t.updated_at AS updatedAt,
         c.name AS subName, p.name AS parentName
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  JOIN categories p ON p.id = c.parent_id`

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
    return db.prepare(SELECT_TX).get(info.lastInsertRowid) as Transaction
  })

  ipcMain.handle(
    'transactions:update',
    (_event, id: number, data: NewTransaction): Transaction => {
      if (!Number.isInteger(id)) throw new Error('记录编号无效')
      validateNewTransaction(data)
      const db = getDb()
      const info = db
        .prepare(
          `UPDATE transactions
           SET amount_cents = ?, category_id = ?, date = ?, note = ?,
               updated_at = datetime('now', 'localtime')
           WHERE id = ?`
        )
        .run(data.amountCents, data.categoryId, data.date, data.note, id)
      if (info.changes === 0) throw new Error('记录不存在')
      return db.prepare(SELECT_TX).get(id) as Transaction
    }
  )

  ipcMain.handle('transactions:delete', (_event, id: number): void => {
    if (!Number.isInteger(id)) throw new Error('记录编号无效')
    const info = getDb().prepare('DELETE FROM transactions WHERE id = ?').run(id)
    if (info.changes === 0) throw new Error('记录不存在')
  })

  ipcMain.handle(
    'transactions:list',
    (_event, filters?: TransactionFilters): TransactionWithCategory[] => {
      const clauses: string[] = []
      const params: unknown[] = []
      if (filters?.month) {
        clauses.push('t.date LIKE ?')
        params.push(`${filters.month}%`)
      }
      if (filters?.categoryId) {
        clauses.push('p.id = ?')
        params.push(filters.categoryId)
      }
      if (filters?.keyword) {
        clauses.push('t.note LIKE ?')
        params.push(`%${filters.keyword}%`)
      }
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
      return getDb()
        .prepare(`${SELECT_TX_WITH_CATEGORY} ${where} ORDER BY t.date DESC, t.id DESC`)
        .all(...params) as TransactionWithCategory[]
    }
  )
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

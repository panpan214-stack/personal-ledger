import { ipcMain } from 'electron'
import { getDb } from './db'
import type {
  Category,
  CategoryStat,
  MonthStat,
  NewCategory,
  NewTransaction,
  StatsData,
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
    const cats = getDb()
      .prepare(
        `SELECT id, level, parent_id AS parentId, name, sort_order AS sortOrder, is_builtin AS isBuiltin
         FROM categories ORDER BY sort_order, id`
      )
      .all() as Category[]
    const rows = getDb()
      .prepare('SELECT category_id AS cid, COUNT(*) AS cnt FROM transactions GROUP BY category_id')
      .all() as { cid: number; cnt: number }[]
    const counts = new Map(rows.map((r) => [r.cid, r.cnt]))
    // 一级分类的账目数 = 其下所有二级分类账目数之和
    const l1Counts = new Map<number, number>()
    for (const c of cats) {
      if (c.level === 2 && c.parentId !== null) {
        l1Counts.set(c.parentId, (l1Counts.get(c.parentId) ?? 0) + (counts.get(c.id) ?? 0))
      }
    }
    return cats.map((c) => ({
      ...c,
      usageCount: c.level === 1 ? (l1Counts.get(c.id) ?? 0) : (counts.get(c.id) ?? 0)
    }))
  })

  ipcMain.handle('categories:add', (_event, data: NewCategory): Category => {
    const name = validateCategoryName(data?.name)
    if (data.level !== 1 && data.level !== 2) throw new Error('分类层级无效')
    const db = getDb()
    let parentId: number | null = null
    if (data.level === 1) {
      if (data.parentId !== null) throw new Error('一级分类不需要父分类')
    } else {
      const parent = db
        .prepare('SELECT level FROM categories WHERE id = ?')
        .get(data.parentId) as { level: number } | undefined
      if (!parent || parent.level !== 1) throw new Error('父分类无效,请选择正确的一级分类')
      parentId = data.parentId
    }
    const maxSort = (
      db.prepare('SELECT MAX(sort_order) AS m FROM categories WHERE parent_id IS ?').get(parentId) as {
        m: number | null
      }
    ).m
    const info = db
      .prepare(
        'INSERT INTO categories (level, parent_id, name, sort_order, is_builtin) VALUES (?, ?, ?, ?, 0)'
      )
      .run(data.level, parentId, name, (maxSort ?? -1) + 1)
    const row = db
      .prepare(
        `SELECT id, level, parent_id AS parentId, name, sort_order AS sortOrder, is_builtin AS isBuiltin
         FROM categories WHERE id = ?`
      )
      .get(info.lastInsertRowid) as Category
    return { ...row, usageCount: 0 }
  })

  ipcMain.handle('categories:update', (_event, id: number, name: string): Category => {
    if (!Number.isInteger(id)) throw new Error('分类编号无效')
    const trimmed = validateCategoryName(name)
    const info = getDb().prepare('UPDATE categories SET name = ? WHERE id = ?').run(trimmed, id)
    if (info.changes === 0) throw new Error('分类不存在')
    const row = getDb()
      .prepare(
        `SELECT id, level, parent_id AS parentId, name, sort_order AS sortOrder, is_builtin AS isBuiltin
         FROM categories WHERE id = ?`
      )
      .get(id) as Category
    return { ...row, usageCount: 0 }
  })

  ipcMain.handle('categories:delete', (_event, id: number): void => {
    if (!Number.isInteger(id)) throw new Error('分类编号无效')
    const db = getDb()
    const cat = db.prepare('SELECT level FROM categories WHERE id = ?').get(id) as
      | { level: number }
      | undefined
    if (!cat) throw new Error('分类不存在')
    if (cat.level === 1) {
      const childCnt = (
        db.prepare('SELECT COUNT(*) AS c FROM categories WHERE parent_id = ?').get(id) as { c: number }
      ).c
      if (childCnt > 0) throw new Error('该分类下还有二级分类,请先删除其下的二级分类')
    } else {
      const txCnt = (
        db.prepare('SELECT COUNT(*) AS c FROM transactions WHERE category_id = ?').get(id) as {
          c: number
        }
      ).c
      if (txCnt > 0) throw new Error(`该分类下还有 ${txCnt} 笔账目,无法删除。请先删除或修改这些账目`)
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(id)
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

  ipcMain.handle('stats:get', (): StatsData => {
    const db = getDb()
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthRow = db
      .prepare(
        'SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS cnt FROM transactions WHERE date LIKE ?'
      )
      .get(`${month}%`) as { total: number; cnt: number }
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const byCategory = db
      .prepare(
        `SELECT p.id AS categoryId, p.name, COALESCE(SUM(t.amount_cents), 0) AS totalCents
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         JOIN categories p ON p.id = c.parent_id
         WHERE t.date LIKE ?
         GROUP BY p.id
         ORDER BY totalCents DESC, p.sort_order`
      )
      .all(`${month}%`) as CategoryStat[]
    // 近 6 个月(含本月),无数据的月份补 0
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    const rows = db
      .prepare(
        `SELECT substr(date, 1, 7) AS month, SUM(amount_cents) AS totalCents
         FROM transactions WHERE date >= ? GROUP BY month`
      )
      .all(`${months[0]}-01`) as MonthStat[]
    const rowMap = new Map(rows.map((r) => [r.month, r.totalCents]))
    const trend = months.map((m) => ({ month: m, totalCents: rowMap.get(m) ?? 0 }))
    return {
      month,
      totalCents: monthRow.total,
      count: monthRow.cnt,
      dailyAvgCents: daysInMonth > 0 ? Math.round(monthRow.total / daysInMonth) : 0,
      byCategory,
      trend
    }
  })
}

function validateCategoryName(name: unknown): string {
  if (typeof name !== 'string') throw new Error('分类名称无效')
  const trimmed = name.trim()
  if (!trimmed) throw new Error('分类名称不能为空')
  if (trimmed.length > 20) throw new Error('分类名称过长(最多 20 个字)')
  return trimmed
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

import Database from 'better-sqlite3'
import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

let db: Database.Database | null = null

// 预置分类(一级大类 + 二级小类),与 CLAUDE.md「三、分类体系设计」一致
const PRESET_CATEGORIES: { name: string; children: string[] }[] = [
  { name: '餐饮食品', children: ['早餐', '午餐', '晚餐', '夜宵', '零食饮料', '咖啡奶茶', '外卖', '买菜做饭', '聚餐应酬'] },
  { name: '交通出行', children: ['公交地铁', '打车网约车', '火车高铁', '飞机', '加油充电', '停车费', '共享单车'] },
  { name: '购物消费', children: ['服饰鞋包', '数码家电', '日用品', '美妆护肤', '母婴用品', '宠物用品', '其他购物'] },
  { name: '居住生活', children: ['房租', '房贷', '水电燃气', '物业费', '宽带电视', '家居用品', '家政维修'] },
  { name: '娱乐休闲', children: ['电影演出', '游戏充值', '旅游度假', '运动健身', 'KTV酒吧', '会员订阅'] },
  { name: '医疗健康', children: ['门诊就医', '药品', '体检', '牙科眼科', '保健营养'] },
  { name: '教育学习', children: ['学费培训', '书籍文具', '考试报名', '在线课程'] },
  { name: '人情往来', children: ['红包礼金', '请客送礼', '孝敬长辈', '慈善捐款'] },
  { name: '生活服务', children: ['话费流量', '快递邮寄', '理发洗护', '金融服务费'] },
  { name: '其他支出', children: ['临时支出', '无法归类'] }
]

// 数据文件位于「文档\个人记账\ledger.db」,用户可见、拷贝即备份(2026-09-17 用户选定)
export function initDatabase(): Database.Database {
  if (db) return db
  const dir = path.join(app.getPath('documents'), '个人记账')
  fs.mkdirSync(dir, { recursive: true })
  db = new Database(path.join(dir, 'ledger.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level INTEGER NOT NULL,
      parent_id INTEGER,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_builtin INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount_cents INTEGER NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  `)
  seedPresetCategories(db)
  return db
}

export function getDb(): Database.Database {
  if (!db) throw new Error('数据库尚未初始化')
  return db
}

// 首次运行时写入预置分类。用 user_version 作标记:之后即使用户删光所有分类,重启也不会重新写入
function seedPresetCategories(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true }) as number
  if (version >= 1) return
  const insert = db.prepare(
    'INSERT INTO categories (level, parent_id, name, sort_order, is_builtin) VALUES (?, ?, ?, ?, 1)'
  )
  db.transaction(() => {
    PRESET_CATEGORIES.forEach((parent, pi) => {
      const parentId = insert.run(1, null, parent.name, pi).lastInsertRowid as number
      parent.children.forEach((child, ci) => {
        insert.run(2, parentId, child, ci)
      })
    })
  })()
  db.pragma('user_version = 1')
}

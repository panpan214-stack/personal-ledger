import { useEffect, useMemo, useState } from 'react'
import { Button, Card, DatePicker, Input, Modal, Popconfirm, Select, Space, Table, Typography, message } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import TransactionForm from '../components/TransactionForm'
import type { Category, NewTransaction, TransactionWithCategory } from '../../../shared/types'

interface Props {
  refreshKey: number
}

function ListView({ refreshKey }: Props): JSX.Element {
  const [items, setItems] = useState<TransactionWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [month, setMonth] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [keyword, setKeyword] = useState<string | undefined>(undefined)
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<TransactionWithCategory | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api
      .listCategories()
      .then(setCategories)
      .catch((err) => message.error(`分类加载失败:${String(err)}`))
  }, [])

  useEffect(() => {
    window.api
      .listTransactions({ month: month ?? undefined, categoryId, keyword })
      .then(setItems)
      .catch((err) => message.error(`账目加载失败:${String(err)}`))
  }, [refreshKey, reloadKey, month, categoryId, keyword])

  const level1Options = useMemo(
    () => categories.filter((c) => c.level === 1).map((c) => ({ value: c.id, label: c.name })),
    [categories]
  )

  const totalCents = useMemo(() => items.reduce((sum, t) => sum + t.amountCents, 0), [items])

  const handleUpdate = async (data: NewTransaction): Promise<void> => {
    if (!editing) return
    setSaving(true)
    try {
      await window.api.updateTransaction(editing.id, data)
      message.success('已更新')
      setEditing(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      message.error(`更新失败:${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number): Promise<void> => {
    try {
      await window.api.deleteTransaction(id)
      message.success('已删除')
      setReloadKey((k) => k + 1)
    } catch (err) {
      message.error(`删除失败:${String(err)}`)
    }
  }

  const columns: TableColumnsType<TransactionWithCategory> = [
    { title: '日期', dataIndex: 'date', width: 120 },
    {
      title: '分类',
      key: 'category',
      render: (_v, record) => `${record.parentName} / ${record.subName}`
    },
    { title: '备注', dataIndex: 'note', ellipsis: true },
    {
      title: '金额(元)',
      dataIndex: 'amountCents',
      width: 120,
      align: 'right',
      render: (v: number) => `¥ ${(v / 100).toFixed(2)}`
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      render: (_v, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => setEditing(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除这笔记录?"
            description="删除后无法恢复"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <Card
      title="账目列表"
      extra={
        <Typography.Text strong>
          共 {items.length} 笔,合计 ¥ {(totalCents / 100).toFixed(2)}
        </Typography.Text>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker
          picker="month"
          value={month ? dayjs(month) : null}
          onChange={(d) => setMonth(d ? d.format('YYYY-MM') : null)}
          placeholder="全部月份"
          allowClear
        />
        <Select
          style={{ width: 150 }}
          value={categoryId}
          onChange={setCategoryId}
          options={level1Options}
          placeholder="全部分类"
          allowClear
        />
        <Input
          style={{ width: 220 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value.trim() || undefined)}
          placeholder="搜索备注关键字"
          allowClear
        />
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="middle"
      />
      <Modal title="编辑记录" open={editing !== null} onCancel={() => setEditing(null)} footer={null}>
        {editing && (
          <TransactionForm
            key={editing.id}
            initial={{
              amountCents: editing.amountCents,
              categoryId: editing.categoryId,
              date: editing.date,
              note: editing.note
            }}
            submitting={saving}
            submitText="保存修改"
            onSubmit={handleUpdate}
          />
        )}
      </Modal>
    </Card>
  )
}

export default ListView

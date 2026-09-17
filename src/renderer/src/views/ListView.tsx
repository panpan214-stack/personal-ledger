import { useEffect, useMemo, useState } from 'react'
import { Card, Table, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import type { TransactionWithCategory } from '../../../shared/types'

interface Props {
  refreshKey: number
}

function ListView({ refreshKey }: Props): JSX.Element {
  const [items, setItems] = useState<TransactionWithCategory[]>([])

  useEffect(() => {
    window.api
      .listTransactions()
      .then(setItems)
      .catch((err) => console.error('账目加载失败', err))
  }, [refreshKey])

  const totalCents = useMemo(() => items.reduce((sum, t) => sum + t.amountCents, 0), [items])

  const columns: TableColumnsType<TransactionWithCategory> = [
    { title: '日期', dataIndex: 'date', width: 130 },
    {
      title: '分类',
      key: 'category',
      render: (_v, record) => `${record.parentName} / ${record.subName}`
    },
    { title: '备注', dataIndex: 'note', ellipsis: true },
    {
      title: '金额(元)',
      dataIndex: 'amountCents',
      width: 130,
      align: 'right',
      render: (v: number) => `¥ ${(v / 100).toFixed(2)}`
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
      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="middle"
      />
    </Card>
  )
}

export default ListView

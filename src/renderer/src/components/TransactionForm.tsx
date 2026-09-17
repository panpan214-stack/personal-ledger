import { useEffect, useMemo, useState } from 'react'
import { Button, Cascader, DatePicker, Form, Input, InputNumber, message } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import type { Category, NewTransaction } from '../../../shared/types'

interface Props {
  // 编辑场景下传入初始值;记账场景下留空
  initial?: { amountCents: number; categoryId: number; date: string; note: string }
  submitting?: boolean
  submitText?: string
  onSubmit: (data: NewTransaction) => Promise<void>
}

// 记账/编辑共用的表单:金额、两级分类、日期、备注
function TransactionForm({ initial, submitting, submitText = '保存', onSubmit }: Props): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([])
  const [amount, setAmount] = useState<number | null>(initial ? initial.amountCents / 100 : null)
  const [categoryPath, setCategoryPath] = useState<[number, number] | undefined>(undefined)
  const [date, setDate] = useState<Dayjs>(() => (initial ? dayjs(initial.date) : dayjs()))
  const [note, setNote] = useState(initial?.note ?? '')

  useEffect(() => {
    window.api
      .listCategories()
      .then((cats) => {
        setCategories(cats)
        // 编辑场景:根据二级分类 id 反推两级路径
        if (initial) {
          const child = cats.find((c) => c.id === initial.categoryId)
          if (child && child.parentId !== null) {
            setCategoryPath([child.parentId, child.id])
          }
        }
      })
      .catch((err) => message.error(`分类加载失败:${String(err)}`))
    // 仅在挂载时加载一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const options = useMemo(() => {
    return categories
      .filter((c) => c.level === 1)
      .map((p) => ({
        value: p.id,
        label: p.name,
        children: categories
          .filter((c) => c.level === 2 && c.parentId === p.id)
          .map((ch) => ({ value: ch.id, label: ch.name }))
      }))
  }, [categories])

  const handleSubmit = async (): Promise<void> => {
    if (amount === null || amount <= 0) {
      message.warning('请输入金额')
      return
    }
    if (!categoryPath) {
      message.warning('请选择分类')
      return
    }
    await onSubmit({
      amountCents: Math.round(amount * 100),
      categoryId: categoryPath[1],
      date: date.format('YYYY-MM-DD'),
      note: note.trim()
    })
  }

  return (
    <Form layout="vertical">
      <Form.Item label="金额(元)" required>
        <InputNumber
          style={{ width: '100%' }}
          min={0.01}
          precision={2}
          prefix="¥"
          placeholder="例如 23.50"
          value={amount}
          onChange={(v) => setAmount(v)}
        />
      </Form.Item>
      <Form.Item label="分类" required>
        <Cascader
          style={{ width: '100%' }}
          options={options}
          value={categoryPath}
          onChange={(v) => setCategoryPath(v as [number, number] | undefined)}
          placeholder="先选大类,再选小类"
        />
      </Form.Item>
      <Form.Item label="日期" required>
        <DatePicker
          style={{ width: '100%' }}
          value={date}
          onChange={(d) => setDate(d ?? dayjs())}
          allowClear={false}
        />
      </Form.Item>
      <Form.Item label="备注(选填)">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如:和同事聚餐"
          maxLength={100}
        />
      </Form.Item>
      <Button type="primary" block onClick={handleSubmit} loading={submitting}>
        {submitText}
      </Button>
    </Form>
  )
}

export default TransactionForm

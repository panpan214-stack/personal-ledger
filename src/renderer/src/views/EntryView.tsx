import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Cascader, DatePicker, Form, Input, InputNumber, message } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import type { Category } from '../../../shared/types'

interface Props {
  onSaved: () => void
}

function EntryView({ onSaved }: Props): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([])
  const [amount, setAmount] = useState<number | null>(null)
  const [categoryPath, setCategoryPath] = useState<[number, number] | undefined>(undefined)
  const [date, setDate] = useState<Dayjs>(() => dayjs())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api
      .listCategories()
      .then(setCategories)
      .catch((err) => message.error(`分类加载失败:${String(err)}`))
  }, [])

  // 组装成 Cascader 需要的两级选项结构
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

  const handleSave = async (): Promise<void> => {
    if (amount === null || amount <= 0) {
      message.warning('请输入金额')
      return
    }
    if (!categoryPath) {
      message.warning('请选择分类')
      return
    }
    setSaving(true)
    try {
      await window.api.addTransaction({
        amountCents: Math.round(amount * 100),
        categoryId: categoryPath[1],
        date: date.format('YYYY-MM-DD'),
        note: note.trim()
      })
      message.success('已保存')
      setAmount(null)
      setNote('')
      onSaved()
    } catch (err) {
      message.error(`保存失败:${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="记一笔" style={{ maxWidth: 480 }}>
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
        <Button type="primary" block onClick={handleSave} loading={saving}>
          保存
        </Button>
      </Form>
    </Card>
  )
}

export default EntryView

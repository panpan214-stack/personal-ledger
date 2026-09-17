import { useState } from 'react'
import { Card, message } from 'antd'
import TransactionForm from '../components/TransactionForm'
import type { NewTransaction } from '../../../shared/types'

interface Props {
  onSaved: () => void
}

function EntryView({ onSaved }: Props): JSX.Element {
  const [saving, setSaving] = useState(false)
  // 保存成功后 +1,通过换 key 让表单重置为空白
  const [formKey, setFormKey] = useState(0)

  const handleSubmit = async (data: NewTransaction): Promise<void> => {
    setSaving(true)
    try {
      await window.api.addTransaction(data)
      message.success('已保存')
      setFormKey((k) => k + 1)
      onSaved()
    } catch (err) {
      message.error(`保存失败:${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="记一笔" style={{ maxWidth: 480 }}>
      <TransactionForm key={formKey} submitting={saving} onSubmit={handleSubmit} />
    </Card>
  )
}

export default EntryView

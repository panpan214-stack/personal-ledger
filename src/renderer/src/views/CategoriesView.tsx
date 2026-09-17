import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd'
import type { TableColumnsType } from 'antd'
import type { Category } from '../../../shared/types'
import { errMsg } from '../utils/errMsg'

type DialogState =
  | { mode: 'add-l1' }
  | { mode: 'add-l2'; parent: Category }
  | { mode: 'rename'; category: Category }
  | null

function CategoriesView(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    window.api
      .listCategories()
      .then(setCategories)
      .catch((err) => message.error(errMsg(err)))
  }, [reloadKey])

  // 组装成一、二级的树形结构
  const treeData = useMemo(() => {
    return categories
      .filter((c) => c.level === 1)
      .map((p) => ({
        ...p,
        children: categories.filter((c) => c.level === 2 && c.parentId === p.id)
      }))
  }, [categories])

  const openDialog = (state: DialogState, initialName = ''): void => {
    setDialog(state)
    setName(initialName)
  }

  const handleOk = async (): Promise<void> => {
    const trimmed = name.trim()
    if (!trimmed) {
      message.warning('请输入分类名称')
      return
    }
    if (!dialog) return
    setBusy(true)
    try {
      if (dialog.mode === 'add-l1') {
        await window.api.addCategory({ name: trimmed, level: 1, parentId: null })
      } else if (dialog.mode === 'add-l2') {
        await window.api.addCategory({ name: trimmed, level: 2, parentId: dialog.parent.id })
      } else {
        await window.api.updateCategory(dialog.category.id, trimmed)
      }
      message.success('已保存')
      setDialog(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      message.error(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (category: Category): Promise<void> => {
    try {
      await window.api.deleteCategory(category.id)
      message.success('已删除')
      setReloadKey((k) => k + 1)
    } catch (err) {
      message.error(errMsg(err))
    }
  }

  const columns: TableColumnsType<Category> = [
    { title: '分类名称', dataIndex: 'name', key: 'name' },
    {
      title: '账目数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 100,
      render: (v: number) =>
        v > 0 ? <Tag color="blue">{v} 笔</Tag> : <span style={{ color: '#bbb' }}>0 笔</span>
    },
    {
      title: '类型',
      key: 'level',
      width: 90,
      render: (_v, r) => (r.level === 1 ? '一级分类' : '二级分类')
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_v, r) => (
        <Space size={0}>
          {r.level === 1 && (
            <Button type="link" size="small" onClick={() => openDialog({ mode: 'add-l2', parent: r })}>
              添加二级分类
            </Button>
          )}
          <Button type="link" size="small" onClick={() => openDialog({ mode: 'rename', category: r }, r.name)}>
            改名
          </Button>
          <Popconfirm
            title={`确认删除分类「${r.name}」?`}
            description="删除后无法恢复"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => handleDelete(r)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const dialogTitle =
    dialog?.mode === 'add-l1'
      ? '添加一级分类'
      : dialog?.mode === 'add-l2'
        ? `添加二级分类(在「${dialog.parent.name}」下)`
        : '重命名分类'

  return (
    <Card
      title="分类管理"
      extra={
        <Button type="primary" onClick={() => openDialog({ mode: 'add-l1' })}>
          添加一级分类
        </Button>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={treeData}
        pagination={false}
        size="middle"
        expandable={{ defaultExpandAllRows: true }}
      />
      <Modal
        title={dialogTitle}
        open={dialog !== null}
        onOk={handleOk}
        onCancel={() => setDialog(null)}
        confirmLoading={busy}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="分类名称(最多 20 个字)"
          maxLength={20}
          onPressEnter={handleOk}
          autoFocus
        />
      </Modal>
    </Card>
  )
}

export default CategoriesView

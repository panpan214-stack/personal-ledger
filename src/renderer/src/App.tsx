import { useCallback, useState } from 'react'
import { ConfigProvider, Layout, Menu } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import EntryView from './views/EntryView'
import ListView from './views/ListView'
import StatsView from './views/StatsView'
import CategoriesView from './views/CategoriesView'

type ViewKey = 'entry' | 'list' | 'stats' | 'categories'

const MENU_ITEMS = [
  { key: 'entry', label: '📝 记一笔' },
  { key: 'list', label: '📋 账目' },
  { key: 'stats', label: '📊 统计' },
  { key: 'categories', label: '🗂️ 分类管理' }
]

function App(): JSX.Element {
  const [view, setView] = useState<ViewKey>('entry')
  // 记账保存成功后 +1,触发账目列表重新加载
  const [refreshKey, setRefreshKey] = useState(0)
  const handleSaved = useCallback(() => setRefreshKey((k) => k + 1), [])

  return (
    <ConfigProvider locale={zhCN}>
      <Layout style={{ minHeight: '100vh' }}>
        <Layout.Sider width={168} theme="light">
          <div style={{ padding: '18px 16px 10px', fontSize: 18, fontWeight: 600 }}>📒 个人记账</div>
          <Menu
            mode="inline"
            selectedKeys={[view]}
            items={MENU_ITEMS}
            onClick={(e) => setView(e.key as ViewKey)}
            style={{ borderInlineEnd: 'none' }}
          />
        </Layout.Sider>
        <Layout.Content style={{ padding: 24, overflow: 'auto', background: '#f5f5f5' }}>
          {view === 'entry' && <EntryView onSaved={handleSaved} />}
          {view === 'list' && <ListView refreshKey={refreshKey} />}
          {view === 'stats' && <StatsView />}
          {view === 'categories' && <CategoriesView />}
        </Layout.Content>
      </Layout>
    </ConfigProvider>
  )
}

export default App

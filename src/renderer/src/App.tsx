import { ConfigProvider, Layout, Tag, Typography } from 'antd'
import zhCN from 'antd/locale/zh_CN'

function App(): JSX.Element {
  return (
    <ConfigProvider locale={zhCN}>
      <Layout style={{ minHeight: '100vh' }}>
        <Layout.Content
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ textAlign: 'center' }}>
            <Typography.Title>个人记账</Typography.Title>
            <Typography.Paragraph type="secondary">
              Electron + React + TypeScript + Ant Design + ECharts
            </Typography.Paragraph>
            <Tag color="green">项目骨架搭建完成</Tag>
          </div>
        </Layout.Content>
      </Layout>
    </ConfigProvider>
  )
}

export default App

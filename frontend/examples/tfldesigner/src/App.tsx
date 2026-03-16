import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  DatabaseOutlined,
  TableOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import StudyList from './pages/StudyList'
import StudyDetail from './pages/StudyDetail'
import TableEditor from './pages/TableEditor'
import FigureEditor from './pages/FigureEditor'
import ListingEditor from './pages/ListingEditor'
import './index.css'

const { Header, Sider, Content } = Layout

function App() {
  return (
    <BrowserRouter>
      <Layout className="app-layout">
        <Header className="app-header">
          <TableOutlined style={{ color: '#fff', fontSize: 24 }} />
          <h1>TFL Designer</h1>
        </Header>
        <Layout>
          <Sider width={200} className="app-sider">
            <Menu
              mode="inline"
              defaultSelectedKeys={['studies']}
              style={{ height: '100%', borderRight: 0 }}
              items={[
                {
                  key: 'studies',
                  icon: <DatabaseOutlined />,
                  label: 'Studies',
                },
                {
                  key: 'tables',
                  icon: <TableOutlined />,
                  label: 'Tables',
                },
                {
                  key: 'figures',
                  icon: <BarChartOutlined />,
                  label: 'Figures',
                },
                {
                  key: 'listings',
                  icon: <UnorderedListOutlined />,
                  label: 'Listings',
                },
                {
                  key: 'settings',
                  icon: <SettingOutlined />,
                  label: 'Settings',
                },
              ]}
            />
          </Sider>
          <Content className="app-content">
            <Routes>
              <Route path="/" element={<Navigate to="/studies" replace />} />
              <Route path="/studies" element={<StudyList />} />
              <Route path="/studies/:id" element={<StudyDetail />} />
              <Route path="/tables/:id" element={<TableEditor />} />
              <Route path="/figures/:id" element={<FigureEditor />} />
              <Route path="/listings/:id" element={<ListingEditor />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </BrowserRouter>
  )
}

export default App
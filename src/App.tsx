import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ReportEditor from './pages/ReportEditor'
import ExportPage from './pages/ExportPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/report/edit" element={<ReportEditor />} />
        <Route path="/report/new" element={<ReportEditor />} />
        <Route path="/report/export" element={<ExportPage />} />
      </Routes>
    </BrowserRouter>
  )
}

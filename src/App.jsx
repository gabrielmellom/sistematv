import { Navigate, Route, Routes } from 'react-router-dom'
import { isAdminLoggedIn } from './api'
import { AdminPage } from './pages/AdminPage'
import { CampaignPage } from './pages/CampaignPage'
import { LoginPage } from './pages/LoginPage'
import { ParticipantPage } from './pages/ParticipantPage'
import { TvLivePage } from './pages/TvLivePage'

function AdminRoute({ children }) {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin/login" replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/campaign/:pollId"
        element={
          <AdminRoute>
            <CampaignPage />
          </AdminRoute>
        }
      />
      <Route path="/vote/:pollId" element={<ParticipantPage />} />
      <Route path="/tv/:pollId" element={<TvLivePage />} />
    </Routes>
  )
}

export default App

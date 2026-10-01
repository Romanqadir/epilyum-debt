import { Navigate, Route, Routes } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import UserExpenses from './pages/UserExpenses.jsx'
import AdminClients from './pages/AdminClients.jsx'
import AdminDevices from './pages/AdminDevices.jsx'
import AdminMonthly from './pages/AdminMonthly.jsx'
import AdminExpenses from './pages/AdminExpenses.jsx'

function Protected({ children, role }) {
  const { session, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '100dvh' }}>
        <CircularProgress size={28} />
      </Box>
    )
  }
  if (!session) return <Navigate to="/login" replace />

  // Each role has its own workspace: the manager oversees, the rep records.
  if (role === 'admin' && !isAdmin) return <Navigate to="/dashboard" replace />
  if (role === 'user' && isAdmin) return <Navigate to="/admin/clients" replace />

  return <Layout>{children}</Layout>
}

function Home() {
  const { session, loading, isAdmin } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={isAdmin ? '/admin/clients' : '/dashboard'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<Protected role="user"><Dashboard /></Protected>} />
      <Route path="/dashboard/expenses" element={<Protected role="user"><UserExpenses /></Protected>} />

      <Route path="/admin" element={<Navigate to="/admin/clients" replace />} />
      <Route path="/admin/clients" element={<Protected role="admin"><AdminClients /></Protected>} />
      <Route path="/admin/devices" element={<Protected role="admin"><AdminDevices /></Protected>} />
      <Route path="/admin/monthly" element={<Protected role="admin"><AdminMonthly /></Protected>} />
      <Route path="/admin/expenses" element={<Protected role="admin"><AdminExpenses /></Protected>} />

      <Route path="*" element={<Home />} />
    </Routes>
  )
}

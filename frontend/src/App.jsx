import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import CategoryMenu from './pages/CategoryMenu'
import { StorefrontProvider } from './features/storefront/StorefrontContext'

export default function App() {
  return (
    <StorefrontProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        <Route path="/cardapio" element={<Navigate to="/cardapio/hamburgueres" replace />} />
        <Route path="/cardapio/:categoria" element={<CategoryMenu />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StorefrontProvider>
  )
}

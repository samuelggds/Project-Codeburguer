import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import CategoryMenu from './pages/CategoryMenu'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderComplete from './pages/OrderComplete'
import AdminGuard from './features/admin/components/AdminGuard'
import AdminLayout from './features/admin/components/AdminLayout'
import AdminOrders from './features/admin/pages/AdminOrders'
import AdminProducts from './features/admin/pages/AdminProducts'
import AdminProductForm from './features/admin/pages/AdminProductForm'
import AdminCategories from './features/admin/pages/AdminCategories'
import AdminCategoryForm from './features/admin/pages/AdminCategoryForm'
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
        <Route path="/carrinho" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pedido-concluido" element={<OrderComplete />} />
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="pedidos" replace />} />
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="produtos" element={<AdminProducts />} />
            <Route path="produtos/novo" element={<AdminProductForm />} />
            <Route path="produtos/:id/editar" element={<AdminProductForm />} />
            <Route path="categorias" element={<AdminCategories />} />
            <Route path="categorias/novo" element={<AdminCategoryForm />} />
            <Route path="categorias/:id/editar" element={<AdminCategoryForm />} />
            <Route path="*" element={<Navigate to="/admin/pedidos" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StorefrontProvider>
  )
}

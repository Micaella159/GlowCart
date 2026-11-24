import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { NetworkStatusProvider } from './context/NetworkStatusContext.jsx'
import { useAuth } from './hooks/useAuth.js'
import './App.css'

const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const ProductsPage = lazy(() => import('./pages/ProductsPage.jsx'))
const DetailPage = lazy(() => import('./pages/DetailPage.jsx'))
const CartPage = lazy(() => import('./pages/CartPage.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'))
const BeautyAIPage = lazy(() => import('./pages/BeautyAIPage.jsx'))
const UnavailablePage = lazy(() => import('./pages/UnavailablePage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))

function PageFallback() {
  return <p className="state-message" role="status">Loading GlowCart...</p>
}

function ProtectedRoute({ role }) {
  const { isAuthenticated, isReady, user } = useAuth()
  const location = useLocation()
  if (!isReady) return <PageFallback />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (role && user?.role !== role) {
    return <section className="error-message" role="alert">You do not have permission to access this page.</section>
  }
  return <Outlet />
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:id" element={<DetailPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<UnavailablePage kind="checkout" />} />
            <Route path="payment/success" element={<UnavailablePage kind="success" />} />
            <Route path="payment/cancelled" element={<UnavailablePage kind="cancelled" />} />
            <Route element={<ProtectedRoute />}>
              <Route path="orders" element={<UnavailablePage kind="orders" />} />
              <Route path="orders/:id" element={<UnavailablePage kind="orders" />} />
            </Route>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="ai-assistant" element={<BeautyAIPage />} />
            <Route element={<ProtectedRoute role="admin" />}>
              <Route path="admin/*" element={<UnavailablePage kind="admin" />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function App() {
  return (
    <NetworkStatusProvider>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </NetworkStatusProvider>
  )
}

export default App

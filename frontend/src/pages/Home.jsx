import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import HomePage from '../features/home/HomePage'
import './Home.css'

export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  return <HomePage user={user} onLogout={logout} onLogin={() => navigate('/login')} onOpenMenu={(category) => navigate(`/cardapio/${category.slug}`)} />
}

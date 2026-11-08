import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

function storedUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem('devburger_user'))
    return sessionStorage.getItem('devburger_token') && user?.id ? user : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser)

  function logout() {
    sessionStorage.removeItem('devburger_token')
    sessionStorage.removeItem('devburger_user')
    setUser(null)
  }

  useEffect(() => {
    const onUnauthorized = () => logout()
    window.addEventListener('devburger:unauthorized', onUnauthorized)
    return () => window.removeEventListener('devburger:unauthorized', onUnauthorized)
  }, [])

  async function login(credentials) {
    const result = await authService.login(credentials)
    const nextUser = { id: result.id, name: result.name, email: result.email, admin: result.admin === true }
    sessionStorage.setItem('devburger_token', result.token)
    sessionStorage.setItem('devburger_user', JSON.stringify(nextUser))
    setUser(nextUser)
    return nextUser
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}

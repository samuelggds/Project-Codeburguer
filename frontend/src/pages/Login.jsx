import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AuthLayout, { AuthFooter } from '../components/AuthLayout'
import { loginSchema } from '../schemas/authSchemas'
import { getApiError } from '../services/authService'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [apiError, setApiError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema) })
  if (user) return <Navigate to={user.admin === true ? '/admin/pedidos' : '/'} replace />

  const onSubmit = async (values) => {
    setApiError('')
    try {
      const loggedUser = await login(values)
      navigate(loggedUser.admin === true ? '/admin/pedidos' : '/', { replace: true })
    } catch (error) {
      setApiError(getApiError(error))
    }
  }

  return (
    <AuthLayout>
      <h1 className="login-heading">Olá, seja bem vindo ao <strong>Dev Burguer!</strong></h1>
      <p className="login-subheading">Acesse com seu <strong>Login</strong> e <strong>senha.</strong></p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="auth-form">
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
        {errors.email && <span className="field-error">{errors.email.message}</span>}
        <label htmlFor="login-password">Senha</label>
        <input id="login-password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
        {errors.password && <span className="field-error">{errors.password.message}</span>}
        {apiError && <p role="alert" className="api-error">{apiError}</p>}
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'ENTRANDO...' : 'ENTRAR'}</button>
      </form>
      <AuthFooter />
    </AuthLayout>
  )
}

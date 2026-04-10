// src/pages/auth/LoginPage.tsx

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useLogin } from '@/hooks/useQueries'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const [form, setForm] = useState({ email: '', password: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login.mutateAsync(form)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4 shadow-lg">
            <Ticket className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PromoManager</h1>
          <p className="mt-1 text-gray-500 text-sm">Gestión de eventos y promociones</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="tu@email.com"
              required
            />
            <Input
              label="Contraseña"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
            />
            <Button
              type="submit"
              className="w-full justify-center"
              loading={login.isPending}
            >
              Entrar
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              Registrarse
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

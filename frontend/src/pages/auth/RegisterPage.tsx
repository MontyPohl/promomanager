// src/pages/auth/RegisterPage.tsx

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useRegister } from '@/hooks/useQueries'

export default function RegisterPage() {
  const navigate = useNavigate()
  const register = useRegister()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.full_name.length < 2) e.full_name = 'Mínimo 2 caracteres'
    if (!form.email.includes('@')) e.email = 'Email inválido'
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (!/\d/.test(form.password)) e.password = 'Debe contener al menos un número'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await register.mutateAsync(form)
    navigate('/login')
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
    error: errors[key],
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4 shadow-lg">
            <Ticket className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PromoManager</h1>
          <p className="mt-1 text-gray-500 text-sm">Creá tu cuenta gratis</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Crear cuenta</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nombre completo" placeholder="Ana García" {...field('full_name')} />
            <Input label="Email" type="email" placeholder="tu@email.com" {...field('email')} />
            <Input
              label="Contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              helperText="Debe contener letras y al menos un número"
              {...field('password')}
            />
            <Button
              type="submit"
              className="w-full justify-center"
              loading={register.isPending}
            >
              Crear cuenta
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

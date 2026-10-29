'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Loader from '@/components/ui/loader'
import { loginSchema, formatZodError, getFieldErrors } from '@/lib/validations'
import logger from '@/lib/logger'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { login, user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      const validationResult = loginSchema.safeParse({ email, password })

      if (!validationResult.success) {
        const fieldErrors = getFieldErrors(validationResult.error)
        setErrors(fieldErrors)
        toast.error(formatZodError(validationResult.error))
        setLoading(false)
        return
      }

      const { email: validEmail, password: validPassword } = validationResult.data
      const result = await login(validEmail, validPassword)

      if (!result.success) {
        toast.error(result.message || 'Login failed')
        setLoading(false)
      }
      // on success auth-context redirects to /dashboard
    } catch (error) {
      logger.error('Login error:', error)
      toast.error('An error occurred during login')
      setLoading(false)
    }
  }

  if (authLoading || loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader message={authLoading ? 'Preparing…' : loading ? 'Signing you in…' : 'Redirecting…'} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="mb-8 text-center">
          <img
            src="https://pub-89761921e62746dda1cd99206b609c04.r2.dev/ruyaa/brand/logo-full-color.png"
            alt="Ruyaa Essentials"
            className="mx-auto mb-4 w-40 rounded-2xl object-cover"
          />
          <p className="text-sm text-muted-foreground mt-1">Admin Panel</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-medium mb-5">Sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ruyaaessentials.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }))
                }}
                className={errors.email ? 'border-destructive' : ''}
                autoComplete="email"
                required
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }))
                }}
                className={errors.password ? 'border-destructive' : ''}
                autoComplete="current-password"
                required
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#4A5C38] hover:bg-[#3d4d2f] text-white"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

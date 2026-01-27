'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '../../client'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import type { ThemeName } from '../../themes'
import { isAdminEmail, getAdminDashboardUrl, getRedirectUrl, type AppOrigin } from '@slo/snap-types'

export interface LoginFormProps {
  /**
   * Theme name for styling
   */
  theme?: ThemeName
  /**
   * Redirect path after successful login (default: '/dashboard')
   * Note: Admin users will always redirect to admin dashboard
   */
  redirectTo?: string
  /**
   * Custom title text
   */
  title?: string
  /**
   * Custom description text
   */
  description?: string
  /**
   * Show register link (default: true)
   */
  showRegisterLink?: boolean
  /**
   * Register link URL (default: '/register')
   */
  registerLink?: string
  /**
   * Custom className for the container
   */
  className?: string
  /**
   * Application origin for redirect logic
   */
  appOrigin?: AppOrigin
  /**
   * Admin dashboard domain (default: 'dev.snaplabs.global')
   */
  adminDomain?: string
}

export function LoginForm({
  theme = 'slg-corporate',
  redirectTo = '/dashboard',
  title = 'Welcome Back',
  description = 'Sign in to your account',
  showRegisterLink = true,
  registerLink = '/register',
  className,
  appOrigin,
  adminDomain = 'dev.snaplabs.global',
}: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createBrowserClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (data.user) {
        // Smart redirect based on user role
        const userEmail = data.user.email
        
        if (isAdminEmail(userEmail)) {
          // Admin: redirect to admin dashboard
          const adminUrl = getAdminDashboardUrl(adminDomain)
          window.location.href = adminUrl
        } else {
          // Regular user: redirect based on app origin or default
          const finalRedirect = getRedirectUrl(userEmail, appOrigin, redirectTo)
          
          // If redirect is external URL, use window.location
          if (finalRedirect.startsWith('http')) {
            window.location.href = finalRedirect
          } else {
            router.push(finalRedirect)
            router.refresh()
          }
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 px-4 ${className || ''}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center text-primary">
            {title}
          </CardTitle>
          <CardDescription className="text-center">
            {description}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            {showRegisterLink && (
              <div className="text-sm text-center text-gray-600">
                Don't have an account?{' '}
                <Link href={registerLink} className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </div>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import { Button } from '../components/shared/Button'
import { Card } from '../components/shared/Card'
import { Spinner } from '../components/shared/Spinner'

export function LoginPage() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50">
        <Spinner />
      </div>
    )
  }

  if (session) {
    return <Navigate to={from} replace />
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4">
      <Card title="Sign in" className="w-full max-w-sm">
        <form onSubmit={submit} className="flex flex-col gap-3" data-testid="login-form">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
              data-testid="login-email"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600">Password</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
              data-testid="login-password"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={pending} data-testid="login-submit">
            {pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                type="button"
                className="font-medium text-sky-700 underline"
                onClick={() => setMode('signup')}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Have an account?{' '}
              <button
                type="button"
                className="font-medium text-sky-700 underline"
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </Card>
    </div>
  )
}

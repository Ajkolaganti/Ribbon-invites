import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useSession } from '../lib/session'
import { supabase } from '../lib/supabase'
import { isEmail, sendWelcome } from '../lib/mail'

function nextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/join') || value.startsWith('/i/')) {
    return '/new'
  }
  return value
}

export function AccountPage() {
  const session = useSession()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<'create' | 'sign-in'>(params.get('mode') === 'sign-in' ? 'sign-in' : 'create')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const destination = nextPath(params.get('next'))

  if (session === undefined) return <p className="muted">Checking your account…</p>
  if (session) return <Navigate to={destination} replace />

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault()
    if (!isEmail(email)) {
      setError('That email does not look complete.')
      return
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for the password.')
      return
    }
    if (mode === 'create' && !name.trim()) {
      setError('Add your name. It goes on the invite.')
      return
    }
    setPending(true)
    setError('')
    const result =
      mode === 'create'
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { name: name.trim() } },
          })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (result.error) {
      setPending(false)
      setError(result.error.message)
      return
    }
    if (mode === 'create' && result.data.user) {
      await sendWelcome(name.trim(), email.trim(), result.data.user.id)
    }
    setPending(false)
    if (!result.data.session) {
      setError('Check your email to confirm the account, then sign in.')
    }
  }

  return (
    <form className="panel stack account-card" onSubmit={submit}>
      <div>
        <p className="film-kicker">{mode === 'create' ? 'Host account' : 'Welcome back'}</p>
        <h1>{mode === 'create' ? 'Create an account' : 'Sign in'}</h1>
        <p className="muted">
          {mode === 'create'
            ? 'A host account is required. Free includes emailing the invite to 20 people.'
            : 'Sign in to see your invites and make another.'}
        </p>
      </div>
      {mode === 'create' && (
        <label className="field">
          <span>Your name</span>
          <input value={name} onChange={(change) => setName(change.target.value)} autoComplete="name" placeholder="Lena" />
        </label>
      )}
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(change) => setEmail(change.target.value)}
          autoComplete="email"
          placeholder="lena@example.com"
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(change) => setPassword(change.target.value)}
          autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
          minLength={8}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn" type="submit" disabled={pending || session === undefined}>
        {pending ? 'Please wait…' : mode === 'create' ? 'Create account' : 'Sign in'}
      </button>
      <button
        className="btn secondary"
        type="button"
        onClick={() => {
          setMode(mode === 'create' ? 'sign-in' : 'create')
          setError('')
        }}
      >
        {mode === 'create' ? 'I already have an account' : 'Create an account'}
      </button>
    </form>
  )
}

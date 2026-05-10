'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function checkSession() {
      try {
        await adminApi.me()

        if (!isMounted) return

        router.replace('/dashboard/')
      } catch {
        if (!isMounted) return

        setChecking(false)
      }
    }

    checkSession()

    return () => {
      isMounted = false
    }
  }, [router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username.trim() || !password.trim()) {
      setError('Informe usuário e senha.')
      return
    }

    try {
      setLoading(true)
      setError('')

      await adminApi.login(username.trim(), password)

      router.replace('/dashboard/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <main className="page-center">
        <div className="loading-card">
          <div className="brand-mark">O</div>
          <p>Verificando sessão...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="brand-row">
          <div className="brand-mark">O</div>
          <span>ORDR Admin</span>
        </div>

        <div>
          <p className="eyebrow">Painel da plataforma</p>
          <h1>Gerencie empresas, licenças e acessos.</h1>
          <p className="hero-text">
            Área administrativa separada do PDV principal, feita para controlar
            clientes, planos e liberação de uso do ORDR.
          </p>
        </div>
      </section>

      <section className="login-card-wrap">
        <form className="card login-card" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Acesso restrito</p>
            <h2>Entrar</h2>
            <p className="muted">Use seu usuário administrativo da plataforma.</p>
          </div>

          <label className="field">
            <span>Usuário</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="joao"
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              type="password"
              placeholder="••••••••"
            />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button className="primary-button" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar no admin'}
          </button>
        </form>
      </section>
    </main>
  )
}

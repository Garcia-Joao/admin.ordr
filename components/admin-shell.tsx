'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/api'

export function AdminLoading() {
  return (
    <main className="page-center">
      <div className="loading-card">
        <div className="brand-mark">O</div>
        <p>Carregando painel...</p>
      </div>
    </main>
  )
}

export function AdminShell({
  children,
  current,
}: {
  children: React.ReactNode
  current: 'dashboard' | 'empresas' | 'licencas'
}) {
  const router = useRouter()

  async function handleLogout() {
    try {
      await adminApi.logout()
    } finally {
      router.replace('/login/')
    }
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand-row">
          <div className="brand-mark">O</div>
          <span>ORDR Admin</span>
        </div>

        <nav>
          <Link className={current === 'dashboard' ? 'active' : ''} href="/dashboard/">
            Dashboard
          </Link>
          <Link className={current === 'empresas' ? 'active' : ''} href="/empresas/">
            Empresas
          </Link>
          <Link className={current === 'licencas' ? 'active' : ''} href="/licencas/">
            Licenças
          </Link>
        </nav>

        <button className="ghost-button sidebar-logout" onClick={handleLogout}>
          Sair
        </button>
      </aside>

      <section className="admin-content">{children}</section>
    </main>
  )
}

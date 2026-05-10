'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/api'
import { OrdrFullLogo, OrdrIcon } from '@/components/brand/ordr-brand'

type IconName = 'dashboard' | 'companies' | 'users' | 'licenses' | 'logout' | 'spark'

export function AdminIcon({ name }: { name: IconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (name === 'dashboard') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="8" rx="2" />
        <rect x="14" y="3" width="7" height="5" rx="2" />
        <rect x="14" y="12" width="7" height="9" rx="2" />
        <rect x="3" y="15" width="7" height="6" rx="2" />
      </svg>
    )
  }

  if (name === 'companies') {
    return (
      <svg {...common}>
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-3" />
        <path d="M9 9h1" />
        <path d="M9 13h1" />
        <path d="M9 17h1" />
        <path d="M16 14h1" />
        <path d="M16 17h1" />
      </svg>
    )
  }


  if (name === 'users') {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }

  if (name === 'licenses') {
    return (
      <svg {...common}>
        <path d="M8 3h8l3 4v17H5V7l3-4Z" />
        <path d="M8 3v4h11" />
        <path d="m8 14 2.5 2.5L16 11" />
      </svg>
    )
  }

  if (name === 'spark') {
    return (
      <svg {...common}>
        <path d="M12 2l1.6 6.1L20 10l-6.4 1.9L12 18l-1.6-6.1L4 10l6.4-1.9L12 2Z" />
        <path d="M19 16l.6 2.1L22 19l-2.4.9L19 22l-.6-2.1L16 19l2.4-.9L19 16Z" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

export function AdminLoading() {
  return (
    <main className="page-center">
      <div className="loading-card">
        <OrdrIcon size="lg" className="loading-logo" />
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
  current: 'dashboard' | 'empresas' | 'usuarios' | 'licencas'
}) {
  const router = useRouter()

  async function handleLogout() {
    try {
      await adminApi.logout()
    } finally {
      router.replace('/login/')
    }
  }

  const links = [
    { key: 'dashboard', href: '/dashboard/', label: 'Dashboard', description: 'Visão geral', icon: 'dashboard' },
    { key: 'empresas', href: '/empresas/', label: 'Empresas', description: 'Clientes e acessos', icon: 'companies' },
    { key: 'usuarios', href: '/usuarios/', label: 'Usuários', description: 'Acessos por empresa', icon: 'users' },
    { key: 'licencas', href: '/licencas/', label: 'Licenças', description: 'Planos comerciais', icon: 'licenses' },
  ] as const

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand-row sidebar-brand">
          <OrdrIcon size="sm" />
          <div className="brand-copy">
            <OrdrFullLogo />
            <span>Admin platform</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegação administrativa">
          {links.map((item) => (
            <Link
              key={item.key}
              className={current === item.key ? 'active' : ''}
              href={item.href}
            >
              <span className="nav-icon"><AdminIcon name={item.icon} /></span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="nav-icon"><AdminIcon name="spark" /></span>
          <p>Controle central das empresas usando ORDR.</p>
        </div>

        <button className="ghost-button sidebar-logout" onClick={handleLogout}>
          <AdminIcon name="logout" />
          Sair
        </button>
      </aside>

      <section className="admin-content">{children}</section>
    </main>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { adminApi, type Company, type LicensePlan } from '@/lib/api'
import { useAdminGuard } from '@/lib/auth'
import { AdminIcon, AdminLoading, AdminShell } from '@/components/admin-shell'

type StatusBucket = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CANCELLED'

const statusLabels: Record<StatusBucket, string> = {
  ACTIVE: 'Ativas',
  SUSPENDED: 'Suspensas',
  BLOCKED: 'Bloqueadas',
  CANCELLED: 'Canceladas',
}

export default function DashboardPage() {
  const { admin, loading } = useAdminGuard()
  const [companies, setCompanies] = useState<Company[]>([])
  const [plans, setPlans] = useState<LicensePlan[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!admin) return

    async function loadData() {
      try {
        setError('')

        const [companiesResult, plansResult] = await Promise.all([
          adminApi.listCompanies(),
          adminApi.listLicensePlans(),
        ])

        setCompanies(companiesResult.companies)
        setPlans(plansResult.plans)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard.')
      }
    }

    loadData()
  }, [admin])

  const realCompanies = useMemo(() => companies.filter((company) => !company.isTest), [companies])

  const stats = useMemo(() => {
    const activeCompanies = realCompanies.filter(
      (company) => company.platformAccessStatus === 'ACTIVE'
    ).length

    const blockedCompanies = realCompanies.filter(
      (company) => company.platformAccessStatus !== 'ACTIVE'
    ).length

    const lifetimeLicenses = realCompanies.filter((company) => {
      const license = company.platformLicenses?.[0]
      return Boolean(license?.plan?.isLifetime)
    }).length

    const companiesWithLicenses = realCompanies.filter(
      (company) => company.platformLicenses?.[0]
    ).length

    return {
      totalCompanies: realCompanies.length,
      activeCompanies,
      blockedCompanies,
      totalPlans: plans.length,
      activePlans: plans.filter((plan) => plan.active).length,
      lifetimeLicenses,
      companiesWithLicenses,
    }
  }, [realCompanies, plans])

  const statusRows = useMemo(() => {
    return (Object.keys(statusLabels) as StatusBucket[]).map((status) => {
      const total = realCompanies.filter((company) => company.platformAccessStatus === status).length
      const percentage = stats.totalCompanies ? Math.round((total / stats.totalCompanies) * 100) : 0

      return { status, label: statusLabels[status], total, percentage }
    })
  }, [realCompanies, stats.totalCompanies])

  const recentCompanies = useMemo(() => realCompanies.slice(0, 6), [realCompanies])

  if (loading) return <AdminLoading />

  return (
    <AdminShell current="dashboard">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1>Dashboard</h1>
          <p className="muted">
            Resumo administrativo da plataforma ORDR. Empresas de teste não entram nos indicadores.
          </p>
        </div>
        <div className="heading-actions">
          <Link className="ghost-button" href="/licencas/">
            <AdminIcon name="licenses" />
            Licenças
          </Link>
          <Link className="primary-button action-button" href="/empresas/">
            <AdminIcon name="companies" />
            Empresas
          </Link>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <section className="hero-metrics card">
        <div>
          <p className="eyebrow">Operação comercial</p>
          <h2>{stats.activeCompanies} empresas ativas</h2>
          <p className="muted">
            {stats.companiesWithLicenses} com licença atribuída · {stats.activePlans} planos ativos no catálogo
          </p>
        </div>
        <div className="hero-metrics-grid">
          <StatPill label="Empresas reais" value={stats.totalCompanies} />
          <StatPill label="Atenção" value={stats.blockedCompanies} />
          <StatPill label="Vitalícias" value={stats.lifetimeLicenses} />
        </div>
      </section>

      <section className="stats-grid dashboard-stats">
        <StatCard icon="companies" label="Empresas" value={stats.totalCompanies} description="Sem empresas de teste" />
        <StatCard icon="dashboard" label="Ativas" value={stats.activeCompanies} description="Liberadas para uso" />
        <StatCard icon="spark" label="Bloq./Susp." value={stats.blockedCompanies} description="Precisam revisão" />
        <StatCard icon="licenses" label="Licenças" value={stats.totalPlans} description="Tipos cadastrados" />
      </section>

      <section className="grid-two dashboard-grid align-start">
        <div className="card">
          <div className="section-title">
            <div>
              <p className="eyebrow compact">Clientes</p>
              <h2>Empresas recentes</h2>
            </div>
            <Link href="/empresas/">Ver empresas</Link>
          </div>

          <div className="list-stack">
            {recentCompanies.map((company) => (
              <div className="list-row rich-row" key={company.id}>
                <div className="row-leading">
                  <span className="mini-icon"><AdminIcon name="companies" /></span>
                  <div>
                    <strong>{company.name}</strong>
                    <p>{company.platformAccessStatus}</p>
                  </div>
                </div>

                <span className="badge">
                  {company.platformLicenses?.[0]?.plan?.name ?? 'Sem licença'}
                </span>
              </div>
            ))}

            {recentCompanies.length === 0 && (
              <p className="muted">Nenhuma empresa cadastrada.</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <div>
              <p className="eyebrow compact">Acesso</p>
              <h2>Status das empresas</h2>
            </div>
          </div>

          <div className="status-stack">
            {statusRows.map((row) => (
              <div className="status-row" key={row.status}>
                <div className="status-row-head">
                  <span>{row.label}</span>
                  <strong>{row.total}</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${row.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="section-title licenses-title">
            <div>
              <p className="eyebrow compact">Planos</p>
              <h2>Licenças</h2>
            </div>
            <Link href="/licencas/">Gerenciar</Link>
          </div>

          <div className="list-stack compact-list">
            {plans.slice(0, 4).map((plan) => (
              <div className="list-row license-row" key={plan.id}>
                <div>
                  <strong>{plan.name}</strong>
                  <p>{plan.isLifetime ? 'Vitalícia' : `${plan.durationMonths} meses`}</p>
                </div>

                <span className={plan.active ? 'badge success' : 'badge muted-badge'}>
                  {plan.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            ))}

            {plans.length === 0 && <p className="muted">Nenhuma licença cadastrada.</p>}
          </div>
        </div>
      </section>
    </AdminShell>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: 'dashboard' | 'companies' | 'licenses' | 'spark'
  label: string
  value: number
  description: string
}) {
  return (
    <div className="card stat-card">
      <span className="mini-icon"><AdminIcon name={icon} /></span>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{description}</p>
    </div>
  )
}

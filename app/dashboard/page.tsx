'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { adminApi, type Company, type LicensePlan } from '@/lib/api'
import { useAdminGuard } from '@/lib/auth'
import { AdminLoading, AdminShell } from '@/components/admin-shell'

export default function DashboardPage() {
  const { admin, loading } = useAdminGuard()
  const [companies, setCompanies] = useState<Company[]>([])
  const [plans, setPlans] = useState<LicensePlan[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!admin) return

    async function loadData() {
      try {
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

  const stats = useMemo(() => {
    const activeCompanies = companies.filter(
      (company) => company.platformAccessStatus === 'ACTIVE'
    ).length

    const blockedCompanies = companies.filter(
      (company) => company.platformAccessStatus !== 'ACTIVE'
    ).length

    const lifetimeLicenses = companies.filter((company) => {
      const license = company.platformLicenses?.[0]
      return license?.plan?.isLifetime
    }).length

    return {
      totalCompanies: companies.length,
      activeCompanies,
      blockedCompanies,
      totalPlans: plans.length,
      lifetimeLicenses,
    }
  }, [companies, plans])

  if (loading) return <AdminLoading />

  return (
    <AdminShell current="dashboard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1>Dashboard</h1>
          <p className="muted">Resumo administrativo da plataforma ORDR.</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <section className="stats-grid">
        <StatCard label="Empresas" value={stats.totalCompanies} />
        <StatCard label="Ativas" value={stats.activeCompanies} />
        <StatCard label="Bloqueadas/Suspensas" value={stats.blockedCompanies} />
        <StatCard label="Tipos de licença" value={stats.totalPlans} />
        <StatCard label="Vitalícias" value={stats.lifetimeLicenses} />
      </section>

      <section className="grid-two">
        <div className="card">
          <div className="section-title">
            <h2>Empresas recentes</h2>
            <Link href="/empresas/">Ver empresas</Link>
          </div>

          <div className="list-stack">
            {companies.slice(0, 5).map((company) => (
              <div className="list-row" key={company.id}>
                <div>
                  <strong>{company.name}</strong>
                  <p>{company.platformAccessStatus}</p>
                </div>
                <span className="badge">{company.platformLicenses?.[0]?.plan?.name ?? 'Sem licença'}</span>
              </div>
            ))}

            {companies.length === 0 && <p className="muted">Nenhuma empresa cadastrada.</p>}
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <h2>Licenças</h2>
            <Link href="/licencas/">Gerenciar</Link>
          </div>

          <div className="list-stack">
            {plans.slice(0, 5).map((plan) => (
              <div className="list-row" key={plan.id}>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

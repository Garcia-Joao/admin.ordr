'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AdminLoading, AdminShell } from '@/components/admin-shell'
import { adminApi, type Company, type LicensePlan } from '@/lib/api'
import { useAdminGuard } from '@/lib/auth'

type AccessStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CANCELLED'

export default function EmpresasPage() {
  const { admin, loading } = useAdminGuard()
  const [companies, setCompanies] = useState<Company[]>([])
  const [plans, setPlans] = useState<LicensePlan[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [ownerUsername, setOwnerUsername] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('123456')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [licensePlanId, setLicensePlanId] = useState('')
  const [isTest, setIsTest] = useState(false)

  const [assignPlanId, setAssignPlanId] = useState('')
  const [accessStatus, setAccessStatus] = useState<AccessStatus>('ACTIVE')
  const [accessReason, setAccessReason] = useState('')

  const selectedCompany = useMemo(() => {
    return companies.find((company) => company.id === selectedCompanyId) ?? null
  }, [companies, selectedCompanyId])

  async function loadData() {
    const [companiesResult, plansResult] = await Promise.all([
      adminApi.listCompanies(),
      adminApi.listLicensePlans(),
    ])

    setCompanies(companiesResult.companies)
    setPlans(plansResult.plans)

    if (!selectedCompanyId && companiesResult.companies[0]) {
      setSelectedCompanyId(companiesResult.companies[0].id)
    }
  }

  useEffect(() => {
    if (!admin) return

    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : 'Erro ao carregar empresas.')
    })
  }, [admin])

  useEffect(() => {
    if (!selectedCompany) return

    setAccessStatus(selectedCompany.platformAccessStatus)
    setAccessReason(selectedCompany.platformBlockedReason ?? '')
  }, [selectedCompany])

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      const result = await adminApi.createCompany({
        name: companyName,
        isTest,
        ownerUsername,
        ownerPassword,
        ownerName: ownerName || null,
        ownerPhone: ownerPhone || null,
        licensePlanId: licensePlanId || null,
        licenseNotes: licensePlanId ? 'Licença inicial criada pelo painel admin' : null,
      })

      setCompanyName('')
      setOwnerUsername('')
      setOwnerPassword('123456')
      setOwnerName('')
      setOwnerPhone('')
      setLicensePlanId('')
      setIsTest(false)
      setSelectedCompanyId(result.company.id)
      setSuccess('Empresa criada com sucesso.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar empresa.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAssignLicense() {
    if (!selectedCompany || !assignPlanId) return

    try {
      setError('')
      setSuccess('')

      await adminApi.assignCompanyLicense(selectedCompany.id, {
        planId: assignPlanId,
        notes: 'Licença atribuída pelo painel admin',
      })

      setAssignPlanId('')
      setSuccess('Licença atribuída com sucesso.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atribuir licença.')
    }
  }

  async function handleUpdateAccess() {
    if (!selectedCompany) return

    try {
      setError('')
      setSuccess('')

      await adminApi.updateCompanyAccess(selectedCompany.id, {
        platformAccessStatus: accessStatus,
        platformBlockedReason: accessReason || null,
      })

      setSuccess('Acesso atualizado com sucesso.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar acesso.')
    }
  }

  if (loading) return <AdminLoading />

  return (
    <AdminShell current="empresas">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Clientes</p>
          <h1>Empresas</h1>
          <p className="muted">Crie empresas, libere acessos iniciais e gerencie licenças.</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <section className="grid-two align-start">
        <form className="card form-card" onSubmit={handleCreateCompany}>
          <h2>Nova empresa</h2>

          <label className="field">
            <span>Nome da empresa</span>
            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
          </label>

          <label className="check-row">
            <input type="checkbox" checked={isTest} onChange={(event) => setIsTest(event.target.checked)} />
            <span>Empresa de teste</span>
          </label>

          <div className="form-grid">
            <label className="field">
              <span>Usuário inicial</span>
              <input value={ownerUsername} onChange={(event) => setOwnerUsername(event.target.value)} />
            </label>

            <label className="field">
              <span>Senha inicial</span>
              <input value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} />
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Nome do responsável</span>
              <input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} />
            </label>

            <label className="field">
              <span>Telefone</span>
              <input value={ownerPhone} onChange={(event) => setOwnerPhone(event.target.value)} />
            </label>
          </div>

          <label className="field">
            <span>Licença inicial</span>
            <select value={licensePlanId} onChange={(event) => setLicensePlanId(event.target.value)}>
              <option value="">Sem licença inicial</option>
              {plans.filter((plan) => plan.active).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {plan.isLifetime ? 'Vitalícia' : `${plan.durationMonths} meses`}
                </option>
              ))}
            </select>
          </label>

          <button className="primary-button" disabled={submitting}>
            {submitting ? 'Criando...' : 'Criar empresa'}
          </button>
        </form>

        <div className="card">
          <div className="section-title">
            <h2>Empresas cadastradas</h2>
            <span>{companies.length} empresa(s)</span>
          </div>

          <div className="list-stack company-list">
            {companies.map((company) => (
              <button
                className={`company-button ${selectedCompanyId === company.id ? 'selected' : ''}`}
                key={company.id}
                onClick={() => setSelectedCompanyId(company.id)}
              >
                <div>
                  <strong>{company.name}</strong>
                  <p>
                    {company.platformAccessStatus} · {company.platformLicenses?.[0]?.plan?.name ?? 'Sem licença'}
                  </p>
                </div>
                <span>{company._count?.memberships ?? 0} usuários</span>
              </button>
            ))}

            {companies.length === 0 && <p className="muted">Nenhuma empresa cadastrada.</p>}
          </div>
        </div>
      </section>

      {selectedCompany && (
        <section className="card details-card">
          <div className="section-title">
            <div>
              <h2>{selectedCompany.name}</h2>
              <p className="muted">Criada em {new Date(selectedCompany.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
            <span className="badge">{selectedCompany.platformAccessStatus}</span>
          </div>

          <div className="details-grid">
            <div>
              <h3>Licença atual</h3>
              <p>{selectedCompany.platformLicenses?.[0]?.plan?.name ?? 'Sem licença'}</p>
              <small>
                {selectedCompany.platformLicenses?.[0]?.endsAt
                  ? `Expira em ${new Date(selectedCompany.platformLicenses[0].endsAt).toLocaleDateString('pt-BR')}`
                  : selectedCompany.platformLicenses?.[0]?.plan?.isLifetime
                    ? 'Vitalícia'
                    : 'Sem data'}
              </small>
            </div>

            <div>
              <h3>Uso</h3>
              <p>
                {selectedCompany._count?.orders ?? 0} pedidos · {selectedCompany._count?.products ?? 0} produtos
              </p>
              <small>{selectedCompany._count?.customers ?? 0} clientes cadastrados</small>
            </div>

            <div>
              <h3>Usuários</h3>
              <p>{selectedCompany._count?.memberships ?? 0} usuário(s)</p>
              <small>{selectedCompany.memberships?.[0]?.user?.username ?? 'Sem usuário inicial'}</small>
            </div>
          </div>

          <div className="management-grid">
            <div className="mini-card">
              <h3>Atribuir licença</h3>
              <label className="field">
                <span>Plano</span>
                <select value={assignPlanId} onChange={(event) => setAssignPlanId(event.target.value)}>
                  <option value="">Selecione</option>
                  {plans.filter((plan) => plan.active).map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary-button" onClick={handleAssignLicense} disabled={!assignPlanId}>
                Atribuir licença
              </button>
            </div>

            <div className="mini-card">
              <h3>Controle de acesso</h3>
              <label className="field">
                <span>Status</span>
                <select value={accessStatus} onChange={(event) => setAccessStatus(event.target.value as AccessStatus)}>
                  <option value="ACTIVE">Ativa</option>
                  <option value="SUSPENDED">Suspensa</option>
                  <option value="BLOCKED">Bloqueada</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
              </label>
              <label className="field">
                <span>Motivo</span>
                <input value={accessReason} onChange={(event) => setAccessReason(event.target.value)} />
              </label>
              <button className="primary-button" onClick={handleUpdateAccess}>
                Salvar acesso
              </button>
            </div>
          </div>
        </section>
      )}
    </AdminShell>
  )
}

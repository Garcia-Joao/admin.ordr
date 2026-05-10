'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AdminIcon, AdminLoading, AdminShell } from '@/components/admin-shell'
import { adminApi, type Company, type LicensePlan } from '@/lib/api'
import { useAdminGuard } from '@/lib/auth'

type AccessStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CANCELLED'

const accessLabels: Record<AccessStatus, string> = {
  ACTIVE: 'Ativa',
  SUSPENDED: 'Suspensa',
  BLOCKED: 'Bloqueada',
  CANCELLED: 'Cancelada',
}

export default function EmpresasPage() {
  const { admin, loading } = useAdminGuard()
  const [companies, setCompanies] = useState<Company[]>([])
  const [plans, setPlans] = useState<LicensePlan[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)

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

  const activePlans = useMemo(() => plans.filter((plan) => plan.active), [plans])

  const summary = useMemo(() => {
    return {
      total: companies.length,
      active: companies.filter((company) => company.platformAccessStatus === 'ACTIVE').length,
      test: companies.filter((company) => company.isTest).length,
      withLicense: companies.filter((company) => company.platformLicenses?.[0]).length,
    }
  }, [companies])

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

  function resetCompanyForm() {
    setCompanyName('')
    setOwnerUsername('')
    setOwnerPassword('123456')
    setOwnerName('')
    setOwnerPhone('')
    setLicensePlanId('')
    setIsTest(false)
  }

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

      resetCompanyForm()
      setSelectedCompanyId(result.company.id)
      setIsCompanyModalOpen(false)
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
        <div className="heading-actions">
          <button className="primary-button action-button" onClick={() => setIsCompanyModalOpen(true)}>
            <AdminIcon name="companies" />
            Nova empresa
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <section className="stats-grid company-summary-grid">
        <SummaryCard label="Empresas" value={summary.total} />
        <SummaryCard label="Ativas" value={summary.active} />
        <SummaryCard label="Com licença" value={summary.withLicense} />
        <SummaryCard label="Teste" value={summary.test} />
      </section>

      <section className="grid-two companies-layout align-start">
        <div className="card companies-card">
          <div className="section-title">
            <div>
              <p className="eyebrow compact">Grid</p>
              <h2>Empresas cadastradas</h2>
            </div>
            <span>{companies.length} empresa(s)</span>
          </div>

          <div className="company-grid-list">
            {companies.map((company) => (
              <button
                className={`company-tile ${selectedCompanyId === company.id ? 'selected' : ''}`}
                key={company.id}
                onClick={() => setSelectedCompanyId(company.id)}
              >
                <div className="company-tile-head">
                  <span className="mini-icon"><AdminIcon name="companies" /></span>
                  <span className={`status-dot ${company.platformAccessStatus.toLowerCase()}`} />
                </div>
                <strong>{company.name}</strong>
                <p>
                  {accessLabels[company.platformAccessStatus]} · {company.platformLicenses?.[0]?.plan?.name ?? 'Sem licença'}
                </p>
                <small>{company._count?.memberships ?? 0} usuários</small>
              </button>
            ))}

            {companies.length === 0 && <p className="muted">Nenhuma empresa cadastrada.</p>}
          </div>
        </div>

        {selectedCompany && (
          <section className="card details-card selected-company-panel">
            <div className="section-title">
              <div>
                <p className="eyebrow compact">Selecionada</p>
                <h2>{selectedCompany.name}</h2>
                <p className="muted">Criada em {new Date(selectedCompany.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className={`badge status-${selectedCompany.platformAccessStatus.toLowerCase()}`}>
                {accessLabels[selectedCompany.platformAccessStatus]}
              </span>
            </div>

            <div className="details-grid">
              <InfoBlock
                title="Licença atual"
                value={selectedCompany.platformLicenses?.[0]?.plan?.name ?? 'Sem licença'}
                description={
                  selectedCompany.platformLicenses?.[0]?.endsAt
                    ? `Expira em ${new Date(selectedCompany.platformLicenses[0].endsAt).toLocaleDateString('pt-BR')}`
                    : selectedCompany.platformLicenses?.[0]?.plan?.isLifetime
                      ? 'Vitalícia'
                      : 'Sem data'
                }
              />
              <InfoBlock
                title="Uso"
                value={`${selectedCompany._count?.orders ?? 0} pedidos · ${selectedCompany._count?.products ?? 0} produtos`}
                description={`${selectedCompany._count?.customers ?? 0} clientes cadastrados`}
              />
              <InfoBlock
                title="Usuários"
                value={`${selectedCompany._count?.memberships ?? 0} usuário(s)`}
                description={selectedCompany.memberships?.[0]?.user?.username ?? 'Sem usuário inicial'}
              />
            </div>

            <div className="management-grid">
              <div className="mini-card">
                <h3>Atribuir licença</h3>
                <label className="field">
                  <span>Plano</span>
                  <select value={assignPlanId} onChange={(event) => setAssignPlanId(event.target.value)}>
                    <option value="">Selecione</option>
                    {activePlans.map((plan) => (
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
      </section>

      {isCompanyModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsCompanyModalOpen(false)}>
          <form className="modal-card card" onSubmit={handleCreateCompany} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow compact">Cadastro</p>
                <h2>Nova empresa</h2>
                <p className="muted">Crie a empresa e o usuário inicial sem ocupar espaço do grid.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsCompanyModalOpen(false)} aria-label="Fechar modal">
                ×
              </button>
            </div>

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
                {activePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} · {plan.isLifetime ? 'Vitalícia' : `${plan.durationMonths} meses`}
                  </option>
                ))}
              </select>
            </label>

            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={() => setIsCompanyModalOpen(false)}>
                Cancelar
              </button>
              <button className="primary-button action-button" disabled={submitting}>
                {submitting ? 'Criando...' : 'Criar empresa'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card stat-card summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function InfoBlock({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className="info-block">
      <h3>{title}</h3>
      <p>{value}</p>
      <small>{description}</small>
    </div>
  )
}

'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AdminIcon, AdminLoading, AdminShell } from '@/components/admin-shell'
import { adminApi, type Company, type CompanyLicense, type CompanyMembership, type LicensePlan, type PlatformUser } from '@/lib/api'
import { useAdminGuard } from '@/lib/auth'

type AccessStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CANCELLED'
type SystemRole = 'ADMIN' | 'CUSTOM'
type LegacyRole = 'admin' | 'cashier' | 'waiter'
type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'REPLACED'

const accessLabels: Record<AccessStatus, string> = {
  ACTIVE: 'Ativa',
  SUSPENDED: 'Suspensa',
  BLOCKED: 'Bloqueada',
  CANCELLED: 'Cancelada',
}

const licenseStatusLabels: Record<LicenseStatus, string> = {
  ACTIVE: 'Ativa',
  EXPIRED: 'Expirada',
  CANCELLED: 'Cancelada',
  REPLACED: 'Substituída',
}

const legacyRoleLabels: Record<LegacyRole, string> = {
  admin: 'Admin',
  cashier: 'Caixa',
  waiter: 'Garçom',
}

function getMembershipLabel(membership: CompanyMembership) {
  if (membership.systemRole === 'ADMIN') return 'Admin total'
  return membership.customRole?.name ?? legacyRoleLabels[membership.role] ?? 'Custom'
}

function getTodayInput() {
  return new Date().toISOString().slice(0, 10)
}

function toDateInput(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 10)
}

function addMonthsToDateInput(value: string, months: number) {
  if (!value || !Number.isFinite(months)) return ''

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return ''

  const targetMonthIndex = month - 1 + months
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12
  const maxDay = new Date(targetYear, normalizedMonthIndex + 1, 0).getDate()
  const safeDay = Math.min(day, maxDay)
  const result = new Date(targetYear, normalizedMonthIndex, safeDay)

  const resultYear = result.getFullYear()
  const resultMonth = String(result.getMonth() + 1).padStart(2, '0')
  const resultDay = String(result.getDate()).padStart(2, '0')

  return `${resultYear}-${resultMonth}-${resultDay}`
}

function getPlanDurationMonths(plan?: LicensePlan | null) {
  if (!plan || plan.isLifetime) return null

  const duration = Number(plan.durationMonths)
  if (!Number.isFinite(duration) || duration <= 0) return null

  return duration
}

function getRemainingLabelFromDateInput(value: string, isLifetime = false) {
  if (isLifetime) return 'Vitalícia'
  if (!value) return '—'

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return '—'

  const end = new Date(year, month - 1, day, 23, 59, 59, 999)
  if (Number.isNaN(end.getTime())) return '—'

  const diff = end.getTime() - Date.now()
  const remaining = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (remaining < 0) return `Expirada há ${Math.abs(remaining)} dia(s)`
  if (remaining === 0) return 'Expira hoje'
  return `${remaining} dia(s) restantes`
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getRemainingDays(license?: CompanyLicense | null) {
  if (!license) return null
  if (!license.endsAt) return null

  const end = new Date(license.endsAt)
  if (Number.isNaN(end.getTime())) return null

  const diff = end.getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getRemainingLabel(license?: CompanyLicense | null) {
  if (!license) return 'Sem licença'
  if (!license.endsAt) return 'Vitalícia'

  const remaining = getRemainingDays(license)
  if (remaining === null) return '—'
  if (remaining < 0) return `Expirada há ${Math.abs(remaining)} dia(s)`
  if (remaining === 0) return 'Expira hoje'
  return `${remaining} dia(s) restantes`
}

export default function EmpresasPage() {
  const { admin, loading } = useAdminGuard()
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [plans, setPlans] = useState<LicensePlan[]>([])
  const [editingCompanyId, setEditingCompanyId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [companyType, setCompanyType] = useState<'BUSINESS' | 'SUPPLIER'>('BUSINESS')
  const [ownerUsername, setOwnerUsername] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('123456')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [licensePlanId, setLicensePlanId] = useState('')
  const [licenseStartsAt, setLicenseStartsAt] = useState(getTodayInput())

  const [editName, setEditName] = useState('')
  const [editCompanyType, setEditCompanyType] = useState<'BUSINESS' | 'SUPPLIER'>('BUSINESS')
  const [editAccessStatus, setEditAccessStatus] = useState<AccessStatus>('ACTIVE')
  const [editAccessReason, setEditAccessReason] = useState('')
  const [assignPlanId, setAssignPlanId] = useState('')
  const [assignStartsAt, setAssignStartsAt] = useState(getTodayInput())
  const [assignNotes, setAssignNotes] = useState('')

  const [licenseEditPlanId, setLicenseEditPlanId] = useState('')
  const [licenseEditStatus, setLicenseEditStatus] = useState<LicenseStatus>('ACTIVE')
  const [licenseEditStartsAt, setLicenseEditStartsAt] = useState('')
  const [licenseEditEndsAt, setLicenseEditEndsAt] = useState('')
  const [licenseEditNotes, setLicenseEditNotes] = useState('')

  const [membershipUserId, setMembershipUserId] = useState('')
  const [membershipSystemRole, setMembershipSystemRole] = useState<SystemRole>('ADMIN')
  const [membershipCustomRoleId, setMembershipCustomRoleId] = useState('')
  const [membershipLegacyRole, setMembershipLegacyRole] = useState<LegacyRole>('admin')

  const editingCompany = useMemo(() => {
    return companies.find((company) => company.id === editingCompanyId) ?? null
  }, [companies, editingCompanyId])

  const currentLicense = useMemo(() => {
    return editingCompany?.platformLicenses?.[0] ?? null
  }, [editingCompany])

  const canDeleteEditingCompany = Boolean(editingCompany && editingCompany.platformAccessStatus !== 'ACTIVE')
  const canDeleteCurrentLicense = Boolean(currentLicense && currentLicense.status !== 'ACTIVE')

  const activePlans = useMemo(() => plans.filter((plan) => plan.active), [plans])

  const selectedLicenseEditPlan = useMemo(() => {
    return (
      activePlans.find((plan) => plan.id === licenseEditPlanId) ??
      plans.find((plan) => plan.id === licenseEditPlanId) ??
      currentLicense?.plan ??
      null
    )
  }, [activePlans, plans, licenseEditPlanId, currentLicense])

  const selectedInitialLicensePlan = useMemo(() => {
    return activePlans.find((plan) => plan.id === licensePlanId) ?? null
  }, [activePlans, licensePlanId])

  const selectedAssignLicensePlan = useMemo(() => {
    return activePlans.find((plan) => plan.id === assignPlanId) ?? null
  }, [activePlans, assignPlanId])

  const visibleCompanies = useMemo(() => {
    return companies.filter((company) => !company.isTest)
  }, [companies])

  const summary = useMemo(() => {
    return {
      total: visibleCompanies.length,
      active: visibleCompanies.filter((company) => company.platformAccessStatus === 'ACTIVE').length,
      withLicense: visibleCompanies.filter((company) => company.platformLicenses?.[0]).length,
    }
  }, [visibleCompanies])

  const availableUsersForCompany = useMemo(() => {
    if (!editingCompany) return users
    const userIds = new Set(editingCompany.memberships?.map((membership) => membership.user?.id ?? membership.userId))
    return users.filter((user) => !userIds.has(user.id))
  }, [editingCompany, users])

  async function loadData() {
    const [companiesResult, usersResult, plansResult] = await Promise.all([
      adminApi.listCompanies(),
      adminApi.listUsers(),
      adminApi.listLicensePlans(),
    ])

    setCompanies(companiesResult.companies)
    setUsers(usersResult.users)
    setPlans(plansResult.plans)
  }

  useEffect(() => {
    if (!admin) return

    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : 'Erro ao carregar empresas.')
    })
  }, [admin])

  useEffect(() => {
    if (!editingCompany) return

    const license = editingCompany.platformLicenses?.[0] ?? null

    setEditName(editingCompany.name)
    setEditCompanyType((editingCompany.companyType as 'BUSINESS' | 'SUPPLIER') ?? 'BUSINESS')
    setEditAccessStatus(editingCompany.platformAccessStatus)
    setEditAccessReason(editingCompany.platformBlockedReason ?? '')
    setAssignPlanId('')
    setAssignStartsAt(getTodayInput())
    setAssignNotes('')
    setLicenseEditPlanId(license?.planId ?? '')
    setLicenseEditStatus((license?.status as LicenseStatus) ?? 'ACTIVE')
    setLicenseEditStartsAt(toDateInput(license?.startsAt))
    setLicenseEditEndsAt(toDateInput(license?.endsAt))
    setLicenseEditNotes(license?.notes ?? '')
    setMembershipUserId('')
    setMembershipSystemRole('ADMIN')
    setMembershipCustomRoleId('')
    setMembershipLegacyRole('admin')
  }, [editingCompany])

  function resetCompanyForm() {
    setCompanyName('')
    setOwnerUsername('')
    setOwnerPassword('123456')
    setOwnerName('')
    setOwnerPhone('')
    setLicensePlanId('')
    setLicenseStartsAt(getTodayInput())
    setCompanyType('BUSINESS')
  }

  function getLicensePlanById(planId: string) {
    return (
      activePlans.find((plan) => plan.id === planId) ??
      plans.find((plan) => plan.id === planId) ??
      (currentLicense?.planId === planId ? currentLicense.plan : null) ??
      null
    )
  }

  function handleInitialLicensePlanChange(planId: string) {
    setLicensePlanId(planId)

    const plan = getLicensePlanById(planId)
    if (!plan || plan.isLifetime || !getPlanDurationMonths(plan)) return

    setLicenseStartsAt((current) => current || getTodayInput())
  }

  function handleLicenseEditPlanChange(planId: string) {
    setLicenseEditPlanId(planId)

    const plan = getLicensePlanById(planId)
    const durationMonths = getPlanDurationMonths(plan)

    if (plan?.isLifetime || !durationMonths) {
      setLicenseEditEndsAt('')
      return
    }

    const startsAt = licenseEditStartsAt || getTodayInput()
    setLicenseEditStartsAt(startsAt)
    setLicenseEditEndsAt(addMonthsToDateInput(startsAt, durationMonths))
  }

  function handleLicenseEditStartsAtChange(startsAt: string) {
    setLicenseEditStartsAt(startsAt)

    const durationMonths = getPlanDurationMonths(selectedLicenseEditPlan)
    if (!startsAt || !durationMonths) return

    setLicenseEditEndsAt(addMonthsToDateInput(startsAt, durationMonths))
  }

  function handleLicenseEditEndsAtChange(endsAt: string) {
    setLicenseEditEndsAt(endsAt)

    const durationMonths = getPlanDurationMonths(selectedLicenseEditPlan)
    if (!endsAt || !durationMonths) return

    setLicenseEditStartsAt(addMonthsToDateInput(endsAt, -durationMonths))
  }

  function handleAssignLicensePlanChange(planId: string) {
    setAssignPlanId(planId)

    const plan = getLicensePlanById(planId)
    if (!plan || plan.isLifetime || !getPlanDurationMonths(plan)) return

    setAssignStartsAt((current) => current || getTodayInput())
  }

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      const result = await adminApi.createCompany({
        name: companyName,
        companyType,
        isTest: false,
        ownerUsername,
        ownerPassword,
        ownerName: ownerName || null,
        ownerPhone: ownerPhone || null,
        licensePlanId: licensePlanId || null,
        licenseStartsAt: licensePlanId ? licenseStartsAt || null : null,
        licenseNotes: licensePlanId ? 'Licença inicial criada pelo painel admin' : null,
      })

      resetCompanyForm()
      setIsCompanyModalOpen(false)
      setEditingCompanyId(result.company.id)
      setSuccess('Empresa criada com sucesso.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar empresa.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingCompany) return

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      await adminApi.updateCompany(editingCompany.id, {
        name: editName,
        companyType: editCompanyType,
        platformAccessStatus: editAccessStatus,
        platformBlockedReason: editAccessReason || null,
      })

      if (assignPlanId) {
        await adminApi.assignCompanyLicense(editingCompany.id, {
          planId: assignPlanId,
          startsAt: assignStartsAt || null,
          notes: assignNotes || 'Licença atribuída pelo painel admin',
        })
      }

      setAssignPlanId('')
      setAssignStartsAt(getTodayInput())
      setAssignNotes('')
      setSuccess('Empresa atualizada com sucesso.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar empresa.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateCurrentLicense() {
    if (!currentLicense) return

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      await adminApi.updateCompanyLicense(currentLicense.id, {
        planId: licenseEditPlanId || currentLicense.planId,
        status: licenseEditStatus,
        startsAt: licenseEditStartsAt || null,
        endsAt: licenseEditEndsAt || null,
        notes: licenseEditNotes || null,
      })

      setSuccess('Licença atualizada com sucesso.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar licença.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddMembership() {
    if (!editingCompany || !membershipUserId) return

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      await adminApi.upsertCompanyMembership({
        companyId: editingCompany.id,
        userId: membershipUserId,
        systemRole: membershipSystemRole,
        customRoleId: membershipSystemRole === 'CUSTOM' ? membershipCustomRoleId || null : null,
        role: membershipSystemRole === 'ADMIN' ? 'admin' : membershipLegacyRole,
      })

      setMembershipUserId('')
      setMembershipSystemRole('ADMIN')
      setMembershipCustomRoleId('')
      setMembershipLegacyRole('admin')
      setSuccess('Usuário vinculado à empresa.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vincular usuário.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateMembership(membership: CompanyMembership, systemRole: SystemRole, customRoleId: string) {
    try {
      setError('')
      setSuccess('')

      await adminApi.updateCompanyMembership(membership.id, {
        systemRole,
        customRoleId: systemRole === 'CUSTOM' ? customRoleId || null : null,
        role: systemRole === 'ADMIN' ? 'admin' : membership.role,
      })

      setSuccess('Permissão atualizada.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar permissão.')
    }
  }

  async function handleRemoveMembership(membershipId: string) {
    try {
      setError('')
      setSuccess('')

      await adminApi.deleteCompanyMembership(membershipId)
      setSuccess('Acesso removido da empresa.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover acesso.')
    }
  }


  async function handleDeleteCurrentLicense() {
    if (!currentLicense) return

    const confirmed = window.confirm('Excluir esta licença inativa do histórico da empresa? Esta ação não pode ser desfeita.')
    if (!confirmed) return

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      await adminApi.deleteCompanyLicense(currentLicense.id)
      setSuccess('Licença removida do histórico.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir licença.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteCompany() {
    if (!editingCompany) return

    const confirmed = window.confirm(
      `Excluir definitivamente a empresa "${editingCompany.name}"? Todos os produtos, pedidos, clientes, eventos, estoque, impressoras, dispositivos, licenças e acessos desta empresa serão apagados.`
    )
    if (!confirmed) return

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      await adminApi.deleteCompany(editingCompany.id)
      setEditingCompanyId('')
      setSuccess('Empresa e todos os dados vinculados foram excluídos.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir empresa.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <AdminLoading />

  return (
    <AdminShell current="empresas">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Clientes</p>
          <h1>Empresas</h1>
          <p className="muted">Gerencie dados, licenças e quais usuários acessam cada empresa.</p>
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
      </section>

      <section className="card companies-card full-grid-card">
        <div className="section-title">
          <div>
            <p className="eyebrow compact">Grid</p>
            <h2>Empresas cadastradas</h2>
          </div>
          <span>{visibleCompanies.length} empresa(s)</span>
        </div>

        <div className="company-grid-list company-grid-list-wide">
          {visibleCompanies.map((company) => {
            const license = company.platformLicenses?.[0]
            const memberships = company.memberships ?? []

            return (
              <button
                className="company-tile company-tile-wide"
                key={company.id}
                onClick={() => setEditingCompanyId(company.id)}
              >
                <div className="company-tile-head">
                  <span className="mini-icon"><AdminIcon name="companies" /></span>
                  <span className={`status-dot ${company.platformAccessStatus.toLowerCase()}`} />
                </div>

                <strong>{company.name}</strong>
                <p>{company.companyType === 'SUPPLIER' ? 'Fornecedor' : 'Operação'} · {accessLabels[company.platformAccessStatus]} · {license?.plan?.name ?? 'Sem licença'}</p>
                {company.platformAccessStatus !== 'ACTIVE' && (
                  <span className="delete-ready-pill">Pronta para exclusão segura</span>
                )}

                <div className="tile-meta-row">
                  <span className="badge muted-badge">{memberships.length} usuário(s)</span>
                  {license && <span className="badge muted-badge">{getRemainingLabel(license)}</span>}
                </div>

                <div className="mini-user-stack">
                  {memberships.slice(0, 3).map((membership) => (
                    <span key={membership.id}>{membership.user?.name || membership.user?.username} · {getMembershipLabel(membership)}</span>
                  ))}
                  {memberships.length > 3 && <span>+{memberships.length - 3} usuário(s)</span>}
                </div>
              </button>
            )
          })}

          {visibleCompanies.length === 0 && <p className="muted">Nenhuma empresa cadastrada.</p>}
        </div>
      </section>

      {isCompanyModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsCompanyModalOpen(false)}>
          <form className="modal-card card" onSubmit={handleCreateCompany} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow compact">Cadastro</p>
                <h2>Nova empresa</h2>
                <p className="muted">Crie a empresa, o usuário inicial e, opcionalmente, uma licença com data inicial customizada.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsCompanyModalOpen(false)} aria-label="Fechar modal">×</button>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Nome da empresa</span>
                <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
              </label>
              <label className="field">
                <span>Tipo de empresa</span>
                <select value={companyType} onChange={(event) => setCompanyType(event.target.value as 'BUSINESS' | 'SUPPLIER')}>
                  <option value="BUSINESS">Operação / Cliente ORDR</option>
                  <option value="SUPPLIER">Fornecedor</option>
                </select>
                <small>{companyType === 'SUPPLIER' ? 'Usuários deste tipo serão direcionados ao portal de fornecedores.' : 'Bares, restaurantes, eventos e operações que usam o PDV.'}</small>
              </label>
            </div>

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

            <div className="form-grid">
              <label className="field">
                <span>Licença inicial</span>
                <select value={licensePlanId} onChange={(event) => handleInitialLicensePlanChange(event.target.value)}>
                  <option value="">Sem licença inicial</option>
                  {activePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name} · {plan.isLifetime ? 'Vitalícia' : `${plan.durationMonths} meses`}</option>
                  ))}
                </select>
              </label>

              {licensePlanId && (
                <label className="field">
                  <span>Data inicial da licença</span>
                  <input type="date" value={licenseStartsAt} onChange={(event) => setLicenseStartsAt(event.target.value)} />
                  {selectedInitialLicensePlan?.isLifetime ? (
                    <small>Vencimento: vitalício</small>
                  ) : (
                    <small>Vencimento previsto: {getPlanDurationMonths(selectedInitialLicensePlan) ? formatDate(addMonthsToDateInput(licenseStartsAt, getPlanDurationMonths(selectedInitialLicensePlan) ?? 0)) : '—'}</small>
                  )}
                </label>
              )}
            </div>

            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={() => setIsCompanyModalOpen(false)}>Cancelar</button>
              <button className="primary-button action-button" disabled={submitting}>{submitting ? 'Criando...' : 'Criar empresa'}</button>
            </div>
          </form>
        </div>
      )}

      {editingCompany && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditingCompanyId('')}>
          <form className="modal-card card wide-modal" onSubmit={handleUpdateCompany} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow compact">Edição</p>
                <h2>{editingCompany.name}</h2>
                <p className="muted">Ajuste cadastro, status, licença e usuários com acesso.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setEditingCompanyId('')} aria-label="Fechar modal">×</button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div className="mini-card">
                <h3>Dados da empresa</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '0.85rem' }}>
                  <label className="field">
                    <span>Nome da empresa</span>
                    <input value={editName} onChange={(event) => setEditName(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Tipo de empresa</span>
                    <select value={editCompanyType} onChange={(event) => setEditCompanyType(event.target.value as 'BUSINESS' | 'SUPPLIER')}>
                      <option value="BUSINESS">Operação / Cliente ORDR</option>
                      <option value="SUPPLIER">Fornecedor</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Status de acesso</span>
                    <select value={editAccessStatus} onChange={(event) => setEditAccessStatus(event.target.value as AccessStatus)}>
                      <option value="ACTIVE">Ativa</option>
                      <option value="SUSPENDED">Suspensa</option>
                      <option value="BLOCKED">Bloqueada</option>
                      <option value="CANCELLED">Cancelada</option>
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>Motivo do bloqueio/suspensão</span>
                  <input value={editAccessReason} onChange={(event) => setEditAccessReason(event.target.value)} placeholder="Opcional" />
                </label>
              </div>

              <div className="mini-card license-management-card">
                <h3>Licença atual</h3>
                {currentLicense ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: '0.65rem' }}>
                      <InfoItem label="Plano" value={currentLicense.plan?.name ?? '—'} />
                      <InfoItem label="Status" value={licenseStatusLabels[currentLicense.status as LicenseStatus] ?? currentLicense.status} />
                      <InfoItem label="Início" value={formatDate(licenseEditStartsAt || currentLicense.startsAt)} />
                      <InfoItem label="Vencimento" value={selectedLicenseEditPlan?.isLifetime ? 'Vitalícia' : formatDate(licenseEditEndsAt || currentLicense.endsAt)} />
                      <InfoItem label="Dias restantes" value={selectedLicenseEditPlan?.isLifetime ? 'Vitalícia' : getRemainingLabelFromDateInput(licenseEditEndsAt)} />
                      <InfoItem label="Criada em" value={formatDate(currentLicense.createdAt)} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: '0.75rem' }}>
                      <label className="field">
                        <span>Plano</span>
                        <select value={licenseEditPlanId} onChange={(event) => handleLicenseEditPlanChange(event.target.value)}>
                          {activePlans.map((plan) => (
                            <option key={plan.id} value={plan.id}>{plan.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Status</span>
                        <select value={licenseEditStatus} onChange={(event) => setLicenseEditStatus(event.target.value as LicenseStatus)}>
                          <option value="ACTIVE">Ativa</option>
                          <option value="EXPIRED">Expirada</option>
                          <option value="CANCELLED">Cancelada</option>
                          <option value="REPLACED">Substituída</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Started at</span>
                        <input type="date" value={licenseEditStartsAt} onChange={(event) => handleLicenseEditStartsAtChange(event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Ends at</span>
                        <input type="date" value={licenseEditEndsAt} onChange={(event) => handleLicenseEditEndsAtChange(event.target.value)} disabled={Boolean(selectedLicenseEditPlan?.isLifetime)} />
                      </label>
                    </div>

                    <p className="muted">
                      Prévia: {selectedLicenseEditPlan?.isLifetime ? 'licença vitalícia' : `${getRemainingLabelFromDateInput(licenseEditEndsAt)}`}
                    </p>

                    <label className="field">
                      <span>Observações da licença</span>
                      <textarea value={licenseEditNotes} onChange={(event) => setLicenseEditNotes(event.target.value)} placeholder="Opcional" />
                    </label>

                    <div className="split-actions">
                      <button className="ghost-button tile-action" type="button" disabled={submitting} onClick={handleUpdateCurrentLicense}>
                        <AdminIcon name="licenses" />
                        Salvar licença atual
                      </button>
                      <button
                        className="ghost-button danger-button tile-action"
                        type="button"
                        disabled={!canDeleteCurrentLicense || submitting}
                        onClick={handleDeleteCurrentLicense}
                        title={canDeleteCurrentLicense ? 'Excluir licença inativa' : 'Somente licenças inativas podem ser excluídas'}
                      >
                        Excluir licença
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="muted">Sem licença atribuída.</p>
                )}
              </div>

              <div className="mini-card">
                <h3>Atribuir nova licença</h3>
                <p className="muted">Ao atribuir uma nova licença ativa, a anterior é marcada como substituída.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '0.75rem' }}>
                  <label className="field">
                    <span>Nova licença</span>
                    <select value={assignPlanId} onChange={(event) => handleAssignLicensePlanChange(event.target.value)}>
                      <option value="">Manter atual</option>
                      {activePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>{plan.name} · {plan.isLifetime ? 'Vitalícia' : `${plan.durationMonths} meses`}</option>
                      ))}
                    </select>
                  </label>

                  {assignPlanId && (
                    <label className="field">
                      <span>Start date</span>
                      <input type="date" value={assignStartsAt} onChange={(event) => setAssignStartsAt(event.target.value)} />
                      {selectedAssignLicensePlan?.isLifetime ? (
                        <small>Vencimento: vitalício</small>
                      ) : (
                        <small>Vencimento previsto: {getPlanDurationMonths(selectedAssignLicensePlan) ? formatDate(addMonthsToDateInput(assignStartsAt, getPlanDurationMonths(selectedAssignLicensePlan) ?? 0)) : '—'}</small>
                      )}
                    </label>
                  )}
                </div>
                {assignPlanId && (
                  <label className="field">
                    <span>Observações</span>
                    <input value={assignNotes} onChange={(event) => setAssignNotes(event.target.value)} placeholder="Licença atribuída pelo painel admin" />
                  </label>
                )}
              </div>
            </div>

            <div className="modal-section-grid">
              <div className="mini-card">
                <h3>Adicionar usuário à empresa</h3>
                <label className="field">
                  <span>Usuário</span>
                  <select value={membershipUserId} onChange={(event) => setMembershipUserId(event.target.value)}>
                    <option value="">Selecione</option>
                    {availableUsersForCompany.map((user) => (
                      <option key={user.id} value={user.id}>{user.name || user.username} · {user.username}</option>
                    ))}
                  </select>
                </label>

                <div className="form-grid compact-form-grid">
                  <label className="field">
                    <span>Acesso</span>
                    <select value={membershipSystemRole} onChange={(event) => setMembershipSystemRole(event.target.value as SystemRole)}>
                      <option value="ADMIN">Admin total</option>
                      <option value="CUSTOM">Role customizada</option>
                    </select>
                  </label>

                  {membershipSystemRole === 'CUSTOM' && (
                    <label className="field">
                      <span>Role</span>
                      <select value={membershipCustomRoleId} onChange={(event) => setMembershipCustomRoleId(event.target.value)}>
                        <option value="">Selecione</option>
                        {(editingCompany.accessRoles ?? []).map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <button className="ghost-button tile-action" type="button" disabled={!membershipUserId || submitting} onClick={handleAddMembership}>
                  <AdminIcon name="users" />
                  Vincular usuário
                </button>
              </div>

              <div className="mini-card users-access-card no-top-margin">
                <div className="section-title compact-section-title">
                  <div>
                    <p className="eyebrow compact">Acessos</p>
                    <h3>Usuários com acesso</h3>
                  </div>
                  <span>{editingCompany.memberships?.length ?? 0} vínculo(s)</span>
                </div>

                <div className="access-list">
                  {(editingCompany.memberships ?? []).map((membership) => (
                    <MembershipRow
                      key={membership.id}
                      membership={membership}
                      company={editingCompany}
                      onUpdate={handleUpdateMembership}
                      onRemove={handleRemoveMembership}
                    />
                  ))}
                  {(editingCompany.memberships ?? []).length === 0 && <p className="muted">Nenhum usuário vinculado.</p>}
                </div>
              </div>
            </div>

            <div className="danger-zone-card">
              <div>
                <strong>Excluir empresa definitivamente</strong>
                <p>
                  Disponível somente quando a empresa está suspensa, bloqueada ou cancelada. Ao excluir, todos os dados vinculados à empresa também são apagados.
                </p>
              </div>
              <button
                className="ghost-button danger-button"
                type="button"
                disabled={!canDeleteEditingCompany || submitting}
                onClick={handleDeleteCompany}
                title={canDeleteEditingCompany ? 'Excluir empresa e seus dados' : 'Desative a empresa antes de excluir'}
              >
                Excluir empresa
              </button>
            </div>

            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={() => setEditingCompanyId('')}>Fechar</button>
              <button className="primary-button action-button" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar empresa'}</button>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="license-info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function MembershipRow({
  membership,
  company,
  onUpdate,
  onRemove,
}: {
  membership: CompanyMembership
  company: Company
  onUpdate: (membership: CompanyMembership, systemRole: SystemRole, customRoleId: string) => void
  onRemove: (membershipId: string) => void
}) {
  const [systemRole, setSystemRole] = useState<SystemRole>(membership.systemRole)
  const [customRoleId, setCustomRoleId] = useState(membership.customRoleId ?? '')

  return (
    <div className="access-row">
      <div className="row-leading">
        <span className="mini-icon"><AdminIcon name="users" /></span>
        <div>
          <strong>{membership.user?.name || membership.user?.username}</strong>
          <p>{membership.user?.username} · {getMembershipLabel(membership)}</p>
        </div>
      </div>

      <div className="access-row-actions">
        <select value={systemRole} onChange={(event) => setSystemRole(event.target.value as SystemRole)}>
          <option value="ADMIN">Admin total</option>
          <option value="CUSTOM">Role customizada</option>
        </select>

        {systemRole === 'CUSTOM' && (
          <select value={customRoleId} onChange={(event) => setCustomRoleId(event.target.value)}>
            <option value="">Selecione</option>
            {(company.accessRoles ?? []).map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        )}

        <button className="ghost-button" type="button" onClick={() => onUpdate(membership, systemRole, customRoleId)}>Salvar</button>
        <button className="ghost-button danger-button" type="button" onClick={() => onRemove(membership.id)}>Remover</button>
      </div>
    </div>
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

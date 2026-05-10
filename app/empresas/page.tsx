'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AdminIcon, AdminLoading, AdminShell } from '@/components/admin-shell'
import { adminApi, type Company, type CompanyMembership, type LicensePlan, type PlatformUser } from '@/lib/api'
import { useAdminGuard } from '@/lib/auth'

type AccessStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CANCELLED'
type SystemRole = 'ADMIN' | 'CUSTOM'
type LegacyRole = 'admin' | 'cashier' | 'waiter'

const accessLabels: Record<AccessStatus, string> = {
  ACTIVE: 'Ativa',
  SUSPENDED: 'Suspensa',
  BLOCKED: 'Bloqueada',
  CANCELLED: 'Cancelada',
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
  const [ownerUsername, setOwnerUsername] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('123456')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [licensePlanId, setLicensePlanId] = useState('')
  const [isTest, setIsTest] = useState(false)

  const [editName, setEditName] = useState('')
  const [editIsTest, setEditIsTest] = useState(false)
  const [editAccessStatus, setEditAccessStatus] = useState<AccessStatus>('ACTIVE')
  const [editAccessReason, setEditAccessReason] = useState('')
  const [assignPlanId, setAssignPlanId] = useState('')

  const [membershipUserId, setMembershipUserId] = useState('')
  const [membershipSystemRole, setMembershipSystemRole] = useState<SystemRole>('ADMIN')
  const [membershipCustomRoleId, setMembershipCustomRoleId] = useState('')
  const [membershipLegacyRole, setMembershipLegacyRole] = useState<LegacyRole>('admin')

  const editingCompany = useMemo(() => {
    return companies.find((company) => company.id === editingCompanyId) ?? null
  }, [companies, editingCompanyId])

  const activePlans = useMemo(() => plans.filter((plan) => plan.active), [plans])

  const summary = useMemo(() => {
    return {
      total: companies.length,
      active: companies.filter((company) => company.platformAccessStatus === 'ACTIVE').length,
      test: companies.filter((company) => company.isTest).length,
      withLicense: companies.filter((company) => company.platformLicenses?.[0]).length,
    }
  }, [companies])

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

    setEditName(editingCompany.name)
    setEditIsTest(editingCompany.isTest)
    setEditAccessStatus(editingCompany.platformAccessStatus)
    setEditAccessReason(editingCompany.platformBlockedReason ?? '')
    setAssignPlanId('')
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
        isTest: editIsTest,
        platformAccessStatus: editAccessStatus,
        platformBlockedReason: editAccessReason || null,
      })

      if (assignPlanId) {
        await adminApi.assignCompanyLicense(editingCompany.id, {
          planId: assignPlanId,
          notes: 'Licença atribuída pelo painel admin',
        })
      }

      setSuccess('Empresa atualizada com sucesso.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar empresa.')
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
        <SummaryCard label="Teste" value={summary.test} />
      </section>

      <section className="card companies-card full-grid-card">
        <div className="section-title">
          <div>
            <p className="eyebrow compact">Grid</p>
            <h2>Empresas cadastradas</h2>
          </div>
          <span>{companies.length} empresa(s)</span>
        </div>

        <div className="company-grid-list company-grid-list-wide">
          {companies.map((company) => {
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
                <p>{accessLabels[company.platformAccessStatus]} · {license?.plan?.name ?? 'Sem licença'}</p>

                <div className="tile-meta-row">
                  <span className="badge muted-badge">{memberships.length} usuário(s)</span>
                  {company.isTest && <span className="badge">Teste</span>}
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

          {companies.length === 0 && <p className="muted">Nenhuma empresa cadastrada.</p>}
        </div>
      </section>

      {isCompanyModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsCompanyModalOpen(false)}>
          <form className="modal-card card" onSubmit={handleCreateCompany} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow compact">Cadastro</p>
                <h2>Nova empresa</h2>
                <p className="muted">Crie a empresa e o usuário inicial.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsCompanyModalOpen(false)} aria-label="Fechar modal">×</button>
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
                  <option key={plan.id} value={plan.id}>{plan.name} · {plan.isLifetime ? 'Vitalícia' : `${plan.durationMonths} meses`}</option>
                ))}
              </select>
            </label>

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

            <div className="form-grid">
              <label className="field">
                <span>Nome da empresa</span>
                <input value={editName} onChange={(event) => setEditName(event.target.value)} />
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

            <label className="check-row">
              <input type="checkbox" checked={editIsTest} onChange={(event) => setEditIsTest(event.target.checked)} />
              <span>Empresa de teste</span>
            </label>

            <label className="field">
              <span>Motivo do bloqueio/suspensão</span>
              <input value={editAccessReason} onChange={(event) => setEditAccessReason(event.target.value)} placeholder="Opcional" />
            </label>

            <div className="modal-section-grid">
              <div className="mini-card">
                <h3>Licença atual</h3>
                <p className="muted">{editingCompany.platformLicenses?.[0]?.plan?.name ?? 'Sem licença atribuída'}</p>
                <label className="field">
                  <span>Nova licença</span>
                  <select value={assignPlanId} onChange={(event) => setAssignPlanId(event.target.value)}>
                    <option value="">Manter atual</option>
                    {activePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.name} · {plan.isLifetime ? 'Vitalícia' : `${plan.durationMonths} meses`}</option>
                    ))}
                  </select>
                </label>
              </div>

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
            </div>

            <div className="mini-card users-access-card">
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

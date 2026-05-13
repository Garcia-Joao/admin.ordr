'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AdminIcon, AdminLoading, AdminShell } from '@/components/admin-shell'
import { adminApi, type Company, type CompanyMembership, type PlatformUser } from '@/lib/api'
import { useAdminGuard } from '@/lib/auth'

type SystemRole = 'ADMIN' | 'CUSTOM'

function getMembershipLabel(membership: CompanyMembership) {
  if (membership.systemRole === 'ADMIN') return 'Admin total'
  return membership.customRole?.name ?? 'Role customizada'
}

export default function UsuariosPage() {
  const { admin, loading } = useAdminGuard()
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [editingUserId, setEditingUserId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false)

  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('123456')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newCompanyId, setNewCompanyId] = useState('')
  const [newSystemRole, setNewSystemRole] = useState<SystemRole>('ADMIN')
  const [newCustomRoleId, setNewCustomRoleId] = useState('')

  const [companyId, setCompanyId] = useState('')
  const [systemRole, setSystemRole] = useState<SystemRole>('ADMIN')
  const [customRoleId, setCustomRoleId] = useState('')

  const editingUser = useMemo(() => users.find((user) => user.id === editingUserId) ?? null, [users, editingUserId])

  const availableCompanies = useMemo(() => {
    if (!editingUser) return companies
    const companyIds = new Set(editingUser.memberships.map((membership) => membership.company?.id ?? membership.companyId))
    return companies.filter((company) => !companyIds.has(company.id))
  }, [companies, editingUser])

  const selectedCompany = useMemo(() => {
    return companies.find((company) => company.id === companyId) ?? null
  }, [companies, companyId])

  const selectedNewCompany = useMemo(() => {
    return companies.find((company) => company.id === newCompanyId) ?? null
  }, [companies, newCompanyId])

  const summary = useMemo(() => {
    const multiCompanyUsers = users.filter((user) => user.memberships.length > 1).length
    const withoutCompany = users.filter((user) => user.memberships.length === 0).length

    return {
      total: users.length,
      multiCompanyUsers,
      withoutCompany,
      totalLinks: users.reduce((total, user) => total + user.memberships.length, 0),
    }
  }, [users])

  async function loadData() {
    const [usersResult, companiesResult] = await Promise.all([
      adminApi.listUsers(),
      adminApi.listCompanies(),
    ])

    setUsers(usersResult.users)
    setCompanies(companiesResult.companies)
  }

  useEffect(() => {
    if (!admin) return

    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários.')
    })
  }, [admin])

  useEffect(() => {
    if (!editingUser) return
    setCompanyId('')
    setSystemRole('ADMIN')
    setCustomRoleId('')
  }, [editingUser])

  useEffect(() => {
    setCustomRoleId('')
  }, [companyId, systemRole])

  useEffect(() => {
    setNewCustomRoleId('')
  }, [newCompanyId, newSystemRole])

  function resetCreateUserForm() {
    setNewUsername('')
    setNewPassword('123456')
    setNewName('')
    setNewPhone('')
    setNewCompanyId('')
    setNewSystemRole('ADMIN')
    setNewCustomRoleId('')
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      await adminApi.createUser({
        username: newUsername,
        password: newPassword,
        name: newName || null,
        phone: newPhone || null,
        companyId: newCompanyId || null,
        systemRole: newCompanyId ? newSystemRole : undefined,
        customRoleId: newCompanyId && newSystemRole === 'CUSTOM' ? newCustomRoleId || null : null,
        role: newCompanyId && newSystemRole === 'ADMIN' ? 'admin' : 'cashier',
      })

      resetCreateUserForm()
      setIsCreateUserModalOpen(false)
      setSuccess('Usuário criado com sucesso.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddCompanyAccess() {
    if (!editingUser || !companyId) return

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      await adminApi.upsertCompanyMembership({
        userId: editingUser.id,
        companyId,
        systemRole,
        customRoleId: systemRole === 'CUSTOM' ? customRoleId || null : null,
        role: systemRole === 'ADMIN' ? 'admin' : 'cashier',
      })

      setCompanyId('')
      setSystemRole('ADMIN')
      setCustomRoleId('')
      setSuccess('Empresa vinculada ao usuário.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vincular empresa.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateMembership(membership: CompanyMembership, nextSystemRole: SystemRole, nextCustomRoleId: string) {
    try {
      setError('')
      setSuccess('')

      await adminApi.updateCompanyMembership(membership.id, {
        systemRole: nextSystemRole,
        customRoleId: nextSystemRole === 'CUSTOM' ? nextCustomRoleId || null : null,
        role: nextSystemRole === 'ADMIN' ? 'admin' : membership.role,
      })

      setSuccess('Acesso atualizado.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar acesso.')
    }
  }

  async function handleRemoveMembership(membershipId: string) {
    try {
      setError('')
      setSuccess('')

      await adminApi.deleteCompanyMembership(membershipId)
      setSuccess('Acesso removido.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover acesso.')
    }
  }


  async function handleDeleteUser() {
    if (!editingUser) return

    const confirmed = window.confirm(`Excluir definitivamente o usuário "${editingUser.name || editingUser.username}"? Esta ação só é permitida para usuários sem vínculo com empresas.`)
    if (!confirmed) return

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      await adminApi.deleteUser(editingUser.id)
      setEditingUserId('')
      setSuccess('Usuário excluído com sucesso.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir usuário.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <AdminLoading />

  return (
    <AdminShell current="usuarios">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Acessos</p>
          <h1>Usuários</h1>
          <p className="muted">Veja todos os usuários e quais empresas cada um consegue acessar.</p>
        </div>
        <div className="heading-actions">
          <button className="primary-button action-button" onClick={() => setIsCreateUserModalOpen(true)}>
            <AdminIcon name="users" />
            Novo usuário
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <section className="stats-grid company-summary-grid">
        <SummaryCard label="Usuários" value={summary.total} />
        <SummaryCard label="Multiempresa" value={summary.multiCompanyUsers} />
        <SummaryCard label="Sem empresa" value={summary.withoutCompany} />
        <SummaryCard label="Vínculos" value={summary.totalLinks} />
      </section>

      <section className="card companies-card full-grid-card">
        <div className="section-title">
          <div>
            <p className="eyebrow compact">Grid</p>
            <h2>Usuários cadastrados</h2>
          </div>
          <span>{users.length} usuário(s)</span>
        </div>

        <div className="user-grid-list">
          {users.map((user) => (
            <button className="user-tile" key={user.id} onClick={() => setEditingUserId(user.id)}>
              <div className="company-tile-head">
                <span className="mini-icon"><AdminIcon name="users" /></span>
                <span className="badge muted-badge">{user.memberships.length} empresa(s)</span>
              </div>
              <strong>{user.name || user.username}</strong>
              <p>{user.username}{user.phone ? ` · ${user.phone}` : ''}</p>
              {user.memberships.length === 0 && <span className="delete-ready-pill">Sem empresa · pode excluir</span>}
              <div className="mini-user-stack">
                {user.memberships.slice(0, 4).map((membership) => (
                  <span key={membership.id}>{membership.company?.name} · {getMembershipLabel(membership)}</span>
                ))}
                {user.memberships.length > 4 && <span>+{user.memberships.length - 4} empresa(s)</span>}
              </div>
            </button>
          ))}

          {users.length === 0 && <p className="muted">Nenhum usuário cadastrado.</p>}
        </div>
      </section>


      {isCreateUserModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsCreateUserModalOpen(false)}>
          <form className="modal-card card" onSubmit={handleCreateUser} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow compact">Cadastro</p>
                <h2>Novo usuário</h2>
                <p className="muted">Crie o usuário e, se quiser, já vincule a uma empresa.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsCreateUserModalOpen(false)} aria-label="Fechar modal">×</button>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Usuário/login</span>
                <input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} />
              </label>
              <label className="field">
                <span>Senha inicial</span>
                <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              </label>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Nome</span>
                <input value={newName} onChange={(event) => setNewName(event.target.value)} />
              </label>
              <label className="field">
                <span>Telefone</span>
                <input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} />
              </label>
            </div>

            <div className="mini-card">
              <h3>Acesso inicial</h3>
              <p className="muted">As roles customizadas abaixo vêm somente da empresa selecionada.</p>

              <div className="form-grid compact-form-grid">
                <label className="field">
                  <span>Empresa</span>
                  <select value={newCompanyId} onChange={(event) => setNewCompanyId(event.target.value)}>
                    <option value="">Criar sem empresa</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </label>

                {newCompanyId && (
                  <label className="field">
                    <span>Acesso</span>
                    <select value={newSystemRole} onChange={(event) => setNewSystemRole(event.target.value as SystemRole)}>
                      <option value="ADMIN">Admin total</option>
                      <option value="CUSTOM">Role customizada</option>
                    </select>
                  </label>
                )}
              </div>

              {newCompanyId && newSystemRole === 'CUSTOM' && (
                <label className="field">
                  <span>Role da empresa</span>
                  <select value={newCustomRoleId} onChange={(event) => setNewCustomRoleId(event.target.value)}>
                    <option value="">Selecione</option>
                    {(selectedNewCompany?.accessRoles ?? []).map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={() => setIsCreateUserModalOpen(false)}>Cancelar</button>
              <button className="primary-button action-button" disabled={submitting}>{submitting ? 'Criando...' : 'Criar usuário'}</button>
            </div>
          </form>
        </div>
      )}

      {editingUser && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditingUserId('')}>
          <div className="modal-card card wide-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow compact">Usuário</p>
                <h2>{editingUser.name || editingUser.username}</h2>
                <p className="muted">{editingUser.username}{editingUser.phone ? ` · ${editingUser.phone}` : ''}</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setEditingUserId('')} aria-label="Fechar modal">×</button>
            </div>

            <div className="mini-card">
              <h3>Adicionar acesso a outra empresa</h3>
              <div className="form-grid compact-form-grid">
                <label className="field">
                  <span>Empresa</span>
                  <select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
                    <option value="">Selecione</option>
                    {availableCompanies.map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Acesso</span>
                  <select value={systemRole} onChange={(event) => setSystemRole(event.target.value as SystemRole)}>
                    <option value="ADMIN">Admin total</option>
                    <option value="CUSTOM">Role customizada</option>
                  </select>
                </label>
              </div>

              {systemRole === 'CUSTOM' && selectedCompany && (
                <label className="field">
                  <span>Role da empresa</span>
                  <select value={customRoleId} onChange={(event) => setCustomRoleId(event.target.value)}>
                    <option value="">Selecione</option>
                    {(selectedCompany.accessRoles ?? []).map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </label>
              )}

              <button className="ghost-button tile-action" type="button" disabled={!companyId || submitting} onClick={handleAddCompanyAccess}>
                <AdminIcon name="companies" />
                Vincular empresa
              </button>
            </div>

            <div className="mini-card users-access-card">
              <div className="section-title compact-section-title">
                <div>
                  <p className="eyebrow compact">Empresas</p>
                  <h3>Empresas acessíveis</h3>
                </div>
                <span>{editingUser.memberships.length} vínculo(s)</span>
              </div>

              <div className="access-list">
                {editingUser.memberships.map((membership) => {
                  const company = companies.find((item) => item.id === (membership.company?.id ?? membership.companyId))
                  return (
                    <MembershipRow
                      key={membership.id}
                      membership={membership}
                      company={company}
                      onUpdate={handleUpdateMembership}
                      onRemove={handleRemoveMembership}
                    />
                  )
                })}
                {editingUser.memberships.length === 0 && <p className="muted">Este usuário ainda não acessa nenhuma empresa.</p>}
              </div>
            </div>

            <div className="danger-zone-card">
              <div>
                <strong>Excluir usuário definitivamente</strong>
                <p>Remova os vínculos com empresas antes de excluir. O histórico fica preservado com autor nulo.</p>
              </div>
              <button
                className="ghost-button danger-button"
                type="button"
                disabled={editingUser.memberships.length > 0 || submitting}
                onClick={handleDeleteUser}
                title={editingUser.memberships.length > 0 ? 'Remova os acessos antes de excluir' : 'Excluir usuário'}
              >
                Excluir usuário
              </button>
            </div>
          </div>
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
  company?: Company
  onUpdate: (membership: CompanyMembership, systemRole: SystemRole, customRoleId: string) => void
  onRemove: (membershipId: string) => void
}) {
  const [systemRole, setSystemRole] = useState<SystemRole>(membership.systemRole)
  const [customRoleId, setCustomRoleId] = useState(membership.customRoleId ?? '')

  return (
    <div className="access-row">
      <div className="row-leading">
        <span className="mini-icon"><AdminIcon name="companies" /></span>
        <div>
          <strong>{membership.company?.name ?? company?.name ?? 'Empresa'}</strong>
          <p>{getMembershipLabel(membership)}</p>
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
            {(company?.accessRoles ?? []).map((role) => (
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

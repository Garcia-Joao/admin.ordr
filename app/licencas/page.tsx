'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AdminIcon, AdminLoading, AdminShell } from '@/components/admin-shell'
import { adminApi, type LicensePlan } from '@/lib/api'
import { useAdminGuard } from '@/lib/auth'

export default function LicencasPage() {
  const { admin, loading } = useAdminGuard()
  const [plans, setPlans] = useState<LicensePlan[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [durationMonths, setDurationMonths] = useState('6')
  const [isLifetime, setIsLifetime] = useState(false)

  const summary = useMemo(() => {
    return {
      total: plans.length,
      active: plans.filter((plan) => plan.active).length,
      lifetime: plans.filter((plan) => plan.isLifetime).length,
      recurring: plans.filter((plan) => !plan.isLifetime).length,
    }
  }, [plans])

  async function loadPlans() {
    const result = await adminApi.listLicensePlans()
    setPlans(result.plans)
  }

  useEffect(() => {
    if (!admin) return

    loadPlans().catch((err) => {
      setError(err instanceof Error ? err.message : 'Erro ao carregar licenças.')
    })
  }, [admin])

  function resetForm() {
    setName('')
    setSlug('')
    setDescription('')
    setDurationMonths('6')
    setIsLifetime(false)
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      await adminApi.createLicensePlan({
        name,
        slug,
        description: description || null,
        durationMonths: isLifetime ? null : Number(durationMonths),
        isLifetime,
        active: true,
      })

      resetForm()
      setIsPlanModalOpen(false)
      setSuccess('Licença criada com sucesso.')
      await loadPlans()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar licença.')
    } finally {
      setSubmitting(false)
    }
  }

  async function togglePlan(plan: LicensePlan) {
    try {
      setError('')
      setSuccess('')

      await adminApi.updateLicensePlan(plan.id, {
        active: !plan.active,
      })

      setSuccess(plan.active ? 'Licença desativada.' : 'Licença ativada.')
      await loadPlans()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar licença.')
    }
  }

  if (loading) return <AdminLoading />

  return (
    <AdminShell current="licencas">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Planos</p>
          <h1>Tipos de licença</h1>
          <p className="muted">Crie licenças mensais ou vitalícias para atribuir às empresas.</p>
        </div>
        <div className="heading-actions">
          <button className="primary-button action-button" onClick={() => setIsPlanModalOpen(true)}>
            <AdminIcon name="licenses" />
            Nova licença
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <section className="stats-grid company-summary-grid">
        <SummaryCard label="Tipos" value={summary.total} />
        <SummaryCard label="Ativas" value={summary.active} />
        <SummaryCard label="Vitalícias" value={summary.lifetime} />
        <SummaryCard label="Mensais" value={summary.recurring} />
      </section>

      <section className="card licenses-card">
        <div className="section-title">
          <div>
            <p className="eyebrow compact">Catálogo</p>
            <h2>Licenças cadastradas</h2>
          </div>
          <span>{plans.length} tipo(s)</span>
        </div>

        <div className="license-grid">
          {plans.map((plan) => (
            <div className="license-tile" key={plan.id}>
              <div className="company-tile-head">
                <span className="mini-icon"><AdminIcon name="licenses" /></span>
                <span className={plan.active ? 'badge success' : 'badge muted-badge'}>
                  {plan.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              <strong>{plan.name}</strong>
              <p>{plan.description || 'Sem descrição'}</p>
              <small>
                {plan.isLifetime ? 'Vitalícia' : `${plan.durationMonths} meses`} · {plan.slug}
              </small>

              <button className="ghost-button tile-action" onClick={() => togglePlan(plan)}>
                {plan.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          ))}

          {plans.length === 0 && <p className="muted">Nenhuma licença cadastrada.</p>}
        </div>
      </section>

      {isPlanModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsPlanModalOpen(false)}>
          <form className="modal-card card" onSubmit={handleCreate} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow compact">Cadastro</p>
                <h2>Nova licença</h2>
                <p className="muted">Configure um tipo de licença para atribuir às empresas.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsPlanModalOpen(false)} aria-label="Fechar modal">
                ×
              </button>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Nome</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Gold" />
              </label>

              <label className="field">
                <span>Slug</span>
                <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="gold" />
              </label>
            </div>

            <label className="field">
              <span>Descrição</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Licença Gold por 6 meses"
              />
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                checked={isLifetime}
                onChange={(event) => setIsLifetime(event.target.checked)}
              />
              <span>Licença vitalícia</span>
            </label>

            {!isLifetime && (
              <label className="field">
                <span>Duração em meses</span>
                <input
                  type="number"
                  min="1"
                  value={durationMonths}
                  onChange={(event) => setDurationMonths(event.target.value)}
                />
              </label>
            )}

            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={() => setIsPlanModalOpen(false)}>
                Cancelar
              </button>
              <button className="primary-button action-button" disabled={submitting}>
                {submitting ? 'Criando...' : 'Criar licença'}
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

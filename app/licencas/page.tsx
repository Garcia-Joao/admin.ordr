'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AdminLoading, AdminShell } from '@/components/admin-shell'
import { adminApi, type LicensePlan } from '@/lib/api'
import { useAdminGuard } from '@/lib/auth'

export default function LicencasPage() {
  const { admin, loading } = useAdminGuard()
  const [plans, setPlans] = useState<LicensePlan[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [durationMonths, setDurationMonths] = useState('6')
  const [isLifetime, setIsLifetime] = useState(false)

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

      setName('')
      setSlug('')
      setDescription('')
      setDurationMonths('6')
      setIsLifetime(false)
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
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <section className="grid-two align-start">
        <form className="card form-card" onSubmit={handleCreate}>
          <h2>Nova licença</h2>

          <label className="field">
            <span>Nome</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Gold" />
          </label>

          <label className="field">
            <span>Slug</span>
            <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="gold" />
          </label>

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

          <button className="primary-button" disabled={submitting}>
            {submitting ? 'Criando...' : 'Criar licença'}
          </button>
        </form>

        <div className="card">
          <div className="section-title">
            <h2>Licenças cadastradas</h2>
            <span>{plans.length} tipo(s)</span>
          </div>

          <div className="list-stack">
            {plans.map((plan) => (
              <div className="list-row license-row" key={plan.id}>
                <div>
                  <strong>{plan.name}</strong>
                  <p>{plan.description || 'Sem descrição'}</p>
                  <small>
                    {plan.isLifetime ? 'Vitalícia' : `${plan.durationMonths} meses`} · {plan.slug}
                  </small>
                </div>

                <button className="ghost-button" onClick={() => togglePlan(plan)}>
                  {plan.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            ))}

            {plans.length === 0 && <p className="muted">Nenhuma licença cadastrada.</p>}
          </div>
        </div>
      </section>
    </AdminShell>
  )
}

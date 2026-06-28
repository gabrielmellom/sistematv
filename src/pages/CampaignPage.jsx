import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminLayout } from '../components/AdminLayout'
import { adminLogout, deletePoll, getPoll, updatePoll } from '../api'
import { getPollMetrics } from '../utils'

export function CampaignPage() {
  const { pollId } = useParams()
  const navigate = useNavigate()
  const [live, setLive] = useState(null)
  const [form, setForm] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleLogout() {
    adminLogout()
    navigate('/admin/login')
  }

  useEffect(() => {
    let mounted = true
    if (!pollId) return undefined

    async function loadOnce() {
      try {
        const row = await getPoll(pollId)
        if (!mounted) return
        setLive(row)
        setForm((current) =>
          current || {
            campaignName: row.campaignName || '',
            question: row.question || '',
            options: (row.options || []).map((option) => ({ ...option })),
            participationFields: row.participationFields || ['Nome'],
            status: row.status || 'open',
          },
        )
      } catch {
        if (mounted) setNotFound(true)
      }
    }

    loadOnce()
    const intervalId = setInterval(async () => {
      try {
        const row = await getPoll(pollId)
        if (mounted) setLive(row)
      } catch {
        /* ignora falhas pontuais do polling */
      }
    }, 10000)

    return () => {
      mounted = false
      clearInterval(intervalId)
    }
  }, [pollId])

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateOption(optionId, value) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option) =>
        option.id === optionId ? { ...option, text: value } : option,
      ),
    }))
  }

  function addOption() {
    setForm((current) => ({
      ...current,
      options: [...current.options, { id: crypto.randomUUID(), text: '', votes: 0 }],
    }))
  }

  function removeOption(optionId) {
    setForm((current) => ({
      ...current,
      options: current.options.filter((option) => option.id !== optionId),
    }))
  }

  function updateParticipationField(index, value) {
    setForm((current) => ({
      ...current,
      participationFields: current.participationFields.map((field, itemIndex) =>
        itemIndex === index ? value : field,
      ),
    }))
  }

  function addParticipationField() {
    setForm((current) => ({
      ...current,
      participationFields: [...current.participationFields, ''],
    }))
  }

  function removeParticipationField(index) {
    setForm((current) => ({
      ...current,
      participationFields: current.participationFields.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }))
  }

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    const cleanOptions = form.options
      .map((option) => ({ ...option, text: option.text.trim() }))
      .filter((option) => option.text)

    if (cleanOptions.length < 2) {
      setError('Cadastre pelo menos duas opcoes.')
      return
    }

    setSaving(true)
    try {
      await updatePoll(pollId, {
        campaignName: form.campaignName,
        question: form.question,
        options: cleanOptions,
        participationFields: form.participationFields,
        status: form.status,
      })
      setMessage('Campanha atualizada com sucesso.')
    } catch (saveError) {
      console.error(saveError)
      setError('Nao foi possivel salvar. Verifique login/API.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus() {
    const nextStatus = form.status === 'closed' ? 'open' : 'closed'
    setForm((current) => ({ ...current, status: nextStatus }))
    try {
      await updatePoll(pollId, { status: nextStatus })
      setMessage(nextStatus === 'closed' ? 'Enquete encerrada.' : 'Enquete reaberta.')
    } catch {
      setError('Nao foi possivel alterar o status.')
    }
  }

  async function handleDelete() {
    if (!window.confirm('Excluir esta campanha? Esta acao nao pode ser desfeita.')) return
    try {
      await deletePoll(pollId)
      navigate('/admin')
    } catch {
      setError('Nao foi possivel excluir a campanha.')
    }
  }

  if (notFound) {
    return (
      <AdminLayout
        title="Campanha nao encontrada"
        subtitle="Volte ao painel e tente novamente"
        onLogout={handleLogout}
        onBack={() => navigate('/admin')}
      >
        <section className="admin-panel admin-empty">
          <Link to="/admin">Voltar ao painel</Link>
        </section>
      </AdminLayout>
    )
  }

  if (!form) {
    return (
      <AdminLayout
        title="Carregando..."
        subtitle="Buscando dados da campanha"
        onLogout={handleLogout}
        onBack={() => navigate('/admin')}
      >
        <section className="admin-panel admin-empty">
          <p>Aguarde um momento</p>
        </section>
      </AdminLayout>
    )
  }

  const metrics = getPollMetrics(live?.options || form.options)
  const isClosed = form.status === 'closed'

  return (
    <AdminLayout
      title={form.campaignName}
      subtitle={form.question}
      onLogout={handleLogout}
      onBack={() => navigate('/admin')}
    >
      {message && <p className="admin-alert admin-alert-success">{message}</p>}
      {error && <p className="admin-alert admin-alert-error">{error}</p>}

      <section className="admin-panel admin-panel--flat">
        <div className="admin-quick-links">
          <Link to={`/tv/${pollId}`} target="_blank" rel="noreferrer">
            TV ao vivo
          </Link>
          <Link to={`/vote/${pollId}`} target="_blank" rel="noreferrer">
            Pagina do ouvinte
          </Link>
          <span className={`status-pill ${isClosed ? 'closed' : 'open'}`}>
            {isClosed ? 'Encerrada' : 'Ativa'}
          </span>
        </div>
      </section>

      <section className="admin-panel">
        <h2 className="admin-section-title">Editar campanha</h2>
        <form className="admin-form" onSubmit={handleSave}>
          <label>
            Nome da campanha
            <input
              value={form.campaignName}
              onChange={(event) => updateField('campaignName', event.target.value)}
              required
            />
          </label>

          <label>
            Pergunta da enquete
            <input
              value={form.question}
              onChange={(event) => updateField('question', event.target.value)}
              required
            />
          </label>

          <fieldset className="admin-fieldset">
            <legend>Opcoes de resposta</legend>
            {form.options.map((option) => (
              <div key={option.id} className="row-with-remove">
                <input
                  value={option.text}
                  onChange={(event) => updateOption(option.id, event.target.value)}
                  placeholder="Texto da opcao"
                  required
                />
                <span className="vote-chip-light">{option.votes || 0} votos</span>
                <button
                  type="button"
                  className="btn-remove"
                  disabled={form.options.length <= 2}
                  onClick={() => removeOption(option.id)}
                >
                  Remover
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={addOption}>
              + Adicionar opcao
            </button>
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend>Campos de participacao</legend>
            {form.participationFields.map((field, index) => (
              <div key={index} className="row-with-remove">
                <input
                  value={field}
                  onChange={(event) => updateParticipationField(index, event.target.value)}
                  placeholder="Ex.: Bairro"
                />
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removeParticipationField(index)}
                >
                  Remover
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={addParticipationField}>
              + Adicionar campo
            </button>
          </fieldset>

          <div className="admin-form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
            <button type="button" className="btn-secondary" onClick={handleToggleStatus}>
              {isClosed ? 'Reabrir enquete' : 'Encerrar enquete'}
            </button>
            <button type="button" className="btn-danger-outline" onClick={handleDelete}>
              Excluir campanha
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <h2 className="admin-section-title">Resultados ao vivo</h2>
        <p className="admin-muted">Total de votos: {metrics.totalVotes}</p>
        {metrics.rows.map((row) => (
          <div key={row.id} className="admin-result-row">
            <span>{row.text}</span>
            <strong>
              {row.percentage}% ({row.voteCount})
            </strong>
          </div>
        ))}
      </section>
    </AdminLayout>
  )
}

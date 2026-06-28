import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminLayout } from '../components/AdminLayout'
import { adminLogout, createPoll, deletePoll, getAdminPolls } from '../api'
import { getPollMetrics } from '../utils'

const DEFAULT_OPTION_COUNT = 3

function buildDefaultOptions() {
  return Array.from({ length: DEFAULT_OPTION_COUNT }, (_, index) => ({
    id: crypto.randomUUID(),
    text: `Opcao ${index + 1}`,
    votes: 0,
  }))
}

export function AdminPage() {
  const navigate = useNavigate()
  const [view, setView] = useState('home')
  const [campaignName, setCampaignName] = useState('')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(buildDefaultOptions)
  const [fields, setFields] = useState(['Nome'])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [createdId, setCreatedId] = useState('')
  const [polls, setPolls] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleLogout() {
    adminLogout()
    navigate('/admin/login')
  }

  async function loadPolls() {
    try {
      const rows = await getAdminPolls()
      setPolls(rows)
      setError('')
    } catch {
      setError('Falha para carregar campanhas. Verifique login/API.')
    }
  }

  useEffect(() => {
    if (view !== 'list') return undefined

    loadPolls()
    const intervalId = setInterval(loadPolls, 8000)
    return () => clearInterval(intervalId)
  }, [view])

  function handleOptionChange(optionId, value) {
    setOptions((current) =>
      current.map((option) => (option.id === optionId ? { ...option, text: value } : option)),
    )
  }

  function handleFieldChange(fieldIndex, value) {
    setFields((current) => current.map((field, index) => (index === fieldIndex ? value : field)))
  }

  async function handleCreateCampaign(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setCreatedId('')

    const cleanName = campaignName.trim()
    const cleanQuestion = question.trim()
    const cleanOptions = options.map((option) => option.text.trim()).filter(Boolean)
    const cleanFields = fields.map((field) => field.trim()).filter(Boolean)

    if (!cleanName || !cleanQuestion) {
      setError('Preencha o nome da campanha e a pergunta.')
      return
    }

    if (cleanOptions.length < 2) {
      setError('Cadastre pelo menos duas opcoes de resposta.')
      return
    }

    setLoading(true)
    try {
      const response = await createPoll({
        campaignName: cleanName,
        question: cleanQuestion,
        options: cleanOptions.map((text) => ({
          id: crypto.randomUUID(),
          text,
          votes: 0,
        })),
        participationFields: cleanFields.length > 0 ? cleanFields : ['Nome'],
        tvLabel: 'BAND FM JUINA',
      })

      setCreatedId(response.id)
      setCampaignName('')
      setQuestion('')
      setOptions(buildDefaultOptions())
      setFields(['Nome'])
      setMessage('Enquete criada com sucesso!')
    } catch (createError) {
      setError('Nao foi possivel criar a campanha. Verifique login/API.')
      console.error(createError)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeletePoll(pollId, name) {
    if (!window.confirm(`Excluir "${name}"?\n\nEsta acao nao pode ser desfeita.`)) return

    setDeletingId(pollId)
    setError('')
    setMessage('')

    try {
      await deletePoll(pollId)
      setPolls((current) => current.filter((poll) => poll.id !== pollId))
      setMessage('Campanha excluida com sucesso.')
    } catch (deleteError) {
      console.error(deleteError)
      setError(deleteError.message || 'Nao foi possivel excluir a campanha.')
    } finally {
      setDeletingId('')
    }
  }

  const activePolls = polls.filter((poll) => poll.status !== 'closed')

  const pageMeta = {
    home: {
      title: 'Painel de Enquetes',
      subtitle: 'Gerencie enquetes ao vivo para a TV',
    },
    create: {
      title: 'Nova enquete',
      subtitle: 'Preencha os dados e publique na TV',
    },
    list: {
      title: 'Enquetes ativas',
      subtitle: `${activePolls.length} ativa(s) · ${polls.length} total`,
    },
  }

  const { title, subtitle } = pageMeta[view]

  return (
    <AdminLayout
      title={title}
      subtitle={subtitle}
      onLogout={handleLogout}
      onBack={view !== 'home' ? () => setView('home') : undefined}
      centered={view === 'home'}
      wide={view === 'list'}
    >
      {message && <p className="admin-alert admin-alert-success">{message}</p>}
      {error && <p className="admin-alert admin-alert-error">{error}</p>}

      {view === 'home' && (
        <section className="admin-home">
          <button type="button" className="admin-action-card" onClick={() => setView('create')}>
            <span className="admin-action-icon">+</span>
            <strong>Criar nova enquete</strong>
            <span>Monte perguntas, opcoes e campos de participacao</span>
          </button>

          <button
            type="button"
            className="admin-action-card admin-action-card-secondary"
            onClick={() => {
              setView('list')
              loadPolls()
            }}
          >
            <span className="admin-action-icon">◎</span>
            <strong>Ver enquetes ativas</strong>
            <span>Gerencie campanhas, TV ao vivo e resultados</span>
          </button>
        </section>
      )}

      {view === 'create' && (
        <section className="admin-panel">
          <form onSubmit={handleCreateCampaign} className="admin-form">
            <label>
              Nome da campanha
              <input
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder="Ex.: Melhor musica da semana"
                required
              />
            </label>

            <label>
              Pergunta da enquete
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ex.: Qual hit mais tocou seu coracao?"
                required
              />
            </label>

            <fieldset className="admin-fieldset">
              <legend>Opcoes de resposta</legend>
              {options.map((option) => (
                <div key={option.id} className="row-with-remove">
                  <input
                    value={option.text}
                    onChange={(event) => handleOptionChange(option.id, event.target.value)}
                    placeholder="Texto da opcao"
                    required
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    disabled={options.length <= 2}
                    onClick={() =>
                      setOptions((current) => current.filter((item) => item.id !== option.id))
                    }
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setOptions((current) => [
                    ...current,
                    { id: crypto.randomUUID(), text: '', votes: 0 },
                  ])
                }
              >
                + Adicionar opcao
              </button>
            </fieldset>

            <fieldset className="admin-fieldset">
              <legend>Campos de participacao</legend>
              {fields.map((field, index) => (
                <div key={index} className="row-with-remove">
                  <input
                    value={field}
                    onChange={(event) => handleFieldChange(index, event.target.value)}
                    placeholder="Ex.: Bairro"
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() =>
                      setFields((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setFields((current) => [...current, ''])}
              >
                + Adicionar campo
              </button>
            </fieldset>

            <button type="submit" className="btn-primary btn-block" disabled={loading}>
              {loading ? 'Criando...' : 'Criar enquete'}
            </button>
          </form>

          {createdId && (
            <div className="admin-created-links">
              <Link to={`/admin/campaign/${createdId}`}>Gerenciar campanha</Link>
              <Link to={`/tv/${createdId}`} target="_blank" rel="noreferrer">
                Abrir TV ao vivo
              </Link>
            </div>
          )}
        </section>
      )}

      {view === 'list' && (
        <section className="admin-panel admin-panel--flat">
          {polls.length === 0 ? (
            <div className="admin-empty">
              <p>Nenhuma enquete cadastrada ainda.</p>
              <button type="button" className="btn-primary" onClick={() => setView('create')}>
                Criar primeira enquete
              </button>
            </div>
          ) : (
            <div className="admin-poll-list">
              {polls.map((poll) => {
                const metrics = getPollMetrics(poll.options)
                const isClosed = poll.status === 'closed'

                return (
                  <article
                    className={`admin-poll-row ${isClosed ? 'is-closed' : ''}`}
                    key={poll.id}
                  >
                    <div className="admin-poll-row-main">
                      <div className="admin-poll-row-meta">
                        <span className={`status-pill ${isClosed ? 'closed' : 'open'}`}>
                          {isClosed ? 'Encerrada' : 'Ativa'}
                        </span>
                        <span className="vote-chip-light">{metrics.totalVotes} votos</span>
                      </div>

                      <div className="admin-poll-row-text">
                        <h3>{poll.campaignName}</h3>
                        <p>{poll.question}</p>
                      </div>
                    </div>

                    <div className="admin-poll-row-actions">
                      <Link to={`/admin/campaign/${poll.id}`}>Gerenciar</Link>
                      <Link to={`/tv/${poll.id}`} target="_blank" rel="noreferrer">
                        TV ao vivo
                      </Link>
                      <Link to={`/vote/${poll.id}`} target="_blank" rel="noreferrer">
                        Votacao
                      </Link>
                      <button
                        type="button"
                        className="btn-danger-outline btn-compact"
                        disabled={deletingId === poll.id}
                        onClick={() => handleDeletePoll(poll.id, poll.campaignName)}
                      >
                        {deletingId === poll.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}
    </AdminLayout>
  )
}

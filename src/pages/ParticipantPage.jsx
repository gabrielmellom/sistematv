import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPoll, submitVote } from '../api'
import { getPollMetrics } from '../utils'

export function ParticipantPage() {
  const { pollId } = useParams()
  const [poll, setPoll] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [fieldsData, setFieldsData] = useState({})
  const [selectedOption, setSelectedOption] = useState('')
  const [loading, setLoading] = useState(false)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    if (!pollId) return undefined

    async function loadPoll() {
      try {
        const row = await getPoll(pollId)
        if (mounted) setPoll(row)
      } catch {
        if (mounted) setNotFound(true)
      }
    }

    loadPoll()
    return () => { mounted = false }
  }, [pollId])

  useEffect(() => {
    if (!pollId) return
    if (window.localStorage.getItem(`poll_voted_${pollId}`) === 'true') {
      setAlreadyVoted(true)
    }
  }, [pollId])

  async function handleVoteSubmit(event) {
    event.preventDefault()
    if (!pollId || !selectedOption) return

    setLoading(true)
    setError('')

    try {
      await submitVote(pollId, { selectedOption, participantData: fieldsData || {} })
      window.localStorage.setItem(`poll_voted_${pollId}`, 'true')
      setAlreadyVoted(true)
    } catch (submitError) {
      const text = submitError?.message || ''
      if (text.includes('ja votou') || text.includes('already')) {
        window.localStorage.setItem(`poll_voted_${pollId}`, 'true')
        setAlreadyVoted(true)
      } else if (text.includes('encerrada')) {
        setError('Esta enquete foi encerrada.')
      } else {
        setError('Nao foi possivel enviar seu voto. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (notFound) {
    return (
      <div className="vote-shell">
        <div className="vote-card">
          <p className="vote-brand">BAND FM JUINA</p>
          <h1>Enquete indisponivel</h1>
          <p>Confira o link e tente novamente.</p>
        </div>
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="vote-shell">
        <div className="vote-card">
          <p className="vote-brand">BAND FM JUINA</p>
          <div className="vote-spinner" />
        </div>
      </div>
    )
  }

  if (alreadyVoted) {
    const metrics = getPollMetrics(poll.options)
    return (
      <div className="vote-shell">
        <div className="vote-card">
          <p className="vote-brand">BAND FM JUINA</p>
          <div className="vote-thanks">
            <span className="vote-thanks-icon">✓</span>
            <h2>Voto confirmado!</h2>
            <p>Obrigado por participar.</p>
          </div>
          <h3 className="vote-results-title">Resultado parcial</h3>
          <div className="vote-results">
            {metrics.rows.map((row) => {
              const isLeading = row.voteCount > 0 && row.voteCount === Math.max(...metrics.rows.map(r => r.voteCount))
              return (
                <div key={row.id} className="vote-result-row">
                  <div className="vote-result-labels">
                    <span>{row.text}</span>
                    <strong>{row.percentage}%</strong>
                  </div>
                  <div className="vote-result-bar">
                    <div
                      className={`vote-result-fill ${isLeading ? 'is-leading' : ''}`}
                      style={{ width: `${row.percentage}%` }}
                    />
                  </div>
                  <span className="vote-result-count">{row.voteCount} voto(s)</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const isClosed = poll.status === 'closed'

  return (
    <div className="vote-shell">
      <div className="vote-card">
        <p className="vote-brand">BAND FM JUINA</p>
        <h1 className="vote-campaign">{poll.campaignName}</h1>
        <p className="vote-question">{poll.question}</p>

        {isClosed ? (
          <div className="vote-closed">
            <span>🔒</span>
            <p>Esta enquete foi encerrada.</p>
          </div>
        ) : (
          <form onSubmit={handleVoteSubmit} className="vote-form">
            {poll.participationFields?.map((field) => (
              <div key={field} className="vote-field">
                <label htmlFor={`field-${field}`}>{field}</label>
                <input
                  id={`field-${field}`}
                  type="text"
                  value={fieldsData[field] || ''}
                  onChange={(e) =>
                    setFieldsData((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                  placeholder={`Informe seu ${field.toLowerCase()}`}
                  required
                />
              </div>
            ))}

            <p className="vote-choose-label">Escolha sua resposta</p>

            <div className="vote-options">
              {poll.options?.map((option) => (
                <label
                  key={option.id}
                  className={`vote-option ${selectedOption === option.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="voteOption"
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    required
                  />
                  <span className="vote-option-check" />
                  <span className="vote-option-text">{option.text}</span>
                </label>
              ))}
            </div>

            {error && <p className="vote-error">{error}</p>}

            <button
              type="submit"
              className="vote-submit"
              disabled={loading || !selectedOption}
            >
              {loading ? (
                <span className="vote-spinner-sm" />
              ) : (
                'Confirmar voto'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

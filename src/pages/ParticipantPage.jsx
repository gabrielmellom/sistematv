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
  const [message, setMessage] = useState('')
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
    return () => {
      mounted = false
    }
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
    setMessage('')
    setError('')

    try {
      await submitVote(pollId, {
        selectedOption,
        participantData: fieldsData || {},
      })

      window.localStorage.setItem(`poll_voted_${pollId}`, 'true')
      setAlreadyVoted(true)
      setMessage('Voto registrado com sucesso! Obrigado por participar.')
    } catch (submitError) {
      const text = submitError?.message || ''
      if (text.includes('ja votou')) {
        window.localStorage.setItem(`poll_voted_${pollId}`, 'true')
        setAlreadyVoted(true)
        setError('Este dispositivo ja votou nesta enquete.')
      } else if (text.includes('encerrada')) {
        setError('Esta enquete foi encerrada.')
      } else {
        setError('Nao foi possivel enviar seu voto agora. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (notFound) {
    return (
      <main className="page">
        <section className="card">
          <h1>Enquete indisponivel</h1>
          <p>Confira o link e tente novamente.</p>
        </section>
      </main>
    )
  }

  if (!poll) {
    return (
      <main className="page">
        <section className="card">
          <h1>Carregando enquete...</h1>
        </section>
      </main>
    )
  }

  const isClosed = poll.status === 'closed'

  if (alreadyVoted) {
    const metrics = getPollMetrics(poll.options)
    return (
      <main className="page">
        <section className="card">
          <h1>{poll.campaignName}</h1>
          <p>{poll.question}</p>
          <p className="success">Voto confirmado! Obrigado por participar.</p>
          <h3>Parcial</h3>
          {metrics.rows.map((row) => (
            <div key={row.id} className="progress-row">
              <span>{row.text}</span>
              <strong>{row.percentage}%</strong>
            </div>
          ))}
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <section className="card">
        <h1>{poll.campaignName}</h1>
        <p>{poll.question}</p>

        {isClosed ? (
          <p className="error">Esta enquete foi encerrada. Nao e mais possivel votar.</p>
        ) : (
          <form className="form" onSubmit={handleVoteSubmit}>
            {poll.participationFields?.map((field) => (
              <label key={field}>
                {field}
                <input
                  value={fieldsData[field] || ''}
                  onChange={(event) =>
                    setFieldsData((current) => ({ ...current, [field]: event.target.value }))
                  }
                  required
                />
              </label>
            ))}

            <div>
              <h3>Escolha sua resposta</h3>
              {poll.options?.map((option) => (
                <label key={option.id} className="radio-row">
                  <input
                    type="radio"
                    name="voteOption"
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={(event) => setSelectedOption(event.target.value)}
                    required
                  />
                  {option.text}
                </label>
              ))}
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar voto'}
            </button>
          </form>
        )}

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { getPoll } from '../api'
import { getPollMetrics, getTvOptionsLayoutClass } from '../utils'

const REFRESH_EVERY_MS = 10000

export function TvLivePage() {
  const { pollId } = useParams()
  const [poll, setPoll] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [updatedAt, setUpdatedAt] = useState('')

  useEffect(() => {
    let active = true

    async function loadPoll() {
      if (!pollId) return
      try {
        const row = await getPoll(pollId)
        if (!active) return
        setPoll(row)
        setUpdatedAt(new Date().toLocaleTimeString('pt-BR'))
      } catch {
        if (active) setNotFound(true)
      }
    }

    loadPoll()
    const intervalId = setInterval(loadPoll, REFRESH_EVERY_MS)

    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [pollId])

  if (notFound) {
    return (
      <main className="tv-stage">
        <section className="tv-banner">
          <div className="tv-banner-info">
            <h1 className="tv-question">Campanha nao encontrada</h1>
            <Link to="/admin">Voltar para admin</Link>
          </div>
        </section>
      </main>
    )
  }

  if (!poll) {
    return (
      <main className="tv-stage">
        <section className="tv-banner">
          <div className="tv-banner-info">
            <h1 className="tv-question">Carregando...</h1>
          </div>
        </section>
      </main>
    )
  }

  const voteUrl = `${window.location.origin}/vote/${pollId}`
  const metrics = getPollMetrics(poll.options)
  const leadingVotes = Math.max(0, ...metrics.rows.map((row) => row.voteCount))
  const layoutClass = getTvOptionsLayoutClass(metrics.rows.length)

  return (
    <main className="tv-stage">
      <section className="tv-banner">
        <div className="tv-banner-info">
          <div className="tv-top">
            <span className="badge">{poll.tvLabel || 'BAND FM JUINA'}</span>
            <span className="tv-question">{poll.question}</span>
            <span className="tv-total">{metrics.totalVotes} votos</span>
          </div>

          <div className={`tv-options-grid ${layoutClass}`}>
            {metrics.rows.map((row) => {
              const isLeading = row.voteCount > 0 && row.voteCount === leadingVotes
              return (
                <div className={`tv-option ${isLeading ? 'is-leading' : ''}`} key={row.id}>
                  <div className="tv-option-head">
                    <span className="tv-option-name">{row.text}</span>
                    <strong className="tv-option-pct">{row.percentage}%</strong>
                  </div>
                  <div className="tv-bar">
                    <div className="tv-bar-fill" style={{ width: `${row.percentage}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="tv-qr">
          <div className="tv-qr-frame">
            <QRCodeSVG value={voteUrl} size={150} marginSize={1} level="M" />
          </div>
          <div className="tv-qr-text">
            <strong>Aponte a camera</strong>
            <span>e vote agora</span>
          </div>
        </div>
      </section>
      <span className="tv-updated">atualizado {updatedAt || '...'}</span>
    </main>
  )
}

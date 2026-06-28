import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin, isAdminLoggedIn } from '../api'

export function LoginPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAdminLoggedIn()) {
      navigate('/admin')
    }
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await adminLogin(password)
      navigate('/admin')
    } catch (loginError) {
      console.error(loginError)
      setError('Senha invalida ou API offline.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-shell">
      <main className="admin-login">
        <section className="admin-login-card">
          <span className="admin-brand-badge">BAND FM JUINA</span>
          <h1>Painel Admin</h1>
          <p>Acesso restrito para criacao e controle das enquetes ao vivo.</p>

          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Senha de acesso
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </label>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar no painel'}
            </button>
          </form>

          {error && <p className="admin-alert admin-alert-error">{error}</p>}
        </section>
      </main>
    </div>
  )
}

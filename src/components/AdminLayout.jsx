export function AdminLayout({ title, subtitle, onLogout, onBack, centered, wide, children }) {
  const pageClass = [
    'admin-page',
    centered ? 'admin-page--centered' : '',
    wide ? 'admin-page--wide' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="admin-shell">
      <main className={pageClass}>
        <div className="admin-topbar">
          {onBack ? (
            <button type="button" className="btn-back" onClick={onBack}>
              ← Voltar
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="btn-ghost" onClick={onLogout}>
            Sair
          </button>
        </div>

        <header className="admin-hero">
          <span className="admin-brand-badge">BAND FM JUINA</span>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  )
}

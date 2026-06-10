/* cuadrala-detail.jsx — Match detail with unified court + join/pay states */

const DEMO_MATCH = {
  status: 'Programado', cat: '7ma', club: 'Club Cuádrala', court: 'Cancha Rexona',
  loc: 'Las Mercedes, Caracas', day: 'LUN', date: '02 Jun', time: '17:00',
  surface: 'Exterior', ranked: true, price: 6.25, total: 4,
};
const ME = { name: 'Daniel R.', initials: 'D', idx: 0, elo: 1240 };
// base lineup: one empty seat (A-r) for "you" to take, next to Carlos
const DEMO_COURT = {
  A: { d: { name: 'Carlos M.', initials: 'C', idx: 1, elo: 1180, status: 'paid' }, r: null },
  B: { d: { name: 'Luis P.', initials: 'L', idx: 2, elo: 1310, status: 'paid' }, r: { name: 'Andrés G.', initials: 'A', idx: 3, elo: 1205, status: 'paid' } },
};

function InfoTile({ icon, label, children }) {
  return (
    <div style={{ flex: 1, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', marginBottom: 6 }}>
        <Icon name={icon} size={15} /><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function Banner({ phase }) {
  const cfg = {
    browse: { icon: 'users', tint: 'var(--surface)', border: 'var(--line)', iconColor: 'var(--muted)', title: 'Únete a esta partida', sub: 'Elige tu lugar en la cancha 👇' },
    joined: { icon: 'check', tint: 'var(--green-bg)', border: 'color-mix(in srgb, var(--green) 35%, transparent)', iconColor: 'var(--green)', title: 'Te uniste a la partida', sub: 'Falta confirmar tu pago' },
    pending: { icon: 'clock', tint: 'color-mix(in srgb, var(--lime) 14%, transparent)', border: 'color-mix(in srgb, var(--lime) 45%, transparent)', iconColor: 'color-mix(in srgb, var(--lime) 75%, #8a9a00)', title: 'Pago en revisión', sub: 'El staff de la sede confirmará tu pago' },
    confirmed: { icon: 'check', tint: 'var(--green-bg)', border: 'color-mix(in srgb, var(--green) 35%, transparent)', iconColor: 'var(--green)', title: 'Ya estás anotado', sub: 'Tu pago está confirmado' },
    played: { icon: 'target', tint: 'var(--green-bg)', border: 'color-mix(in srgb, var(--green) 35%, transparent)', iconColor: 'var(--green)', title: 'Partida finalizada', sub: 'Resultado y ELO actualizados' },
  }[phase];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, padding: '14px 16px', borderRadius: 'var(--radius-card)', background: cfg.tint, border: `1.5px solid ${cfg.border}` }}>
      <Icon name={cfg.icon} size={22} stroke={2.4} style={{ color: cfg.iconColor }} />
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>{cfg.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{cfg.sub}</div>
      </div>
    </div>
  );
}

function MatchDetailScreen({ match = DEMO_MATCH, court = DEMO_COURT, joinedPos, payment = 'none', played, scores, onBack, onJoin, onPay, onLoadResult, onShare }) {
  const baseCount = ['A', 'B'].reduce((n, t) => n + (court[t].d ? 1 : 0) + (court[t].r ? 1 : 0), 0);
  const filled = baseCount + (joinedPos ? 1 : 0);
  const phase = played ? 'played' : !joinedPos ? 'browse' : payment === 'confirmed' ? 'confirmed' : payment === 'pending' ? 'pending' : 'joined';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <SheetHeader title="Detalle de partida" onBack={onBack}
        trailing={<button onClick={onShare} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text)', display: 'flex' }}><Icon name="arrowRight" size={20} /></button>} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 150px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, color: 'var(--green)', background: 'var(--green-bg)', padding: '5px 11px', borderRadius: 999 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--green)' }} />{played ? 'Finalizada' : match.status}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: '#15301a', background: 'var(--lime)', padding: '5px 11px', borderRadius: 999 }}>{match.cat}</span>
        </div>

        <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, letterSpacing: -0.5, color: 'var(--text)' }}>{match.club}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13.5, color: 'var(--muted)' }}>
          <Icon name="pin" size={15} />{match.court} · {match.loc}
        </div>

        <Banner phase={phase} />

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <InfoTile icon="calendar" label="Fecha">
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{match.day} {match.date}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{match.time} hs</div>
          </InfoTile>
          <InfoTile icon="info" label="Precio"><Price amount={match.price} suffix="p/p" align="left" /></InfoTile>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {match.ranked && <span style={detailChip}><Icon name="target" size={14} style={{ color: 'var(--green)' }} />Ranked · Afecta ELO</span>}
          <span style={detailChip}><Icon name="court" size={14} style={{ color: 'var(--muted)' }} />{match.surface}</span>
        </div>

        {/* lineup / court */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 12px' }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>{played ? 'Resultado' : 'En la cancha'}</h2>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', background: 'var(--green-bg)', padding: '3px 10px', borderRadius: 999 }}>{filled}/{match.total}</span>
        </div>
        <CourtView court={court} you={ME} joinedPos={joinedPos} payment={payment} onJoin={onJoin} readOnly={played} scores={played ? scores : null} />
        {played && (
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>Ganaste · ELO 1240 → 1254 (+14)</div>
        )}
      </div>

      {/* chat FAB */}
      <button style={{ all: 'unset', cursor: 'pointer', position: 'absolute', right: 20, bottom: 120, zIndex: 6, width: 50, height: 50, borderRadius: 16, background: 'var(--surface)', border: '1.5px solid var(--line)', boxShadow: '0 6px 16px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
        <Icon name="bell" size={22} />
      </button>

      {/* footer — changes by phase */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 20px 30px', background: 'linear-gradient(to top, var(--bg-2) 70%, transparent)', borderTop: '1px solid var(--line)' }}>
        {phase === 'browse' && (
          <button disabled style={{ ...footerCta, background: 'var(--surface-2)', color: 'var(--muted-2)', boxShadow: 'none', cursor: 'default' }}>
            <Icon name="users" size={20} />Toca un lugar para unirte
          </button>
        )}
        {phase === 'joined' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 10, color: 'var(--muted)' }}>
              <span>Tu lugar reservado</span>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{usd(match.price)}<span style={{ fontWeight: 500, color: 'var(--muted)' }}> · {bs(match.price)}</span></span>
            </div>
            <button onClick={onPay} style={{ ...footerCta, background: 'var(--green)', color: '#fff', boxShadow: '0 8px 20px rgba(23,163,74,.4)' }}>
              <Icon name="info" size={20} />Pagar ahora · {usd(match.price)}
            </button>
          </>
        )}
        {(phase === 'pending' || phase === 'confirmed') && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onShare} style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', width: 54, height: 54, borderRadius: 'var(--radius-btn)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1.5px solid var(--line)', color: 'var(--text)' }}>
              <Icon name="arrowRight" size={22} />
            </button>
            <button onClick={onLoadResult} style={{ ...footerCta, flex: 1, background: 'var(--green)', color: '#fff', boxShadow: '0 8px 20px rgba(23,163,74,.4)' }}>
              <Icon name="target" size={20} />Cargar resultado
            </button>
          </div>
        )}
        {phase === 'played' && (
          <button onClick={onBack} style={{ ...footerCta, background: 'var(--surface-2)', color: 'var(--text)', border: '1.5px solid var(--line)', boxShadow: 'none' }}>Volver al inicio</button>
        )}
      </div>
    </div>
  );
}
const detailChip = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--text)', background: 'var(--surface)', border: '1.5px solid var(--line)', padding: '7px 12px', borderRadius: 999 };
const footerCta = { all: 'unset', boxSizing: 'border-box', cursor: 'pointer', width: '100%', height: 54, borderRadius: 'var(--radius-btn)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 16, fontWeight: 800 };

Object.assign(window, { MatchDetailScreen, DEMO_MATCH, DEMO_COURT, ME, InfoTile });

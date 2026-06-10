/* cuadrala-court.jsx — Unified court/teams view (join a spot, see lineup) */

// court: { A:{d:player|null, r:player|null}, B:{d,r} }
// player: { name, initials, idx, elo, status:'paid'|'pending' , you? }
// you: player object to drop into the slot the user joins
// joinedPos: 'A-d' | 'A-r' | 'B-d' | 'B-r' | null
function CourtSpot({ player, teamAccent, joinable, isYou, onJoin, score }) {
  if (player) {
    const pending = player.status === 'pending';
    return (
      <div style={{
        flex: 1, height: 104, borderRadius: 14, padding: '10px 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
        background: 'var(--surface)', border: `2px solid ${isYou ? 'var(--lime)' : teamAccent}`,
        position: 'relative',
      }}>
        {isYou && <span style={{ position: 'absolute', top: 7, right: 7, fontSize: 9.5, fontWeight: 800, color: '#15301a', background: 'var(--lime)', padding: '1px 5px', borderRadius: 4 }}>TÚ</span>}
        <Avatar initials={player.initials} idx={player.idx} size={40} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name.split(' ')[0]}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: pending ? 'var(--lime)' : 'var(--green)' }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: pending ? 'var(--lime)' : 'var(--green)' }} />{pending ? 'Pendiente' : 'Pagado'}
        </span>
      </div>
    );
  }
  return (
    <button onClick={joinable ? onJoin : undefined} style={{
      all: 'unset', cursor: joinable ? 'pointer' : 'default', boxSizing: 'border-box',
      flex: 1, height: 104, borderRadius: 14,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
      border: `2px dashed ${joinable ? teamAccent : 'var(--line-strong)'}`,
      background: joinable ? 'color-mix(in srgb, var(--surface) 50%, transparent)' : 'transparent',
      color: joinable ? 'var(--text)' : 'var(--muted)', transition: 'all .15s',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 999, border: `1.5px dashed ${joinable ? teamAccent : 'var(--line-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: joinable ? teamAccent : 'var(--muted-2)' }}>
        <Icon name={joinable ? 'plus' : 'users'} size={18} />
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{joinable ? 'Unirme aquí' : 'Disponible'}</span>
    </button>
  );
}

function CourtView({ court, you, joinedPos, onJoin, payment = 'pending', readOnly, scores }) {
  const team = (key, accent) => {
    const labelColor = accent === 'var(--green)' ? 'var(--green)' : 'var(--lime)';
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, color: labelColor }}>Equipo {key}</span>
          {scores && <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)' }}>{scores[key]}</span>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['d', 'r'].map(pos => {
            const k = `${key}-${pos}`;
            let p = court[key][pos];
            const isYou = joinedPos === k;
            if (isYou) p = { ...you, you: true, status: payment === 'confirmed' ? 'paid' : 'pending' };
            const joinable = !readOnly && !p && joinedPos == null;
            return <CourtSpot key={k} player={p} teamAccent={accent} joinable={joinable} isYou={isYou} onJoin={() => onJoin(k)} />;
          })}
        </div>
      </div>
    );
  };
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-card)', padding: 14, border: '1.5px solid var(--line)' }}>
      {team('A', 'var(--green)')}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
        <div style={{ flex: 1, height: 2, background: 'repeating-linear-gradient(90deg, var(--line-strong) 0 6px, transparent 6px 12px)' }} />
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, color: 'var(--muted-2)' }}>RED</span>
        <div style={{ flex: 1, height: 2, background: 'repeating-linear-gradient(90deg, var(--line-strong) 0 6px, transparent 6px 12px)' }} />
      </div>
      {team('B', 'var(--lime)')}
    </div>
  );
}

Object.assign(window, { CourtView, CourtSpot });

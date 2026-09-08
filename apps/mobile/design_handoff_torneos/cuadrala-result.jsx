/* cuadrala-result.jsx — Load result flow: positions → sets → summary (+ELO) */

const RESULT_PLAYERS = [
  { name: 'Daniel R.', initials: 'D', elo: 1240, you: true },
  { name: 'Carlos M.', initials: 'C', elo: 1180 },
  { name: 'Luis P.', initials: 'L', elo: 1310 },
  { name: 'Andrés G.', initials: 'A', elo: 1205 },
];
const POS = [
  { key: 'A-d', team: 'A', label: 'Drive' },
  { key: 'A-r', team: 'A', label: 'Revés' },
  { key: 'B-d', team: 'B', label: 'Drive' },
  { key: 'B-r', team: 'B', label: 'Revés' },
];

// ── Step progress ─────────────────────────────────────────────────────────────
function StepProgress({ step, labels }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '14px 20px 4px' }}>
      {labels.map((l, i) => (
        <div key={l} style={{ flex: 1 }}>
          <div style={{ height: 4, borderRadius: 999, background: i <= step ? 'var(--green)' : 'var(--line-strong)', transition: 'background .25s' }} />
          <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 6, color: i === step ? 'var(--green)' : 'var(--muted-2)', textAlign: 'center' }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

// ── Court slot ────────────────────────────────────────────────────────────────
function CourtSlot({ pos, player, idx, selected, onClick, accent }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer', boxSizing: 'border-box', flex: 1, height: 96,
      borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
      background: player ? 'color-mix(in srgb, var(--surface) 92%, transparent)' : 'transparent',
      border: `2px ${player ? 'solid' : 'dashed'} ${selected ? 'var(--lime)' : accent}`,
      boxShadow: selected ? '0 0 0 3px color-mix(in srgb, var(--lime) 25%, transparent)' : 'none',
      transition: 'all .15s',
    }}>
      {player ? (
        <>
          <Avatar initials={player.initials} idx={idx} size={36} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{player.name.split(' ')[0]}</span>
        </>
      ) : (
        <>
          <Icon name="users" size={22} style={{ color: 'var(--muted)' }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>{pos.label}</span>
        </>
      )}
    </button>
  );
}

// ── Step 1: positions (tap to assign) ────────────────────────────────────────
function PositionsStep({ assign, setAssign, sel, setSel }) {
  const place = (posKey) => {
    setAssign(prev => {
      const next = { ...prev };
      // remove player from any current slot
      if (sel != null) { for (const k in next) if (next[k] === sel) delete next[k]; }
      if (next[posKey] != null && sel == null) { delete next[posKey]; return next; } // tap filled w/ none selected -> clear
      if (sel != null) next[posKey] = sel;
      return next;
    });
    setSel(null);
  };
  const assignedIdx = Object.values(assign);
  const pool = RESULT_PLAYERS.map((p, i) => i).filter(i => !assignedIdx.includes(i));
  const teamBox = (team, accent) => (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, color: accent === 'var(--green)' ? 'var(--green)' : 'var(--lime)', marginBottom: 8 }}>Equipo {team}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {POS.filter(p => p.team === team).map(p => {
          const pi = assign[p.key];
          return <CourtSlot key={p.key} pos={p} player={pi != null ? RESULT_PLAYERS[pi] : null} idx={pi ?? 0} selected={false} accent={accent} onClick={() => place(p.key)} />;
        })}
      </div>
    </div>
  );
  return (
    <div style={{ padding: '12px 20px 0' }}>
      <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--muted)' }}>Toca un jugador y luego su posición en la cancha. Toca una posición ocupada para liberarla.</p>
      {teamBox('A', 'var(--green)')}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: 'var(--muted-2)' }}>RED</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
      {teamBox('B', 'var(--lime)')}

      <div style={{ marginTop: 24 }}>
        <SectionLabel>Sin asignar</SectionLabel>
        {pool.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)', fontSize: 13.5, fontWeight: 700 }}><Icon name="check" size={18} />Todos en posición</div>
        ) : (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {pool.map(i => {
              const p = RESULT_PLAYERS[i];
              const on = sel === i;
              return (
                <button key={i} onClick={() => setSel(on ? null : i)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ borderRadius: 999, padding: 2, border: `2px solid ${on ? 'var(--lime)' : 'transparent'}`, boxShadow: on ? '0 0 0 3px color-mix(in srgb, var(--lime) 22%, transparent)' : 'none', transition: 'all .15s' }}>
                    <Avatar initials={p.initials} idx={i} size={48} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: on ? 'var(--text)' : 'var(--muted)' }}>{p.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 2: sets ──────────────────────────────────────────────────────────────
function SetStepper({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button onClick={() => onChange(Math.min(7, value + 1))} style={miniBtn}><Icon name="plus" size={16} /></button>
      <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', minWidth: 28, textAlign: 'center' }}>{value}</span>
      <button onClick={() => onChange(Math.max(0, value - 1))} style={miniBtn}><Icon name="minus" size={16} /></button>
    </div>
  );
}
const miniBtn = { all: 'unset', cursor: 'pointer', width: 36, height: 30, borderRadius: 9, background: 'var(--surface-2)', border: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' };

function SetsStep({ sets, setSets }) {
  const setVal = (i, side, v) => setSets(prev => prev.map((s, j) => j === i ? { ...s, [side]: v } : s));
  const winsA = sets.filter(s => s.a > s.b).length;
  const winsB = sets.filter(s => s.b > s.a).length;
  return (
    <div style={{ padding: '12px 20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--green)' }}>Equipo A</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Sets {winsA}–{winsB}</span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--lime)' }}>Equipo B</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sets.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 14 }}>
            <SetStepper value={s.a} onChange={v => setVal(i, 'a', v)} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: 'var(--muted-2)' }}>SET {i + 1}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.a}–{s.b}</div>
            </div>
            <SetStepper value={s.b} onChange={v => setVal(i, 'b', v)} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {sets.length < 3 && <button onClick={() => setSets([...sets, { a: 0, b: 0 }])} style={{ ...miniGhost, flex: 1 }}><Icon name="plus" size={16} />Añadir set</button>}
        {sets.length > 1 && <button onClick={() => setSets(sets.slice(0, -1))} style={miniGhost}><Icon name="minus" size={16} />Quitar</button>}
      </div>
    </div>
  );
}
const miniGhost = { all: 'unset', cursor: 'pointer', boxSizing: 'border-box', height: 44, padding: '0 16px', borderRadius: 'var(--radius-btn)', background: 'var(--surface-2)', border: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--text)' };

// ── Step 3: summary + ELO ─────────────────────────────────────────────────────
function SummaryStep({ assign, sets, saved }) {
  const winsA = sets.filter(s => s.a > s.b).length;
  const winsB = sets.filter(s => s.b > s.a).length;
  const aWon = winsA > winsB;
  const teamA = POS.filter(p => p.team === 'A').map(p => assign[p.key]).filter(i => i != null);
  const teamB = POS.filter(p => p.team === 'B').map(p => assign[p.key]).filter(i => i != null);
  const delta = (idx) => {
    const winner = (aWon ? teamA : teamB).includes(idx);
    return winner ? (RESULT_PLAYERS[idx].you ? 14 : 11) : -(RESULT_PLAYERS[idx].you ? 9 : 10);
  };
  if (saved) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ width: 84, height: 84, borderRadius: 999, margin: '0 auto 18px', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
          <Icon name="check" size={44} stroke={2.6} />
        </div>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Resultado guardado</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>El ranking ELO de los 4 jugadores fue actualizado.</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 18, padding: '10px 18px', borderRadius: 999, background: 'var(--surface)', border: '1.5px solid var(--line)' }}>
          <Icon name="target" size={18} style={{ color: 'var(--green)' }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Tu ELO: 1240 → {1240 + delta(0)}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: delta(0) > 0 ? 'var(--green)' : '#EF4444' }}>{delta(0) > 0 ? '+' : ''}{delta(0)}</span>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: '12px 20px 0' }}>
      {/* winner */}
      <div style={{ textAlign: 'center', padding: '18px', borderRadius: 'var(--radius-card)', background: 'var(--green-bg)', border: '1.5px solid color-mix(in srgb, var(--green) 35%, transparent)' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, color: 'var(--muted)' }}>GANADOR</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>Equipo {aWon ? 'A' : 'B'}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {sets.map((s, i) => <span key={i} style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', background: 'var(--surface)', borderRadius: 8, padding: '4px 10px' }}>{s.a}-{s.b}</span>)}
        </div>
      </div>

      {/* ELO per team */}
      {[['A', teamA, 'var(--green)'], ['B', teamB, 'var(--lime)']].map(([t, team, accent]) => (
        <div key={t} style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: accent === 'var(--green)' ? 'var(--green)' : 'var(--lime)', marginBottom: 8 }}>Equipo {t}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {team.map(idx => {
              const p = RESULT_PLAYERS[idx]; const d = delta(idx);
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 14 }}>
                  <Avatar initials={p.initials} idx={idx} size={36} you={p.you} />
                  <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{p.name}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{p.elo} → <b style={{ color: 'var(--text)' }}>{p.elo + d}</b></span>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: d > 0 ? 'var(--green)' : '#EF4444', minWidth: 34, textAlign: 'right' }}>{d > 0 ? '+' : ''}{d}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Flow shell ────────────────────────────────────────────────────────────────
function LoadResultFlow({ onClose, onSaved }) {
  const [step, setStep] = React.useState(0);
  const [assign, setAssign] = React.useState({});
  const [sel, setSel] = React.useState(null);
  const [sets, setSets] = React.useState([{ a: 6, b: 4 }, { a: 4, b: 6 }, { a: 6, b: 3 }]);
  const [saved, setSaved] = React.useState(false);
  const labels = ['Cancha', 'Sets', 'Resumen'];

  const allPlaced = Object.keys(assign).length === 4;
  const winsA = sets.filter(s => s.a > s.b).length, winsB = sets.filter(s => s.b > s.a).length;
  const setsValid = winsA !== winsB && sets.every(s => s.a !== s.b);
  const canNext = step === 0 ? allPlaced : step === 1 ? setsValid : true;

  const next = () => { if (step < 2) setStep(step + 1); else { setSaved(true); onSaved && onSaved(); } };
  const back = () => { if (saved) { onClose(); } else if (step === 0) onClose(); else setStep(step - 1); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <SheetHeader title="Cargar resultado" subtitle={saved ? 'Listo' : `Paso ${step + 1} de 3 — ${['Asignar posiciones', 'Marcador por sets', 'Confirmar'][step]}`} onBack={back} center />
      {!saved && <StepProgress step={step} labels={labels} />}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
        {step === 0 && <PositionsStep assign={assign} setAssign={setAssign} sel={sel} setSel={setSel} />}
        {step === 1 && <SetsStep sets={sets} setSets={setSets} />}
        {step === 2 && <SummaryStep assign={assign} sets={sets} saved={saved} />}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 20px 30px', background: 'linear-gradient(to top, var(--bg-2) 70%, transparent)', borderTop: '1px solid var(--line)' }}>
        <button onClick={saved ? onClose : next} disabled={!canNext} style={{
          all: 'unset', boxSizing: 'border-box', width: '100%', height: 54, borderRadius: 'var(--radius-btn)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: canNext ? 'pointer' : 'default',
          fontSize: 16, fontWeight: 800, color: canNext ? '#fff' : 'var(--muted-2)',
          background: canNext ? 'var(--green)' : 'var(--surface-2)', boxShadow: canNext ? '0 8px 20px rgba(23,163,74,.4)' : 'none', transition: 'all .2s',
        }}>
          {saved ? 'Listo' : step === 2 ? <><Icon name="check" size={20} stroke={2.6} />Guardar resultado</> : step === 0 && !allPlaced ? 'Asigna a los 4 jugadores' : step === 1 && !setsValid ? 'Marcador incompleto' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { LoadResultFlow });

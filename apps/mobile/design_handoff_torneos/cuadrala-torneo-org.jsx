/* cuadrala-torneo-org.jsx — Torneos: lado organizador (las 3 preguntas)
   1 Quién se anotó y aceptarlo de un toque · 2 El cuadro armado · 3 "Listo, avisale a todos" */

const INSCRIPTOS = [
  { id: 'r1', name: 'Daniel Rodríguez', type: 'AUTH', status: 'CONFIRMED', cat: '7ma', pair: 'p1' },
  { id: 'r2', name: 'Luis Peña', type: 'AUTH', status: 'CONFIRMED', cat: '7ma', pair: 'p1' },
  { id: 'r3', name: 'Marcos Silva', type: 'AUTH', status: 'CONFIRMED', cat: '7ma', pair: 'p2' },
  { id: 'r4', name: 'Jorge Álvarez', type: 'AUTH', status: 'CONFIRMED', cat: '7ma', pair: 'p2' },
  { id: 'r5', name: 'Andrés Mota', type: 'AUTH', status: 'CONFIRMED', cat: '7ma', pair: null },
  { id: 'r6', name: 'Pedro Lugo', type: 'AUTH', status: 'CONFIRMED', cat: '7ma', pair: null },
  { id: 'r7', name: 'Rafael Torres', type: 'AUTH', status: 'CONFIRMED', cat: '7ma', pair: null },
  { id: 'r8', name: 'Simón Bello', type: 'AUTH', status: 'PENDING', cat: '7ma', pair: null },
  { id: 'r9', name: 'Iván Rojas', type: 'AUTH', status: 'PENDING', cat: '7ma', pair: null },
  { id: 'r10', name: 'Tomás Guerra', type: 'GUEST', status: 'PENDING', phone: '+58 412 123 4567', pair: null },
  { id: 'r11', name: 'Hugo Márquez', type: 'GUEST', status: 'PENDING', phone: '+58 414 987 6543', pair: null },
];

const INVITACIONES = [
  { id: 'i1', name: 'Carlos Méndez', status: 'PENDING' },
  { id: 'i2', name: 'Nicolás Paz', status: 'REJECTED' },
];

// ── Fila de inscripto ────────────────────────────────────────────────────────
function InscriptoRow({ r, idx, onConfirm, onDelete }) {
  const guest = r.type === 'GUEST';
  const done = r.status === 'CONFIRMED';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
      <Avatar initials={r.name.split(' ').map(w => w[0]).slice(0, 2).join('')} size={38} idx={idx} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
          {guest && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 5 }}>HUÉSPED</span>}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>
          {guest ? r.phone : `Categoría ${r.cat}`}{r.pair && ' · en dupla'}
        </div>
      </div>
      {done ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: 'var(--green)' }}><Icon name="check" size={15} stroke={2.8} />Adentro</span>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onDelete} style={{ all: 'unset', cursor: 'pointer', width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--muted)' }}><Icon name="close" size={17} /></button>
          <button onClick={onConfirm} style={{ all: 'unset', cursor: 'pointer', width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--green)', color: '#fff' }}><Icon name="check" size={18} stroke={2.8} /></button>
        </div>
      )}
    </div>
  );
}

// ── Tab 1 — Quién se anotó ───────────────────────────────────────────────────
function OrgInscriptos({ rows, onConfirm, onConfirmAll, onDelete, onGuest, onInvite, onPairs }) {
  const pend = rows.filter(r => r.status === 'PENDING');
  const conf = rows.filter(r => r.status === 'CONFIRMED');
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {[['Inscriptos', rows.length], ['Confirmados', conf.length], ['Pendientes', pend.length]].map(([k, v], i) => (
          <div key={k} style={{ flex: 1, background: 'var(--surface)', border: `1.5px solid ${i === 2 && v > 0 ? 'var(--green)' : 'var(--line)'}`, borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: i === 2 && v > 0 ? 'var(--green)' : 'var(--text)' }}>{v}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{k}</div>
          </div>
        ))}
      </div>

      {pend.length > 0 && (
        <button onClick={onConfirmAll} style={{ ...primaryBtn, width: '100%', height: 52, fontSize: 15.5, marginBottom: 8 }}>
          <Icon name="check" size={20} stroke={2.6} />Confirmar {pend.length} pendientes
        </button>
      )}
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, marginBottom: 16 }}>
        {pend.length > 0
          ? 'Un toque confirma a todos y les llega el aviso solo. No hace falta mandar nada.'
          : 'Todos confirmados. Cada uno ya recibió su aviso.'}
      </div>

      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
        {pend.length > 0 && <div style={groupHead}>Pendientes · {pend.length}</div>}
        {pend.map((r, i) => <InscriptoRow key={r.id} r={r} idx={i} onConfirm={() => onConfirm(r.id)} onDelete={() => onDelete(r.id)} />)}
        <div style={groupHead}>Confirmados · {conf.length}</div>
        {conf.map((r, i) => <InscriptoRow key={r.id} r={r} idx={i + 3} onConfirm={() => {}} onDelete={() => {}} />)}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button onClick={onGuest} style={{ ...secondaryBtn, height: 48, fontSize: 14 }}><Icon name="plus" size={17} stroke={2.4} />Huésped</button>
        <button onClick={onInvite} style={{ ...secondaryBtn, height: 48, fontSize: 14 }}><Icon name="mail" size={17} />Invitar</button>
      </div>

      <div style={{ height: 22 }} />
      <SectionLabel action="Armar dupla" onAction={onPairs}>Duplas</SectionLabel>
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['p1', 'p2'].map(p => {
          const pair = rows.filter(r => r.pair === p);
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex' }}>{pair.map((r, i) => <Avatar key={r.id} initials={r.name[0]} size={28} idx={i} />)}</div>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{pair.map(r => r.name.split(' ')[0]).join(' · ')}</span>
              <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>Deshacer</button>
            </div>
          );
        })}
        <div style={{ fontSize: 12, color: 'var(--muted-2)', lineHeight: 1.45, marginTop: 2 }}>Las duplas las armás vos. Confirmar a uno confirma también a su compañero.</div>
      </div>

      <div style={{ height: 22 }} />
      <SectionLabel>Invitaciones enviadas</SectionLabel>
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
        {INVITACIONES.map((iv, i) => (
          <div key={iv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < INVITACIONES.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <Avatar initials={iv.name[0]} size={32} idx={i + 4} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{iv.name}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: iv.status === 'PENDING' ? 'var(--muted)' : '#F87171' }}>{iv.status === 'PENDING' ? 'Sin responder' : 'Rechazó'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
const groupHead = { padding: '9px 14px', fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted-2)', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' };

// ── Tab 2 — El cuadro ────────────────────────────────────────────────────────
function OrgCuadro({ rows, generated, onGenerate, onConfirmAll, onBracket, onResult }) {
  const pend = rows.filter(r => r.status === 'PENDING').length;
  const conf = rows.filter(r => r.status === 'CONFIRMED' && r.type === 'AUTH').length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {pend > 0 && (
        <Banner tone="warn" icon="info" title={`${pend} sin confirmar quedan fuera`}
          body="El cuadro se arma sólo con los confirmados. Confirmalos antes de generar o vas a tener que rehacerlo."
          action="Confirmar pendientes" onAction={onConfirmAll} />
      )}

      {!generated ? (
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', padding: 18, textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 15, margin: '0 auto', background: 'var(--green-bg)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trophy" size={26} /></div>
          <div style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--text)', marginTop: 12 }}>Generar el cuadro</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>Eliminación simple con los <b style={{ color: 'var(--text)' }}>{conf} confirmados</b> con cuenta. Los huéspedes quedan fuera del cuadro.</div>
          <button onClick={onGenerate} style={{ ...primaryBtn, width: '100%', height: 50, fontSize: 15.5, marginTop: 14 }}>
            <Icon name="sparkle" size={19} stroke={2.4} />Generar cuadro y horarios
          </button>
        </div>
      ) : (
        <>
          <Banner tone="green" icon="check" title="Cuadro generado" body={`3 rondas · ${conf} jugadores. A cada uno le llegó su horario para confirmar.`} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onBracket} style={{ ...secondaryBtn, height: 48, fontSize: 14 }}><Icon name="trophy" size={17} />Ver cuadro</button>
            <button onClick={onResult} style={{ ...primaryBtn, height: 48, fontSize: 14 }}><Icon name="plus" size={17} stroke={2.4} />Cargar resultado</button>
          </div>
          <SectionLabel>Partidos de hoy</SectionLabel>
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
            {[
              { r: 'Cuartos 1', p: 'Daniel R. vs Marcos S.', t: '09:00 · Central', st: 'done', sc: '6-3' },
              { r: 'Cuartos 2', p: 'Luis P. vs Jorge Á.', t: '09:00 · Cancha 2', st: 'done', sc: '6-4' },
              { r: 'Semi 1', p: 'Daniel R. vs Luis P.', t: '11:30 · Central', st: 'live' },
              { r: 'Semi 2', p: 'Pedro L. vs Rafa T.', t: '11:30 · Cancha 2', st: 'reject' },
            ].map((m, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted-2)', letterSpacing: 0.3, textTransform: 'uppercase' }}>{m.r}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 1 }}>{m.p}</div>
                  <div style={{ fontSize: 12.5, color: m.st === 'reject' ? '#F59E0B' : 'var(--muted)', marginTop: 1 }}>
                    {m.st === 'reject' ? 'Rafa T. no puede a las 11:30' : m.t}
                  </div>
                </div>
                {m.st === 'done' && <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{m.sc}</span>}
                {m.st === 'live' && <button onClick={onResult} style={{ all: 'unset', cursor: 'pointer', height: 34, padding: '0 12px', borderRadius: 10, background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center' }}>Cargar</button>}
                {m.st === 'reject' && <button style={{ all: 'unset', cursor: 'pointer', height: 34, padding: '0 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1.5px solid var(--line)', color: 'var(--text)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center' }}>Mover</button>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Tab 3 — Publicar ─────────────────────────────────────────────────────────
function OrgPublicar({ status, setStatus, visible, setVisible, rows }) {
  const conf = rows.filter(r => r.status === 'CONFIRMED').length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionLabel>Quién lo ve</SectionLabel>
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Torneo público</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{visible ? 'Aparece en el listado de la app' : 'Sólo lo ven los que invitás'}</div>
          </div>
          <Toggle value={visible} onChange={setVisible} />
        </div>
      </div>

      <SectionLabel>Estado de la inscripción</SectionLabel>
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', padding: 16 }}>
        <Segmented options={['Borrador', 'Abierta', 'En juego']} value={status} onChange={setStatus} />
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5 }}>
          {status === 'Borrador' && 'Podés seguir cargando gente, pero nadie se anota solo.'}
          {status === 'Abierta' && 'Cualquiera de la categoría puede anotarse. Entra como pendiente.'}
          {status === 'En juego' && 'Se cierran las inscripciones: ya no entra ni sale nadie del plantel.'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: 14, borderRadius: 'var(--radius-card)', background: 'var(--surface-2)', border: '1.5px solid var(--line)' }}>
        <Icon name="info" size={18} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          Son dos cosas distintas: <b style={{ color: 'var(--text)' }}>publicar no cierra la inscripción</b>, y cerrar la inscripción no despublica el torneo.
        </div>
      </div>

      <SectionLabel>Avisos</SectionLabel>
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
        {[
          ['check', `Confirmaste a ${conf} jugadores`, 'Cada uno recibió su aviso al confirmarlo'],
          ['calendar', 'Se enviaron 4 horarios', 'Los jugadores aceptan o piden cambio'],
          ['users', '2 invitaciones sin responder', 'Carlos M. y Nicolás P.'],
        ].map(([ic, t, s], i, arr) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--green-bg)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={ic} size={17} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{s}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted-2)', lineHeight: 1.5 }}>No hay un botón de "avisar a todos": el aviso sale solo con cada acción.</div>
    </div>
  );
}

// ── Pantalla organizador ─────────────────────────────────────────────────────
function OrgTorneoScreen({ t, onBack, onBracket, initialTab = 'Inscriptos' }) {
  const [rows, setRows] = React.useState(INSCRIPTOS);
  const [tab, setTab] = React.useState(initialTab);
  const [generated, setGenerated] = React.useState(false);
  const [status, setStatus] = React.useState('Abierta');
  const [visible, setVisible] = React.useState(true);
  const [sheet, setSheet] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  const flash = msg => { setToast(msg); setTimeout(() => setToast(null), 2600); };
  const confirmOne = id => { setRows(p => p.map(r => r.id === id ? { ...r, status: 'CONFIRMED' } : r)); flash('Confirmado. Le llegó el aviso.'); };
  const confirmAll = () => {
    const n = rows.filter(r => r.status === 'PENDING').length;
    setRows(p => p.map(r => ({ ...r, status: 'CONFIRMED' })));
    flash(`${n} confirmados. A todos les llegó el aviso.`);
  };
  const del = id => setRows(p => p.filter(r => r.id !== id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <SheetHeader title={t.name} subtitle="Vos organizás este torneo" onBack={onBack}
        trailing={<span style={{ fontSize: 11, fontWeight: 800, color: '#15301a', background: 'var(--lime)', padding: '3px 8px', borderRadius: 6 }}>ORG</span>} />
      <div style={{ padding: '12px 20px 12px', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <Segmented options={['Inscriptos', 'Cuadro', 'Publicar']} value={tab} onChange={setTab} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px' }}>
        {tab === 'Inscriptos' && <OrgInscriptos rows={rows} onConfirm={confirmOne} onConfirmAll={confirmAll} onDelete={del}
          onGuest={() => setSheet('guest')} onInvite={() => setSheet('invite')} onPairs={() => setSheet('pair')} />}
        {tab === 'Cuadro' && <OrgCuadro rows={rows} generated={generated} onConfirmAll={confirmAll}
          onGenerate={() => { setGenerated(true); flash('Cuadro generado. Salieron los horarios.'); }} onBracket={onBracket} onResult={() => setSheet('result')} />}
        {tab === 'Publicar' && <OrgPublicar status={status} setStatus={setStatus} visible={visible} setVisible={setVisible} rows={rows} />}
      </div>

      {toast && (
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 28, padding: '13px 16px', borderRadius: 14, background: 'var(--green)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 9, boxShadow: '0 10px 28px rgba(0,0,0,.35)', animation: 'czFade .2s' }}>
          <Icon name="check" size={18} stroke={2.8} />{toast}
        </div>
      )}

      {sheet && <OrgSheet kind={sheet} onClose={() => setSheet(null)} onDone={msg => { setSheet(null); flash(msg); }} />}
    </div>
  );
}

// ── Sheets del organizador ───────────────────────────────────────────────────
function OrgSheet({ kind, onClose, onDone }) {
  const [a, setA] = React.useState(6);
  const [b, setB] = React.useState(4);
  const [name, setName] = React.useState('');
  const cfg = {
    guest: { title: 'Invitar huésped', sub: 'Alguien sin cuenta en la app' },
    invite: { title: 'Invitar jugador', sub: 'Le llega y decide él' },
    pair: { title: 'Armar dupla', sub: 'Elegí dos inscriptos' },
    result: { title: 'Cargar resultado', sub: 'Semifinal 1 · Central' },
  }[kind];
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,.5)', animation: 'czFade .18s' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-2)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '18px 20px 30px', animation: 'sheetUp .26s cubic-bezier(.3,.8,.3,1)', borderTop: '1.5px solid var(--line)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--line-strong)', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>{cfg.title}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, marginBottom: 16 }}>{cfg.sub}</div>

        {kind === 'guest' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre y apellido" style={inputStyle} />
            <input placeholder="Teléfono (opcional) +58…" style={inputStyle} />
            <input placeholder="Email (opcional)" style={inputStyle} />
            <div style={{ fontSize: 12, color: 'var(--muted-2)', lineHeight: 1.45 }}>Entra como pendiente igual que el resto. Los huéspedes no entran al cuadro de eliminación.</div>
          </div>
        )}
        {kind === 'invite' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-btn)', padding: '0 14px', height: 48 }}>
              <Icon name="search" size={18} style={{ color: 'var(--muted)' }} />
              <input placeholder="Buscar por nombre" style={{ all: 'unset', flex: 1, fontSize: 14.5, color: 'var(--text)' }} />
            </div>
            {['Carla Núñez', 'Emilio Sanz', 'Víctor Paredes'].map((n, i) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 14 }}>
                <Avatar initials={n[0]} size={34} idx={i} />
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{n}</span>
                <button onClick={() => onDone('Invitación enviada')} style={{ all: 'unset', cursor: 'pointer', height: 34, padding: '0 14px', borderRadius: 10, background: 'var(--green-bg)', color: 'var(--green)', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center' }}>Invitar</button>
              </div>
            ))}
          </div>
        )}
        {kind === 'pair' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Andrés Mota', 'Pedro Lugo', 'Rafael Torres'].map((n, i) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface)', border: `1.5px solid ${i < 2 ? 'var(--green)' : 'var(--line)'}`, borderRadius: 14 }}>
                <Avatar initials={n[0]} size={34} idx={i + 2} />
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{n}</span>
                {i < 2 && <Icon name="check" size={18} stroke={2.8} style={{ color: 'var(--green)' }} />}
              </div>
            ))}
          </div>
        )}
        {kind === 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['Daniel Rodríguez', a, setA], ['Luis Peña', b, setB]].map(([n, v, set], i) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 14 }}>
                <Avatar initials={n[0]} size={36} idx={i} />
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{n}</span>
                <Stepper value={v} min={0} max={9} onChange={set} />
              </div>
            ))}
            <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>El ganador pasa de ronda automáticamente y a los dos les llega el resultado.</div>
          </div>
        )}

        <button onClick={() => onDone(kind === 'result' ? 'Resultado cargado' : kind === 'guest' ? 'Huésped agregado como pendiente' : kind === 'pair' ? 'Dupla armada' : 'Invitación enviada')}
          style={{ ...primaryBtn, width: '100%', height: 52, fontSize: 15.5, marginTop: 16 }}>
          <Icon name="check" size={19} stroke={2.6} />{kind === 'result' ? 'Guardar resultado' : kind === 'guest' ? 'Agregar huésped' : kind === 'pair' ? 'Armar dupla' : 'Listo'}
        </button>
      </div>
    </div>
  );
}
const inputStyle = { all: 'unset', boxSizing: 'border-box', width: '100%', height: 48, padding: '0 14px', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 12, fontSize: 14.5, color: 'var(--text)' };

// ── Invitación que le llega al jugador ───────────────────────────────────────
function InvitacionSheet({ onClose, onRespond }) {
  const t = TORNEOS[1];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <SheetHeader title="Invitación" onBack={onClose} backIcon="close" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        <Banner tone="lime" icon="mail" title={`${t.org} te invitó`} body="Si aceptás quedás inscripto directo, sin esperar confirmación." />
        <div style={{ height: 16 }} />
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 14px 4px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{t.name}</div>
          <FactRow icon="target" label="Nivel" value={`Categoría ${t.cat} · ${t.gender}`} sub={`Jugás ${USER.cat}: te invitaron igual`} />
          <div style={divider} />
          <FactRow icon="card" label="Inscripción" value={usd(t.price)} sub={bs(t.price)} />
          <div style={divider} />
          <FactRow icon="calendar" label="Cuándo" value={`${t.day} · ${t.time}`} />
          <div style={divider} />
          <FactRow icon="pin" label="Dónde" value={`${t.venue}, ${t.zone}`} sub={t.dist} />
        </div>
      </div>
      <div style={{ padding: '14px 20px 30px', borderTop: '1px solid var(--line)', background: 'var(--bg-2)', display: 'flex', gap: 10 }}>
        <button onClick={() => onRespond('REJECT')} style={{ ...secondaryBtn, height: 54, fontSize: 15 }}>Rechazar</button>
        <button onClick={() => onRespond('ACCEPT')} style={{ ...primaryBtn, height: 54, fontSize: 15.5 }}><Icon name="check" size={19} stroke={2.6} />Aceptar</button>
      </div>
    </div>
  );
}

// ── Crear torneo (POST /tournaments) ─────────────────────────────────────────
function CrearTorneoScreen({ onClose, onCreated }) {
  const days = React.useMemo(() => buildDays(28), []);
  const [name, setName] = React.useState('');
  const [date, setDate] = React.useState(days[5].key);
  const [venueId, setVenueId] = React.useState('cuadrala');
  const [cat, setCat] = React.useState('7ma');
  const [gender, setGender] = React.useState('Masculino');
  const [format, setFormat] = React.useState('Eliminación simple');
  const [size, setSize] = React.useState(16);
  const [price, setPrice] = React.useState(15);
  const [publish, setPublish] = React.useState(false);
  const ready = name.trim().length > 2 && venueId;
  const venue = VENUES.find(v => v.id === venueId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <SheetHeader title="Crear torneo" subtitle="Lo creás en borrador: nadie lo ve todavía" onBack={onClose} backIcon="close" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 130px' }}>
        <SectionLabel required>Nombre</SectionLabel>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Copa Cuádrala" style={inputStyle} />

        <div style={{ height: 22 }} />
        <SectionLabel required>Cuándo arranca</SectionLabel>
        <DateStrip days={days} value={date} onChange={setDate} />

        <div style={{ height: 22 }} />
        <SectionLabel required>Dónde</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {VENUES.map(v => (
            <Card key={v.id} selected={venueId === v.id} onClick={() => setVenueId(v.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
              <ImgPlaceholder label="FOTO" style={{ width: 46, height: 46, flexShrink: 0 }} radius={11} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{v.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{v.zone} · {v.courts.length} canchas</div>
              </div>
              {venueId === v.id && <Icon name="check" size={18} stroke={2.8} style={{ color: 'var(--green)' }} />}
            </Card>
          ))}
        </div>

        <div style={{ height: 22 }} />
        <SectionLabel required>Categoría</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map(c => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
        </div>
        <div style={{ height: 14 }} />
        <Segmented options={['Masculino', 'Femenino', 'Mixto']} value={gender} onChange={setGender} />

        <div style={{ height: 22 }} />
        <SectionLabel required>Formato</SectionLabel>
        <Segmented options={['Eliminación simple', 'Round robin']} value={format} onChange={setFormat} />
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.45 }}>
          {format === 'Eliminación simple' ? 'Arma cuadro. Los huéspedes sin cuenta no entran.' : 'Todos contra todos: no hay cuadro, se sigue por la tabla.'}
        </div>

        <div style={{ height: 22 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Cupos</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Tamaño del cuadro</div>
          </div>
          <Stepper value={size} min={4} max={32} onChange={v => setSize(v)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Inscripción</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Por jugador · {bs(price)}</div>
          </div>
          <Stepper value={price} min={0} max={60} onChange={setPrice} />
        </div>

        <div style={{ height: 22 }} />
        <SectionLabel>Publicación</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Publicar al crear</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{publish ? 'Aparece en el listado y se abre la inscripción' : 'Queda en borrador: cargás gente vos y publicás después'}</div>
          </div>
          <Toggle value={publish} onChange={setPublish} />
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 20px 30px', background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
          <span>{venue ? venue.name : 'Elegí sede'} · {cat} {gender} · {size} cupos</span>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{price ? usd(price) : 'Gratis'}</span>
        </div>
        <button disabled={!ready} onClick={() => ready && onCreated(publish)} style={{
          all: 'unset', boxSizing: 'border-box', width: '100%', height: 54, borderRadius: 'var(--radius-btn)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 16, fontWeight: 800,
          cursor: ready ? 'pointer' : 'default', background: ready ? 'var(--green)' : 'var(--surface-2)',
          color: ready ? '#fff' : 'var(--muted-2)', boxShadow: ready ? '0 8px 20px rgba(23,163,74,.4)' : 'none', transition: 'all .2s',
        }}>
          <Icon name="check" size={20} stroke={2.6} />{ready ? (publish ? 'Crear y publicar' : 'Crear borrador') : 'Ponele nombre al torneo'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { INSCRIPTOS, INVITACIONES, OrgTorneoScreen, OrgSheet, InvitacionSheet, CrearTorneoScreen, OrgInscriptos, OrgCuadro, OrgPublicar });

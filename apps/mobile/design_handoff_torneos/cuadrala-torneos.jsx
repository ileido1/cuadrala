/* cuadrala-torneos.jsx — Torneos: lado jugador (las 4 preguntas)
   1 ¿Puedo entrar?  2 ¿Estoy adentro?  3 ¿Cuándo y dónde juego?  4 ¿Cómo voy?
   El orden de las preguntas es el orden de la pantalla. */

// ── Datos demo ───────────────────────────────────────────────────────────────
const TORNEOS = [
  { id: 't1', name: 'Copa Cuádrala', status: 'OPEN', visibility: 'PUBLIC', cat: '7ma', gender: 'Masculino', price: 15,
    venue: 'Club Cuádrala', zone: 'Las Mercedes', dist: '1.2 km', day: 'SÁB 12 Sep', time: '09:00',
    closes: 'VIE 11 Sep · 20:00', format: 'Eliminación simple', size: 16, count: 11, confirmed: 7, pending: 4, org: 'Club Cuádrala' },
  { id: 't2', name: 'Nocturno Chacao', status: 'OPEN', visibility: 'PUBLIC', cat: '5ta', gender: 'Masculino', price: 25,
    venue: 'Padel Country', zone: 'Chacao', dist: '2.5 km', day: 'VIE 18 Sep', time: '19:00',
    closes: 'JUE 17 Sep · 18:00', format: 'Eliminación simple', size: 8, count: 6, confirmed: 6, pending: 0, org: 'Padel Country' },
  { id: 't3', name: 'Liga Base Aérea', status: 'IN_PROGRESS', visibility: 'PUBLIC', cat: '7ma', gender: 'Mixto', price: 10,
    venue: 'Base Aérea Padel', zone: 'La Carlota', dist: '3.1 km', day: 'DOM 06 Sep', time: '08:00',
    closes: 'cerrada', format: 'Round robin', size: 12, count: 12, confirmed: 12, pending: 0, org: 'Base Aérea Padel' },
  { id: 't4', name: 'Interclubes Caracas', status: 'COMPLETED', visibility: 'PUBLIC', cat: '6ta', gender: 'Masculino', price: 20,
    venue: 'Club Cuádrala', zone: 'Las Mercedes', dist: '1.2 km', day: 'SÁB 23 Ago', time: '10:00',
    closes: 'cerrada', format: 'Eliminación simple', size: 16, count: 16, confirmed: 16, pending: 0, org: 'Club Cuádrala' },
];

const TSTATUS = {
  DRAFT: { label: 'Borrador', fg: 'var(--muted)', bg: 'var(--surface-2)' },
  OPEN: { label: 'Inscripción abierta', fg: 'var(--green)', bg: 'var(--green-bg)' },
  IN_PROGRESS: { label: 'En juego', fg: '#15301a', bg: 'var(--lime)' },
  COMPLETED: { label: 'Finalizado', fg: 'var(--muted)', bg: 'var(--surface-2)' },
  CANCELLED: { label: 'Cancelado', fg: '#F87171', bg: 'color-mix(in srgb, #F87171 16%, transparent)' },
};

// Mis partidos del torneo (GET /schedule/my-matches)
const MY_TMATCHES = [
  { round: 'Octavos', day: 'SÁB 12 Sep', time: '09:00', court: 'Cancha Central', rival: 'Luis Peña', rivalCat: '7ma', state: 'PROPOSED' },
  { round: 'Cuartos', day: 'SÁB 12 Sep', time: '11:30', court: 'Por definir', rival: 'Ganador C3', rivalCat: '—', state: 'WAITING' },
];

const SCOREBOARD = [
  { pos: 1, name: 'Luis Peña', pj: 3, pg: 3, sets: '6-2', pts: 9, you: false },
  { pos: 2, name: 'Daniel Rodríguez', pj: 3, pg: 2, sets: '5-3', pts: 6, you: true },
  { pos: 3, name: 'Marcos Silva', pj: 3, pg: 1, sets: '3-5', pts: 3, you: false },
  { pos: 4, name: 'Jorge Álvarez', pj: 3, pg: 0, sets: '1-6', pts: 0, you: false },
];

const BRACKET = [
  { n: 1, name: 'Cuartos', matches: [
    { a: 'Daniel R.', b: 'Marcos S.', sa: 6, sb: 3, w: 'a', st: 'COMPLETED' },
    { a: 'Luis P.', b: 'Jorge Á.', sa: 6, sb: 4, w: 'a', st: 'COMPLETED' },
    { a: 'Andrés M.', b: 'Pedro L.', sa: 4, sb: 6, w: 'b', st: 'COMPLETED' },
    { a: 'Rafa T.', b: null, sa: null, sb: null, w: 'a', st: 'BYE' },
  ] },
  { n: 2, name: 'Semifinal', matches: [
    { a: 'Daniel R.', b: 'Luis P.', sa: null, sb: null, w: null, st: 'IN_PROGRESS' },
    { a: 'Pedro L.', b: 'Rafa T.', sa: null, sb: null, w: null, st: 'PENDING' },
  ] },
  { n: 3, name: 'Final', matches: [
    { a: null, b: null, sa: null, sb: null, w: null, st: 'PENDING' },
  ] },
];

// ── Piezas chicas ────────────────────────────────────────────────────────────
function TPill({ status, small }) {
  const s = TSTATUS[status];
  return <span style={{ fontSize: small ? 10.5 : 11.5, fontWeight: 800, color: s.fg, background: s.bg, padding: small ? '2px 7px' : '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{s.label}</span>;
}

function CupoBar({ count, size }) {
  const pct = Math.min(100, (count / size) * 100);
  return (
    <div style={{ height: 5, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: pct >= 100 ? 'var(--muted-2)' : 'var(--green)' }} />
    </div>
  );
}

// Fila de dato: icono + etiqueta + valor. Es el ladrillo de "¿Puedo entrar?".
function FactRow({ icon, label, value, sub, tone }) {
  const c = tone === 'ok' ? 'var(--green)' : tone === 'no' ? '#F87171' : 'var(--muted)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tone ? 'color-mix(in srgb, ' + c + ' 14%, transparent)' : 'var(--surface-2)', color: c }}>
        <Icon name={icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--muted-2)' }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12.5, color: tone === 'no' ? '#F87171' : 'var(--muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      {tone === 'ok' && <Icon name="check" size={17} stroke={2.8} style={{ color: 'var(--green)' }} />}
      {tone === 'no' && <Icon name="lock" size={17} style={{ color: '#F87171' }} />}
    </div>
  );
}

function Banner({ tone = 'green', icon, title, body, action, onAction }) {
  const c = tone === 'green' ? 'var(--green)' : tone === 'lime' ? 'var(--lime)' : tone === 'warn' ? '#F59E0B' : 'var(--muted)';
  return (
    <div style={{ display: 'flex', gap: 12, padding: 14, borderRadius: 'var(--radius-card)', background: `color-mix(in srgb, ${c} 12%, var(--surface))`, border: `1.5px solid color-mix(in srgb, ${c} 45%, transparent)` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c, color: tone === 'lime' ? '#15301a' : '#fff' }}>
        <Icon name={icon} size={19} stroke={2.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
        {body && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{body}</div>}
        {action && <button onClick={onAction} style={{ all: 'unset', cursor: 'pointer', marginTop: 8, fontSize: 13.5, fontWeight: 800, color: c === 'var(--lime)' ? 'var(--text)' : c }}>{action} →</button>}
      </div>
    </div>
  );
}

// ── Tarjeta de torneo: responde la #1 sin abrir nada ─────────────────────────
function TorneoCard({ t, insc, onPress }) {
  const eligible = t.cat === USER.cat;
  const full = t.count >= t.size;
  return (
    <Card onClick={onPress} style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <TPill status={t.status} small />
        <span style={{ fontSize: 11, fontWeight: 800, color: eligible ? '#15301a' : 'var(--muted)', background: eligible ? 'var(--lime)' : 'var(--surface-2)', padding: '2px 8px', borderRadius: 6 }}>{t.cat}</span>
        <span style={{ ...tagStyle, padding: '2px 8px' }}>{t.gender}</span>
        {insc && insc !== 'none' && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: insc === 'CONFIRMED' ? 'var(--green)' : 'var(--muted)' }}>
            {insc === 'CONFIRMED' ? 'Adentro' : 'Pendiente'}
          </span>
        )}
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.2 }}>{t.name}</div>
      {/* Los cuatro datos de la #1, antes de cualquier botón */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 7 }}>
        <span style={metaRow}><Icon name="calendar" size={14} style={{ color: 'var(--muted-2)' }} />{t.day} · {t.time}</span>
        <span style={metaRow}><Icon name="pin" size={14} style={{ color: 'var(--muted-2)' }} />{t.venue} · {t.dist}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, color: full ? 'var(--muted)' : 'var(--text)', marginBottom: 5 }}>
            <span>{t.count}/{t.size} inscriptos</span>
            {t.status === 'OPEN' && <span style={{ color: 'var(--muted)', fontWeight: 600 }}>cierra {t.closes.split(' · ')[0]}</span>}
          </div>
          <CupoBar count={t.count} size={t.size} />
        </div>
        <Price amount={t.price} size={16} />
      </div>
    </Card>
  );
}
const metaRow = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 };

// ── LISTADO ──────────────────────────────────────────────────────────────────
function TorneosScreen({ inscs, invite, onOpen, onInvite, onOrg, onCreate }) {
  const [tab, setTab] = React.useState('Abiertos');
  const [onlyMine, setOnlyMine] = React.useState(true);
  const mine = TORNEOS.filter(t => inscs[t.id] && inscs[t.id] !== 'none');
  let list = tab === 'Mis torneos' ? mine : TORNEOS.filter(t => t.status === 'OPEN');
  if (tab === 'Abiertos' && onlyMine) list = list.filter(t => t.cat === USER.cat);

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '54px 20px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 800, letterSpacing: -0.5, color: 'var(--text)' }}>Torneos</h1>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16 }}>Nivel, precio, fecha y sede antes de anotarte</div>
          </div>
          <button onClick={onCreate} style={{ all: 'unset', cursor: 'pointer', height: 42, padding: '0 14px', borderRadius: 12, background: 'var(--green)', color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 6px 16px rgba(23,163,74,.35)', flexShrink: 0 }}>
            <Icon name="plus" size={18} stroke={2.6} />Crear
          </button>
        </div>
        <Segmented options={['Abiertos', 'Mis torneos']} value={tab} onChange={setTab} />
      </div>

      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {invite && (
          <Banner tone="lime" icon="mail" title="Te invitaron al Nocturno Chacao"
            body="Padel Country te sumó al cuadro. Si aceptás, quedás inscripto."
            action="Ver invitación" onAction={onInvite} />
        )}

        {onOrg && (
          <button onClick={onOrg} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 'var(--radius-card)', background: 'var(--surface)', border: '1.5px solid var(--line)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--lime)', color: '#15301a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="shield" size={20} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>Organizás Copa Cuádrala</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>4 inscriptos esperando que los aceptes</div>
            </div>
            <Icon name="chevronRight" size={18} style={{ color: 'var(--muted-2)' }} />
          </button>
        )}

        {tab === 'Abiertos' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Chip active={onlyMine} onClick={() => setOnlyMine(!onlyMine)}>{`Mi categoría ${USER.cat}`}</Chip>
            <Chip active={false} onClick={() => {}} icon="pin">Cerca</Chip>
          </div>
        )}

        {list.map(t => <TorneoCard key={t.id} t={t} insc={inscs[t.id]} onPress={() => onOpen(t)} />)}

        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--muted)' }}>
            <Icon name="trophy" size={30} style={{ margin: '0 auto 10px', color: 'var(--muted-2)' }} />
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{tab === 'Mis torneos' ? 'Todavía no te anotaste a ninguno' : 'Nada abierto en tu categoría'}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{tab === 'Mis torneos' ? 'Cuando te inscribas, va a aparecer acá.' : 'Quitá el filtro para ver el resto.'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DETALLE ──────────────────────────────────────────────────────────────────
function TorneoDetail({ t, insc, onBack, onJoin, onWithdraw, onBracket, tab, setTab }) {
  const eligible = t.cat === USER.cat;
  const closed = t.status !== 'OPEN' && t.status !== 'DRAFT';
  const inside = insc === 'CONFIRMED';
  const pending = insc === 'PENDING';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <SheetHeader title={t.name} subtitle={`${t.venue} · ${t.gender} ${t.cat}`} onBack={onBack} />

      {(inside || t.status === 'IN_PROGRESS') && (
        <div style={{ padding: '12px 20px 0', background: 'var(--bg-2)', flexShrink: 0 }}>
          <Segmented options={['Info', 'Mis partidos', 'Tabla']} value={tab} onChange={setTab} />
          <div style={{ height: 12 }} />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 130px' }}>
        {(!inside && t.status !== 'IN_PROGRESS') || tab === 'Info' ? (
          <>
            {/* #2 — ¿Estoy adentro? La respuesta va arriba de todo cuando ya hay una. */}
            {pending && (
              <div style={{ marginBottom: 16 }}>
                <Banner tone="warn" icon="clock" title="Te anotaste. Falta que te acepten."
                  body="El organizador confirma los inscriptos. Te avisamos apenas quedés adentro — no tenés que volver a entrar." />
              </div>
            )}
            {inside && (
              <div style={{ marginBottom: 16 }}>
                <Banner tone="green" icon="check" title="Estás adentro" body="Inscripción confirmada. Tu primer partido ya tiene horario propuesto."
                  action="Ver mis partidos" onAction={() => setTab('Mis partidos')} />
              </div>
            )}

            {/* #1 — ¿Puedo entrar? */}
            <SectionLabel>¿Puedo entrar?</SectionLabel>
            <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
              <FactRow icon="target" label="Nivel" value={`Categoría ${t.cat} · ${t.gender}`}
                sub={eligible ? `Jugás ${USER.cat}. Podés entrar.`
                  : insc !== 'none' ? `Te invitaron: entrás aunque juegues ${USER.cat}.`
                  : `Jugás ${USER.cat}. Este torneo es para ${t.cat}.`}
                tone={eligible || insc !== 'none' ? 'ok' : 'no'} />
              <div style={divider} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--muted)' }}><Icon name="card" size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--muted-2)' }}>Inscripción</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Por jugador, se paga al confirmar</div>
                </div>
                <Price amount={t.price} size={16} />
              </div>
              <div style={divider} />
              <FactRow icon="calendar" label="Cuándo" value={`${t.day} · ${t.time}`} sub={t.status === 'OPEN' ? `Inscripción hasta ${t.closes}` : 'Inscripción cerrada'} />
              <div style={divider} />
              <FactRow icon="pin" label="Dónde" value={`${t.venue}, ${t.zone}`} sub={`${t.dist} de vos · organiza ${t.org}`} />
            </div>

            <div style={{ height: 20 }} />
            <SectionLabel>Cómo se juega</SectionLabel>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['Formato', t.format], ['Cuadro', `${t.size} jugadores`], ['Anotados', `${t.count}`]].map(([k, v]) => (
                <div key={k} style={{ flex: 1, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', lineHeight: 1.25 }}>{v}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{k}</div>
                </div>
              ))}
            </div>

            <div style={{ height: 20 }} />
            <SectionLabel>Inscriptos <span style={{ textTransform: 'none', fontWeight: 500 }}>({t.count})</span></SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', padding: 14 }}>
              <AvatarStack filled={Math.min(6, t.confirmed)} total={6} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{t.confirmed} confirmados</div>
                {t.pending > 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t.pending} esperando al organizador</div>}
              </div>
              <Icon name="chevronRight" size={18} style={{ color: 'var(--muted-2)' }} />
            </div>
          </>
        ) : tab === 'Mis partidos' ? <MisPartidos /> : <TablaTab onBracket={onBracket} />}
      </div>

      {/* CTA sólo en Info */}
      {((!inside && t.status !== 'IN_PROGRESS') || tab === 'Info') && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 20px 30px', background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
          {insc === 'none' && eligible && !closed && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
                <span>Entrás como <b style={{ color: 'var(--text)' }}>pendiente</b> hasta que te acepten</span>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>{usd(t.price)}</span>
              </div>
              <button onClick={onJoin} style={{ ...primaryBtn, width: '100%', height: 54, fontSize: 16 }}>
                <Icon name="check" size={20} stroke={2.6} />Inscribirme
              </button>
            </>
          )}
          {insc === 'none' && !eligible && (
            <button disabled style={{ ...secondaryBtn, width: '100%', height: 54, fontSize: 15, color: 'var(--muted-2)', cursor: 'default' }}>
              <Icon name="lock" size={18} />Es categoría {t.cat} · jugás {USER.cat}
            </button>
          )}
          {insc === 'none' && eligible && closed && (
            <button disabled style={{ ...secondaryBtn, width: '100%', height: 54, fontSize: 15, color: 'var(--muted-2)', cursor: 'default' }}>
              <Icon name="clock" size={18} />Inscripción cerrada
            </button>
          )}
          {pending && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, height: 54, borderRadius: 'var(--radius-btn)', background: 'var(--surface-2)', border: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14.5, fontWeight: 700, color: 'var(--muted)' }}>
                <span style={{ width: 14, height: 14, borderRadius: 999, border: '2px solid var(--muted-2)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                Esperando al organizador
              </div>
              <button onClick={onWithdraw} style={{ ...secondaryBtn, flex: '0 0 auto', width: 'auto', padding: '0 18px', height: 54, fontSize: 14, fontWeight: 700 }}>Retirarme</button>
            </div>
          )}
          {inside && (
            <button onClick={() => setTab('Mis partidos')} style={{ ...primaryBtn, width: '100%', height: 54, fontSize: 16 }}>
              <Icon name="calendar" size={19} stroke={2.4} />Ver cuándo y dónde juego
            </button>
          )}
        </div>
      )}
    </div>
  );
}
const divider = { height: 1, background: 'var(--line)', marginLeft: 60 };

// ── #3 ¿Cuándo y dónde juego? ────────────────────────────────────────────────
function MisPartidos() {
  const [resp, setResp] = React.useState(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>Sólo tus partidos. El cuadro completo está en <b style={{ color: 'var(--text)' }}>Tabla</b>.</div>
      {MY_TMATCHES.map((m, i) => {
        const proposed = m.state === 'PROPOSED' && !resp;
        return (
          <Card key={i} style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--green)', background: 'var(--green-bg)', padding: '2px 8px', borderRadius: 6 }}>{m.round}</span>
              {m.state === 'WAITING' && <span style={{ ...tagStyle, padding: '2px 8px' }}>Depende del cuadro</span>}
              {resp === 'ACCEPT' && i === 0 && <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--green)', marginLeft: 'auto' }}>Confirmado</span>}
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
              <div style={{ width: 62, flexShrink: 0, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: 'var(--green)' }}>{m.day.split(' ')[0]}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.15 }}>{m.time}</span>
                <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{m.day.split(' ').slice(1).join(' ')}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar initials={m.rival[0]} size={30} idx={i + 1} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Rival</div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{m.rival}</div>
                  </div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
                  <Icon name="court" size={14} style={{ color: 'var(--muted-2)' }} />{m.court}
                </div>
              </div>
            </div>
            {proposed && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>El organizador propuso este horario. ¿Te sirve?</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setResp('ACCEPT')} style={{ ...primaryBtn, height: 44, fontSize: 14.5 }}><Icon name="check" size={17} stroke={2.6} />Me sirve</button>
                  <button onClick={() => setResp('REJECT')} style={{ ...secondaryBtn, height: 44, fontSize: 14.5 }}>No puedo</button>
                </div>
              </div>
            )}
            {resp === 'REJECT' && i === 0 && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>Avisamos al organizador. Va a reprogramar el partido y te llega el horario nuevo.</div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ── #4 ¿Cómo voy? ────────────────────────────────────────────────────────────
function TablaTab({ onBracket }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--green)' }} />
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Se actualiza sola al cargarse cada resultado</span>
      </div>
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', padding: '10px 14px', fontSize: 11, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--muted-2)', borderBottom: '1px solid var(--line)' }}>
          <span style={{ width: 24 }}>#</span><span style={{ flex: 1 }}>Jugador</span>
          <span style={{ width: 34, textAlign: 'center' }}>PJ</span><span style={{ width: 34, textAlign: 'center' }}>PG</span><span style={{ width: 38, textAlign: 'right' }}>Pts</span>
        </div>
        {SCOREBOARD.map(r => (
          <div key={r.pos} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--line)', background: r.you ? 'var(--green-bg)' : 'transparent' }}>
            <span style={{ width: 24, fontSize: 13.5, fontWeight: 800, color: r.pos <= 2 ? 'var(--green)' : 'var(--muted)' }}>{r.pos}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: r.you ? 800 : 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}{r.you && <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--green)' }}> · vos</span>}</span>
            <span style={{ width: 34, textAlign: 'center', fontSize: 13.5, color: 'var(--muted)' }}>{r.pj}</span>
            <span style={{ width: 34, textAlign: 'center', fontSize: 13.5, color: 'var(--muted)' }}>{r.pg}</span>
            <span style={{ width: 38, textAlign: 'right', fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>{r.pts}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 14 }} />
      <button onClick={onBracket} style={{ ...secondaryBtn, width: '100%', height: 50, fontSize: 15 }}>
        <Icon name="trophy" size={19} />Ver el cuadro completo
      </button>
    </div>
  );
}

// ── Cuadro (bracket) ─────────────────────────────────────────────────────────
function BracketScreen({ onBack, state = 'ok', canEdit, onMatch, t }) {
  if (state === 'ok' && t && t.format !== 'Eliminación simple') state = 'format';
  if (state !== 'ok') {
    const cfg = state === 'format'
      ? { icon: 'info', title: 'Este torneo no arma cuadro', body: 'El cuadro existe sólo para eliminación simple. Este torneo es round robin: seguí la posición en la tabla.' }
      : { icon: 'users', title: 'Todavía no hay cuadro', body: 'Hacen falta al menos 2 inscriptos confirmados. Cuando el organizador confirme, el cuadro aparece acá.' };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
        <SheetHeader title="Cuadro" onBack={onBack} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--surface)', border: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}><Icon name={cfg.icon} size={26} /></div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginTop: 14 }}>{cfg.title}</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>{cfg.body}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <SheetHeader title="Cuadro" subtitle={t ? `${t.name} · ${t.size} jugadores` : 'Copa Cuádrala · 8 jugadores'} onBack={onBack} />
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 0 24px' }}>
        <div style={{ display: 'flex', gap: 12, padding: '0 20px', minWidth: 'max-content' }}>
          {BRACKET.map(r => (
            <div key={r.n} style={{ width: 190, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted)' }}>{r.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'space-around', flex: 1 }}>
                {r.matches.map((m, i) => <BracketMatch key={i} m={m} n={i + 1} canEdit={canEdit} onMatch={onMatch} />)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '18px 20px 0', maxWidth: 402 }}>
          <div style={{ fontSize: 12, color: 'var(--muted-2)', lineHeight: 1.5 }}>Los huéspedes (inscriptos sin cuenta) no entran al cuadro: sólo jugadores con cuenta.</div>
        </div>
      </div>
    </div>
  );
}

function BracketMatch({ m, n, canEdit, onMatch }) {
  const row = (name, score, win, bye) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: win ? 800 : 600, color: name ? (win ? 'var(--text)' : 'var(--muted)') : 'var(--muted-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name || (bye ? 'Bye' : 'Por definir')}
      </span>
      {score != null && <span style={{ fontSize: 13.5, fontWeight: 800, color: win ? 'var(--green)' : 'var(--muted)' }}>{score}</span>}
    </div>
  );
  const live = m.st === 'IN_PROGRESS';
  return (
    <div onClick={canEdit && m.a && m.b ? () => onMatch(m, n) : undefined} style={{
      background: 'var(--surface)', border: `1.5px solid ${live ? 'var(--green)' : 'var(--line)'}`, borderRadius: 14, overflow: 'hidden',
      boxShadow: live ? '0 0 0 3px var(--green-bg)' : 'none', cursor: canEdit && m.a && m.b ? 'pointer' : 'default',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: 'var(--surface-2)' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted-2)' }}>Partido {n}</span>
        {live && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--green)' }}>EN JUEGO</span>}
        {m.st === 'PENDING' && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-2)' }}>Pendiente</span>}
        {canEdit && m.st === 'IN_PROGRESS' && <Icon name="plus" size={13} style={{ color: 'var(--green)' }} />}
      </div>
      {row(m.a, m.sa, m.w === 'a', false)}
      <div style={{ height: 1, background: 'var(--line)' }} />
      {row(m.b, m.sb, m.w === 'b', m.st === 'BYE')}
    </div>
  );
}

Object.assign(window, {
  TORNEOS, TSTATUS, MY_TMATCHES, SCOREBOARD, BRACKET,
  TPill, CupoBar, FactRow, Banner, TorneoCard, TorneosScreen, TorneoDetail, BracketScreen, BracketMatch, metaRow, divider,
});

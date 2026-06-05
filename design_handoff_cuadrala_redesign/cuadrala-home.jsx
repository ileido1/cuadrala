/* cuadrala-home.jsx — Home, match cards, bottom nav, secondary tabs */

const USER = { name: 'Daniel', initials: 'D', cat: '7ma', elo: 1240, played: 38, win: 0.61 };

const MY_MATCHES = [
  { day: 'LUN', date: '02 Jun', time: '17:00', cat: '7ma', club: 'Club Cuádrala', court: 'Cancha Rexona', loc: 'Las Mercedes, Caracas', price: '6.25', filled: 1, total: 6, surface: 'Exterior' },
  { day: 'MAR', date: '03 Jun', time: '19:30', cat: '7ma', club: 'Club Cuádrala', court: 'Cancha 2', loc: 'Las Mercedes, Caracas', price: '9.00', filled: 3, total: 4, surface: 'Exterior' },
];
const NEARBY = [
  { day: 'LUN', date: '02 Jun', time: '17:00', cat: '6ta', club: 'Padel Country', court: 'Cancha 1', loc: 'Chacao, Caracas', price: '8.50', filled: 2, total: 6, surface: 'Cubierta' },
  { day: 'MIÉ', date: '04 Jun', time: '20:00', cat: '7ma', club: 'Base Aérea Padel', court: 'Cancha A', loc: 'La Carlota, Caracas', price: '6.00', filled: 5, total: 6, surface: 'Exterior' },
];

// ── Match card ────────────────────────────────────────────────────────────────
function MatchCard({ m }) {
  const full = m.filled >= m.total;
  return (
    <Card onClick={() => {}} style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'stretch' }}>
      {/* date block */}
      <div style={{ width: 58, flexShrink: 0, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: 'var(--green)' }}>{m.day}</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{m.time}</span>
        <span style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>{m.date}</span>
      </div>
      {/* body */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#15301a', background: 'var(--lime)', padding: '2px 8px', borderRadius: 6 }}>{m.cat}</span>
          <span style={{ ...tagStyle, padding: '2px 8px' }}>{m.surface}</span>
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.club} · {m.court}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>{m.loc}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', paddingTop: 10 }}>
          <AvatarStack filled={m.filled} total={m.total} size={24} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: full ? 'var(--muted)' : 'var(--green)' }}>{full ? 'Completa' : `${m.total - m.filled} cupos`}</span>
          <div style={{ marginLeft: 'auto', textAlign: 'right', lineHeight: 1.12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>{usd(m.price)}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}> p/p</span></div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-2)' }}>{bs(m.price)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── App header (greeting + avatar + bell) ────────────────────────────────────
function AppHeader({ onBell }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '54px 20px 4px' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ width: 46, height: 46, borderRadius: 999, background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 800, border: '2px solid var(--lime)' }}>{USER.initials}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Hola, {USER.name}</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <Icon name="target" size={13} style={{ color: 'var(--green)' }} />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>{USER.cat}</span>
          <span style={{ fontSize: 13, color: 'var(--muted-2)' }}>·</span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{USER.elo}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>ELO</span>
        </div>
      </div>
      <button onClick={onBell} style={{ all: 'unset', cursor: 'pointer', position: 'relative', width: 42, height: 42, borderRadius: 12, background: 'var(--surface)', border: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
        <Icon name="bell" size={20} />
        <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 999, background: 'var(--lime)', border: '1.5px solid var(--surface)' }} />
      </button>
    </div>
  );
}

// ── Home screen ───────────────────────────────────────────────────────────────
function HomeScreen({ onCreate, onSearch, onBell }) {
  return (
    <div style={{ paddingBottom: 24 }}>
      <AppHeader onBell={onBell} />
      <div style={{ padding: '12px 20px 0' }}>
        <h1 style={{ margin: '0 0 16px', fontSize: 27, fontWeight: 800, letterSpacing: -0.5, color: 'var(--text)' }}>Actividad cerca de ti</h1>

        {/* matchmaking hero */}
        <div style={{ borderRadius: 'var(--radius-card)', overflow: 'hidden', background: 'var(--bg-2)', border: '1.5px solid var(--line)' }}>
          <div style={{ position: 'relative', padding: '18px 18px 16px' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 100% 0%, color-mix(in srgb, var(--green) 22%, transparent), transparent 60%)' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(23,163,74,.45)' }}>
                <Icon name="bolt" size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Buscar partida</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Matchmaking por horario y nivel</div>
              </div>
            </div>
            <div style={{ position: 'relative', display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={onSearch} style={primaryBtn}>
                <Icon name="search" size={18} stroke={2.4} />Buscar
              </button>
              <button onClick={onCreate} style={secondaryBtn}>
                <Icon name="plus" size={18} stroke={2.4} />Crear
              </button>
            </div>
          </div>
        </div>

        {/* My matches */}
        <SectionHeaderRow title="Mis partidas" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MY_MATCHES.map((m, i) => <MatchCard key={i} m={m} />)}
        </div>

        {/* Nearby */}
        <SectionHeaderRow title="Cerca de ti" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {NEARBY.map((m, i) => <MatchCard key={i} m={m} />)}
        </div>
      </div>
    </div>
  );
}

function SectionHeaderRow({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '24px 0 12px' }}>
      <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: 'var(--text)' }}>{title}</h2>
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: 'var(--green)' }}>Ver todas</button>
    </div>
  );
}

const primaryBtn = {
  all: 'unset', boxSizing: 'border-box', cursor: 'pointer', flex: 1, height: 48, borderRadius: 'var(--radius-btn)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  fontSize: 15, fontWeight: 800, color: '#fff', background: 'var(--green)', boxShadow: '0 6px 16px rgba(23,163,74,.4)',
};
const secondaryBtn = {
  all: 'unset', boxSizing: 'border-box', cursor: 'pointer', flex: 1, height: 48, borderRadius: 'var(--radius-btn)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  fontSize: 15, fontWeight: 800, color: 'var(--text)', background: 'var(--surface-2)', border: '1.5px solid var(--line)',
};

// ── Matches tab ────────────────────────────────────────────────────────────────
function MatchesScreen() {
  const [tab, setTab] = React.useState('Próximas');
  const list = tab === 'Próximas' ? [...MY_MATCHES, ...NEARBY] : MY_MATCHES;
  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '54px 20px 4px' }}>
        <h1 style={{ margin: '0 0 16px', fontSize: 27, fontWeight: 800, letterSpacing: -0.5, color: 'var(--text)' }}>Mis partidas</h1>
        <Segmented options={['Próximas', 'Historial']} value={tab} onChange={setTab} />
      </div>
      <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map((m, i) => <MatchCard key={i} m={m} />)}
      </div>
    </div>
  );
}

// ── Avisos tab ───────────────────────────────────────────────────────────────
const AVISOS = [
  { icon: 'users', title: 'Carlos se unió a tu partida', sub: 'Cancha 2 · MAR 19:30', t: 'hace 5 min', unread: true },
  { icon: 'check', title: 'Tu partida fue confirmada', sub: 'Club Cuádrala · LUN 17:00', t: 'hace 1 h', unread: true },
  { icon: 'target', title: 'Tu ELO subió a 1240 (+12)', sub: 'Ganaste vs. equipo de Luis', t: 'ayer', unread: false },
  { icon: 'clock', title: 'Recordatorio: partida mañana', sub: 'Padel Country · 17:00', t: 'ayer', unread: false },
];
function AvisosScreen() {
  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '54px 20px 8px' }}>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: -0.5, color: 'var(--text)' }}>Avisos</h1>
      </div>
      <div style={{ padding: '8px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {AVISOS.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px', borderRadius: 14, background: a.unread ? 'var(--surface)' : 'transparent', border: `1.5px solid ${a.unread ? 'var(--line)' : 'transparent'}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: 'var(--green-bg)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={a.icon} size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{a.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{a.sub}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>{a.t}</span>
              {a.unread && <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--lime)' }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Perfil tab ───────────────────────────────────────────────────────────────
function PerfilScreen() {
  const stats = [
    { k: 'Jugadas', v: USER.played },
    { k: 'Victorias', v: `${Math.round(USER.win * 100)}%` },
    { k: 'ELO', v: USER.elo },
  ];
  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '54px 20px 0', textAlign: 'center' }}>
        <div style={{ width: 84, height: 84, borderRadius: 999, margin: '8px auto 0', background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800, border: '3px solid var(--lime)' }}>{USER.initials}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 12 }}>{USER.name} Rodríguez</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13.5, fontWeight: 700, color: 'var(--green)', background: 'var(--green-bg)', padding: '5px 12px', borderRadius: 999 }}>
          <Icon name="target" size={15} />Categoría {USER.cat}
        </div>
      </div>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {stats.map(s => (
            <div key={s.k} style={{ flex: 1, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 14, padding: '16px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{s.v}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.k}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {[['user', 'Editar perfil'], ['target', 'Historial de ELO'], ['pin', 'Clubes favoritos'], ['sliders', 'Ajustes']].map(([ic, label], i, arr) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <Icon name={ic} size={19} style={{ color: 'var(--muted)' }} />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
              <Icon name="chevronRight" size={18} style={{ color: 'var(--muted-2)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Bottom nav ───────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab }) {
  const items = [
    { id: 'inicio', label: 'Inicio', icon: 'home' },
    { id: 'partidas', label: 'Partidas', icon: 'court' },
    { id: 'avisos', label: 'Avisos', icon: 'bell', badge: 2 },
    { id: 'perfil', label: 'Perfil', icon: 'user' },
  ];
  return (
    <div style={{ flexShrink: 0, display: 'flex', borderTop: '1px solid var(--line)', background: 'var(--bg-2)', padding: '8px 6px 26px' }}>
      {items.map(it => {
        const on = tab === it.id;
        return (
          <button key={it.id} onClick={() => setTab(it.id)} style={{ all: 'unset', cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0' }}>
            <div style={{ position: 'relative', color: on ? 'var(--green)' : 'var(--muted-2)' }}>
              <Icon name={it.icon} size={24} stroke={on ? 2.4 : 2} />
              {it.badge && <span style={{ position: 'absolute', top: -3, right: -6, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--lime)', color: '#15301a', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--bg-2)' }}>{it.badge}</span>}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: on ? 'var(--green)' : 'var(--muted-2)' }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { HomeScreen, MatchesScreen, AvisosScreen, PerfilScreen, BottomNav, MatchCard });

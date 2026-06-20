/* cuadrala-search.jsx — Search / matchmaking screen */

const SEARCH_POOL = [
  { day: 'LUN', date: '02 Jun', time: '17:00', cat: '7ma', club: 'Club Cuádrala', court: 'Cancha Rexona', loc: 'Las Mercedes, Caracas', price: '6.25', filled: 1, total: 6, surface: 'Exterior', when: 'Tarde', level: 'mi' },
  { day: 'LUN', date: '02 Jun', time: '08:30', cat: '7ma', club: 'Padel Country', court: 'Cancha 1', loc: 'Chacao, Caracas', price: '8.50', filled: 3, total: 4, surface: 'Cubierta', when: 'Mañana', level: 'mi' },
  { day: 'MAR', date: '03 Jun', time: '20:00', cat: '6ta', club: 'Base Aérea Padel', court: 'Cancha A', loc: 'La Carlota, Caracas', price: '6.00', filled: 2, total: 4, surface: 'Exterior', when: 'Noche', level: 'otra' },
  { day: 'MIÉ', date: '04 Jun', time: '19:30', cat: '7ma', club: 'Club Cuádrala', court: 'Cancha 2', loc: 'Las Mercedes, Caracas', price: '9.00', filled: 3, total: 4, surface: 'Exterior', when: 'Noche', level: 'mi' },
  { day: 'JUE', date: '05 Jun', time: '10:00', cat: '8va', club: 'Padel Country', court: 'Cancha 2', loc: 'Chacao, Caracas', price: '7.50', filled: 1, total: 4, surface: 'Cubierta', when: 'Mañana', level: 'otra' },
];

function FilterChip({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer', whiteSpace: 'nowrap',
      height: 34, padding: '0 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 5,
      color: active ? (children === 'Mi nivel' ? '#15301a' : 'var(--green)') : 'var(--muted)',
      background: active ? (children === 'Mi nivel' ? 'var(--lime)' : 'var(--green-bg)') : 'var(--surface-2)',
      border: `1.5px solid ${active ? (children === 'Mi nivel' ? 'var(--lime)' : 'var(--green)') : 'var(--line)'}`,
      transition: 'all .14s',
    }}>{children}</button>
  );
}

function SearchScreen({ onClose, onOpenMatch, onCreate }) {
  const days = React.useMemo(() => buildDays(14), []);
  const [date, setDate] = React.useState(days[0].key);
  const [level, setLevel] = React.useState(true);     // mi nivel
  const [when, setWhen] = React.useState('Cualquiera');

  const results = SEARCH_POOL.filter(m =>
    (!level || m.level === 'mi') &&
    (when === 'Cualquiera' || m.when === when) &&
    m.filled < m.total
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <SheetHeader title="Buscar partida" subtitle="Matchmaking por horario y nivel" onBack={onClose} backIcon="close" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 110px' }}>
        {/* smart matchmaking banner */}
        <div style={{ position: 'relative', borderRadius: 'var(--radius-card)', overflow: 'hidden', background: 'var(--bg-2)', border: '1.5px solid var(--line)', padding: '16px', marginBottom: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 0% 0%, color-mix(in srgb, var(--green) 22%, transparent), transparent 60%)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(23,163,74,.45)' }}><Icon name="bolt" size={22} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>Encontrar para mí</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Te ubicamos en la mejor partida según tu ELO</div>
            </div>
            <Icon name="chevronRight" size={20} style={{ color: 'var(--muted)' }} />
          </div>
        </div>

        {/* date */}
        <SectionLabel>Día</SectionLabel>
        <DateStrip days={days} value={date} onChange={setDate} />

        {/* filters */}
        <div style={{ height: 18 }} />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -20px', padding: '0 20px 4px' }}>
          <FilterChip active={level} onClick={() => setLevel(!level)}>Mi nivel</FilterChip>
          {['Cualquiera', 'Mañana', 'Tarde', 'Noche'].map(w => (
            <FilterChip key={w} active={when === w} onClick={() => setWhen(w)}>{w}</FilterChip>
          ))}
        </div>

        {/* results */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 0 12px' }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>{results.length} partida{results.length !== 1 ? 's' : ''}</h2>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>con cupos</span>
        </div>

        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-2)' }}><Icon name="search" size={26} /></div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Nada con esos filtros</div>
            <div style={{ fontSize: 13.5, marginTop: 4 }}>Prueba otro día o crea tu propia partida.</div>
            <button onClick={onCreate} style={{ all: 'unset', cursor: 'pointer', marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, height: 46, padding: '0 20px', borderRadius: 'var(--radius-btn)', background: 'var(--green)', color: '#fff', fontSize: 15, fontWeight: 800 }}><Icon name="plus" size={18} />Crear partida</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((m, i) => <MatchCard key={i} m={m} onPress={() => onOpenMatch(m)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SearchScreen });

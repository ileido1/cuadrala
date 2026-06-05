/* cuadrala-screens.jsx — Home + Create Match screens */

// ── Demo data ────────────────────────────────────────────────────────────────
const VENUES = [
  {
    id: 'cuadrala', name: 'Club Cuádrala', zone: 'Las Mercedes', dist: '1.2 km',
    price: 8, surface: 'Exterior', rating: 4.8, pin: { x: 58, y: 40 },
    courts: [
      { id: 'c-central', name: 'Cancha Central', surface: 'Exterior', slots: ['07:00', '08:30', '10:00', '17:00', '18:30', '20:00'] },
      { id: 'c-2', name: 'Cancha 2', surface: 'Exterior', slots: ['09:00', '12:00', '19:00', '21:00'] },
      { id: 'c-rexona', name: 'Cancha Rexona', surface: 'Exterior', slots: [] },
    ],
  },
  {
    id: 'country', name: 'Padel Country', zone: 'Chacao', dist: '2.5 km',
    price: 10, surface: 'Cubierta', rating: 4.6, pin: { x: 30, y: 62 },
    courts: [
      { id: 'pc-1', name: 'Cancha 1', surface: 'Cubierta', slots: ['08:00', '11:30', '16:00', '18:00'] },
      { id: 'pc-2', name: 'Cancha 2', surface: 'Cubierta', slots: ['10:30', '13:00', '20:30'] },
    ],
  },
  {
    id: 'base', name: 'Base Aérea Padel', zone: 'La Carlota', dist: '3.1 km',
    price: 6, surface: 'Exterior', rating: 4.4, pin: { x: 76, y: 28 },
    courts: [
      { id: 'b-1', name: 'Cancha A', surface: 'Exterior', slots: ['07:30', '09:00', '17:30', '19:30'] },
    ],
  },
];

const CATEGORIES = ['8va', '7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra'];

function buildDays(n) {
  const out = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push({ key: d.toISOString().slice(0, 10), date: d, offset: i, today: i === 0 });
  }
  return out;
}

// ── Stylized compact map ─────────────────────────────────────────────────────
function MiniMap({ venues, selectedId, onSelect }) {
  return (
    <div style={{ position: 'relative', height: 188, borderRadius: 'var(--radius-card)', overflow: 'hidden', border: '1.5px solid var(--line)', background: 'var(--map)' }}>
      {/* parks */}
      <div style={{ position: 'absolute', width: 120, height: 90, left: -20, top: 70, borderRadius: '50%', background: 'color-mix(in srgb, var(--green) 16%, var(--map))' }} />
      <div style={{ position: 'absolute', width: 90, height: 70, right: 24, top: -16, borderRadius: '46%', background: 'color-mix(in srgb, var(--green) 13%, var(--map))' }} />
      <div style={{ position: 'absolute', width: 70, height: 70, right: -18, bottom: 10, borderRadius: '48%', background: 'color-mix(in srgb, var(--green) 11%, var(--map))' }} />
      {/* roads */}
      {[
        { t: '34%', l: '-10%', w: '120%', r: '-8deg' },
        { t: '70%', l: '-10%', w: '120%', r: '6deg' },
      ].map((r, i) => (
        <div key={i} style={{ position: 'absolute', top: r.t, left: r.l, width: r.w, height: 6, background: 'color-mix(in srgb, var(--text) 8%, transparent)', transform: `rotate(${r.r})` }} />
      ))}
      <div style={{ position: 'absolute', top: '-10%', left: '46%', width: 6, height: '120%', background: 'color-mix(in srgb, var(--text) 8%, transparent)', transform: 'rotate(7deg)' }} />
      {/* pins */}
      {venues.map(v => {
        const on = v.id === selectedId;
        return (
          <button key={v.id} onClick={() => onSelect(v.id)} style={{
            all: 'unset', cursor: 'pointer', position: 'absolute',
            left: `${v.pin.x}%`, top: `${v.pin.y}%`, transform: 'translate(-50%,-100%)', zIndex: on ? 3 : 2,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 999,
              fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              background: on ? 'var(--green)' : 'var(--surface)', color: on ? '#fff' : 'var(--text)',
              border: `1.5px solid ${on ? 'var(--green)' : 'var(--line)'}`,
              boxShadow: on ? '0 6px 16px rgba(23,163,74,.45)' : '0 3px 8px rgba(0,0,0,.25)',
              transition: 'all .15s',
            }}>
              <Icon name="pin" size={13} />US${v.price}
            </div>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: on ? 'var(--green)' : 'var(--surface)', border: `1.5px solid ${on ? 'var(--green)' : 'var(--line)'}`, margin: '-3px auto 0', transform: 'rotate(45deg)' }} />
          </button>
        );
      })}
      {/* my location */}
      <div style={{ position: 'absolute', left: '50%', bottom: '14%', transform: 'translateX(-50%)' }}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: '#3B82F6', border: '2.5px solid #fff', boxShadow: '0 0 0 4px rgba(59,130,246,.25)' }} />
      </div>
    </div>
  );
}

// ── Venue card (list mode) ───────────────────────────────────────────────────
function VenueCard({ v, selected, onClick }) {
  return (
    <Card selected={selected} onClick={onClick} style={{ display: 'flex', gap: 12, padding: 12, alignItems: 'center' }}>
      <ImgPlaceholder label="FOTO" style={{ width: 64, height: 64, flexShrink: 0 }} radius={12} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{v.name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
            <Icon name="star" size={12} style={{ color: 'var(--lime)' }} />{v.rating}
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{v.zone} · {v.dist}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <span style={tagStyle}>{v.surface}</span>
          <span style={tagStyle}>{v.courts.length} canchas</span>
        </div>
      </div>
      <Price amount={v.price} suffix="/h" />
    </Card>
  );
}
const tagStyle = { fontSize: 11, fontWeight: 600, color: 'var(--muted)', background: 'var(--surface-2)', padding: '3px 8px', borderRadius: 7 };

// ── Court + slots picker (after venue chosen) ────────────────────────────────
function CourtPicker({ venue, dateLabel, selCourt, selSlot, onPick, onChangeDate }) {
  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {venue.courts.map(c => {
        const empty = c.slots.length === 0;
        return (
          <div key={c.id} style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: empty ? 8 : 10 }}>
              <Icon name="court" size={17} style={{ color: 'var(--muted)' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{c.name}</span>
              <span style={{ ...tagStyle, marginLeft: 'auto' }}>{c.surface}</span>
            </div>
            {empty ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', borderRadius: 10, padding: '10px 12px' }}>
                <Icon name="clock" size={16} style={{ color: 'var(--muted-2)' }} />
                <span style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>Sin horarios el {dateLabel}</span>
                <button onClick={onChangeDate} style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                  Otro día <Icon name="arrowRight" size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {c.slots.map(s => {
                  const on = selCourt === c.id && selSlot === s;
                  return (
                    <button key={s} onClick={() => onPick(c.id, s)} style={{
                      all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                      height: 34, padding: '0 12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      color: on ? '#fff' : 'var(--text)', background: on ? 'var(--green)' : 'var(--surface-2)',
                      border: `1.5px solid ${on ? 'var(--green)' : 'var(--line)'}`, transition: 'all .14s',
                    }}>
                      <Icon name="clock" size={13} style={{ opacity: on ? 1 : 0.5 }} />{s}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── CREATE MATCH SCREEN ───────────────────────────────────────────────────────
function CreateMatchScreen({ onClose, initialView = 'Lista' }) {
  const days = React.useMemo(() => buildDays(21), []);
  const [date, setDate] = React.useState(days[0].key);
  const [view, setView] = React.useState(initialView);
  const [query, setQuery] = React.useState('');
  const [venueId, setVenueId] = React.useState(null);
  const [court, setCourt] = React.useState(null);
  const [slot, setSlot] = React.useState(null);
  const [cat, setCat] = React.useState('8va');
  const [elo, setElo] = React.useState(true);
  const [gender, setGender] = React.useState('Masculino');
  const [players, setPlayers] = React.useState(4);
  const dateScrollRef = React.useRef(null);

  const venue = VENUES.find(v => v.id === venueId);
  const selDay = days.find(d => d.key === date);
  const dateLabel = `${DOW[selDay.date.getDay()]} ${selDay.date.getDate()}`;
  const filtered = VENUES.filter(v => (v.name + v.zone).toLowerCase().includes(query.toLowerCase()));
  const ready = venue && court && slot && cat && gender;

  const pickVenue = (id) => { setVenueId(id); setCourt(null); setSlot(null); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* sheet header */}
      <div style={{ paddingTop: 56, paddingBottom: 14, paddingInline: 20, background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--text)' }}>
          <Icon name="close" size={20} />
        </button>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>Crear partida</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Define cuándo, dónde y con quién</div>
        </div>
      </div>

      {/* scroll content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 120px' }}>
        {/* WHEN */}
        <SectionLabel>Cuándo</SectionLabel>
        <div ref={dateScrollRef}><DateStrip days={days} value={date} onChange={setDate} /></div>

        {/* WHERE */}
        <div style={{ height: 24 }} />
        <SectionLabel required>Dónde</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-btn)', padding: '0 14px', height: 48, marginBottom: 10 }}>
          <Icon name="search" size={18} style={{ color: 'var(--muted)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar club o dirección" style={{ all: 'unset', flex: 1, fontSize: 14.5, color: 'var(--text)' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Segmented options={['Lista', 'Mapa']} value={view} onChange={setView} icons={['list', 'map']} />
        </div>

        {view === 'Mapa' && (
          <div style={{ marginBottom: 12 }}>
            <MiniMap venues={filtered} selectedId={venueId} onSelect={pickVenue} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(v => {
            const open = venueId === v.id;
            return (
              <div key={v.id}>
                <VenueCard v={v} selected={open} onClick={() => pickVenue(open ? null : v.id)} />
                {open && <CourtPicker venue={v} dateLabel={dateLabel} selCourt={court} selSlot={slot} onPick={(c, s) => { setCourt(c); setSlot(s); }} onChangeDate={() => dateScrollRef.current?.scrollIntoView?.()} />}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 14 }}>Sin resultados para “{query}”.</div>
          )}
        </div>

        {/* CATEGORY */}
        <div style={{ height: 24 }} />
        <SectionLabel required>Categoría</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map(c => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
        </div>

        {/* ELO */}
        <div style={{ height: 20 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', padding: '14px 16px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
            <Icon name="target" size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Afecta ELO</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>El resultado modifica el ranking</div>
          </div>
          <Toggle value={elo} onChange={setElo} />
        </div>

        {/* GENDER */}
        <div style={{ height: 20 }} />
        <SectionLabel>Género</SectionLabel>
        <Segmented options={['Masculino', 'Femenino', 'Mixto']} value={gender} onChange={setGender} />

        {/* PLAYERS */}
        <div style={{ height: 20 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Jugadores</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Cupos totales en la partida</div>
          </div>
          <Stepper value={players} min={2} max={8} onChange={setPlayers} />
        </div>

        {/* NOTES */}
        <div style={{ height: 20 }} />
        <SectionLabel>Notas <span style={{ textTransform: 'none', fontWeight: 500 }}>(opcional)</span></SectionLabel>
        <textarea maxLength={300} placeholder="Nivel esperado, si llevas pelotas, parking…" style={{
          all: 'unset', boxSizing: 'border-box', width: '100%', minHeight: 84, padding: '12px 14px',
          background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)',
          fontSize: 14, color: 'var(--text)', lineHeight: 1.5, fontFamily: 'inherit',
        }} />
      </div>

      {/* sticky footer */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 20px 30px', background: 'linear-gradient(to top, var(--bg-2) 70%, transparent)', borderTop: '1px solid var(--line)' }}>
        {venue && court && slot && (() => {
          const pp = venue.price / players * 1.5;
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 10, color: 'var(--muted)' }}>
              <span>{venue.name} · {venue.courts.find(c => c.id === court)?.name} · {slot}</span>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{usd(pp)}<span style={{ fontWeight: 500, color: 'var(--muted)' }}> p/p · {bs(pp)}</span></span>
            </div>
          );
        })()}
        <button disabled={!ready} style={{
          all: 'unset', boxSizing: 'border-box', width: '100%', height: 54, borderRadius: 'var(--radius-btn)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 16, fontWeight: 800, cursor: ready ? 'pointer' : 'default',
          background: ready ? 'var(--green)' : 'var(--surface-2)', color: ready ? '#fff' : 'var(--muted-2)',
          boxShadow: ready ? '0 8px 20px rgba(23,163,74,.4)' : 'none', transition: 'all .2s',
        }}>
          <Icon name="check" size={20} stroke={2.6} />{ready ? 'Crear partida' : 'Elige cancha y horario'}
        </button>
      </div>
    </div>
  );
}

window.CreateMatchScreen = CreateMatchScreen;
window.VENUES = VENUES;
window.buildDays = buildDays;
window.tagStyle = tagStyle;

/* cuadrala-onboarding.jsx — Wizard de configuración de perfil (4 pasos) */

// ── Chrome común: top bar + progreso segmentado + footer sticky ──────────────
function WizardChrome({ step, total = 4, onBack, footer, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--bg)' }}>
      {/* top bar */}
      <div style={{ paddingTop: 56, paddingBottom: 12, paddingInline: 16, background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ all: 'unset', cursor: 'pointer', width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--text)', flexShrink: 0 }}>
            <Icon name="chevronLeft" size={20} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Configura tu perfil</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginTop: 1 }}>Paso {step} de {total}</div>
          </div>
          <div style={{ width: 38, flexShrink: 0 }} />
        </div>
        {/* progreso segmentado */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? 'var(--green)' : 'var(--line)', transition: 'background-color .25s' }} />
          ))}
        </div>
      </div>

      {/* contenido scroll */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 120px' }}>
        {children}
      </div>

      {/* footer */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 20px 30px', background: 'linear-gradient(to top, var(--bg-2) 72%, transparent)', borderTop: '1px solid var(--line)' }}>
        {footer}
      </div>
    </div>
  );
}

function StepIntro({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 900, letterSpacing: -0.4, color: 'var(--text)' }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 14.5, fontWeight: 500, color: 'var(--muted)', lineHeight: 1.5 }}>{subtitle}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 1 — TU PERFIL
// ═══════════════════════════════════════════════════════════════════════════
function StepProfile({ data, set }) {
  const initials = (data.name || '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'TÚ';
  return (
    <>
      <StepIntro title="Tu perfil" subtitle="Así te verán los otros jugadores." />

      {/* avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 26 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 108, height: 108, borderRadius: 999, background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 900, boxShadow: '0 12px 28px rgba(23,163,74,.4)' }}>{initials}</div>
          <div style={{ position: 'absolute', right: 2, bottom: 2, width: 34, height: 34, borderRadius: 999, background: 'var(--surface)', border: '2.5px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
            <Icon name="camera" size={17} />
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginTop: 12 }}>Toca para cambiar la foto</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Nombre completo" icon="user" hint="Carlos Rodríguez" value={data.name} onChange={e => set({ name: e.target.value })} />
        <Field label="Teléfono (WhatsApp)" icon="phone" hint="412 555 1234" prefix="🇻🇪 +58" value={data.phone} onChange={e => set({ phone: e.target.value })}
          helper="Te avisamos cuando una partida está cuadrada." />
        <Field label="Número de documento (DNI)" icon="card" hint="Ej: 12345678" value={data.dni} onChange={e => set({ dni: e.target.value })}
          helper="Opcional. Solo números sin puntos ni guiones." />
        <Field label="Fecha de nacimiento" icon="cake" hint="DD / MM / AAAA" value={data.dob} onChange={e => set({ dob: e.target.value })} />
        <Field label="Ciudad" icon="pin" hint="Caracas, Venezuela" value={data.city} onChange={e => set({ city: e.target.value })} />
      </div>

      {/* vista previa */}
      <div style={{ marginTop: 24 }}>
        <SectionLabel>Vista previa de tu perfil</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface-2)', border: '1.5px solid var(--line)', borderRadius: 16, padding: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 999, background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{data.name || 'Tu nombre'}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 1 }}>{data.city || 'Tu ciudad'}</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: 'var(--green)', background: 'var(--green-bg)', padding: '5px 10px', borderRadius: 999 }}>
            <Icon name="sparkle" size={13} />Nuevo
          </span>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 2 — TUS DEPORTES
// ═══════════════════════════════════════════════════════════════════════════
const SPORTS = [
  { k: 'padel', name: 'Pádel', icon: 'court', accent: '#2E7D32', racket: true },
  { k: 'tenis', name: 'Tenis', icon: 'target', accent: '#607D8B', racket: true },
  { k: 'pickleball', name: 'Pickleball', icon: 'court', accent: '#00897B', racket: true },
  { k: 'futbol5', name: 'Fútbol 5', icon: 'users', accent: '#455A64', racket: false },
  { k: 'basquet', name: 'Básquet 3x3', icon: 'users', accent: '#E65100', racket: false },
  { k: 'voley', name: 'Vóley playa', icon: 'users', accent: '#FFB300', racket: false },
];
const LEVEL_BANDS = ['Principiante', 'Intermedio', 'Avanzado', 'Pro'];
const SPORT_CATS = ['8va', '7ma', '6ta', '5ta', '4ta', '3ra'];

function SportCard({ sport, on, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      all: 'unset', cursor: 'pointer', boxSizing: 'border-box', position: 'relative',
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', borderRadius: 14,
      background: on ? 'var(--green-bg)' : 'var(--surface)',
      border: `1.5px solid ${on ? 'var(--green)' : 'var(--line)'}`, transition: 'all .15s',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: sport.accent }}>
        <Icon name={sport.icon} size={21} />
      </div>
      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>{sport.name}</span>
      {on && <Icon name="check" size={18} stroke={2.8} style={{ color: 'var(--green)' }} />}
    </button>
  );
}

function ClassifyCard({ sport, cfg, set }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: sport.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={sport.icon} size={15} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{sport.name}</span>
      </div>

      <SectionLabel>Banda de nivel</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {LEVEL_BANDS.map(b => <Chip key={b} active={cfg.band === b} onClick={() => set({ band: b })}>{b}</Chip>)}
      </div>

      <div style={{ height: 16 }} />
      <SectionLabel>Categoría</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {SPORT_CATS.map(c => <Chip key={c} active={cfg.cat === c} onClick={() => set({ cat: c })}>{c}</Chip>)}
      </div>

      {sport.racket && (
        <>
          <div style={{ height: 16 }} />
          <SectionLabel>Lado preferido en cancha</SectionLabel>
          <Segmented options={['Drive', 'Revés']} value={cfg.side || 'Drive'} onChange={v => set({ side: v })} />
          <div style={{ height: 16 }} />
          <SectionLabel>Mano dominante</SectionLabel>
          <Segmented options={['Diestro', 'Zurdo', 'Ambidiestro']} value={cfg.hand || 'Diestro'} onChange={v => set({ hand: v })} />
        </>
      )}
    </div>
  );
}

function StepSports({ data, set }) {
  const chosen = data.sports || {};
  const toggle = (k) => {
    const next = { ...chosen };
    if (next[k]) delete next[k]; else next[k] = { band: 'Intermedio', cat: '7ma', side: 'Drive', hand: 'Diestro' };
    set({ sports: next });
  };
  const setCfg = (k, patch) => set({ sports: { ...chosen, [k]: { ...chosen[k], ...patch } } });

  return (
    <>
      <StepIntro title="Tus deportes" subtitle="Elige deportes, categoría y datos técnicos." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {SPORTS.map(s => <SportCard key={s.k} sport={s} on={!!chosen[s.k]} onToggle={() => toggle(s.k)} />)}
      </div>

      {Object.keys(chosen).length > 0 && (
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SPORTS.filter(s => chosen[s.k]).map(s => (
            <ClassifyCard key={s.k} sport={s} cfg={chosen[s.k]} set={patch => setCfg(s.k, patch)} />
          ))}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 3 — UBICACIÓN
// ═══════════════════════════════════════════════════════════════════════════
const RADII = [5, 10, 20, 30];
function StepLocation({ data, set }) {
  const radius = data.radius ?? 10;
  return (
    <>
      <StepIntro title="¿Dónde te queda mejor jugar?" subtitle="Te avisaremos solo de partidas dentro de tu radio. Podrás cambiarlo cuando quieras." />

      {/* usar mi ubicación */}
      <button style={{
        all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%',
        display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16,
        background: 'var(--green-bg)', border: '1.5px solid var(--green)',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 16px rgba(23,163,74,.4)' }}>
          <Icon name="locate" size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--text)' }}>Usar mi ubicación</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 1 }}>Detectaremos tu zona automáticamente.</div>
        </div>
        <Icon name="chevronRight" size={20} style={{ color: 'var(--green)', flexShrink: 0 }} />
      </button>

      <div style={{ height: 24 }} />
      <SectionLabel>Tu zona</SectionLabel>
      <Field icon="pin" hint="Caracas — La Castellana" value={data.zone} onChange={e => set({ zone: e.target.value })} />
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Zona o ciudad (opcional)</div>

      <div style={{ height: 24 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--muted)' }}>Radio de búsqueda</div>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', background: 'var(--green-bg)', padding: '4px 11px', borderRadius: 999 }}>{radius} km</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {RADII.map(r => <Chip key={r} active={radius === r} onClick={() => set({ radius: r })}>{r} km</Chip>)}
      </div>
      <input type="range" min={1} max={100} value={radius} onChange={e => set({ radius: Number(e.target.value) })}
        style={{ width: '100%', accentColor: '#17A34A', height: 24 }} />

      <div style={{ height: 20 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', padding: '14px 16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>Ajustar coordenadas manualmente</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Para mayor precisión</div>
        </div>
        <Toggle value={!!data.manualCoords} onChange={v => set({ manualCoords: v })} />
      </div>
      {data.manualCoords && (
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}><Field label="Latitud" icon="locate" hint="10.4806" value={data.lat} onChange={e => set({ lat: e.target.value })} /></div>
          <div style={{ flex: 1 }}><Field label="Longitud" icon="locate" hint="-66.9036" value={data.lng} onChange={e => set({ lng: e.target.value })} /></div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 4 — DISPONIBILIDAD
// ═══════════════════════════════════════════════════════════════════════════
const WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const SLOTS = [
  { k: 'manana', title: 'Mañana', range: '06:00 – 12:00', icon: 'sun', color: '#FFB300' },
  { k: 'tarde', title: 'Tarde', range: '12:00 – 18:00', icon: 'sunset', color: '#FB8C00' },
  { k: 'noche', title: 'Noche', range: '18:00 – 22:00', icon: 'moon', color: '#5C6BC0' },
];

function SlotCard({ slot, on, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%',
      display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16,
      background: on ? 'var(--green-bg)' : 'var(--surface)',
      border: `1.5px solid ${on ? 'var(--green)' : 'var(--line)'}`, transition: 'all .15s',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: slot.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={slot.icon} size={22} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--text)' }}>{slot.title}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 1 }}>{slot.range}</div>
      </div>
      <div style={{
        width: 26, height: 26, borderRadius: 999, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: on ? 'var(--green)' : 'transparent', border: `2px solid ${on ? 'var(--green)' : 'var(--line-strong)'}`,
        color: '#fff', transition: 'all .15s',
      }}>{on && <Icon name="check" size={15} stroke={3} />}</div>
    </button>
  );
}

function StepAvailability({ data, set }) {
  const days = data.days || [];
  const slots = data.slots || [];
  const toggleDay = d => set({ days: days.includes(d) ? days.filter(x => x !== d) : [...days, d] });
  const toggleSlot = s => set({ slots: slots.includes(s) ? slots.filter(x => x !== s) : [...slots, s] });
  return (
    <>
      <StepIntro title="¿Cuándo juegas?" subtitle="Te mostramos partidas que se ajusten a tu tiempo." />

      <SectionLabel>Días disponibles</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {WEEK.map(d => <Chip key={d} active={days.includes(d)} onClick={() => toggleDay(d)}>{d}</Chip>)}
      </div>

      <div style={{ height: 24 }} />
      <SectionLabel>Horario preferido</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SLOTS.map(s => <SlotCard key={s.k} slot={s} on={slots.includes(s.k)} onToggle={() => toggleSlot(s.k)} />)}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENEDOR DEL WIZARD
// ═══════════════════════════════════════════════════════════════════════════
function OnboardingScreen({ onExit, onFinish }) {
  const [step, setStep] = React.useState(1);
  const [data, setData] = React.useState({ name: '', phone: '', dni: '', dob: '', city: '', sports: {}, radius: 10, days: [], slots: [] });
  const set = patch => setData(d => ({ ...d, ...patch }));

  const back = () => (step > 1 ? setStep(s => s - 1) : onExit());
  const next = () => (step < 4 ? setStep(s => s + 1) : onFinish());

  const body = {
    1: <StepProfile data={data} set={set} />,
    2: <StepSports data={data} set={set} />,
    3: <StepLocation data={data} set={set} />,
    4: <StepAvailability data={data} set={set} />,
  }[step];

  const footer = step < 4
    ? <PrimaryBtn onClick={next} height={54} icon="arrowRight">Continuar</PrimaryBtn>
    : <PrimaryBtn onClick={next} height={54} icon="bolt">¡Empezar a jugar!</PrimaryBtn>;

  return (
    <WizardChrome step={step} onBack={back} footer={footer}>
      <div key={step}>{body}</div>
    </WizardChrome>
  );
}

Object.assign(window, { OnboardingScreen, WizardChrome });

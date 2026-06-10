/* cuadrala-ui.jsx — shared UI primitives for the Cuádrala redesign
   Tokens come from CSS vars (.cz[data-theme]); components stay theme-agnostic. */

// ── Icon set (clean line icons, currentColor) ───────────────────────────────
function Icon({ name, size = 20, stroke = 2, style = {} }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    search: <><circle cx="11" cy="11" r="7" {...p} /><path d="M20 20l-3.5-3.5" {...p} /></>,
    plus: <><path d="M12 5v14M5 12h14" {...p} /></>,
    bolt: <><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8z" {...p} strokeLinejoin="round" /></>,
    pin: <><path d="M12 21c4.5-5 7-8.2 7-11a7 7 0 10-14 0c0 2.8 2.5 6 7 11z" {...p} /><circle cx="12" cy="10" r="2.5" {...p} /></>,
    calendar: <><rect x="3.5" y="4.5" width="17" height="16" rx="3" {...p} /><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4" {...p} /></>,
    chevronDown: <><path d="M5 9l7 7 7-7" {...p} /></>,
    chevronRight: <><path d="M9 5l7 7-7 7" {...p} /></>,
    chevronLeft: <><path d="M15 5l-7 7 7 7" {...p} /></>,
    minus: <><path d="M5 12h14" {...p} /></>,
    check: <><path d="M4 12.5l5 5L20 6.5" {...p} /></>,
    clock: <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M12 7.5V12l3 2" {...p} /></>,
    bell: <><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" {...p} /><path d="M10 20a2 2 0 004 0" {...p} /></>,
    home: <><path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" {...p} /></>,
    users: <><circle cx="9" cy="8" r="3.2" {...p} /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" {...p} /><path d="M16 5.5a3 3 0 010 5.6M17 19c0-2.2-1-3.8-2.5-4.6" {...p} /></>,
    user: <><circle cx="12" cy="8" r="3.6" {...p} /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" {...p} /></>,
    map: <><path d="M9 4.5L3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5l-6-2z" {...p} /><path d="M9 4.5v13M15 6.5v13" {...p} /></>,
    list: <><path d="M8 6.5h12M8 12h12M8 17.5h12" {...p} /><circle cx="4" cy="6.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="4" cy="17.5" r="1.1" fill="currentColor" stroke="none" /></>,
    sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" {...p} /><circle cx="16" cy="7" r="2.2" {...p} /><circle cx="8" cy="17" r="2.2" {...p} /></>,
    star: <><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L12 3.5z" {...p} strokeLinejoin="round" /></>,
    close: <><path d="M6 6l12 12M18 6L6 18" {...p} /></>,
    info: <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M12 11v5M12 8h.01" {...p} /></>,
    court: <><rect x="3" y="6" width="18" height="12" rx="1.5" {...p} /><path d="M12 6v12M3 12h18M7.5 10v4M16.5 10v4" {...p} /></>,
    gender: <><circle cx="10" cy="13" r="4.5" {...p} /><path d="M16 8l4-4M20 4h-3.5M20 4v3.5" {...p} /></>,
    arrowRight: <><path d="M5 12h14M13 6l6 6-6 6" {...p} /></>,
    target: <><circle cx="12" cy="12" r="8.5" {...p} /><circle cx="12" cy="12" r="4" {...p} /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0, ...style }}>
      {paths[name]}
    </svg>
  );
}

// ── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children, required, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--muted)' }}>
        {children}{required && <span style={{ color: 'var(--green)', marginLeft: 3 }}>•</span>}
      </div>
      {action && (
        <button onClick={onAction} style={{ all: 'unset', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{action}</button>
      )}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────
function Card({ children, style = {}, onClick, selected }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-card)',
      border: `1.5px solid ${selected ? 'var(--green)' : 'var(--line)'}`,
      boxShadow: selected ? '0 0 0 3px var(--green-bg)' : 'none',
      transition: 'border-color .18s, box-shadow .18s, transform .12s',
      cursor: onClick ? 'pointer' : 'default', ...style,
    }}>{children}</div>
  );
}

// ── Weekly date strip (matches the reference) ────────────────────────────────
const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function DateStrip({ days, value, onChange }) {
  const sel = days.find(d => d.key === value) || days[0];
  const scrollRef = React.useRef(null);

  // keep selected day in view
  React.useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-sel="1"]');
    if (el) el.parentElement.scrollLeft = Math.max(0, el.offsetLeft - 120);
  }, [value]);

  const relative = sel.offset === 0 ? 'Hoy' : sel.offset === 1 ? 'Mañana' : `${MONTHS[sel.date.getMonth()]} ${sel.date.getFullYear()}`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{MONTHS[sel.date.getMonth()]}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', background: 'var(--green-bg)', padding: '3px 9px', borderRadius: 999 }}>{relative}</span>
      </div>
      <div ref={scrollRef} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -20px', padding: '2px 20px 4px', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {days.map(d => {
            const active = d.key === value;
            return (
              <button key={d.key} data-sel={active ? '1' : '0'} onClick={() => onChange(d.key)} style={{
                all: 'unset', cursor: 'pointer', flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                width: 46, padding: '8px 0 6px', borderRadius: 16,
                background: active ? 'var(--surface-2)' : 'transparent',
                transition: 'background .15s',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: active ? 'var(--text)' : 'var(--muted)' }}>{DOW[d.date.getDay()]}</span>
                <span style={{
                  width: 36, height: 36, borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700,
                  background: active ? 'var(--green)' : 'transparent',
                  color: active ? '#fff' : 'var(--text)',
                  boxShadow: active ? '0 4px 12px rgba(23,163,74,.4)' : 'none',
                  border: d.today && !active ? '1.5px solid var(--green)' : '1.5px solid transparent',
                  transition: 'all .15s',
                }}>{d.date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Chip (selectable) ────────────────────────────────────────────────────────
function Chip({ children, active, onClick, accent = 'green', icon }) {
  const isLime = accent === 'lime';
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 38, padding: '0 16px', borderRadius: 'var(--radius-btn)',
      fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
      color: active ? (isLime ? '#15301a' : 'var(--green)') : 'var(--muted)',
      background: active ? (isLime ? 'var(--lime)' : 'var(--green-bg)') : 'var(--surface-2)',
      border: `1.5px solid ${active ? (isLime ? 'var(--lime)' : 'var(--green)') : 'var(--line)'}`,
      transition: 'all .14s',
    }}>
      {active && !icon && <Icon name="check" size={15} stroke={2.6} />}
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

// ── iOS-style toggle ─────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      all: 'unset', cursor: 'pointer', width: 50, height: 30, borderRadius: 999, padding: 2,
      background: value ? 'var(--green)' : 'var(--line-strong)', transition: 'background .2s',
      display: 'flex', alignItems: 'center', justifyContent: value ? 'flex-end' : 'flex-start',
    }}>
      <span style={{ width: 26, height: 26, borderRadius: 999, background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.25)', transition: 'all .2s' }} />
    </button>
  );
}

// ── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ value, min = 1, max = 8, onChange }) {
  const btn = (dis, kids, fn) => (
    <button disabled={dis} onClick={fn} style={{
      all: 'unset', cursor: dis ? 'default' : 'pointer',
      width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: dis ? 'var(--muted-2)' : 'var(--text)', opacity: dis ? 0.45 : 1,
    }}>{kids}</button>
  );
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'var(--surface-2)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-btn)', padding: 2 }}>
      {btn(value <= min, <Icon name="minus" size={18} />, () => onChange(Math.max(min, value - 1)))}
      <span style={{ minWidth: 30, textAlign: 'center', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{value}</span>
      {btn(value >= max, <Icon name="plus" size={18} />, () => onChange(Math.min(max, value + 1)))}
    </div>
  );
}

// ── Segmented control ──────────────────────────────────────────────────────
function Segmented({ options, value, onChange, icons }) {
  const idx = Math.max(0, options.findIndex(o => o === value));
  return (
    <div style={{ position: 'relative', display: 'flex', background: 'var(--surface-2)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-btn)', padding: 3 }}>
      <div style={{
        position: 'absolute', top: 3, bottom: 3, left: 3,
        width: `calc((100% - 6px) / ${options.length})`,
        transform: `translateX(${idx * 100}%)`,
        background: 'var(--surface)', borderRadius: 9,
        boxShadow: '0 1px 3px rgba(0,0,0,.18)', transition: 'transform .22s cubic-bezier(.4,0,.2,1)',
      }} />
      {options.map((o, i) => (
        <button key={o} onClick={() => onChange(o)} style={{
          all: 'unset', cursor: 'pointer', flex: 1, zIndex: 1, height: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 14, fontWeight: 600, color: i === idx ? 'var(--text)' : 'var(--muted)', transition: 'color .15s',
        }}>
          {icons && <Icon name={icons[i]} size={16} />}{o}
        </button>
      ))}
    </div>
  );
}

// ── Striped image placeholder ────────────────────────────────────────────────
function ImgPlaceholder({ label, style = {}, radius = 12 }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: radius,
      background: 'repeating-linear-gradient(135deg, var(--surface-2) 0 10px, color-mix(in srgb, var(--surface-2) 60%, var(--line)) 10px 20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', ...style,
    }}>
      {label && <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, color: 'var(--muted-2)', letterSpacing: 0.4 }}>{label}</span>}
    </div>
  );
}

// ── Avatar stack ─────────────────────────────────────────────────────────────
const AV_COLORS = ['#17A34A', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];
function AvatarStack({ filled, total, size = 26 }) {
  const items = [];
  for (let i = 0; i < total; i++) {
    const on = i < filled;
    items.push(
      <span key={i} style={{
        width: size, height: size, borderRadius: 999, marginLeft: i ? -size * 0.34 : 0,
        border: '2px solid var(--surface)', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: on ? AV_COLORS[i % AV_COLORS.length] : 'var(--surface-2)',
        color: '#fff', fontSize: size * 0.4, fontWeight: 700,
        borderStyle: on ? 'solid' : 'dashed', borderColor: on ? 'var(--surface)' : 'var(--line-strong)',
      }}>{on ? '' : ''}</span>
    );
  }
  return <div style={{ display: 'flex', alignItems: 'center' }}>{items}</div>;
}

// ── Currency (dual: US$ + Bs) ────────────────────────────────────────────────
// Placeholder rate — el dev lo conecta a la tasa real (BCV/paralelo) en Flutter.
const BS_RATE = 40;
function bs(usd) { return 'Bs ' + (Number(usd) * BS_RATE).toLocaleString('es-VE', { maximumFractionDigits: 0 }); }
function usd(n) { return 'US$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 }); }

// Stacked dual-currency price: big USD + muted Bs underneath
function Price({ amount, suffix, align = 'right', size = 15 }) {
  return (
    <div style={{ textAlign: align, lineHeight: 1.15 }}>
      <div style={{ fontSize: size, fontWeight: 800, color: 'var(--text)' }}>
        {usd(amount)}{suffix && <span style={{ fontSize: size * 0.72, fontWeight: 500, color: 'var(--muted)' }}> {suffix}</span>}
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted-2)', marginTop: 1 }}>{bs(amount)}{suffix ? ' ' + suffix : ''}</div>
    </div>
  );
}

// ── Single avatar (initials) ─────────────────────────────────────────────────
function Avatar({ initials, size = 40, idx = 0, you, ring }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0,
      background: AV_COLORS[idx % AV_COLORS.length], color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 800,
      border: ring ? '2px solid var(--lime)' : (you ? '2px solid var(--lime)' : 'none'),
    }}>{initials}</div>
  );
}

// ── Sheet header (back/close + title + optional trailing) ────────────────────
function SheetHeader({ title, subtitle, onBack, backIcon = 'chevronLeft', trailing, center }) {
  return (
    <div style={{ paddingTop: 56, paddingBottom: 14, paddingInline: 16, background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <button onClick={onBack} style={{ all: 'unset', cursor: 'pointer', width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--text)', flexShrink: 0 }}>
        <Icon name={backIcon} size={20} />
      </button>
      <div style={{ flex: 1, minWidth: 0, textAlign: center ? 'center' : 'left' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{subtitle}</div>}
      </div>
      <div style={{ width: 38, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>{trailing}</div>
    </div>
  );
}

Object.assign(window, {
  Icon, SectionLabel, Card, DateStrip, Chip, Toggle, Stepper, Segmented, ImgPlaceholder, AvatarStack,
  DOW, MONTHS, AV_COLORS, BS_RATE, bs, usd, Price, Avatar, SheetHeader,
});

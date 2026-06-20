/* cuadrala-auth.jsx — Bienvenida, Login y Registro
   Reutiliza tokens .cz[data-theme] y primitivos de cuadrala-ui.jsx */

// ── Brand mark: "C" de 4 cuñas (líneas de cancha), line-art verde + navy ──────
function Logo({ size = 96, radius = 22 }) {
  const inner = Math.round(size * 0.66);
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: 'var(--green)', boxShadow: '0 14px 34px rgba(23,163,74,.42)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: inner, height: inner, borderRadius: 999, background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={inner * 0.74} height={inner * 0.74} viewBox="0 0 48 48" fill="none">
          {/* C abierta a la derecha, formada por 4 arcos-cuña alternando verde/navy */}
          <path d="M38 13A19 19 0 0024 7" stroke="#17A34A" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M24 7A19 19 0 005.4 19" stroke="#0F172A" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M5.4 29A19 19 0 0024 41" stroke="#17A34A" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M24 41a19 19 0 0014-6" stroke="#0F172A" strokeWidth="5.5" strokeLinecap="round" />
          {/* línea de cancha central */}
          <path d="M16 24h13" stroke="#17A34A" strokeWidth="4.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ── Botones ──────────────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, icon, height = 50, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      all: 'unset', boxSizing: 'border-box', width: '100%', height, borderRadius: 'var(--radius-btn)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
      fontSize: 16, fontWeight: 800, cursor: disabled ? 'default' : 'pointer',
      background: disabled ? 'var(--surface-2)' : 'var(--green)', color: disabled ? 'var(--muted-2)' : '#fff',
      boxShadow: disabled ? 'none' : '0 10px 24px rgba(23,163,74,.4)', transition: 'all .18s',
    }}>
      {icon && <Icon name={icon} size={20} stroke={2.4} />}{children}
    </button>
  );
}

function OutlineBtn({ children, onClick, icon, height = 50 }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', boxSizing: 'border-box', width: '100%', height, borderRadius: 'var(--radius-btn)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
      fontSize: 16, fontWeight: 800, cursor: 'pointer',
      background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--line-strong)', transition: 'all .18s',
    }}>
      {icon && <Icon name={icon} size={20} />}{children}
    </button>
  );
}

// ── Botones sociales (marca multicolor inline) ───────────────────────────────
function GoogleMark({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.2z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3v-5.7H4.5C3 17 2 20.4 2 24s1 7 2.5 10z" />
      <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14l7.3 5.7c1.7-5.2 6.5-9 12.2-9z" />
    </svg>
  );
}
function AppleMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.4 12.8c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8s-1.7-.8-2.9-.8c-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.8 2.2 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 2-1.1 2.7-2.2.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.4-.9-2.4-3.6zM14.2 6c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.7-.9 2.8 1 .1 2-.5 2.6-1.3z" />
    </svg>
  );
}
function SocialBtn({ children, mark, onClick }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', boxSizing: 'border-box', width: '100%', height: 48, borderRadius: 'var(--radius-btn)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontSize: 15, fontWeight: 700, cursor: 'pointer',
      background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--line-strong)',
    }}>
      {mark}{children}
    </button>
  );
}

// ── Divisor con texto ────────────────────────────────────────────────────────
function OrDivider({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted-2)', whiteSpace: 'nowrap' }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  );
}

// ── Campo filled con label + ícono prefijo + trailing opcional ───────────────
function Field({ label, icon, hint, type = 'text', value, onChange, trailing, helper, prefix, focusKey }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 7 }}>{label}</label>}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, height: 50, padding: '0 14px',
        background: 'var(--surface)', borderRadius: 'var(--radius-btn)',
        border: `1.5px solid ${focus ? 'var(--green)' : 'var(--line)'}`,
        boxShadow: focus ? '0 0 0 3px var(--green-bg)' : 'none', transition: 'all .16s',
      }}>
        {icon && <Icon name={icon} size={19} style={{ color: focus ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }} />}
        {prefix && <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>{prefix}</span>}
        <input
          type={type} value={value} onChange={onChange} placeholder={hint}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ all: 'unset', flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500, color: 'var(--text)' }}
        />
        {trailing}
      </div>
      {helper && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.4 }}>{helper}</div>}
    </div>
  );
}

// botón ojo para inputs de contraseña
function EyeToggle({ shown, onClick }) {
  return (
    <button onClick={onClick} style={{ all: 'unset', cursor: 'pointer', display: 'flex', color: 'var(--muted)', flexShrink: 0 }}>
      <Icon name={shown ? 'eyeOff' : 'eye'} size={19} />
    </button>
  );
}

// ── Switcher pill 2 pestañas (Ingresar / Crear cuenta) ───────────────────────
function AuthTabs({ value, onChange }) {
  const tabs = [{ k: 'login', t: 'Ingresar' }, { k: 'register', t: 'Crear cuenta' }];
  const idx = tabs.findIndex(t => t.k === value);
  return (
    <div style={{ position: 'relative', display: 'flex', background: 'var(--surface-2)', border: '1.5px solid var(--line)', borderRadius: 999, padding: 4 }}>
      <div style={{
        position: 'absolute', top: 4, bottom: 4, left: 4, width: 'calc((100% - 8px) / 2)',
        transform: `translateX(${idx * 100}%)`, background: 'var(--surface)', borderRadius: 999,
        border: '1.5px solid var(--line)', boxShadow: '0 1px 3px rgba(0,0,0,.14)', transition: 'transform .22s cubic-bezier(.4,0,.2,1)',
      }} />
      {tabs.map(t => (
        <button key={t.k} onClick={() => onChange(t.k)} style={{
          all: 'unset', cursor: 'pointer', flex: 1, zIndex: 1, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 900, letterSpacing: 0.3,
          color: t.k === value ? 'var(--text)' : 'var(--muted)', transition: 'color .15s',
        }}>{t.t}</button>
      ))}
    </div>
  );
}

// ── Cáscara de pantalla auth (header marca centrado + scroll) ────────────────
function AuthScroll({ children }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 24px 40px', maxWidth: 420, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  );
}

function LegalNote() {
  return (
    <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--muted)', textAlign: 'center', margin: '4px 8px 0' }}>
      Al continuar aceptas nuestros <span style={{ color: 'var(--text)', fontWeight: 700 }}>Términos</span> y la <span style={{ color: 'var(--text)', fontWeight: 700 }}>Política de privacidad</span>.
    </p>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PANTALLA 1 — BIENVENIDA
// ═══════════════════════════════════════════════════════════════════════════
function WelcomeScreen({ onRegister, onLogin }) {
  return (
    <AuthScroll>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
        <Logo size={96} radius={22} />
        <h1 style={{ margin: '26px 0 0', fontSize: 34, fontWeight: 900, letterSpacing: -0.4, color: 'var(--text)' }}>Cuádrala</h1>
        <p style={{ margin: '10px 0 0', fontSize: 16, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.5 }}>
          Arma partidas, paga y juega.<br />Cero grupos de WhatsApp.
        </p>
      </div>

      <div style={{ height: 36 }} />
      <OrDivider>o continuar con email</OrDivider>
      <div style={{ height: 18 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PrimaryBtn onClick={onRegister} icon="mail">Crear cuenta con email</PrimaryBtn>
        <OutlineBtn onClick={onLogin}>Ya tengo cuenta</OutlineBtn>
      </div>

      <div style={{ height: 22 }} />
      <LegalNote />
    </AuthScroll>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Header de marca compacto (login/registro)
// ═══════════════════════════════════════════════════════════════════════════
function AuthBrandHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <Logo size={56} radius={16} />
        <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.4, color: 'var(--text)' }}>Cuádrala</span>
      </div>
      <h2 style={{ margin: '0 0 6px', fontSize: 25, fontWeight: 900, letterSpacing: -0.4, color: 'var(--text)' }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 14.5, fontWeight: 500, color: 'var(--muted)', lineHeight: 1.5 }}>{subtitle}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PANTALLA 2 — LOGIN
// ═══════════════════════════════════════════════════════════════════════════
function LoginScreen({ onSwitch, onSubmit }) {
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [show, setShow] = React.useState(false);

  return (
    <AuthScroll>
      <AuthBrandHeader title="Bienvenido de vuelta" subtitle="Inicia sesión para seguir cuadrando partidas." />

      <AuthTabs value="login" onChange={k => k === 'register' && onSwitch()} />

      <div style={{ height: 18 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SocialBtn mark={<GoogleMark />}>Continuar con Google</SocialBtn>
        <SocialBtn mark={<AppleMark />}>Continuar con Apple</SocialBtn>
      </div>

      <div style={{ height: 18 }} />
      <OrDivider>o continuar con email</OrDivider>
      <div style={{ height: 18 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Correo electrónico" icon="mail" hint="tu@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <div>
          <Field label="Contraseña" icon="lock" hint="••••••••" type={show ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)}
            trailing={<EyeToggle shown={show} onClick={() => setShow(s => !s)} />} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button style={{ all: 'unset', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>¿Olvidaste tu contraseña?</button>
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />
      <PrimaryBtn onClick={onSubmit} height={52}>Iniciar sesión</PrimaryBtn>

      <div style={{ height: 18 }} />
      <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', margin: 0 }}>
        ¿No tienes cuenta?{' '}
        <button onClick={onSwitch} style={{ all: 'unset', cursor: 'pointer', fontWeight: 900, color: 'var(--green)' }}>Crear cuenta</button>
      </p>
    </AuthScroll>
  );
}

// ── Indicador de fuerza de contraseña ────────────────────────────────────────
function strengthOf(pwd) {
  let s = 0;
  if (pwd.length >= 6) s++;
  if (pwd.length >= 10) s++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) s++;
  return Math.min(4, s);
}
const STRENGTH = [
  { label: '—', color: 'var(--line-strong)' },
  { label: 'Débil', color: '#EF4444' },
  { label: 'Regular', color: '#FB8C00' },
  { label: 'Buena', color: '#8BC34A' },
  { label: 'Fuerte', color: '#17A34A' },
];
function PasswordStrength({ pwd }) {
  const lvl = pwd ? strengthOf(pwd) || 1 : 0;
  const info = STRENGTH[lvl];
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < lvl ? info.color : 'var(--line)', transition: 'background-color .2s' }} />
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: lvl ? info.color : 'var(--muted)', marginTop: 7 }}>
        Seguridad: {info.label}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PANTALLA 3 — REGISTRO
// ═══════════════════════════════════════════════════════════════════════════
function RegisterScreen({ onSwitch, onSubmit }) {
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [show2, setShow2] = React.useState(false);

  return (
    <AuthScroll>
      <AuthBrandHeader title="Crea tu cuenta" subtitle="Usarás este correo para ingresar." />

      <AuthTabs value="register" onChange={k => k === 'login' && onSwitch()} />

      <div style={{ height: 20 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Correo electrónico" icon="mail" hint="tu@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <div>
          <Field label="Contraseña" icon="lock" hint="Mínimo 8 caracteres" type={show ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)}
            trailing={<EyeToggle shown={show} onClick={() => setShow(s => !s)} />} />
          <PasswordStrength pwd={pwd} />
        </div>
        <Field label="Confirmar contraseña" icon="lock" hint="Repite tu contraseña" type={show2 ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
          trailing={<EyeToggle shown={show2} onClick={() => setShow2(s => !s)} />}
          helper={confirm && confirm !== pwd ? '⚠ Las contraseñas no coinciden.' : undefined} />
      </div>

      <div style={{ height: 22 }} />
      <PrimaryBtn onClick={onSubmit} icon="arrowRight" height={52}>Continuar</PrimaryBtn>

      <div style={{ height: 18 }} />
      <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', margin: 0 }}>
        ¿Ya tienes cuenta?{' '}
        <button onClick={onSwitch} style={{ all: 'unset', cursor: 'pointer', fontWeight: 900, color: 'var(--green)' }}>Inicia sesión</button>
      </p>
    </AuthScroll>
  );
}

Object.assign(window, {
  Logo, PrimaryBtn, OutlineBtn, SocialBtn, GoogleMark, AppleMark, OrDivider, Field, EyeToggle,
  AuthTabs, AuthScroll, LegalNote, WelcomeScreen, AuthBrandHeader, LoginScreen, RegisterScreen,
  PasswordStrength,
});

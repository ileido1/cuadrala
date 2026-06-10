/* cuadrala-payment.jsx — Payment method selection + pending confirmation */

const PAY_METHODS = [
  { id: 'efectivo', name: 'Efectivo', sub: 'Efectivo · USD', kind: 'note',
    note: 'Pagarás en efectivo en el club. No necesitas subir comprobante; el staff confirmará tu pago.' },
  { id: 'transfer', name: 'Transferencia bancaria', sub: 'Transferencia Bancaria · USD', kind: 'data',
    data: [['Banco', 'Banesco'], ['Cuenta', '0134 5678 9012 3456 7890'], ['Titular', 'V-12.345.678']] },
  { id: 'movil', name: 'Pago móvil', sub: 'Pago Móvil Banesco · USD', kind: 'data',
    data: [['Banco', 'Banesco (0134)'], ['Teléfono', '0414 123 4567'], ['Cédula', 'V-12.345.678']] },
];

function Radio({ on }) {
  return (
    <span style={{ width: 22, height: 22, borderRadius: 999, flexShrink: 0, border: `2px solid ${on ? 'var(--green)' : 'var(--line-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .15s' }}>
      {on && <span style={{ width: 11, height: 11, borderRadius: 999, background: 'var(--green)' }} />}
    </span>
  );
}

function PaymentFlow({ club = 'Club Cuádrala', price = 6.25, onClose, onConfirm, onHome, onViewMatch }) {
  const [method, setMethod] = React.useState('transfer');
  const [step, setStep] = React.useState('method'); // method | done
  const sel = PAY_METHODS.find(m => m.id === method);

  const confirm = () => { onConfirm && onConfirm(); setStep('done'); };

  if (step === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
        <SheetHeader title="Esperando confirmación" center onBack={onViewMatch} backIcon="close" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: 999, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
            <span style={{ width: 56, height: 56, borderRadius: 999, border: '4px solid color-mix(in srgb, var(--green) 25%, transparent)', borderTopColor: 'var(--green)', animation: 'spin 0.9s linear infinite' }} />
          </div>
          <h2 style={{ margin: '22px 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Comprobante enviado</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>El staff de la sede revisará el pago en el panel web.</p>
          <div style={{ width: '100%', marginTop: 24, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}><Icon name="court" size={20} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>{club}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Monto: {usd(price)} · {bs(price)}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#15301a', background: 'var(--lime)', padding: '5px 11px', borderRadius: 999 }}>Pendiente</span>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 20px 30px', background: 'var(--bg-2)', borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
          <button onClick={onHome} style={{ ...payCta, flex: 1, background: 'var(--surface-2)', color: 'var(--text)', border: '1.5px solid var(--line)', boxShadow: 'none' }}>Ir al inicio</button>
          <button onClick={onViewMatch} style={{ ...payCta, flex: 1, background: 'var(--green)', color: '#fff', boxShadow: '0 8px 20px rgba(23,163,74,.4)' }}>Ver mi partida</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <SheetHeader title="Elegir método de pago" center onBack={onClose} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 120px' }}>
        {/* summary */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-2)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)' }}>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--text)' }}>{club}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Pago por jugador</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', background: 'var(--green-bg)', padding: '6px 12px', borderRadius: 10 }}>{usd(price)}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 3 }}>{bs(price)}</div>
          </div>
        </div>

        <div style={{ height: 18 }} />
        <SectionLabel>Selecciona una opción</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PAY_METHODS.map(m => {
            const on = method === m.id;
            return (
              <button key={m.id} onClick={() => setMethod(m.id)} style={{
                all: 'unset', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderRadius: 'var(--radius-card)', background: on ? 'var(--green-bg)' : 'var(--surface)',
                border: `1.5px solid ${on ? 'var(--green)' : 'var(--line)'}`, transition: 'all .15s',
              }}>
                <Radio on={on} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{m.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{m.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* dynamic detail */}
        <div style={{ marginTop: 16 }}>
          {sel.kind === 'data' ? (
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-card)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'var(--text)' }}>
                <Icon name="info" size={17} style={{ color: 'var(--lime)' }} /><span style={{ fontSize: 14, fontWeight: 800 }}>Datos para pagar</span>
              </div>
              {sel.data.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{k}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 }}>{sel.note}</p>
          )}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 20px 30px', background: 'linear-gradient(to top, var(--bg-2) 70%, transparent)', borderTop: '1px solid var(--line)' }}>
        <button onClick={confirm} style={{ ...payCta, width: '100%', background: 'var(--green)', color: '#fff', boxShadow: '0 8px 20px rgba(23,163,74,.4)' }}>
          {sel.kind === 'data' ? 'Ya pagué · Enviar comprobante' : 'Confirmar inscripción'}
        </button>
      </div>
    </div>
  );
}
const payCta = { all: 'unset', boxSizing: 'border-box', cursor: 'pointer', height: 54, borderRadius: 'var(--radius-btn)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 16, fontWeight: 800 };

Object.assign(window, { PaymentFlow });

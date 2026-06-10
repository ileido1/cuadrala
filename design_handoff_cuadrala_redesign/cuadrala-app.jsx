/* cuadrala-app.jsx — root: device frame, navigation, create sheet, tweaks */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "venueView": "Lista",
  "corners": "Redondeadas"
}/*EDITMODE-END*/;

function Stage({ children }) {
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const fit = () => {
      const s = Math.min(1, (window.innerWidth - 40) / 402, (window.innerHeight - 40) / 874);
      setScale(s);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#06080d' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>{children}</div>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = React.useState('inicio');
  const [stack, setStack] = React.useState([]);
  const [selMatch, setSelMatch] = React.useState({ ...DEMO_MATCH, total: 4 });
  const [joinedPos, setJoinedPos] = React.useState(null);
  const [payment, setPayment] = React.useState('none');
  const [played, setPlayed] = React.useState(false);
  const dark = t.theme === 'dark';
  const SCORES = { A: '6 · 4 · 6', B: '4 · 6 · 3' };

  const top = stack[stack.length - 1] || null;
  const push = s => setStack(p => [...p, s]);
  const pop = () => setStack(p => p.slice(0, -1));
  const reset = s => setStack(s ? [s] : []);
  const openMatch = m => {
    setSelMatch({ ...DEMO_MATCH, ...(m || {}), total: 4 });
    setJoinedPos(null); setPayment('none'); setPlayed(false);
    reset('detail');
  };

  const screens = {
    inicio: <HomeScreen onCreate={() => reset('create')} onSearch={() => reset('search')} onBell={() => setTab('avisos')} onOpenMatch={openMatch} />,
    partidas: <MatchesScreen onOpenMatch={openMatch} />,
    avisos: <AvisosScreen />,
    perfil: <PerfilScreen />,
  };

  const overlays = {
    create: <CreateMatchScreen onClose={pop} initialView={t.venueView} />,
    search: <SearchScreen onClose={pop} onOpenMatch={openMatch} onCreate={() => reset('create')} />,
    detail: <MatchDetailScreen match={selMatch} court={DEMO_COURT} joinedPos={joinedPos} payment={payment} played={played} scores={SCORES}
      onBack={() => { reset(); setTab('inicio'); }} onJoin={k => setJoinedPos(k)} onPay={() => push('payment')} onLoadResult={() => push('result')} onShare={() => {}} />,
    payment: <PaymentFlow club={selMatch.club} price={selMatch.price} onClose={pop}
      onConfirm={() => setPayment('pending')} onHome={() => { reset(); setTab('inicio'); }} onViewMatch={() => reset('detail')} />,
    result: <LoadResultFlow onClose={pop} onSaved={() => setPlayed(true)} />,
  };

  const czStyle = {
    height: '100%', position: 'relative', display: 'flex', flexDirection: 'column',
    background: 'var(--bg)', color: 'var(--text)',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    '--radius-card': t.corners === 'Redondeadas' ? '18px' : '12px',
  };

  return (
    <Stage>
      <IOSDevice dark={dark}>
        <div className="cz" data-theme={t.theme} style={czStyle}>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} key={tab}>
            {screens[tab]}
          </div>
          <BottomNav tab={tab} setTab={setTab} />

          {top && (
            <div key={top + stack.length} style={{ position: 'absolute', inset: 0, zIndex: 5, animation: 'sheetUp .28s cubic-bezier(.3,.8,.3,1)' }}>
              {overlays[top]}
            </div>
          )}
        </div>
      </IOSDevice>

      <TweaksPanel>
        <TweakSection label="Apariencia" />
        <TweakRadio label="Tema" value={t.theme} options={['dark', 'light']} onChange={v => setTweak('theme', v)} />
        <TweakRadio label="Esquinas" value={t.corners} options={['Redondeadas', 'Suaves']} onChange={v => setTweak('corners', v)} />
        <TweakSection label="Crear partida" />
        <TweakRadio label="Vista de sedes" value={t.venueView} options={['Lista', 'Mapa']} onChange={v => setTweak('venueView', v)} />
        <TweakSection label="Ir a pantalla" />
        <TweakButton label="Crear partida" onClick={() => reset('create')} />
        <TweakButton label="Buscar / matchmaking" onClick={() => reset('search')} />
        <TweakButton label="Detalle de partida" onClick={() => openMatch(null)} />
        <TweakButton label="Método de pago" onClick={() => reset('payment')} />
        <TweakButton label="Cargar resultado" onClick={() => reset('result')} />
      </TweaksPanel>
    </Stage>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

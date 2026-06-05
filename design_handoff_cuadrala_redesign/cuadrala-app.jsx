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
  const [createOpen, setCreateOpen] = React.useState(false);
  const dark = t.theme === 'dark';

  const screens = {
    inicio: <HomeScreen onCreate={() => setCreateOpen(true)} onSearch={() => setCreateOpen(true)} onBell={() => setTab('avisos')} />,
    partidas: <MatchesScreen />,
    avisos: <AvisosScreen />,
    perfil: <PerfilScreen />,
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

          {createOpen && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 5, animation: 'sheetUp .28s cubic-bezier(.3,.8,.3,1)' }}>
              <CreateMatchScreen onClose={() => setCreateOpen(false)} initialView={t.venueView} />
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
        <TweakButton label="Abrir 'Crear partida'" onClick={() => setCreateOpen(true)} />
      </TweaksPanel>
    </Stage>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

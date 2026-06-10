# Handoff: Rediseño de Cuádrala — Home + Crear partida

## Overview
Rediseño hi-fi de dos pantallas centrales de **Cuádrala** (app de pádel / matchmaking, Flutter):
1. **Home / "Actividad cerca de ti"** — saludo + nivel/ELO, hero de matchmaking, listas de "Mis partidas" y "Cerca de ti", bottom nav de 4 tabs.
2. **Crear partida** (modal full-screen) — tira semanal de fecha, selección de sede (Lista/Mapa) con canchas y horarios, categoría, ELO, género, jugadores y notas.

Incluye además versiones funcionales de los tabs **Partidas**, **Avisos** y **Perfil**.

## About the Design Files
Los archivos de este bundle son **referencias de diseño hechas en HTML/React** (un prototipo que muestra el look & feel y el comportamiento esperado). **No son código de producción para copiar tal cual.** La tarea es **recrear estos diseños en la app Flutter existente** usando sus patrones establecidos: `Theme.of(context).colorScheme`, los widgets compartidos (`AppCard`, `PrimaryButton`, `AppHeader`, `StatusChip`, …) y los tokens de `brand_colors.dart` / `app_theme.dart`. No se debe portar React ni el marco de iPhone — ese marco es solo para presentar el prototipo.

Cómo abrir el prototipo: abrir `Cuadrala App.html` en un navegador. Los `.jsx` son los componentes fuente (UI primitives, pantallas, root).

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografía, espaciado e interacciones son finales y deben recrearse con precisión usando el design system de Cuádrala. Donde el prototipo usa primitivas propias (chips, segmented, stepper), preferir el widget compartido equivalente del repo si existe.

---

## Para una recreación EXACTA (leer primero)

El objetivo es que la implementación quede **idéntica** al prototipo. Orden de prioridad de fuentes de verdad:

1. **El código fuente del prototipo (`.jsx`) = valores exactos.** Cada color, padding, radio, tamaño de fuente, duración de animación y regla de layout está literalmente en los `.jsx`. Ante cualquier duda de medida o color, **lee el valor en el `.jsx`**, no lo estimes desde la prosa ni desde una captura.
2. **Las capturas en `screens/` = verdad visual.** Úsalas como checklist de comparación 1:1. Después de implementar cada pantalla, ponla lado a lado con su PNG y corrige hasta que coincidan (espaciados, pesos tipográficos, alineaciones, estados de color).
3. **Este README = el “por qué” y el comportamiento** (flujos, estados, qué viene del backend).

Flujo recomendado con Claude Code:
- Abre `Cuadrala App.html` en un navegador para navegar el prototipo **en vivo** (es la referencia más fiel; muestra animaciones e interacciones reales).
- Implementa pantalla por pantalla, comparando contra `screens/NN-*.png`.
- Reproduce los valores leyéndolos del `.jsx` correspondiente (ver mapa en §Files).

### Capturas de referencia (`screens/`)
| Archivo | Pantalla |
|---|---|
| `01-home.png` | Home / Actividad cerca de ti |
| `02-partidas.png` | Tab Partidas |
| `03-avisos.png` | Tab Avisos |
| `04-perfil.png` | Tab Perfil |
| `05-crear.png` | Crear partida (Cuándo / Dónde / Categoría) |
| `06-buscar.png` | Buscar / matchmaking |
| `07-detalle.png` | Detalle de partida — vista de cancha (sin unirse) |
| `08-detalle-unido.png` | Detalle — unido, banner verde + “Pagar ahora” |
| `09-pago-metodo.png` | Método de pago (Transferencia seleccionada + datos) |
| `10-cargar-resultado.png` | Cargar resultado — paso 1 (asignar posiciones) |

> Las capturas son del tema **oscuro** (default). El tema claro existe en el prototipo (toggle en Tweaks); sus tokens están más abajo.

---

## Design Tokens

> Fuente de verdad en producción: `brand_colors.dart`, `app_theme.dart` (mobile) y `tailwind.config.ts` / `globals.css` (web). Estos valores deben coincidir con el design system; abajo se listan los usados en el prototipo.

### Color
| Token | Hex | Uso |
|---|---|---|
| Primary (padel green) | `#17A34A` | CTAs, FAB, estados activos, precios destacados, pins seleccionados |
| Accent (lime) | `#C5FF00` | Badges de categoría, dot de "no leído", badge del tab, **nunca** CTA grande |
| Navy | `#0F172A` | Base del tema oscuro (`--bg-2`), texto fuerte en light |

**Tema oscuro (default del prototipo):**
| Var | Hex |
|---|---|
| bg | `#0B1220` |
| bg-2 / surface base | `#0F172A` |
| surface | `#131C2E` |
| surface-2 (inputs, chips off) | `#1B2740` |
| line (bordes) | `rgba(255,255,255,0.09)` |
| line-strong | `rgba(255,255,255,0.18)` |
| text | `#F8FAFC` |
| muted | `#94A3B8` |
| muted-2 | `#5C6B85` |
| map bg | `#0C1524` |
| green-bg (tint) | `color-mix(green 15%)` ≈ `rgba(23,163,74,0.15)` |

**Tema claro:**
| Var | Hex |
|---|---|
| bg | `#F3F4F6` |
| surface / bg-2 | `#FFFFFF` |
| surface-2 | `#F3F4F6` |
| line | `#E5E7EB` |
| line-strong | `#CBD2DC` |
| text | `#0F172A` |
| muted | `#64748B` |
| muted-2 | `#94A3B8` |

Ambos temas deben mapearse a `ColorScheme` light/dark de Material 3.

### Tipografía
- Familia: **Plus Jakarta Sans** (mockups). En mobile, mantener la decisión del repo (Material 3 / fuente del sistema) salvo que se unifique.
- Escala usada: título grande 27/800; título sheet 19/800; section header 19/800; label de sección 13/700 UPPERCASE +0.3; body 14–15/600–700; meta 12.5–13/500–600; micro 11–11.5.
- `letter-spacing` títulos: −0.3 a −0.5.

### Radios y espaciado
| Token | Valor |
|---|---|
| Radio botón / input / chip | **12px** |
| Radio card | **18px** (tweakable a 12) |
| Radio interno (date pill, court row, slot) | 10–16px |
| Grid | **8pt** (múltiplos de 4/8); padding lateral de pantalla = **20px** |

### Sombras
- CTA verde: `0 8px 20px rgba(23,163,74,0.40)` (botón grande); `0 6px 16px rgba(23,163,74,0.40)` (íconos hero/pin).
- Card seleccionada: borde `1.5px #17A34A` + halo `0 0 0 3px green-bg`.

---

## Screens / Views

### 1. Home — "Actividad cerca de ti"
- **Layout:** columna scrollable, padding lateral 20px. Header (54px top) → H1 → hero card → "Mis partidas" → "Cerca de ti". Bottom nav fijo.
- **Header (`AppHeader`):** avatar circular 46px verde con borde lime 2px e iniciales; a la derecha botón campana 42px (radio 12) con dot lime de no-leído. Texto: "Hola, {nombre}" (13/600 muted) + fila chip nivel: ícono target verde + categoría (ej. "7ma") + "·" + ELO (ej. "1240") + "ELO".
- **H1:** "Actividad cerca de ti" 27/800 −0.5.
- **Hero matchmaking:** card (radio 18, borde line) con glow radial verde en esquina sup-der. Ícono bolt 46px en cuadro verde. Título "Buscar partida" 16/800 + subtítulo "Matchmaking por horario y nivel". Dos botones a 48px: **Buscar** (primary verde, ícono search) y **Crear** (secundario surface-2 + borde, ícono +).
- **Section header row:** título 19/800 + acción "Ver todas" (13.5/700 verde).
- **Match cards:** ver componente abajo.

### 2. Crear partida (modal full-screen)
- **Presentación:** sheet que sube desde abajo (`translateY(100%) → 0`, 280ms, `cubic-bezier(.3,.8,.3,1)`). En Flutter: `showModalBottomSheet(isScrollControlled: true)` full-height o ruta con `PageRouteBuilder` slide-up.
- **Header sheet:** botón cerrar (X) 36px en surface-2; título "Crear partida" 19/800 + subtítulo "Define cuándo, dónde y con quién". Borde inferior line.
- **Body scrollable** (padding 18/20, bottom 120 para el footer), secciones separadas por 20–24px:
  1. **Cuándo** → `DateStrip` (ver componente).
  2. **Dónde** *(requerido)* → input de búsqueda full-width (48px) con ícono lupa → debajo, `Segmented` **Lista / Mapa** full-width con íconos. En modo Mapa, mapa compacto arriba (188px). Lista de **Venue cards**; al tocar una se expande el **Court picker**.
  3. **Categoría** *(requerido)* → wrap de chips: `8va 7ma 6ta 5ta 4ta 3ra 2da 1ra` (single-select).
  4. **Afecta ELO** → fila card: ícono target en cuadro green-bg + título + subtítulo "El resultado modifica el ranking" + `Toggle`.
  5. **Género** → `Segmented` Masculino / Femenino / Mixto.
  6. **Jugadores** → label + `Stepper` (min 2, max 8, default 4).
  7. **Notas (opcional)** → textarea (min 84px, maxLength 300).
- **Footer fijo:** gradiente hacia bg-2, borde superior. Si hay sede+cancha+horario: línea resumen "{sede} · {cancha} · {hora}" + precio "US$X p/p · Bs Y". CTA 54px: deshabilitado (surface-2, texto muted) muestra "Elige cancha y horario"; habilitado (verde + sombra) muestra "Crear partida". Se habilita cuando hay sede, cancha, horario, categoría y género.

### 3. Partidas (tab)
H1 "Mis partidas" + `Segmented` Próximas / Historial + lista de match cards.

### 4. Avisos (tab)
H1 "Avisos" + lista de filas: ícono en cuadro green-bg + título + subtítulo + timestamp + dot lime si no-leído. Las no-leídas tienen fondo surface + borde.

### 5. Perfil (tab)
Avatar 84px (borde lime 3px) + nombre + chip "Categoría 7ma". Fila de 3 stat cards (Jugadas / Victorias % / ELO). Lista de ajustes (Editar perfil, Historial de ELO, Clubes favoritos, Ajustes) con ícono + chevron.

### Bottom nav
4 tabs: **Inicio** (home), **Partidas** (court), **Avisos** (bell, badge lime "2"), **Perfil** (user). Activo en verde (stroke 2.4), inactivo muted-2. Padding inferior 26px (safe area). Borde superior line, fondo bg-2.

---

## Componentes clave (recrear como widgets Flutter)

### DateStrip (tira semanal) — pieza solicitada
- Header: mes (17/700) + chip relativo "Hoy" / "Mañana" / "{Mes} {año}" (verde sobre green-bg).
- Fila horizontal scrollable de días (21 días desde hoy). Cada día = columna ancho 46: etiqueta DOW 3 letras (`DOM LUN MAR MIÉ JUE VIE SÁB`, 11/700 +0.4) + número en círculo 36px.
  - **Seleccionado:** círculo verde, texto blanco, sombra `0 4px 12px rgba(23,163,74,.4)`, fondo de columna surface-2.
  - **Hoy (no seleccionado):** borde verde 1.5px en el círculo.
- Auto-scroll para mantener el día seleccionado visible.
- Flutter: `ListView.builder` horizontal o `SingleChildScrollView` + `Row`.

### Venue card
Fila (radio 18, padding 12): thumbnail 64px (placeholder a reemplazar por foto real del club) + nombre 15/700 + rating (★ lime + valor) + "{zona} · {dist}" + tags (superficie, "N canchas") + a la derecha **Price** dual (US$ grande + Bs muted, sufijo "/h"). Seleccionada: borde+halo verde.

### Court picker (al elegir sede)
Por cada cancha: fila con ícono court + nombre + tag superficie. Si hay horarios: wrap de **slot chips** (34px, ícono reloj + hora; activo = verde). Si **no hay horarios** (estado vacío): fila surface-2 con reloj + "Sin horarios el {DOW día}" + acción "Otro día →" (no es un callejón sin salida).

### MiniMap (mapa compacto, 188px)
Mapa estilizado (en Flutter: usar el mapa real — Google Maps / Mapbox) con **pins de precio** tipo pill ("US$8"): seleccionado verde con sombra, otros surface+borde. Punto azul de "mi ubicación". Tap en pin = selecciona la sede.

### Price (moneda dual) — pieza solicitada
Muestra **ambas monedas**: US$ en grande (text) + **Bs** debajo en muted. Helpers en `cuadrala-ui.jsx`: `usd(n)`, `bs(n)`, `BS_RATE`.
> ⚠️ `BS_RATE = 40` es un **placeholder**. En producción conectar a la tasa real (BCV/paralelo) y formatear con `intl` (`NumberFormat`, locale `es-VE`). Decidir si la tasa se cachea por sesión o se refresca por request.

### Otras primitivas
- **Chip** (12px radio, 38px alto): off = surface-2 + borde line + texto muted; on = green-bg + borde verde + texto verde + check. Variante lime para badges.
- **Toggle** iOS (50×30, verde on).
- **Stepper** (− valor +, 38px botones, pill surface-2).
- **Segmented** (indicador deslizante 220ms, sombra; íconos opcionales).
- **AvatarStack** (cupos): círculos solapados; llenos = color sólido, vacíos = dashed. Mostrar "{N} cupos" o "Completa".

---

## Interactions & Behavior
- **Navegación tabs:** cambia el contenido; el bottom nav refleja el activo. Campana del header → tab Avisos.
- **Abrir Crear partida:** botones "Crear"/"Buscar" del hero → sheet slide-up. X → cerrar.
- **Selección de fecha:** tap en día → re-render de horarios disponibles (en real, refetch por fecha).
- **Selección de sede:** tap en venue card o en pin del mapa → expande court picker; toggle Lista/Mapa cambia la vista (mantener la sede seleccionada). Buscador filtra por nombre/zona.
- **Selección de horario:** tap en slot chip → setea cancha+hora, actualiza footer y habilita el CTA cuando se cumplen los requeridos.
- **Estado vacío de horarios:** "Otro día →" debe llevar el foco a la tira de fecha (scroll/highlight).
- **Transiciones:** sheet 280ms; segmented 220ms; chips/toggles ~140–200ms.

## State Management
Estado de **Crear partida**: `date`, `view` (Lista/Mapa), `query`, `venueId`, `courtId`, `slot`, `category`, `affectsElo` (bool), `gender`, `players` (2–8), `notes`. `canSubmit = venue && court && slot && category && gender`. En Flutter: `ChangeNotifier`/`Riverpod`/`Bloc` según el repo.

Datos a traer del backend (ver OpenAPI real en `services/api`, no el §D del DESIGN_SPEC): sedes cercanas con canchas y disponibilidad por fecha, categorías, tasa de cambio, partidas del usuario y actividad cercana, avisos.

## Assets
- **Iconos:** el prototipo usa íconos de línea propios (search, plus, bolt, pin, calendar, chevrons, minus, check, clock, bell, home, users, user, map, list, sliders, star, close, info, court, target). Reemplazar por el set de íconos del repo (Material Symbols / `flutter_svg`).
- **Logo:** `assets/images/logo.png` (repo).
- **Fotos de canchas/clubes:** los placeholders rayados deben sustituirse por imágenes reales.

## Files
- `Cuadrala App.html` — entry point del prototipo (tokens CSS, fuentes, monta los scripts).
- `cuadrala-ui.jsx` — primitivas: Icon, DateStrip, Chip, Toggle, Stepper, Segmented, Card, Price (moneda dual), AvatarStack, Avatar, SheetHeader, helpers `usd/bs/BS_RATE`.
- `cuadrala-screens.jsx` — CreateMatchScreen, VenueCard, CourtPicker, MiniMap, data demo (VENUES, CATEGORIES).
- `cuadrala-home.jsx` — HomeScreen, MatchCard, AppHeader, MatchesScreen, AvisosScreen, PerfilScreen, BottomNav.
- `cuadrala-court.jsx` — **CourtView / CourtSpot**: vista de cancha unificada (Equipo A/B, Drive/Revés, RED), usada en detalle y resultado.
- `cuadrala-detail.jsx` — MatchDetailScreen (con CourtView + estados join/pago), Banner, InfoTile, DEMO_COURT, ME.
- `cuadrala-payment.jsx` — **PaymentFlow**: selección de método (Efectivo/Transferencia/Pago móvil) + datos dinámicos + pantalla "Comprobante enviado / pendiente".
- `cuadrala-result.jsx` — LoadResultFlow (posiciones → sets → resumen+ELO).
- `cuadrala-search.jsx` — SearchScreen (matchmaking).
- `cuadrala-app.jsx` — root: navegación por stack de overlays, estado de partida (joinedPos/payment/played), Tweaks.
- `ios-frame.jsx`, `tweaks-panel.jsx` — andamiaje de presentación (no portar a Flutter).

---

## ADENDA — Flujo unir → pagar → resultado (v2)

### Vista de cancha unificada (CourtView) — pieza central
La MISMA visualización de cancha se reutiliza en 3 momentos (consistencia pedida por el cliente):
1. **Detalle / unirse**: muestra la alineación; los lugares vacíos del usuario son tappables ("Unirme aquí"). Al unirte quedas colocado **al lado de tu compañero** (misma mitad de cancha).
2. **Cargar resultado · paso 1**: asignación de posiciones.
3. **Detalle tras jugar**: la misma cancha en modo solo-lectura con el marcador por equipo.

Estructura: tarjeta con **Equipo A** (acento verde) arriba, divisor **RED** (línea punteada), **Equipo B** (acento lime) abajo; cada equipo con 2 posiciones **Drive / Revés** (96–104px). Spot ocupado = avatar + nombre + dot de estado (verde=Pagado / lime=Pendiente) + badge "TÚ" si eres tú. Spot vacío = dashed con "+" y "Unirme aquí" (interactivo) o "Disponible" (solo lectura). En Flutter: `GridView`/`Row` 2×2 con un divisor central.

### Máquina de estados del Detalle (phase)
`browse` (no unido) → `joined` (unido, sin pagar) → `pending` (pago en revisión) → `confirmed` (pago confirmado) · y `played` (finalizada). Cada fase cambia el **banner** y el **footer**:
| phase | banner | footer CTA |
|---|---|---|
| browse | "Únete a esta partida" (neutro) | deshabilitado "Toca un lugar para unirte" |
| joined | "Te uniste a la partida" (verde) | **Pagar ahora · US$X** + resumen precio |
| pending | "Pago en revisión" (lime) | Compartir + **Cargar resultado** |
| confirmed | "Ya estás anotado" (verde) | Compartir + **Cargar resultado** |
| played | "Partida finalizada" (verde) | Volver al inicio + línea "Ganaste · ELO 1240→1254 (+14)" |

### Flujo de pago (PaymentFlow)
**Paso método** — header centrado "Elegir método de pago". Card resumen (club + "Pago por jugador" + precio dual). Lista de **radios**: Efectivo / Transferencia bancaria / Pago móvil (cada uno con subetiqueta). Bloque dinámico debajo:
- *Efectivo* → nota: "Pagarás en efectivo en el club. No necesitas subir comprobante…". CTA = **Confirmar inscripción**.
- *Transferencia / Pago móvil* → card "Datos para pagar" (Banco, Cuenta/Teléfono, Titular/Cédula — placeholders). CTA = **Ya pagué · Enviar comprobante**.

**Paso confirmación** — spinner verde animado, "Comprobante enviado", "El staff de la sede revisará el pago en el panel web.", card (club + Monto dual + badge **Pendiente** lime). Botones: **Ir al inicio** / **Ver mi partida**.

> Backend: los datos bancarios y métodos vienen de la sede; el estado de pago lo confirma el staff desde el panel web (no es pasarela automática). El precio se muestra en **US$ + Bs**.

### Navegación (stack de overlays)
El root mantiene un stack: `detail → payment` (push), `detail → result` (push); `Ver mi partida` hace pop a `detail` (ahora `pending`); `Ir al inicio` limpia el stack y va al tab Inicio. En Flutter: `Navigator.push/pop` con rutas slide-up (`showModalBottomSheet` full-height o `PageRouteBuilder`).

### Estado app-level (demo)
`joinedPos` ('A-d'|'A-r'|'B-d'|'B-r'|null), `payment` ('none'|'pending'|'confirmed'), `played` (bool), `scores`. Al abrir una partida se resetean. En producción derivan del backend (inscripción + estado de pago + resultado).

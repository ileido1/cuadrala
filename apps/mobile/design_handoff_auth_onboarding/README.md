# Handoff: Cuádrala — Autenticación + Onboarding

## Overview
Diseño hi-fi del flujo de entrada de **Cuádrala** (app de pádel / matchmaking, Flutter + Material 3):

1. **Bienvenida** — intro de marca con CTAs crear cuenta / iniciar sesión.
2. **Login** — switcher pill, social (Google/Apple), email + contraseña.
3. **Registro** — email + contraseña con medidor de fuerza + confirmar.
4. **Onboarding (wizard de 4 pasos)** — Perfil → Deportes → Ubicación → Disponibilidad.

Flujo: `Bienvenida → Registro → Onboarding (4 pasos) → App` y `Bienvenida → Login → App`. Login y Registro alternan entre sí por el switcher o por el enlace del pie.

## About the Design Files
Los archivos de este bundle son **referencias de diseño hechas en HTML/React** — un prototipo que muestra look & feel y comportamiento. **No son código de producción para copiar tal cual.** La tarea es **recrear estos diseños en la app Flutter existente** usando sus patrones: `Theme.of(context).colorScheme`, widgets compartidos (inputs filled, `FilledButton`, `OutlinedButton`, chips, segmented) y los tokens de `brand_colors.dart` / `app_theme.dart`. No se porta React ni el marco de iPhone (ese marco es solo para presentar el prototipo).

**Cómo abrir el prototipo:** abrir `Cuadrala App.html` en un navegador. En el panel de **Tweaks** (esquina) hay botones para saltar directo a cada pantalla (sección "Autenticación") y un toggle de **tema claro/oscuro**.

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografía, espaciado, radios e interacciones son finales. Donde el prototipo usa primitivas propias (chips, segmented, stepper, toggle), preferir el widget compartido equivalente del repo si existe.

---

## Para una recreación EXACTA (leer primero)
Orden de prioridad de fuentes de verdad:
1. **El código fuente (`.jsx`) = valores exactos.** Cada color, padding, radio, tamaño y peso de fuente está literal en los `.jsx`. Ante duda de medida o color, **léelo en el `.jsx`**, no lo estimes.
2. **Las capturas en `screens/` = verdad visual.** Compara 1:1 después de implementar cada pantalla.
3. **Este README = el "por qué" y el comportamiento** (flujos, estados, validación).

### Capturas de referencia (`screens/`)
| Archivo | Pantalla |
|---|---|
| `01-bienvenida.png` | Bienvenida |
| `02-login.png` | Login |
| `03-registro.png` | Registro |
| `04-onboarding-perfil.png` | Onboarding — Paso 1: Tu perfil |
| `05-onboarding-deportes.png` | Onboarding — Paso 2: Tus deportes |
| `06-onboarding-ubicacion.png` | Onboarding — Paso 3: Ubicación |
| `07-onboarding-disponibilidad.png` | Onboarding — Paso 4: Disponibilidad |

> Capturas en tema **oscuro** (default). El tema claro existe en el prototipo (toggle en Tweaks).

### Mapa de archivos → código
| Archivo | Contiene |
|---|---|
| `cuadrala-auth.jsx` | `WelcomeScreen`, `LoginScreen`, `RegisterScreen` + primitivos auth (`Logo`, `Field`, `PrimaryBtn`, `OutlineBtn`, `SocialBtn`, `AuthTabs`, `OrDivider`, `PasswordStrength`) |
| `cuadrala-onboarding.jsx` | `OnboardingScreen` (wizard) + `WizardChrome`, `StepProfile`, `StepSports`, `StepLocation`, `StepAvailability` |
| `cuadrala-ui.jsx` | Iconos (`Icon`), `Chip`, `Segmented`, `Toggle`, `SectionLabel`, etc. |
| `cuadrala-app.jsx` | Root: estado `auth`, navegación entre pantallas, Tweaks |
| `ios-frame.jsx` / `tweaks-panel.jsx` | Solo andamiaje del prototipo — **NO portar** |

---

## Design Tokens

### Color
| Token | Hex | Uso |
|---|---|---|
| Primary (padel green) | `#17A34A` | CTAs, estados activos/seleccionados, avatar, foco de inputs, progreso |
| Primary dark | `#13883E` | hover/pressed del primary |
| Lime accent | `#C5FF00` | badges de categoría (no se usa como CTA grande) |
| Navy | `#0F172A` | texto fuerte; base oscura |
| `green-bg` | `color-mix(#17A34A 15%, transparent)` | fondo tenue de chips activos, cards seleccionadas, badges |

**Tema oscuro**
| Token | Hex |
|---|---|
| `--bg` (scaffold) | `#0B1220` |
| `--bg-2` (header/footer) | `#0F172A` |
| `--surface` (cards/inputs) | `#131C2E` |
| `--surface-2` (chips/fills) | `#1B2740` |
| `--line` | `rgba(255,255,255,.09)` |
| `--line-strong` | `rgba(255,255,255,.18)` |
| `--text` | `#F8FAFC` |
| `--muted` | `#94A3B8` |
| `--muted-2` | `#5C6B85` |

**Tema claro**
| Token | Hex |
|---|---|
| `--bg` | `#F3F4F6` |
| `--bg-2` / `--surface` | `#FFFFFF` |
| `--surface-2` | `#F3F4F6` |
| `--line` | `#E5E7EB` |
| `--line-strong` | `#CBD2DC` |
| `--text` | `#0F172A` |
| `--muted` | `#64748B` |
| `--muted-2` | `#94A3B8` |

**Colores semánticos** (medidor de contraseña, acentos de deporte):
Débil `#EF4444` · Regular `#FB8C00` · Buena `#8BC34A` · Fuerte `#17A34A`.
Deportes: Pádel `#2E7D32` · Tenis `#607D8B` · Pickleball `#00897B` · Fútbol 5 `#455A64` · Básquet 3x3 `#E65100` · Vóley `#FFB300`.
Franjas horarias: Mañana `#FFB300` · Tarde `#FB8C00` · Noche `#5C6BC0`.

### Tipografía
**Plus Jakarta Sans.** Pesos: 500 (body), 600/700 (labels), 800 (botones/títulos), 900 (marca y headings).
| Rol | Tamaño / peso | Notas |
|---|---|---|
| Marca "Cuádrala" (bienvenida) | 34 / 900 | `letter-spacing: -0.4` |
| Marca compacta (login/registro) | 26 / 900 | junto a logo 56px |
| Heading de pantalla | 24–25 / 900 | `letter-spacing: -0.4` |
| Subtítulo | 14.5 / 500 | color `--muted`, `line-height 1.5` |
| Label de input | 13 / 700 | `--text` |
| Botón | 16 / 800 | |
| `SectionLabel` | 13 / 700 | UPPERCASE, `letter-spacing 0.3`, `--muted` |
| Helper / legal | 12 / 500 | `--muted` |

### Radios y espaciado
- Inputs y botones: **12px** (`--radius-btn`). Botones de Bienvenida: **16px** wait → ver nota.* Cards: **18px** (`--radius-card`). Cajas de logo: **22px** (96px) / **16px** (56px). Chips: **999px** (pill). Switcher pill: **999px**.
- Grid 8pt. Padding lateral de pantalla **24px** (auth) y **20px** (wizard).
- Alturas: inputs **50**, botones primarios **50–54**, social **48**, chips **38**.

> *Nota: en este prototipo todos los botones usan `--radius-btn` (12px) por consistencia con el resto de la app. El spec original pedía 16px en Bienvenida; usa el que prefieras, pero mantén consistencia.

### Sombras
- CTA primario verde: `0 10px 24px rgba(23,163,74,.4)` (50px) / `0 8px 20px rgba(23,163,74,.4)` (footer 54px).
- Caja de logo 96px: `0 14px 34px rgba(23,163,74,.42)`.
- Foco de input: `border 1.5px var(--green)` + `box-shadow 0 0 0 3px var(--green-bg)`.

---

## Componentes clave

### Logo de marca (`Logo`)
Caja redondeada verde (`#17A34A`) con un círculo blanco dentro; dentro, una **"C" estilizada line-art** formada por 4 arcos-cuña que alternan verde `#17A34A` y navy `#0F172A`, más una línea de cancha central verde. Tamaños usados: 96 (bienvenida), 56 (header login/registro). SVG exacto en `cuadrala-auth.jsx` → `Logo`. En Flutter, exportar como `SvgPicture.asset` o `CustomPaint`.

### Input filled (`Field`)
Filled, alto 50, radius 12, padding `0 14px`, gap 10. Ícono prefijo (`--muted`, vuelve verde en foco), `input` transparente, trailing opcional (ej. ojo). Label arriba (13/700). Helper opcional debajo (12/`--muted`). Foco: borde verde + ring `var(--green-bg)`. Soporta `prefix` (ej. `🇻🇪 +58` en teléfono).

### Botones
- **Primario** (`PrimaryBtn`): verde, texto 16/800 blanco, ícono opcional, sombra verde. Deshabilitado: fondo `--surface-2`, texto `--muted-2`, sin sombra.
- **Outline** (`OutlineBtn`): fondo `--surface`, borde `--line-strong`.
- **Social** (`SocialBtn`): fondo `--surface`, borde `--line-strong`, marca Google (multicolor) / Apple (monocromo `currentColor`).

### Switcher pill (`AuthTabs`)
Dos pestañas [Ingresar | Crear cuenta] en un contenedor pill `--surface-2`. Indicador deslizante `--surface` con borde, transición `transform .22s cubic-bezier(.4,0,.2,1)`. Texto 12/900. Cambiar de pestaña navega entre Login/Registro.

### Medidor de fuerza (`PasswordStrength`)
4 segmentos horizontales (alto 4, radius 2, gap 6). Se llenan según nivel 0–4 con el color del nivel. Texto "Seguridad: {nivel}" debajo (12/800) en el color del nivel. Lógica `strengthOf`: +1 si ≥6 chars, +1 si ≥10, +1 si mayúscula+minúscula, +1 si dígito+símbolo.
> **Importante (bug de transición CSS):** anima `background-color` (NO el shorthand `background`) en estas barras; el shorthand + `var()` deja el color "pegado" al cambiar de estado. En Flutter no aplica, pero replica la regla si lo haces en web.

### Chrome del wizard (`WizardChrome`)
Top bar (alto ~56) con flecha atrás, centro "Configura tu perfil" (16/800) + "Paso N de 4" (11/700 `--muted`), borde inferior. **Barra de progreso:** 4 segmentos (alto 4, radius 2, gap 6); los `i < step` en `--green`, resto `--line`. Footer sticky con gradiente y botón primario ancho completo (alto 54). Misma regla de `background-color` que el medidor.

---

## Pantallas (detalle)

### 1. Bienvenida (`WelcomeScreen`)
Vista centrada vertical, scroll, padding `64 24 40`, `max-width 420`, centrada.
- Logo 96px (radius 22).
- Título "Cuádrala" 34/900.
- Subtítulo 2 líneas (16/600 `--muted`): "Arma partidas, paga y juega." / "Cero grupos de WhatsApp."
- Divisor con texto "o continuar con email".
- Botón primario `mail` "Crear cuenta con email" → Registro.
- Botón outline "Ya tengo cuenta" → Login.
- Nota legal 12/`--muted`: Términos / Política de privacidad (resaltados en `--text` 700).

### 2. Login (`LoginScreen`)
Centrada, `max-width 420`, padding `64 24`.
- Header de marca: logo 56 + "Cuádrala" 26/900; título "Bienvenido de vuelta" 25/900; subtítulo "Inicia sesión para seguir cuadrando partidas."
- `AuthTabs` (Ingresar activa).
- 2 botones sociales (Google, Apple).
- Divisor "o continuar con email".
- `Field` email (ícono `mail`, hint `tu@email.com`).
- `Field` contraseña (ícono `lock`, trailing ojo). Debajo, alineado a la derecha: "¿Olvidaste tu contraseña?" (verde 13/800).
- Primario "Iniciar sesión" (alto 52) → App.
- Pie: "¿No tienes cuenta? **Crear cuenta**" (verde 900) → Registro.

### 3. Registro (`RegisterScreen`)
Igual layout que Login, **sin sociales**.
- Header: "Crea tu cuenta" / "Usarás este correo para ingresar."
- `AuthTabs` (Crear cuenta activa).
- `Field` email.
- `Field` contraseña (ojo) + `PasswordStrength` debajo.
- `Field` confirmar contraseña (ojo); helper de error "⚠ Las contraseñas no coinciden." si no coinciden.
- Primario `arrowRight` "Continuar" (alto 52) → Onboarding.
- Pie: "¿Ya tienes cuenta? **Inicia sesión**" → Login.

### 4. Onboarding — Paso 1: Tu perfil (`StepProfile`)
- Título "Tu perfil" / "Así te verán los otros jugadores."
- Avatar circular 108px verde con iniciales (38/900, derivadas del nombre, fallback "TÚ") + badge de cámara abajo-derecha (34px, borde 2.5px `--bg`). Texto "Toca para cambiar la foto".
- `Field`s: Nombre completo (`user`, hint "Carlos Rodríguez"); Teléfono WhatsApp (`phone`, prefix `🇻🇪 +58`, helper "Te avisamos cuando una partida está cuadrada."); DNI (`card`, helper "Opcional. Solo números sin puntos ni guiones."); Fecha de nacimiento (`cake`, hint "DD / MM / AAAA" → en Flutter usar date picker); Ciudad (`pin`).
- Card **Vista previa de tu perfil** (`SectionLabel` + card `--surface-2` radius 16): avatar 52 + nombre ("Tu nombre" si vacío) + ciudad ("Tu ciudad") + badge verde `sparkle` "Nuevo".
- Footer "Continuar".

### 5. Onboarding — Paso 2: Tus deportes (`StepSports`)
- Título "Tus deportes" / "Elige deportes, categoría y datos técnicos."
- Grid 2 columnas de `SportCard` (radius 14): círculo de ícono con color de acento + nombre. Seleccionada: borde verde + fondo `--green-bg` + check verde. Deportes y acentos en §Tokens.
- Por cada deporte elegido, `ClassifyCard` (radius 16): chips de **banda de nivel** (Principiante/Intermedio/Avanzado/Pro), chips de **categoría** (8va…3ra). Para deportes de raqueta (Pádel/Tenis/Pickleball): **Segmented** "Lado preferido en cancha" (Drive/Revés) y "Mano dominante" (Diestro/Zurdo/Ambidiestro).
- Footer "Continuar".

### 6. Onboarding — Paso 3: Ubicación (`StepLocation`)
- Título "¿Dónde te queda mejor jugar?" / subtítulo de radio.
- Card destacada "Usar mi ubicación" (fondo `--green-bg`, borde verde, ícono `locate` en círculo verde, subtítulo "Detectaremos tu zona automáticamente.", chevron) → permiso de geolocalización.
- "Tu zona": `Field` (`pin`, hint "Caracas — La Castellana"), label "Zona o ciudad (opcional)".
- "Radio de búsqueda" con badge "{n} km" verde. Chips 5/10/20/30 km + `input range` 1–100 (accent verde). Estado compartido entre chips y slider.
- Toggle "Ajustar coordenadas manualmente" → revela `Field`s Latitud / Longitud.
- Footer "Continuar".

### 7. Onboarding — Paso 4: Disponibilidad (`StepAvailability`)
- Título "¿Cuándo juegas?" / "Te mostramos partidas que se ajusten a tu tiempo."
- "Días disponibles": chips Lun…Dom (multi-selección).
- "Horario preferido": 3 `SlotCard` (radius 16) con círculo de ícono en su color, título + rango y **checkbox circular** (26px) a la derecha. Mañana 06:00–12:00 (`sun`), Tarde 12:00–18:00 (`sunset`), Noche 18:00–22:00 (`moon`). Multi-selección.
- Footer destacado con ícono `bolt`: "¡Empezar a jugar!" → App.

---

## Interacciones & Comportamiento
- **Navegación:** estado `auth ∈ {welcome, login, register, onboarding, null}` en `cuadrala-app.jsx`. `null` = dentro de la app.
- **Wizard:** estado `step` 1–4; atrás en paso 1 vuelve a Registro; "Continuar" avanza; en paso 4 finaliza y entra a la app.
- **Validación:** email formato; contraseña mín. 8; confirmar == contraseña; medidor en vivo. (En el prototipo no bloquea el submit — añade las reglas reales en producción.)
- **Mostrar/ocultar contraseña:** alterna el `type` del input vía botón ojo (`eye` / `eyeOff`).
- **Transiciones:** sin animaciones de entrada en las capas full-screen (se quitaron a propósito); usa la transición de ruta nativa de Flutter. Indicador del switcher y barras de progreso: ~.22–.25s.

## State Management (sugerido en Flutter)
- `AuthState`: email, password, confirm, isLogin, obscure flags, strength.
- `OnboardingState`: step; profile {name, phone, dni, dob, city, photo}; sports {Map<sportId, {band, cat, side, hand}>}; location {useGps, zone, radius, manualCoords, lat, lng}; availability {days[], slots[]}.
- Al finalizar: persistir perfil y preferencias; navegar a Home.

## Assets
- **Logo:** recrear desde el SVG en `Logo` (`cuadrala-auth.jsx`) — exportar a `.svg`/`CustomPaint`. Marcas Google/Apple: usar paquetes oficiales o assets de marca propios (no recrear a mano en producción).
- **Iconos:** set line-art `currentColor` en `cuadrala-ui.jsx` (`Icon`). Equivalentes en Flutter: `lucide_icons` / `Icons` Material o SVGs propios. Mapear por nombre (`mail`, `lock`, `eye`, `camera`, `phone`, `card`, `cake`, `pin`, `locate`, `sun`, `sunset`, `moon`, `sparkle`, `bolt`, `check`, `chevron*`, `arrowRight`).
- **Fotos:** placeholders rayados en el prototipo; en producción, foto del usuario.

## Files
Prototipo navegable: **`Cuadrala App.html`**. Componentes de este flujo: `cuadrala-auth.jsx`, `cuadrala-onboarding.jsx`, `cuadrala-ui.jsx`, `cuadrala-app.jsx`. El resto de `.jsx` son las demás pantallas de la app (contexto). `ios-frame.jsx` y `tweaks-panel.jsx` son andamiaje del prototipo — no portar.

# Changelog

Todos los cambios notables de la API se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el versionado sigue [SemVer](https://semver.org/lang/es/).

## [1.2.0] - 2026-09-04

### Agregado

- **Worker de tasas de cambio.** Las tasas se refrescan solas desde
  [dolarapi](https://ve.dolarapi.com/v1/cotizaciones): un tick al arrancar la
  API y después cada 6 h (dolarapi publica una cotización por día). Usa el mismo
  lock distribuido que los otros workers, así que con varias instancias solo una
  refresca. Un tick fallido se registra y el worker sigue vivo: si se cayera, las
  tasas quedarían congeladas hasta el próximo deploy, que es justo el bug que
  vino a arreglar.
- Variables nuevas, todas con default útil: `EXCHANGE_RATES_WORKER_ENABLED`
  (`true`), `EXCHANGE_RATES_WORKER_INTERVAL_MS` (6 h),
  `EXCHANGE_RATES_WORKER_TICK_TIMEOUT_MS` (30 s) y
  `EXCHANGE_RATES_WORKER_COUNTRY_CODE` (`VE`).

### Corregido

- **Las tasas estaban congeladas en valores inventados.** El `POST
  /countries/:code/exchange-rates/refresh` existía, pero detrás de `requireAuth`
  y sin nadie que lo llamara. La base quedaba con lo que dejó el seed: USD a 50
  BS cuando el real ronda los 805, o sea todo precio convertido salía ~16 veces
  más barato.
- **El seed mentía sobre el origen de sus tasas.** Escribía `source:
  'dolarapi.com'` sobre cifras de relleno, así que desde afuera no había manera
  de distinguir una tasa real de una inventada. Ahora dice `source: 'seed'`.

## [1.1.0] - 2026-09-04

### Agregado

- **`GET /venues/:venueId/availability` marca los horarios ya pasados** con el
  motivo nuevo `PAST`. Antes el servidor los devolvía como disponibles y cada
  cliente decidía por su cuenta si ya habían pasado — usando el reloj del
  dispositivo, que solo acierta cuando el usuario está en el mismo huso que la
  cancha. Ahora lo decide el servidor, que es el único que conoce la zona
  horaria de la sede.
- `VenueRepository.getVenueTimezoneSV()`: expone la IANA tz de
  `venueMonetizationSettings`, con fallback a `America/Caracas`.
- `venueWallClockNowSV()`: traduce un instante a la hora de pared de la sede
  bajo la convención wall-clock-as-UTC. Ante una zona inválida cae en la de por
  defecto en vez de lanzar.
- El seed crea la fila `VenueMonetizationSettings` de cada sede. Sin esa fila el
  `timezone` viajaba como `null`: el default del schema no aplica cuando la fila
  no existe.

### Cambiado

- `GetCourtAvailabilityUseCase` recibe el reloj por constructor (con default al
  reloj real). Los tests que usaban fechas fijas ya no dependen de la fecha en
  que se ejecutan.

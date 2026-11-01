# Issue #100 — ForegroundNotificationHandler usa un contexto que no puede ver GoRouter/Overlay

Branch: `fix/issue-100-foreground-notification-context`. Runner: `flutter test` in `apps/mobile/`.

## Specs

- **S1**: `ForegroundNotificationHandler` no debe depender de `GoRouter.of(context)`/`Overlay.of(context)` resueltos desde su propio `context` — ese context, sin importar en qué posición del árbol se envuelva el widget, nunca puede ver un `InheritedWidget` provisto por sus propios descendientes (lookup solo hacia ancestros). Recibe la instancia de `GoRouter` directamente por constructor y resuelve el `Overlay` vía `router.routerDelegate.navigatorKey.currentState?.overlay`, sin pasar por `BuildContext` en absoluto.
- **S2**: regresión descubierta en el camino: `dispose()` llamaba `_dismissOverlay()`, que hace `setState` — durante `dispose()`, el `Element` ya puede estar en camino a `defunct` aunque `mounted` siga devolviendo `true`, reventando la aserción del framework. `dispose()` debe limpiar el `OverlayEntry` directamente sin pasar por el `setState` de `_dismissOverlay`.
- **S3**: test de regresión que reproduce el árbol real de `app.dart` (handler envolviendo `MaterialApp.router`, no una versión simplificada) y ejercita el ciclo completo: mensaje foreground → banner visible → tap → navega sin excepción → desmonte limpio.

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1-S3 | inline (parent) | done | ver Log |

## Log

- **L1**: Hallazgo flagged (no corregido) por el escritor de mobile durante #94-#97; usuario pidió documentarlo (issue #100) y luego corregirlo ("vamos a corregirlo").
- Verificación propia antes de corregir: confirmé en código (no solo en el reporte del subagente) que `app.dart:30-31` envuelve `MaterialApp.router` con `ForegroundNotificationHandler` por fuera, y que las líneas 97/126 usan ese mismo `context`.
- Primer intento de fix (mover el wrap dentro del `builder` de `MaterialApp.router`) **no funcionó** — confirmado con test real: `builder`'s context tampoco está dentro del Overlay/Router interno, es un error de razonamiento (ningún wrap cambia que el padre nunca ve lo que provee su hijo). Fix real: pasar la instancia de `GoRouter` directo y usar `navigatorKey.currentState.overlay`, sin contexto.
- En el camino se encontró y corrigió una segunda bug real, separada: `dispose()` llamando `setState` vía `_dismissOverlay()` — causaba un `_lifecycleState != defunct` assertion failure real, reproducido con el mismo test antes de corregirlo.
- RED confirmado (el test con el wiring real de `app.dart` lanza "No Overlay widget found" exactamente como predecía el issue) → GREEN tras ambos fixes. Regresión: `flutter analyze` limpio; `test/core/push/` + `test/features/quick_match/` (49 tests) sin cambios de comportamiento.

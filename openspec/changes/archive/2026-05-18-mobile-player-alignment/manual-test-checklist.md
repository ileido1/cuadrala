# Checklist de prueba manual — mobile-player-alignment

Prerrequisitos: API (`npm run dev`), web backoffice, app mobile con usuario jugador + usuario staff de la mise sede.

---

## 1. Mobile solo jugador (M1)

- [ ] En mobile **no** existe ruta a agenda staff (`/venues/:id/schedule` → 404 o redirige).
- [ ] Desde detalle de sede **no** hay botón “Agenda” / “Backoffice”.
- [ ] Búsqueda en código: sin pantallas de confirmar pagos staff en mobile.

---

## 2. Crear partida + bloqueo en web (M2)

**Mobile — jugador**

1. Iniciar sesión como jugador.
2. Crear partida → elegir sede con cancha, fecha **abierta** según horarios, horario disponible, publicar.
3. Verificar que la partida aparece en detalle con sede/cancha/hora correctos.

**Web — staff (misma sede)**

4. Iniciar sesión como staff → Agenda / calendario.
5. Confirmar que el slot de la partida aparece **ocupado** (reserva `MATCH` vinculada).
6. Intentar crear reserva `DIRECT` en el **mismo** court + `scheduledAt` → debe fallar (409 / conflicto).

**API (opcional)**

```bash
# Tras crear partida, en DB o vía GET bookings del día:
# reservation.type = MATCH, visibility = PUBLISHED, matchId = <id partida>
```

---

## 3. Horarios de sede (M4)

1. En web → Settings de la sede: domingo **cerrado** (o sin entrada en `openingHours`).
2. En mobile → crear partida, misma sede, elegir **domingo**.
3. Esperado: mensaje tipo “Domingo la sede está cerrada…” y **sin** chips de horario (o lista vacía).
4. Elegir lunes (u otro día abierto 08:00–23:00): solo horarios dentro de esa ventana (no slots a las 06:00 si la sede abre a las 08:00).

---

## 4. Pago jugador — multi-moneda (M3)

**Preparación**

- Sede con `pricingCurrency` = **USD** (o EUR) y al menos un `VenuePaymentMethod` activo (transferencia / pago móvil).
- Partida con `pricePerPlayerCents` > 0 y jugador inscrito.

**Flujo mobile**

1. Detalle partida → **Pagar** / **Pagar ahora**.
2. Monto mostrado con símbolo de la sede (ej. `US$`, `€`, `Bs.`), **no** siempre Bs.
3. Lista de **medios de pago de la sede** (nombre + moneda de liquidación).
4. Al elegir transferencia: ver datos bancarios / pago móvil del método (no solo CVU legacy vacío).
5. Continuar → subir comprobante (imagen) → pantalla **Esperando confirmación** con badge **Pendiente**.
6. Poll: tras unos segundos la UI sigue en pendiente (normal).

**Web — staff confirma**

7. Staff → pagos pendientes de la sede / reserva o partida vinculada.
8. Confirmar pago manual con método y monto en moneda correcta.

**Mobile — tras confirmación**

9. En **Esperando confirmación**: badge pasa a **Confirmado** (poll 5–15 s) o al reabrir detalle de partida.
10. Si staff **rechaza**: badge **Rechazado** y opción volver a pagar.

---

## 5. Regresión rápida

- [ ] Unirse a partida abierta (`/matches/open`) sigue funcionando.
- [ ] Chat de partida abre sin error.
- [ ] Torneos: listar / detalle (smoke).
- [ ] `flutter test` y `npm test` en verde en tu rama.

---

## 6. Casos borde

| Caso | Acción | Esperado |
|------|--------|----------|
| Sede sin métodos de pago | Pagar partida | Fallback a datos legacy `payment-info` o mensaje claro |
| Sin `venueId` en partida | Pagar | Flujo no rompe; legacy o error amigable |
| Partida sin precio | Detalle | No muestra CTA de pago |
| Doble tap Pagar | Crear obligación | Reutiliza transacción `PENDING` existente |

---

## Registro de ejecución

| Fecha | Ejecutor | Build/commit | M1 | M2 | M3 | M4 | Notas |
|-------|----------|--------------|----|----|----|----|-------|
| | | | | | | | |

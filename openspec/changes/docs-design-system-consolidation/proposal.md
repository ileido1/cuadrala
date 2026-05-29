# Proposal: docs-design-system-consolidation

## Intent

La documentación de producto, UI y backlog mobile está fragmentada en varios MD históricos con estados obsoletos. La app Flutter/web ya implementó gran parte del plan; leer `BACKLOG_MOBILE.md` o `desing.mdc` induce decisiones incorrectas. Consolidar en fuentes de verdad explícitas sin cambiar comportamiento de la app.

## Scope

### In Scope

- Crear `docs/DESIGN_SYSTEM.md` (índice: tokens, enlaces a código, mockups, reglas agente).
- Archivar `docs/BACKLOG_MOBILE.md` y `docs/MOBILE_SPRINTS.md` → `docs/archive/` con stubs que redirijan.
- Eliminar `.cursor/rules/desing.mdc` (React Native, stack incorrecto).
- Auditar y corregir estados en `docs/BACKLOG_UNIFICADO.md` vs `apps/mobile/lib/src/features/`.
- Actualizar `docs/SDD.md` y `AGENTS.md` con enlaces al índice y aviso “estado en UNIFICADO”.
- Añadir nota en `Cuadrada-Sport/.../DESIGN_SPEC.md`: primary canónico `#17A34A` (código), mockup `#1FA34A` legacy.
- Crear `docs/archive/README.md` explicando qué hay archivado y por qué.

### Out of Scope

- Paquete `design-tokens.yaml` generado (evaluar después).
- Mover repo Cuadrada-Sport al monorepo.
- Refactor de colores hardcodeados en widgets (seguimiento opcional).
- Cambios en `openspec/specs/mobile-*` (comportamiento sin cambios).
- Archivar `docs/TODO.md` (fase 2 si el equipo confirma).

## Capabilities

### New Capabilities

None — cambio de documentación y gobernanza, sin nuevos requisitos de producto.

### Modified Capabilities

None — no altera contratos en `openspec/specs/`.

## Approach

**Opción A (recomendada):** índice + archivo + auditoría backlog.

| Capa | SSOT |
|------|------|
| Tokens visuales | `apps/mobile/lib/src/core/theme/*` + `apps/web/tailwind.config.ts` + `globals.css` |
| Patrones UX Flutter (agentes) | `.cursor/rules/flutter-ui-design-system-cuadrala.mdc` |
| Backlog delivery | `docs/BACKLOG_UNIFICADO.md` |
| Mockups / copy / wireframes | `Cuadrada-Sport/artifacts/mockup-sandbox/.../DESIGN_SPEC.md` + `SCREENS.md` |

`docs/DESIGN_SYSTEM.md` documenta la tabla de colores y enlaces; no duplica hex en tres sitios más.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docs/DESIGN_SYSTEM.md` | New | Índice único design system |
| `docs/archive/*` | New | Históricos mobile |
| `docs/BACKLOG_MOBILE.md` | Removed/Moved | Archivar |
| `docs/MOBILE_SPRINTS.md` | Removed/Moved | Archivar |
| `.cursor/rules/desing.mdc` | Removed | Stack RN obsoleto |
| `docs/BACKLOG_UNIFICADO.md` | Modified | Estados US (ver auditoría) |
| `docs/SDD.md`, `AGENTS.md` | Modified | Enlaces y banners |
| `Cuadrada-Sport/.../DESIGN_SPEC.md` | Modified | Nota primary `#17A34A` |

### Auditoría backlog (correcciones propuestas)

| US | Estado actual doc | Estado código | Acción |
|----|-------------------|---------------|--------|
| US-M6-02 | Pendiente | `notification_prefs_screen.dart` | → Done |
| US-M3-07 | Pendiente | matchmaking feature | → Done o Parcial |
| US-M4-02,03,04 | Pendiente | create/detail/schedule screens | → Parcial |
| US-M4-01 | Pendiente | tab torneos placeholder | Mantener Pendiente |
| US-M5-02 | Pendiente | chat tournament routes | Verificar → Parcial/Done |
| Sprint M5 torneos | Pendiente (front) | Parcial | Ajustar resumen §1 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Links rotos a BACKLOG_MOBILE | Med | Stubs en `docs/` que apunten a archive |
| Agentes sin regla RN crean menos ruido | Low | Eliminar `desing.mdc` |
| UNIFICADO sigue desactualizado | Med | Checklist en PR + grep `features/` |

## Rollback Plan

- `git revert` del PR de docs.
- Restaurar archivos desde `docs/archive/` a `docs/` si hace falta.
- Sin migraciones DB ni cambios de API.

## Dependencies

- Exploración: Engram `sdd/design-system-docs-consolidation/explore`.
- Acceso de escritura a `Cuadrada-Sport` (repo externo) para nota en DESIGN_SPEC — opcional si solo monorepo.

## Success Criteria

- [ ] Un desarrollador encuentra tokens, tema y backlog en ≤3 archivos enlazados desde `DESIGN_SYSTEM.md`.
- [ ] `BACKLOG_MOBILE.md` y `MOBILE_SPRINTS.md` no están en raíz `docs/` activos.
- [ ] `desing.mdc` eliminado.
- [ ] US auditadas (tabla arriba) reflejadas en `BACKLOG_UNIFICADO.md`.
- [ ] `AGENTS.md` menciona `docs/DESIGN_SYSTEM.md` y `BACKLOG_UNIFICADO.md` como SSOT docs.

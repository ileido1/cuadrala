# Design system — Cuádrala

Índice único para **tokens visuales**, **tema** y **referencias UX**. No duplicar hex aquí si ya están en código; este documento enlaza las fuentes de verdad.

## Tokens de color (canónicos)

| Token | HEX | Uso |
|-------|-----|-----|
| Primary (padel green) | `#17A34A` | CTA, FAB, links activos |
| Secondary (navy) | `#0F172A` | Botones secundarios, texto fuerte |
| Tertiary / accent (lime) | `#C5FF00` | Chips, highlights (no CTA grande) |
| Surface | `#FFFFFF` | Fondo cards (light) |
| Surface container | `#F3F4F6` | Fondos muted / inputs filled |
| Outline | `#E5E7EB` | Bordes |

**Implementación (SSOT):**

| Plataforma | Archivos |
|------------|----------|
| Mobile (Flutter) | `apps/mobile/lib/src/core/theme/brand_colors.dart`, `app_theme.dart`, `brand_gradients.dart` |
| Web (staff) | `apps/web/tailwind.config.ts`, `apps/web/src/app/globals.css` |

Regla: los widgets **no** importan `brand_colors.dart` directamente; usan `Theme.of(context).colorScheme` (ver comentario en `brand_colors.dart`).

## Radios y espaciado

| Token | Valor | Dónde |
|-------|-------|-------|
| Radio medio | `12px` | Botones, inputs (`AppTheme`) |
| Radio grande | `18px` | Cards |
| Grid | 8pt (múltiplos de 4/8) | Convención Flutter + regla Cursor |

## Patrones UX (Flutter)

- Regla para agentes: `.cursor/rules/flutter-ui-design-system-cuadrala.mdc`
- Widgets compartidos: `apps/mobile/lib/src/shared/widgets/` (`AppCard`, `PrimaryButton`, `AppHeader`, `StatusChip`, …)
- Logo: `assets/images/logo.png`

## Mockups y copy (referencia visual)

Repo externo **Cuadrada-Sport** (no está en este monorepo):

| Documento | Ruta |
|-----------|------|
| Spec producto + UI + flujos | `artifacts/mockup-sandbox/src/components/mockups/cuadrala/DESIGN_SPEC.md` |
| Inventario de pantallas | `.../cuadrala/SCREENS.md` |
| Componentes React sandbox | `.../cuadrala/*.tsx` |

> Los mockups TSX pueden usar `#1FA34A` (legacy). El **primary canónico en producción** es `#17A34A` (mobile + web).

## Backlog y producto

| Tema | Documento |
|------|-----------|
| Sprints y US (mobile, API, web) | `docs/BACKLOG_UNIFICADO.md` |
| Visión Fase 1 | `docs/SDD.md` |
| Histórico mobile (obsoleto) | `docs/archive/BACKLOG_MOBILE.md` |

## Tipografía

| Plataforma | Fuente | Implementación |
|------------|--------|----------------|
| Mockups | Plus Jakarta Sans | `DESIGN_SPEC.md` (Cuadrada-Sport) |
| Web | DM Sans + Outfit | `apps/web/tailwind.config.ts` |
| Mobile | Plus Jakarta Sans | `google_fonts` en `AppTheme._textTheme()` (`app_theme.dart`) |

Mobile alinea tipografía con mockups; web mantiene stack propio hasta un change de unificación cross-platform.

## No hacer

- No añadir colores fuera de la paleta sin actualizar `brand_colors.dart` y Tailwind.
- No usar `docs/archive/*` para planificar sprints.
- No confundir `DESIGN_SPEC.md` §D (endpoints propuestos) con OpenAPI real (`services/api`).

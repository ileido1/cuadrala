import 'package:flutter/material.dart';

/// Cuádrala brand palette — all named constants.
///
/// Use these constants when wiring [ColorScheme] overrides in [AppTheme].
/// Widgets should prefer `Theme.of(context).colorScheme.*` or
/// `Theme.of(context).extension<BrandGradients>()`.
///
/// **Semantic catalogs** (sport icons, availability slots) may reference
/// constants in this file only — no inline `Color(0x…)` in presentation.
abstract final class BrandColors {
  // ─── Brand primary ────────────────────────────────────────────────────────
  static const padelGreen = Color(0xFF17A34A);
  static const padelGreenDark = Color(0xFF13883E);
  static const navy = Color(0xFF0F172A);
  static const navyMid = Color(0xFF172340);
  static const limeAccent = Color(0xFFC5FF00);

  /// Text on navy/green hero surfaces (always white).
  static const onHero = Color(0xFFFFFFFF);

  // ─── Light scheme overrides ───────────────────────────────────────────────
  /// `--bg` claro — scaffold gris; las cards quedan blancas encima.
  static const lightBg = Color(0xFFF3F4F6);
  static const lightSurface = Color(0xFFFFFFFF);
  static const lightSurfaceContainer = Color(0xFFF3F4F6);

  /// `--line` claro — borde débil (cards, chips, segmented, inputs).
  static const lightOutline = Color(0xFFE5E7EB);

  /// `--line-strong` claro — borde fuerte (OutlineBtn, toggle off, anillo
  /// punteado de avatar vacío).
  static const lightOutlineStrong = Color(0xFFCBD2DC);

  /// `--muted` claro — texto secundario.
  static const lightMuted = Color(0xFF64748B);

  /// `--muted-2` claro — texto terciario/deshabilitado.
  static const lightMuted2 = Color(0xFF94A3B8);

  /// Texto sobre badges lime (categoría). Verde casi negro del prototipo.
  static const onLime = Color(0xFF15301A);

  /// Paleta de avatares (pila de cupos y avatares de cancha). Cicla por índice.
  static const avatarPalette = <Color>[
    padelGreen, // #17A34A
    Color(0xFF3B82F6),
    Color(0xFFF59E0B),
    Color(0xFFEC4899),
    Color(0xFF8B5CF6),
    Color(0xFF06B6D4),
  ];

  // ─── Dark scheme surface ramp (prototipo: bg / bg-2 / surface / surface-2) ──
  /// `--bg` — fondo base de la app (scaffold).
  static const darkSurface = Color(0xFF0B1220);

  /// `--bg-2` — header, bottom nav y sheets (== [navy]).
  static const darkSurfaceLow = navy; // #0F172A

  /// `--surface` — base de cards (match card, venue card, perfil…).
  static const darkSurfaceContainer = Color(0xFF131C2E);

  /// Nivel intermedio interpolado para `surfaceContainerHigh`.
  static const darkSurfaceHigh = Color(0xFF16203A);

  /// `--surface-2` — chips off, date block, stepper, slots (los inputs van
  /// sobre `--surface`, no este rol — confirmado contra `Field` del prototipo).
  static const darkSurface2 = Color(0xFF1B2740);

  /// `--line` oscuro — borde débil (cards, chips, segmented, inputs).
  static const darkOutline = Color(0xFF1F2937);

  /// `--line-strong` oscuro — borde fuerte (OutlineBtn, toggle off, anillo
  /// punteado de avatar vacío). El prototipo lo define como blanco
  /// translúcido (`rgba(255,255,255,.18)`); replicado literal en vez de
  /// aplanarlo a un hex, para que se adapte igual sobre cualquier superficie.
  static const darkOutlineStrong = Color(0x2EFFFFFF);

  /// `--muted` oscuro — texto secundario.
  static const darkMuted = Color(0xFF94A3B8);

  /// `--muted-2` oscuro — texto terciario/deshabilitado.
  static const darkMuted2 = Color(0xFF5C6B85);

  static const darkOnSurface = Color(0xFFE5E7EB);

  // ─── Semantic / fixed colours ─────────────────────────────────────────────
  /// Apple sign-in button background — always near-black per Apple HIG.
  static const appleBlack = Color(0xFF111111);

  /// Warning state — readable on both light and dark backgrounds.
  static const warningAmber = Color(0xFFFB8C00);

  /// Success / good state — readable on both light and dark backgrounds.
  static const successGreen = Color(0xFF8BC34A);

  // ─── Availability time-of-day (onboarding + profile) ─────────────────────
  static const slotMorning = Color(0xFFFFB300);
  static const slotAfternoon = warningAmber;
  static const slotEvening = Color(0xFF5C6BC0);

  // ─── Sport icon accents (onboarding sport picker) ─────────────────────────
  static const sportPadel = Color(0xFF2E7D32);
  static const sportTennis = Color(0xFF607D8B);
  static const sportPickleball = Color(0xFF00897B);
  static const sportFootball5 = Color(0xFF455A64);
  static const sportBasketball3x3 = Color(0xFFE65100);
  static const sportVolleyBeach = Color(0xFFFFB300);
  static const sportFallback = Color(0xFF546E7A);

  static Color sportColorForCode(String code) => switch (code.toUpperCase()) {
        'PADEL' => sportPadel,
        'TENNIS' => sportTennis,
        'PICKLEBALL' => sportPickleball,
        'FOOTBALL5' => sportFootball5,
        'BASKETBALL3X3' => sportBasketball3x3,
        'VOLLEY_BEACH' => sportVolleyBeach,
        _ => sportFallback,
      };
}

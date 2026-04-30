import 'package:flutter/material.dart';

final class AppTheme {
  static ThemeData light() {
    const primary = Color(0xFF1DB954);
    final scheme = ColorScheme.fromSeed(seedColor: primary);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
    );
  }
}

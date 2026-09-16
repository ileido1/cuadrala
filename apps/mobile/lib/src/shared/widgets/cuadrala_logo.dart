import 'package:flutter/material.dart';

/// Canonical Cuádrala brand mark used by auth, startup and installed apps.
class CuadralaLogo extends StatelessWidget {
  const CuadralaLogo({super.key, this.size = 56, this.borderRadius = 16});

  final double size;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Image.asset(
        'assets/images/logo.png',
        width: size,
        height: size,
        fit: BoxFit.cover,
      ),
    );
  }
}

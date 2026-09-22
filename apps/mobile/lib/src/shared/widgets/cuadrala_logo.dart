import 'package:flutter/material.dart';

/// Canonical Cuádrala brand mark used by auth, startup and installed apps.
class CuadralaLogo extends StatelessWidget {
  const CuadralaLogo({super.key, this.size = 56, this.borderRadius = 16});

  final double size;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final asset = Theme.of(context).brightness == Brightness.dark
        ? 'assets/brand/logo-auth-dark.png'
        : 'assets/brand/logo-auth.png';

    return Semantics(
      image: true,
      label: 'Cuádrala',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: ExcludeSemantics(
          child: Image.asset(
            asset,
            width: size,
            height: size,
            fit: BoxFit.contain,
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Ambient background with two soft orange glows — matches the web hero.
class GlowBackground extends StatelessWidget {
  const GlowBackground({
    super.key,
    required this.child,
    this.height,
    this.intensity = 1.0,
  });

  final Widget child;
  final double? height;
  final double intensity;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        // Top-left orange glow
        Positioned(
          top: -140,
          left: -80,
          child: IgnorePointer(
            child: Container(
              width: 320,
              height: 320,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppTheme.brand.withValues(alpha: (isDark ? 0.28 : 0.22) * intensity),
                    AppTheme.brand.withValues(alpha: 0),
                  ],
                ),
              ),
            ),
          ),
        ),
        // Bottom-right amber glow
        Positioned(
          bottom: -120,
          right: -80,
          child: IgnorePointer(
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFFF59E0B).withValues(alpha: (isDark ? 0.18 : 0.15) * intensity),
                    const Color(0xFFF59E0B).withValues(alpha: 0),
                  ],
                ),
              ),
            ),
          ),
        ),
        child,
      ],
    );
  }
}

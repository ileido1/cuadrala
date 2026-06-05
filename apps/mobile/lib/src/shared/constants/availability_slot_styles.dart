import 'package:flutter/material.dart';

import '../../core/theme/brand_colors.dart';
import '../../features/onboarding/data/models/user_availability_dto.dart';

/// Shared labels/icons/colors for [AvailabilitySlot] (onboarding + profile).
final class AvailabilitySlotStyle {
  const AvailabilitySlotStyle({
    required this.title,
    required this.range,
    required this.icon,
    required this.color,
  });

  final String title;
  final String range;
  final IconData icon;
  final Color color;
}

const availabilitySlotStyles = <AvailabilitySlot, AvailabilitySlotStyle>{
  AvailabilitySlot.morning: AvailabilitySlotStyle(
    title: 'Mañana',
    range: '06:00 – 12:00',
    icon: Icons.wb_sunny_outlined,
    color: BrandColors.slotMorning,
  ),
  AvailabilitySlot.afternoon: AvailabilitySlotStyle(
    title: 'Tarde',
    range: '12:00 – 18:00',
    icon: Icons.wb_twilight,
    color: BrandColors.slotAfternoon,
  ),
  AvailabilitySlot.evening: AvailabilitySlotStyle(
    title: 'Noche',
    range: '18:00 – 22:00',
    icon: Icons.nightlight_outlined,
    color: BrandColors.slotEvening,
  ),
};

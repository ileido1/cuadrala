enum DayOfWeek { monday, tuesday, wednesday, thursday, friday, saturday, sunday }
enum AvailabilitySlot { morning, afternoon, evening }

String dayOfWeekToWire(DayOfWeek d) => d.name.toUpperCase();
String availabilitySlotToWire(AvailabilitySlot s) => s.name.toUpperCase();

DayOfWeek dayOfWeekFromWire(String raw) {
  return DayOfWeek.values.firstWhere(
    (d) => d.name.toUpperCase() == raw,
    orElse: () => DayOfWeek.monday,
  );
}

AvailabilitySlot availabilitySlotFromWire(String raw) {
  return AvailabilitySlot.values.firstWhere(
    (s) => s.name.toUpperCase() == raw,
    orElse: () => AvailabilitySlot.morning,
  );
}

final class UserAvailabilityDto {
  const UserAvailabilityDto({required this.dayOfWeek, required this.slot});

  final DayOfWeek dayOfWeek;
  final AvailabilitySlot slot;

  static UserAvailabilityDto fromJson(Map<String, Object?> json) {
    return UserAvailabilityDto(
      dayOfWeek: dayOfWeekFromWire(json['dayOfWeek'] as String),
      slot: availabilitySlotFromWire(json['slot'] as String),
    );
  }

  Map<String, Object?> toWireJson() => {
        'dayOfWeek': dayOfWeekToWire(dayOfWeek),
        'slot': availabilitySlotToWire(slot),
      };
}

/// Medio de pago activo de sede (solo lectura jugador).
final class VenuePaymentMethodDto {
  const VenuePaymentMethodDto({
    required this.id,
    required this.venueId,
    required this.type,
    required this.name,
    required this.settlementCurrency,
    this.config,
  });

  final String id;
  final String venueId;
  final String type;
  final String name;
  final String settlementCurrency;
  final Map<String, Object?>? config;

  static VenuePaymentMethodDto fromJson(Map<String, Object?> json) {
    final configRaw = json['config'];
    return VenuePaymentMethodDto(
      id: json['id'] as String,
      venueId: json['venueId'] as String,
      type: json['type'] as String,
      name: json['name'] as String,
      settlementCurrency: (json['settlementCurrency'] as String?) ?? 'BS',
      config: configRaw is Map<String, Object?> ? configRaw : null,
    );
  }

  String get displayLabel {
    switch (type) {
      case 'BANK_TRANSFER':
        return 'Transferencia bancaria';
      case 'PAGO_MOVIL':
        return 'Pago móvil';
      case 'CASH':
        return 'Efectivo';
      case 'POS':
        return 'POS';
      default:
        return name;
    }
  }

  List<({String label, String value})> get detailRows {
    final rows = <({String label, String value})>[];
    final cfg = config;
    if (cfg == null) return rows;

    void add(String label, Object? value) {
      if (value == null) return;
      final text = value.toString().trim();
      if (text.isEmpty) return;
      rows.add((label: label, value: text));
    }

    switch (type) {
      case 'BANK_TRANSFER':
        add('Banco', cfg['bank']);
        add('Cuenta', cfg['accountNumber']);
        add('Titular', '${cfg['idType'] ?? ''}-${cfg['idNumber'] ?? ''}'.trim());
      case 'PAGO_MOVIL':
        add('Banco', cfg['bank']);
        add('Teléfono', cfg['phoneNumber']);
        add('Cédula', '${cfg['idType'] ?? ''}-${cfg['idNumber'] ?? ''}'.trim());
      case 'POS':
      case 'OTHER':
        add('Referencia', cfg['reference']);
      default:
        break;
    }
    return rows;
  }
}

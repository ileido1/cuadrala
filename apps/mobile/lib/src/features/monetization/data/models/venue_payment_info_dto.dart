final class VenuePaymentInfoDto {
  const VenuePaymentInfoDto({
    required this.id,
    required this.name,
    this.paymentHolder,
    this.paymentBank,
    this.paymentCvu,
    this.paymentAlias,
    this.paymentNotes,
  });

  final String id;
  final String name;
  final String? paymentHolder;
  final String? paymentBank;
  final String? paymentCvu;
  final String? paymentAlias;
  final String? paymentNotes;

  static VenuePaymentInfoDto fromJson(Map<String, Object?> json) {
    return VenuePaymentInfoDto(
      id: json['id'] as String,
      name: json['name'] as String,
      paymentHolder: json['paymentHolder'] as String?,
      paymentBank: json['paymentBank'] as String?,
      paymentCvu: json['paymentCvu'] as String?,
      paymentAlias: json['paymentAlias'] as String?,
      paymentNotes: json['paymentNotes'] as String?,
    );
  }
}

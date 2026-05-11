final class MatchPaymentInfoDto {
  const MatchPaymentInfoDto({
    this.paymentHolder,
    this.paymentBank,
    this.paymentCvu,
    this.paymentAlias,
    this.paymentNotes,
  });

  final String? paymentHolder;
  final String? paymentBank;
  final String? paymentCvu;
  final String? paymentAlias;
  final String? paymentNotes;

  static MatchPaymentInfoDto fromJson(Map<String, Object?> json) {
    return MatchPaymentInfoDto(
      paymentHolder: json['paymentHolder'] as String?,
      paymentBank: json['paymentBank'] as String?,
      paymentCvu: json['paymentCvu'] as String?,
      paymentAlias: json['paymentAlias'] as String?,
      paymentNotes: json['paymentNotes'] as String?,
    );
  }
}

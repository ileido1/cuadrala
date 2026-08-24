final class TournamentRegistrationDto {
  const TournamentRegistrationDto({
    required this.id,
    required this.tournamentId,
    this.userId,
    this.userName,
    required this.status,
    required this.createdAt,
    this.registrationType = 'AUTHENTICATED',
    this.guestName,
    this.guestPhone,
    this.guestEmail,
    this.registeredByUserId,
  });

  final String id;
  final String tournamentId;

  /// Owner of an AUTHENTICATED registration. `null` for GUEST registrations
  /// (Slice 1: tournament-guest-registration — guests have no `User` row).
  final String? userId;

  /// Display name of the authenticated user (null for GUEST).
  final String? userName;

  final String status;
  final DateTime createdAt;

  /// `AUTHENTICATED` or `GUEST`. Defaults to `AUTHENTICATED` for
  /// backward-compat when the field is absent from an older response.
  final String registrationType;

  /// Guest identity fields — set only when [registrationType] is `GUEST`.
  final String? guestName;
  final String? guestPhone;
  final String? guestEmail;

  /// Id of the organizer (or venue staff) who added this guest.
  final String? registeredByUserId;

  bool get isGuest => registrationType == 'GUEST';

  /// Display label for UI lists: user name for AUTHENTICATED, guest name for
  /// GUEST, or userId as last resort.
  String get displayName => userName ?? guestName ?? userId ?? '?';

  static TournamentRegistrationDto fromJson(Map<String, Object?> json) {
    return TournamentRegistrationDto(
      id: json['id'] as String,
      tournamentId: json['tournamentId'] as String,
      userId: json['userId'] as String?,
      userName: json['userName'] as String?,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      registrationType: json['registrationType'] as String? ?? 'AUTHENTICATED',
      guestName: json['guestName'] as String?,
      guestPhone: json['guestPhone'] as String?,
      guestEmail: json['guestEmail'] as String?,
      registeredByUserId: json['registeredByUserId'] as String?,
    );
  }
}

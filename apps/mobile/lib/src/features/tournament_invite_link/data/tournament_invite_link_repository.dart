import '../../../core/failures/app_failure.dart';
import '../../../core/network/api_json.dart';
import 'models/tournament_invite_link_dto.dart';
import 'tournament_invite_link_api.dart';

/// Maps the `tournament-invite-link` envelope shapes into DTOs and lets
/// backend `AppFailure`s (e.g. `ENLACE_INVALIDO`, `ENLACE_REVOCADO`,
/// `ENLACE_AGOTADO`, `NO_AUTORIZADO`, `TORNEO_CERRADO`, `CUPOS_AGOTADOS`)
/// propagate unchanged — `AppFailureMapper` already resolves them from the
/// backend's `code` field, so there is nothing to re-translate here.
class TournamentInviteLinkRepository {
  TournamentInviteLinkRepository({
    required TournamentInviteLinkApi tournamentInviteLinkApi,
  }) : _api = tournamentInviteLinkApi;

  final TournamentInviteLinkApi _api;

  /// Organizer action: generate a new link (REQ-TIL-001). The returned DTO
  /// carries the raw `token` exactly once.
  Future<TournamentInviteLinkDto> generate({
    required String tournamentId,
    DateTime? expiresAt,
    int? maxUses,
  }) async {
    final data = await _api.createEnvelope(
      tournamentId: tournamentId,
      expiresAt: expiresAt,
      maxUses: maxUses,
    );
    return TournamentInviteLinkDto.fromJson(decodeEnvelopeDataMap(data));
  }

  /// Organizer action: list the tournament's links with their registrants
  /// (REQ-TIL-006).
  Future<List<TournamentInviteLinkDto>> list({
    required String tournamentId,
  }) async {
    final data = await _api.listEnvelope(tournamentId: tournamentId);
    final raw = data['data'];
    if (raw is! List) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }
    return raw
        .whereType<Map>()
        .map((e) => Map<String, Object?>.from(e))
        .map(TournamentInviteLinkDto.fromJson)
        .toList();
  }

  /// Organizer action: revoke a link (REQ-TIL-005). Idempotent server-side.
  Future<void> revoke({
    required String tournamentId,
    required String linkId,
  }) {
    return _api.revoke(tournamentId: tournamentId, linkId: linkId);
  }

  /// Public action: preview the tournament a link resolves to, before
  /// registering (REQ-TIL-012).
  Future<TournamentInviteLinkPreviewDto> preview({required String token}) async {
    final data = await _api.previewEnvelope(token: token);
    return TournamentInviteLinkPreviewDto.fromJson(decodeEnvelopeDataMap(data));
  }

  /// Public action: register via the link (REQ-TIL-007/008). `name`/`phone`/
  /// `email` MUST be omitted for an authenticated caller — the backend reads
  /// the actor from the session instead.
  Future<TournamentInviteLinkRegistrationResultDto> register({
    required String token,
    String? name,
    String? phone,
    String? email,
  }) async {
    final data = await _api.registerEnvelope(
      token: token,
      name: name,
      phone: phone,
      email: email,
    );
    return TournamentInviteLinkRegistrationResultDto.fromJson(
      decodeEnvelopeDataMap(data),
    );
  }
}

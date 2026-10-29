import '../../../core/network/api_client.dart';

/// HTTP contract for `tournament-invite-link` (REQ-TIL-001..012). Returns the
/// raw envelope (`{success, message, data}`) for every call that has a
/// payload — [TournamentInviteLinkRepository] owns unwrapping `data` and
/// mapping it into DTOs, same split of responsibilities as `TournamentsApi`
/// / `TournamentsRepository`.
abstract interface class TournamentInviteLinkApi {
  /// `POST /tournaments/:tournamentId/invite-links` (REQ-TIL-001).
  Future<Map<String, Object?>> createEnvelope({
    required String tournamentId,
    DateTime? expiresAt,
    int? maxUses,
  });

  /// `GET /tournaments/:tournamentId/invite-links` (REQ-TIL-006).
  Future<Map<String, Object?>> listEnvelope({required String tournamentId});

  /// `DELETE /tournaments/:tournamentId/invite-links/:linkId` (REQ-TIL-005).
  Future<void> revoke({required String tournamentId, required String linkId});

  /// `GET /public/tournament-invite-links/:token` (REQ-TIL-012).
  Future<Map<String, Object?>> previewEnvelope({required String token});

  /// `POST /public/tournament-invite-links/:token/register`
  /// (REQ-TIL-007/008). `name`/`phone`/`email` MUST be omitted when the
  /// caller is authenticated — `ApiClient`'s interceptor attaches the
  /// session's `Authorization` header automatically, and the backend reads
  /// the actor from it instead of the body.
  Future<Map<String, Object?>> registerEnvelope({
    required String token,
    String? name,
    String? phone,
    String? email,
  });
}

final class DioTournamentInviteLinkApi implements TournamentInviteLinkApi {
  DioTournamentInviteLinkApi({required ApiClient apiClient})
    : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> createEnvelope({
    required String tournamentId,
    DateTime? expiresAt,
    int? maxUses,
  }) {
    return _apiClient.postJson(
      '/api/v1/tournaments/$tournamentId/invite-links',
      body: {
        'expiresAt': ?expiresAt?.toIso8601String(),
        'maxUses': ?maxUses,
      },
    );
  }

  @override
  Future<Map<String, Object?>> listEnvelope({required String tournamentId}) {
    return _apiClient.getJson(
      '/api/v1/tournaments/$tournamentId/invite-links',
    );
  }

  @override
  Future<void> revoke({
    required String tournamentId,
    required String linkId,
  }) async {
    await _apiClient.deleteNoContent(
      '/api/v1/tournaments/$tournamentId/invite-links/$linkId',
    );
  }

  @override
  Future<Map<String, Object?>> previewEnvelope({required String token}) {
    return _apiClient.getJson('/api/v1/public/tournament-invite-links/$token');
  }

  @override
  Future<Map<String, Object?>> registerEnvelope({
    required String token,
    String? name,
    String? phone,
    String? email,
  }) {
    return _apiClient.postJson(
      '/api/v1/public/tournament-invite-links/$token/register',
      body: {'name': ?name, 'phone': ?phone, 'email': ?email},
    );
  }
}

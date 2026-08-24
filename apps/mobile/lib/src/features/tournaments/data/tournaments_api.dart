import 'package:equatable/equatable.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_json.dart';

/// Filters for the tournament list endpoint.
final class TournamentListFilters extends Equatable {
  const TournamentListFilters({
    this.venueId,
    this.startsAtFrom,
    this.startsAtTo,
    this.status,
    this.sportId,
    this.categoryId,
  });

  final String? venueId;
  final DateTime? startsAtFrom;
  final DateTime? startsAtTo;
  final String? status;
  final String? sportId;
  final String? categoryId;

  @override
  List<Object?> get props =>
      [venueId, startsAtFrom, startsAtTo, status, sportId, categoryId];
}

abstract interface class TournamentsApi {
  Future<Map<String, Object?>> listTournamentsEnvelope({
    required int page,
    required int limit,
    TournamentListFilters? filters,
  });

  Future<Map<String, Object?>> listTournamentFormatPresetsEnvelope({
    required String sportId,
  });

  Future<Map<String, Object?>> createTournamentEnvelope({
    required Map<String, Object?> body,
  });

  Future<Map<String, Object?>> getTournamentScheduleEnvelope({
    required String tournamentId,
  });

  Future<Map<String, Object?>> generateTournamentScheduleEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  });

  Future<Map<String, Object?>> getTournamentScoreboardEnvelope({
    required String tournamentId,
  });

  Future<Map<String, Object?>> listRegistrationsEnvelope({
    required String tournamentId,
  });

  Future<Map<String, Object?>> createRegistrationEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  });

  Future<void> withdrawRegistration({
    required String tournamentId,
    required String userId,
  });

  Future<Map<String, Object?>> updateTournamentStatusEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  });

  Future<Map<String, Object?>> updateTournamentVisibilityEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  });

  Future<Map<String, Object?>> listTournamentInvitationsEnvelope({
    required String tournamentId,
  });

  Future<Map<String, Object?>> createTournamentInvitationEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  });

  Future<Map<String, Object?>> respondTournamentInvitationEnvelope({
    required String tournamentId,
    required String invitationId,
    required Map<String, Object?> body,
  });

  Future<void> cancelTournamentInvitation({
    required String tournamentId,
    required String invitationId,
  });

  /// Slice 1 (tournament-guest-registration): organizer adds a player
  /// without a `User` account.
  Future<Map<String, Object?>> inviteGuestTournamentParticipantEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  });

  /// Organizer confirms (or otherwise updates the status of) a registration
  /// — currently used to transition a guest PENDING -> CONFIRMED.
  Future<Map<String, Object?>> updateTournamentRegistrationStatusEnvelope({
    required String tournamentId,
    required String registrationId,
    required Map<String, Object?> body,
  });

  Future<void> deleteTournamentRegistration({
    required String tournamentId,
    required String registrationId,
  });
}

final class DioTournamentsApi implements TournamentsApi {
  DioTournamentsApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> listTournamentsEnvelope({
    required int page,
    required int limit,
    TournamentListFilters? filters,
  }) {
    final params = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };
    if (filters != null) {
      if (filters.venueId != null) params['venueId'] = filters.venueId!;
      if (filters.startsAtFrom != null) {
        params['startsAtFrom'] = filters.startsAtFrom!.toIso8601String();
      }
      if (filters.startsAtTo != null) {
        params['startsAtTo'] = filters.startsAtTo!.toIso8601String();
      }
      if (filters.status != null) params['status'] = filters.status!;
      if (filters.sportId != null) params['sportId'] = filters.sportId!;
      if (filters.categoryId != null) params['categoryId'] = filters.categoryId!;
    }
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/tournaments',
      queryParameters: params,
    );
  }

  @override
  Future<Map<String, Object?>> listTournamentFormatPresetsEnvelope({
    required String sportId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/sports/$sportId/tournament-format-presets',
    );
  }

  @override
  Future<Map<String, Object?>> createTournamentEnvelope({
    required Map<String, Object?> body,
  }) async {
    final json = await _apiClient.postJson('/api/v1/tournaments', body: body);
    return decodeEnvelopeDataMap(json);
  }

  @override
  Future<Map<String, Object?>> getTournamentScheduleEnvelope({
    required String tournamentId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/tournaments/$tournamentId/schedule',
    );
  }

  @override
  Future<Map<String, Object?>> generateTournamentScheduleEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  }) async {
    final json = await _apiClient.postJson(
      '/api/v1/tournaments/$tournamentId/schedule:generate',
      body: body,
    );
    return decodeEnvelopeDataMap(json);
  }

  @override
  Future<Map<String, Object?>> getTournamentScoreboardEnvelope({
    required String tournamentId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/tournaments/$tournamentId/scoreboard',
    );
  }

  @override
  Future<Map<String, Object?>> listRegistrationsEnvelope({
    required String tournamentId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/tournaments/$tournamentId/registrations',
    );
  }

  @override
  Future<Map<String, Object?>> createRegistrationEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  }) async {
    final json = await _apiClient.postJson(
      '/api/v1/tournaments/$tournamentId/registrations',
      body: body,
    );
    return decodeEnvelopeDataMap(json);
  }

  @override
  Future<void> withdrawRegistration({
    required String tournamentId,
    required String userId,
  }) async {
    await _apiClient.postNoContent(
      '/api/v1/tournaments/$tournamentId/registrations/$userId/withdraw',
    );
  }

  @override
  Future<Map<String, Object?>> updateTournamentStatusEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  }) {
    return _apiClient.patchJson(
      '/api/v1/tournaments/$tournamentId/status',
      body: body,
    );
  }

  @override
  Future<Map<String, Object?>> updateTournamentVisibilityEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  }) {
    return _apiClient.patchJson(
      '/api/v1/tournaments/$tournamentId/visibility',
      body: body,
    );
  }

  @override
  Future<Map<String, Object?>> listTournamentInvitationsEnvelope({
    required String tournamentId,
  }) {
    return _apiClient.getJson('/api/v1/tournaments/$tournamentId/invitations');
  }

  @override
  Future<Map<String, Object?>> createTournamentInvitationEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  }) {
    return _apiClient.postJson(
      '/api/v1/tournaments/$tournamentId/invitations',
      body: body,
    );
  }

  @override
  Future<Map<String, Object?>> respondTournamentInvitationEnvelope({
    required String tournamentId,
    required String invitationId,
    required Map<String, Object?> body,
  }) {
    return _apiClient.postJson(
      '/api/v1/tournaments/$tournamentId/invitations/$invitationId/respond',
      body: body,
    );
  }

  @override
  Future<void> cancelTournamentInvitation({
    required String tournamentId,
    required String invitationId,
  }) async {
    await _apiClient.deleteNoContent(
      '/api/v1/tournaments/$tournamentId/invitations/$invitationId',
    );
  }

  @override
  Future<Map<String, Object?>> inviteGuestTournamentParticipantEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  }) {
    return _apiClient.postJson(
      '/api/v1/tournaments/$tournamentId/invite-guest',
      body: body,
    );
  }

  @override
  Future<Map<String, Object?>> updateTournamentRegistrationStatusEnvelope({
    required String tournamentId,
    required String registrationId,
    required Map<String, Object?> body,
  }) {
    return _apiClient.patchJson(
      '/api/v1/tournaments/$tournamentId/registrations/$registrationId',
      body: body,
    );
  }

  @override
  Future<void> deleteTournamentRegistration({
    required String tournamentId,
    required String registrationId,
  }) async {
    await _apiClient.deleteNoContent(
      '/api/v1/tournaments/$tournamentId/registrations/$registrationId',
    );
  }
}


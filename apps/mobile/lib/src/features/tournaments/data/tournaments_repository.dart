import '../../../core/failures/app_failure.dart';
import '../../../core/network/api_json.dart';
import 'models/create_tournament_request.dart';
import 'models/create_tournament_response.dart';
import 'models/tournament_invitation_dto.dart';
import 'models/tournament_list_item_dto.dart';
import 'models/tournament_list_page.dart';
import 'models/tournament_preset_dto.dart';
import 'models/tournament_registration_dto.dart';
import 'models/tournament_schedule_dto.dart';
import 'models/tournament_scoreboard_dto.dart';
import 'tournaments_api.dart';

class TournamentsRepository {
  TournamentsRepository({required TournamentsApi tournamentsApi})
      : _tournamentsApi = tournamentsApi;

  final TournamentsApi _tournamentsApi;

  /// Detalle del torneo por ID (usado cuando se navega sin `extra`, p. ej.
  /// justo después de crear el torneo).
  Future<TournamentListItemDto> getTournamentById({
    required String tournamentId,
  }) async {
    final data = await _tournamentsApi.getTournamentByIdEnvelope(
      tournamentId: tournamentId,
    );
    return TournamentListItemDto.fromJson(data);
  }

  Future<TournamentListPage> listTournaments({
    required int page,
    required int limit,
    TournamentListFilters? filters,
  }) async {
    final data = await _tournamentsApi.listTournamentsEnvelope(
      page: page,
      limit: limit,
      filters: filters,
    );
    return TournamentListPage.fromJson(data);
  }

  Future<List<TournamentPresetDto>> getPresetsBySportId({
    required String sportId,
  }) async {
    final data = await _tournamentsApi.listTournamentFormatPresetsEnvelope(
      sportId: sportId,
    );

    final raw = data['presets'] ?? data['items'];
    final items = raw is List
        ? raw
            .whereType<Map>()
            .map((e) => Map<String, Object?>.from(e))
            .map(TournamentPresetDto.fromJson)
            .toList()
        : <TournamentPresetDto>[];
    return items;
  }

  Future<CreateTournamentResponse> createTournament({
    required Object? request,
  }) async {
    final req = request is CreateTournamentRequest ? request : null;
    if (req == null) {
      throw const AppFailure(
        code: 'INVALID_REQUEST',
        message: 'Solicitud inválida.',
      );
    }

    final data = await _tournamentsApi.createTournamentEnvelope(
      body: req.toJson(),
    );
    return CreateTournamentResponse.fromJson(data);
  }

  Future<TournamentScheduleDto> getTournamentSchedule({
    required String tournamentId,
  }) async {
    try {
      final data = await _tournamentsApi.getTournamentScheduleEnvelope(
        tournamentId: tournamentId,
      );
      return TournamentScheduleDto.fromJson(data);
    } on AppFailure catch (e) {
      //? 404 = aún no hay calendario → estado vacío. El backend responde con
      //? códigos propios (`SCHEDULE_NO_ENCONTRADO`, `TORNEO_NO_ENCONTRADO`),
      //? no `HTTP_404`, así que hay que contemplarlos todos.
      if (e.code == 'HTTP_404' ||
          e.code == 'SCHEDULE_NO_ENCONTRADO' ||
          e.code == 'TORNEO_NO_ENCONTRADO') {
        return TournamentScheduleDto.empty();
      }
      rethrow;
    }
  }

  Future<TournamentScheduleDto> generateTournamentSchedule({
    required String tournamentId,
    bool? doubleRound,
    bool? thirdPlaceMatch,
  }) async {
    try {
      final body = <String, Object?>{
        if (doubleRound != null) 'doubleRound': doubleRound,
        if (thirdPlaceMatch != null) 'thirdPlaceMatch': thirdPlaceMatch,
      };
      final data = await _tournamentsApi.generateTournamentScheduleEnvelope(
        tournamentId: tournamentId,
        body: body,
      );
      return TournamentScheduleDto.fromJson(data);
    } on AppFailure catch (e) {
      if (e.code == 'HTTP_501') {
        throw AppFailure(
          code: 'SCHEDULE_UNSUPPORTED',
          message: e.message,
          details: e.details,
        );
      }
      if (e.code == 'HTTP_409') {
        throw AppFailure(
          code: 'SCHEDULE_CONFLICT',
          message: e.message,
          details: e.details,
        );
      }
      rethrow;
    }
  }

  Future<TournamentScoreboardDto> getTournamentScoreboard({
    required String tournamentId,
  }) async {
    final data = await _tournamentsApi.getTournamentScoreboardEnvelope(
      tournamentId: tournamentId,
    );
    return TournamentScoreboardDto.fromJson(data);
  }

  Future<List<TournamentRegistrationDto>> listRegistrations({
    required String tournamentId,
  }) async {
    final data = await _tournamentsApi.listRegistrationsEnvelope(
      tournamentId: tournamentId,
    );
    final rawItems = data['items'];
    if (rawItems is! List) {
      throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
    }
    return rawItems
        .whereType<Map<String, Object?>>()
        .map(TournamentRegistrationDto.fromJson)
        .toList();
  }

  Future<TournamentRegistrationDto> registerParticipant({
    required String tournamentId,
    required String userId,
  }) async {
    final data = await _tournamentsApi.createRegistrationEnvelope(
      tournamentId: tournamentId,
      body: {'userId': userId},
    );
    return TournamentRegistrationDto.fromJson(data);
  }

  Future<void> withdrawRegistration({
    required String tournamentId,
    required String userId,
  }) async {
    await _tournamentsApi.withdrawRegistration(
      tournamentId: tournamentId,
      userId: userId,
    );
  }

  Future<void> updateTournamentStatus({
    required String tournamentId,
    required String status,
  }) async {
    await _tournamentsApi.updateTournamentStatusEnvelope(
      tournamentId: tournamentId,
      body: {'status': status},
    );
  }

  Future<void> updateTournamentVisibility({
    required String tournamentId,
    required String visibility,
  }) async {
    await _tournamentsApi.updateTournamentVisibilityEnvelope(
      tournamentId: tournamentId,
      body: {'visibility': visibility},
    );
  }

  Future<List<TournamentInvitationDto>> listInvitations({
    required String tournamentId,
  }) async {
    final data = await _tournamentsApi.listTournamentInvitationsEnvelope(
      tournamentId: tournamentId,
    );
    //? La respuesta viene como envelope {success, message, data: [...]}
    final rawItems = data['data'] ?? data['items'];
    if (rawItems is! List) {
      throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
    }
    return rawItems
        .whereType<Map<String, Object?>>()
        .map(TournamentInvitationDto.fromJson)
        .toList();
  }

  Future<TournamentInvitationDto> inviteParticipant({
    required String tournamentId,
    required String userId,
  }) async {
    final data = await _tournamentsApi.createTournamentInvitationEnvelope(
      tournamentId: tournamentId,
      body: {'userId': userId},
    );
    return TournamentInvitationDto.fromJson(decodeEnvelopeDataMap(data));
  }

  Future<TournamentInvitationDto> respondToInvitation({
    required String tournamentId,
    required String invitationId,
    required bool accept,
  }) async {
    final data = await _tournamentsApi.respondTournamentInvitationEnvelope(
      tournamentId: tournamentId,
      invitationId: invitationId,
      body: {'action': accept ? 'ACCEPT' : 'REJECT'},
    );
    return TournamentInvitationDto.fromJson(decodeEnvelopeDataMap(data));
  }

  Future<void> cancelInvitation({
    required String tournamentId,
    required String invitationId,
  }) async {
    await _tournamentsApi.cancelTournamentInvitation(
      tournamentId: tournamentId,
      invitationId: invitationId,
    );
  }

  /// Organizer action: add a player without a `User` account (Slice 1:
  /// tournament-guest-registration). Creates a GUEST registration in
  /// `PENDING` status.
  Future<TournamentRegistrationDto> inviteGuestToTournament({
    required String tournamentId,
    required String name,
    String? phone,
    String? email,
  }) async {
    final data = await _tournamentsApi.inviteGuestTournamentParticipantEnvelope(
      tournamentId: tournamentId,
      body: {
        'name': name,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
      },
    );
    return TournamentRegistrationDto.fromJson(decodeEnvelopeDataMap(data));
  }

  /// Organizer action: confirm a PENDING registration (currently used for
  /// guest registrations — authenticated players self-confirm via
  /// [respondToInvitation]).
  Future<TournamentRegistrationDto> confirmRegistration({
    required String tournamentId,
    required String registrationId,
  }) async {
    final data = await _tournamentsApi.updateTournamentRegistrationStatusEnvelope(
      tournamentId: tournamentId,
      registrationId: registrationId,
      body: {'status': 'CONFIRMED'},
    );
    return TournamentRegistrationDto.fromJson(decodeEnvelopeDataMap(data));
  }

  /// Organizer action: remove a guest registration. Rejected by the backend
  /// with `TORNEO_CERRADO` once the tournament is IN_PROGRESS or later.
  Future<void> removeRegistration({
    required String tournamentId,
    required String registrationId,
  }) async {
    await _tournamentsApi.deleteTournamentRegistration(
      tournamentId: tournamentId,
      registrationId: registrationId,
    );
  }
}


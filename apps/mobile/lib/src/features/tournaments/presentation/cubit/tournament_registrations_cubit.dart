import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../features/profile/data/profile_repository.dart';
import '../../data/models/tournament_invitation_dto.dart';
import '../../data/tournaments_repository.dart';
import 'tournament_registrations_state.dart';

// Not `final`: widget tests mock this cubit via `MockCubit implements
// TournamentRegistrationsCubit` (see tournament_detail_screen_test.dart).
class TournamentRegistrationsCubit extends Cubit<TournamentRegistrationsState> {
  TournamentRegistrationsCubit({
    required TournamentsRepository tournamentsRepository,
    required ProfileRepository profileRepository,
    required String tournamentId,
  })  : _repo = tournamentsRepository,
        _profileRepository = profileRepository,
        _tournamentId = tournamentId,
        super(const TournamentRegistrationsInitial());

  final TournamentsRepository _repo;
  final ProfileRepository _profileRepository;
  final String _tournamentId;
  String? _currentUserId;

  /// Id of the authenticated user, once resolved by [load]. Used by the UI
  /// to gate organizer-only controls and to find "my" pending invitation.
  String? get currentUserId => _currentUserId;

  bool get isCurrentUserRegistered =>
      _currentUserId != null && state is TournamentRegistrationsLoaded
          ? (state as TournamentRegistrationsLoaded).isUserRegistered(_currentUserId!)
          : false;

  /// Fetches the invitation list. Only the organizer (or venue staff) is
  /// allowed to list a tournament's invitations (`GET .../invitations` is
  /// organizer-gated server-side) — a non-organizer actor gets a 403, which
  /// is treated here as "no manageable invitations" rather than a hard
  /// failure, so the registrations tab still loads for everyone.
  Future<({List<TournamentInvitationDto> invitations, bool canManage})>
      _loadInvitationsSV() async {
    try {
      final invitations = await _repo.listInvitations(tournamentId: _tournamentId);
      return (invitations: invitations, canManage: true);
    } on AppFailure catch (e) {
      if (e.code == 'NO_AUTORIZADO' || e.code == 'HTTP_403') {
        return (invitations: const <TournamentInvitationDto>[], canManage: false);
      }
      rethrow;
    }
  }

  Future<void> load() async {
    emit(const TournamentRegistrationsLoading());
    try {
      final me = await _profileRepository.getMe();
      _currentUserId = me.id;
      final items = await _repo.listRegistrations(tournamentId: _tournamentId);
      final invitationsResult = await _loadInvitationsSV();
      emit(TournamentRegistrationsLoaded(
        items: items,
        total: items.length,
        invitations: invitationsResult.invitations,
        canManageInvitations: invitationsResult.canManage,
      ));
    } on AppFailure catch (e) {
      emit(TournamentRegistrationsFailure(message: e.message));
    } catch (_) {
      emit(const TournamentRegistrationsFailure(message: 'No se pudieron cargar las inscripciones.'));
    }
  }

  Future<void> _refreshInvitationsSV(TournamentRegistrationsLoaded current) async {
    final invitationsResult = await _loadInvitationsSV();
    emit(current.copyWith(
      invitations: invitationsResult.invitations,
      canManageInvitations: invitationsResult.canManage,
    ));
  }

  Future<void> register() async {
    final currentUserId = _currentUserId;
    if (currentUserId == null) return;
    final current = state;
    if (current is! TournamentRegistrationsLoaded) return;
    if (current.registering) return;

    emit(current.copyWith(registering: true, clearRegisterError: true));

    try {
      await _repo.registerParticipant(tournamentId: _tournamentId, userId: currentUserId);
      final refreshed = await _repo.listRegistrations(tournamentId: _tournamentId);
      emit(current.copyWith(items: refreshed, total: refreshed.length, registering: false));
    } on AppFailure catch (e) {
      emit(current.copyWith(registering: false, registerError: e.message));
    } catch (e) {
      //? Diag: la causa real queda en la consola del navegador (caché del
      //? service worker, shape de respuesta, etc.).
      debugPrint('registerParticipant falló: $e');
      emit(current.copyWith(
        registering: false,
        registerError: 'No se pudo completar la inscripción.',
      ));
    }
  }

  Future<void> withdraw() async {
    final currentUserId = _currentUserId;
    if (currentUserId == null) return;
    final current = state;
    if (current is! TournamentRegistrationsLoaded) return;
    if (current.registering) return;

    emit(current.copyWith(registering: true, clearRegisterError: true));

    try {
      await _repo.withdrawRegistration(tournamentId: _tournamentId, userId: currentUserId);
      final refreshed = await _repo.listRegistrations(tournamentId: _tournamentId);
      emit(current.copyWith(items: refreshed, total: refreshed.length, registering: false));
    } on AppFailure catch (e) {
      emit(current.copyWith(registering: false, registerError: e.message));
    } catch (_) {
      emit(current.copyWith(
        registering: false,
        registerError: 'No se pudo cancelar la inscripción.',
      ));
    }
  }

  /// Organizer action: invite a player to the tournament.
  Future<void> invite(String userId) async {
    final current = state;
    if (current is! TournamentRegistrationsLoaded) return;
    if (current.inviting) return;

    emit(current.copyWith(inviting: true, clearInvitationError: true));

    try {
      await _repo.inviteParticipant(tournamentId: _tournamentId, userId: userId);
      await _refreshInvitationsSV(current.copyWith(inviting: false));
    } on AppFailure catch (e) {
      emit(current.copyWith(inviting: false, invitationError: e.message));
    } catch (_) {
      emit(current.copyWith(
        inviting: false,
        invitationError: 'No se pudo enviar la invitación.',
      ));
    }
  }

  /// Organizer action: cancel a PENDING invitation.
  Future<void> cancelInvitation(String invitationId) async {
    final current = state;
    if (current is! TournamentRegistrationsLoaded) return;
    if (current.inviting) return;

    emit(current.copyWith(inviting: true, clearInvitationError: true));

    try {
      await _repo.cancelInvitation(tournamentId: _tournamentId, invitationId: invitationId);
      await _refreshInvitationsSV(current.copyWith(inviting: false));
    } on AppFailure catch (e) {
      emit(current.copyWith(inviting: false, invitationError: e.message));
    } catch (_) {
      emit(current.copyWith(
        inviting: false,
        invitationError: 'No se pudo cancelar la invitación.',
      ));
    }
  }

  /// Invitee action: accept a pending invitation addressed to the current user.
  Future<void> acceptInvitation(String invitationId) => _respondSV(invitationId, accept: true);

  /// Invitee action: reject a pending invitation addressed to the current user.
  Future<void> rejectInvitation(String invitationId) => _respondSV(invitationId, accept: false);

  Future<void> _respondSV(String invitationId, {required bool accept}) async {
    final current = state;
    if (current is! TournamentRegistrationsLoaded) return;
    if (current.responding) return;

    emit(current.copyWith(responding: true, clearInvitationError: true));

    try {
      await _repo.respondToInvitation(
        tournamentId: _tournamentId,
        invitationId: invitationId,
        accept: accept,
      );
      final refreshedItems = await _repo.listRegistrations(tournamentId: _tournamentId);
      final invitationsResult = await _loadInvitationsSV();
      emit(current.copyWith(
        items: refreshedItems,
        total: refreshedItems.length,
        invitations: invitationsResult.invitations,
        canManageInvitations: invitationsResult.canManage,
        responding: false,
      ));
    } on AppFailure catch (e) {
      emit(current.copyWith(responding: false, invitationError: e.message));
    } catch (_) {
      emit(current.copyWith(
        responding: false,
        invitationError: 'No se pudo responder la invitación.',
      ));
    }
  }

  /// Organizer action: add a player without a `User` account (Slice 1:
  /// tournament-guest-registration). Creates a GUEST registration in
  /// `PENDING` status and refreshes the roster on success.
  Future<void> inviteGuest({required String name, String? phone, String? email}) async {
    final current = state;
    if (current is! TournamentRegistrationsLoaded) return;
    if (current.invitingGuest) return;

    emit(current.copyWith(invitingGuest: true, clearGuestInviteError: true));

    try {
      await _repo.inviteGuestToTournament(
        tournamentId: _tournamentId,
        name: name,
        phone: phone,
        email: email,
      );
      final refreshed = await _repo.listRegistrations(tournamentId: _tournamentId);
      emit(current.copyWith(items: refreshed, total: refreshed.length, invitingGuest: false));
    } on AppFailure catch (e) {
      emit(current.copyWith(invitingGuest: false, guestInviteError: e.message));
    } catch (_) {
      emit(current.copyWith(
        invitingGuest: false,
        guestInviteError: 'No se pudo invitar al huésped.',
      ));
    }
  }

  /// Organizer action: confirm a PENDING guest registration.
  Future<void> confirmRegistration(String registrationId) async {
    final current = state;
    if (current is! TournamentRegistrationsLoaded) return;
    if (current.busyRegistrationId != null) return;

    emit(current.copyWith(
      busyRegistrationId: registrationId,
      clearRegistrationActionError: true,
    ));

    try {
      await _repo.confirmRegistration(tournamentId: _tournamentId, registrationId: registrationId);
      final refreshed = await _repo.listRegistrations(tournamentId: _tournamentId);
      emit(current.copyWith(
        items: refreshed,
        total: refreshed.length,
        clearBusyRegistrationId: true,
      ));
    } on AppFailure catch (e) {
      emit(current.copyWith(clearBusyRegistrationId: true, registrationActionError: e.message));
    } catch (_) {
      emit(current.copyWith(
        clearBusyRegistrationId: true,
        registrationActionError: 'No se pudo confirmar la inscripción.',
      ));
    }
  }

  /// Organizer action: remove a guest registration (PENDING or CONFIRMED).
  /// Rejected by the backend once the tournament is IN_PROGRESS or later.
  Future<void> removeRegistration(String registrationId) async {
    final current = state;
    if (current is! TournamentRegistrationsLoaded) return;
    if (current.busyRegistrationId != null) return;

    emit(current.copyWith(
      busyRegistrationId: registrationId,
      clearRegistrationActionError: true,
    ));

    try {
      await _repo.removeRegistration(tournamentId: _tournamentId, registrationId: registrationId);
      final refreshed = await _repo.listRegistrations(tournamentId: _tournamentId);
      emit(current.copyWith(
        items: refreshed,
        total: refreshed.length,
        clearBusyRegistrationId: true,
      ));
    } on AppFailure catch (e) {
      emit(current.copyWith(clearBusyRegistrationId: true, registrationActionError: e.message));
    } catch (_) {
      emit(current.copyWith(
        clearBusyRegistrationId: true,
        registrationActionError: 'No se pudo eliminar la inscripción.',
      ));
    }
  }
}

import 'package:equatable/equatable.dart';

sealed class SessionState extends Equatable {
  const SessionState();

  const factory SessionState.loading() = SessionLoading;
  const factory SessionState.authenticated() = SessionAuthenticated;
  const factory SessionState.unauthenticated({String? reason}) =
      SessionUnauthenticated;
}

final class SessionLoading extends SessionState {
  const SessionLoading();

  @override
  List<Object?> get props => [];
}

final class SessionAuthenticated extends SessionState {
  const SessionAuthenticated();

  @override
  List<Object?> get props => [];
}

final class SessionUnauthenticated extends SessionState {
  const SessionUnauthenticated({this.reason});

  final String? reason;

  @override
  List<Object?> get props => [reason];
}

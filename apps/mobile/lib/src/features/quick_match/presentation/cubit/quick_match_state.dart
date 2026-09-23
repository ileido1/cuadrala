import 'package:equatable/equatable.dart';
import '../../data/models/quick_match_search_dto.dart';

sealed class QuickMatchState extends Equatable {
  const QuickMatchState();
  @override
  List<Object?> get props => [];
}

final class QuickMatchInitial extends QuickMatchState {
  const QuickMatchInitial();
}

final class QuickMatchLoading extends QuickMatchState {
  const QuickMatchLoading();
}

final class QuickMatchIdle extends QuickMatchState {
  const QuickMatchIdle();
}

final class QuickMatchActive extends QuickMatchState {
  const QuickMatchActive(this.search);
  final QuickMatchSearchDto search;
  @override
  List<Object?> get props => [search.id, search.status, search.noMatchYet];
}

final class QuickMatchFailure extends QuickMatchState {
  const QuickMatchFailure(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}

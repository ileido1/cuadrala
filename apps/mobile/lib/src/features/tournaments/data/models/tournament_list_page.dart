import 'package:equatable/equatable.dart';
import 'tournament_list_item_dto.dart';

final class TournamentListPage extends Equatable {
  const TournamentListPage({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
  });

  final List<TournamentListItemDto> items;
  final int page;
  final int limit;
  final int total;

  bool get hasReachedEnd => items.length >= total;

  factory TournamentListPage.fromJson(Map<String, Object?> json) {
    final rawItems = json['items'] as List? ?? [];
    return TournamentListPage(
      items: rawItems
          .whereType<Map<String, Object?>>()
          .map((e) => TournamentListItemDto.fromJson(e))
          .toList(),
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  List<Object?> get props => [items, page, limit, total];
}

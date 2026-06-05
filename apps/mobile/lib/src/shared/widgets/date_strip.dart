import 'package:flutter/material.dart';

import '../../core/theme/brand_colors.dart';

/// Etiquetas de día de la semana (índice 0 = domingo), 3 letras en español.
const _dowLabels = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

/// Nombres de mes en español (índice 0 = enero).
const _monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/// Un día de la tira semanal del selector de fecha.
@immutable
class DateStripDay {
  DateStripDay({required DateTime date, required this.offset})
      : date = DateTime(date.year, date.month, date.day);

  /// Fecha normalizada a medianoche local.
  final DateTime date;

  /// Días transcurridos desde hoy (0 = hoy, 1 = mañana, …).
  final int offset;

  /// Clave estable `yyyy-MM-dd` para usar como valor seleccionado.
  String get key =>
      '${date.year.toString().padLeft(4, '0')}-'
      '${date.month.toString().padLeft(2, '0')}-'
      '${date.day.toString().padLeft(2, '0')}';

  bool get isToday => offset == 0;

  /// Etiqueta DOW (3 letras) según el día de la semana.
  String get dowLabel => _dowLabels[date.weekday % 7];

  /// Nombre del mes de este día.
  String get monthName => _monthNames[date.month - 1];

  @override
  bool operator ==(Object other) =>
      other is DateStripDay && other.key == key && other.offset == offset;

  @override
  int get hashCode => Object.hash(key, offset);
}

/// Construye [count] días consecutivos a partir de [from] (por defecto hoy).
List<DateStripDay> buildDateStripDays(int count, {DateTime? from}) {
  final base = from ?? DateTime.now();
  final start = DateTime(base.year, base.month, base.day);
  return List<DateStripDay>.generate(
    count,
    (i) => DateStripDay(date: start.add(Duration(days: i)), offset: i),
    growable: false,
  );
}

/// Tira semanal de selección de fecha (rediseño Cuádrala).
///
/// Cabecera = mes + chip relativo (`Hoy` / `Mañana` / `{Mes} {año}`).
/// Fila horizontal scrollable; el día seleccionado se mantiene visible.
class DateStrip extends StatefulWidget {
  const DateStrip({
    super.key,
    required this.days,
    required this.value,
    required this.onChanged,
    this.horizontalPadding = 20,
  });

  /// Días a mostrar (ver [buildDateStripDays]).
  final List<DateStripDay> days;

  /// [DateStripDay.key] del día seleccionado.
  final String value;

  /// Notifica el [DateStripDay.key] del día tocado.
  final ValueChanged<String> onChanged;

  /// Padding lateral de la cabecera y la fila (0 si el contenedor ya lo aporta).
  final double horizontalPadding;

  @override
  State<DateStrip> createState() => _DateStripState();
}

class _DateStripState extends State<DateStrip> {
  static const double _itemWidth = 46;
  static const double _gap = 8;

  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToSelected());
  }

  @override
  void didUpdateWidget(DateStrip oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) {
      _scrollToSelected();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToSelected() {
    if (!_scrollController.hasClients) return;
    final index = widget.days.indexWhere((d) => d.key == widget.value);
    if (index < 0) return;
    final target = (index * (_itemWidth + _gap) - 120).clamp(
      0.0,
      _scrollController.position.maxScrollExtent,
    );
    _scrollController.animateTo(
      target,
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
    );
  }

  DateStripDay get _selected => widget.days.firstWhere(
        (d) => d.key == widget.value,
        orElse: () => widget.days.first,
      );

  String get _relativeLabel {
    final sel = _selected;
    if (sel.offset == 0) return 'Hoy';
    if (sel.offset == 1) return 'Mañana';
    return '${sel.monthName} ${sel.date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.only(
            bottom: 12,
            left: widget.horizontalPadding,
          ),
          child: Row(
            children: [
              Text(
                _selected.monthName,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: scheme.onSurface,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  _relativeLabel,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: scheme.primary,
                  ),
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 76,
          child: ListView.separated(
            controller: _scrollController,
            scrollDirection: Axis.horizontal,
            padding:
                EdgeInsets.symmetric(horizontal: widget.horizontalPadding),
            itemCount: widget.days.length,
            separatorBuilder: (_, _) => const SizedBox(width: _gap),
            itemBuilder: (context, index) {
              final day = widget.days[index];
              return _DayColumn(
                day: day,
                active: day.key == widget.value,
                onTap: () => widget.onChanged(day.key),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _DayColumn extends StatelessWidget {
  const _DayColumn({
    required this.day,
    required this.active,
    required this.onTap,
  });

  final DateStripDay day;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 46,
        padding: const EdgeInsets.only(top: 8, bottom: 6),
        decoration: BoxDecoration(
          color: active ? scheme.surfaceContainerHighest : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              day.dowLabel,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.4,
                color: active ? scheme.onSurface : scheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 7),
            Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: active ? scheme.primary : Colors.transparent,
                border: Border.all(
                  color: day.isToday && !active
                      ? scheme.primary
                      : Colors.transparent,
                  width: 1.5,
                ),
                boxShadow: active
                    ? [
                        BoxShadow(
                          color: BrandColors.padelGreen.withValues(alpha: 0.4),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : null,
              ),
              child: Text(
                '${day.date.day}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: active ? BrandColors.onHero : scheme.onSurface,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'dart:async';

import 'package:clock/clock.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'cubit/quick_match_cubit.dart';
import 'cubit/quick_match_state.dart';
import '../data/models/quick_match_search_dto.dart';
import '../../matches/data/matches_repository.dart';
import '../../matches/data/models/match_detail_dto.dart';
import '../../../core/di/service_locator.dart';
import '../../../core/formatting/fx_price_labels.dart';
import '../../../core/formatting/money_conversion.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/models/currency_code.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/date_strip.dart';
import '../../../shared/widgets/dual_price.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/segmented_control.dart';

/// Cancela la búsqueda y vuelve al inicio. Antes "Salir de la cola" solo
/// llamaba a `cancel()`: la búsqueda SÍ se cancelaba, pero la pantalla
/// seguía mostrando este mismo flujo — que al quedar sin búsqueda activa
/// cae en `QuickMatchIdle` y renderiza el formulario para crear una nueva
/// cola. Al jugador le parecía que "salir" no hacía nada.
Future<void> _leaveQueue(BuildContext context) async {
  final cubit = context.read<QuickMatchCubit>();
  await cubit.cancel();
  //? Si falló, el cubit muestra el error en esta pantalla: no se navega.
  if (context.mounted && cubit.state is QuickMatchIdle) context.go(Routes.home);
}

/// Tamaño fijo del grupo NEW_GROUP: la API solo lo crea con 4 jugadores.
const _groupSize = 4;

final class QuickMatchScreen extends StatefulWidget {
  const QuickMatchScreen({super.key});

  @override
  State<QuickMatchScreen> createState() => _QuickMatchScreenState();
}

final class _QuickMatchScreenState extends State<QuickMatchScreen> {
  //? La búsqueda que devuelve la API al rechazar queda CANCELLED y puede no
  //? traer la propuesta: este flag distingue "rechacé el ready check" de una
  //? búsqueda cancelada cualquiera, que muestra el estado idle.
  var _declined = false;

  /// Lo rechazado fue una invitación por disponibilidad, no un ready check.
  var _declinedInvitation = false;

  /// Rechaza el ready check. Rechazar saca al jugador de la cola (S5): la
  /// pantalla lo dice y ofrece volver a buscar o volver al inicio (L7).
  Future<void> _declineReadyCheck() async {
    setState(() {
      _declined = true;
      _declinedInvitation = false;
    });
    await context.read<QuickMatchCubit>().dismissProposal();
  }

  /// Rechaza una invitación por disponibilidad (S12): la búsqueda queda
  /// CANCELLED y se ofrecen las mismas salidas que al rechazar un ready check.
  Future<void> _declineInvitation() async {
    setState(() {
      _declined = true;
      _declinedInvitation = true;
    });
    await context.read<QuickMatchCubit>().dismissProposal();
  }

  @override
  void initState() {
    super.initState();
    context.read<QuickMatchCubit>().load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      toolbarHeight: 58,
      leading: IconButton(
        tooltip: 'Volver al inicio',
        onPressed: () => context.go(Routes.home),
        icon: const Icon(AppIcons.chevronDown),
      ),
      title: BlocBuilder<QuickMatchCubit, QuickMatchState>(
        builder: (context, state) {
          final search = state is QuickMatchActive ? state.search : null;
          final isProposal = search?.status == 'PROPOSAL';
          if (isProposal) return const Text('Propuesta para ti');
          //? Fuera de la cola (rechazó, o no aceptó un ready check a tiempo):
          //? no se rotula como búsqueda activa.
          final leftQueue =
              search?.status == 'CANCELLED' ||
              (search?.status == 'EXPIRED' &&
                  search?.proposal?.type == 'NEW_GROUP');
          if (search != null && !leftQueue) {
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                const Text('Búsqueda activa'),
              ],
            );
          }
          return const Text('Encontrar partida');
        },
      ),
      actions: [
        BlocBuilder<QuickMatchCubit, QuickMatchState>(
          builder: (context, state) {
            //? En un lobby, editar reinicia la búsqueda y saca al jugador
            //? del grupo sin avisar: no se ofrece.
            if (state is! QuickMatchActive ||
                state.search.status != 'SEARCHING' ||
                _isLobby(state.search)) {
              return const SizedBox(width: 48);
            }
            return TextButton(
              onPressed: () => _showScheduleSheet(context, state.search),
              child: const Text('Editar'),
            );
          },
        ),
      ],
    ),
    body: SafeArea(
      top: false,
      child: BlocBuilder<QuickMatchCubit, QuickMatchState>(
        builder: (context, state) => AnimatedSwitcher(
          // Mismo timing que el handoff de diseño (`sheetUp .28s
          // cubic-bezier(.3,.8,.3,1)`): cada paso del flujo entra con un
          // leve deslizamiento hacia arriba en vez de aparecer de golpe.
          duration: const Duration(milliseconds: 280),
          switchInCurve: const Cubic(.3, .8, .3, 1),
          transitionBuilder: (child, animation) => FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, .04),
                end: Offset.zero,
              ).animate(animation),
              child: child,
            ),
          ),
          child: KeyedSubtree(
            key: ValueKey(_quickMatchStateKey(state)),
            child: switch (state) {
              QuickMatchInitial() || QuickMatchLoading() => const Center(
                child: CircularProgressIndicator(),
              ),
              QuickMatchFailure(:final message) => _Failure(message: message),
              QuickMatchIdle() => _IdleQuickMatch(
                onStart: _showInitialConfiguration,
              ),
              QuickMatchActive(:final search)
                  when search.status == 'CANCELLED' && _declined =>
                _QueueEnded(
                  declined: true,
                  invitation: _declinedInvitation,
                  onSearchAgain: _showInitialConfiguration,
                ),
              //? Una búsqueda cancelada ya no está en la cola: se ofrece
              //? empezar otra en vez de mostrarla como "buscando".
              QuickMatchActive(:final search)
                  when search.status == 'CANCELLED' =>
                _IdleQuickMatch(onStart: _showInitialConfiguration),
              QuickMatchActive(:final search)
                  when search.status == 'PROPOSAL' && _isInvitation(search) =>
                _Polling(
                  child: _Invitation(
                    proposal: search.proposal!,
                    onDecline: _declineInvitation,
                  ),
                ),
              QuickMatchActive(:final search, :final exchangeRates)
                  when search.status == 'PROPOSAL' &&
                      search.proposal?.status == 'PENDING' =>
                _Proposal(
                  search: search,
                  exchangeRates: exchangeRates,
                  onDecline: _declineReadyCheck,
                ),
              QuickMatchActive(:final search)
                  when search.status == 'CONFIRMED' && !_hasMatch(search) =>
                _Polling(
                  child: _Confirmed(
                    isNewGroup: search.proposal?.type == 'NEW_GROUP',
                    matchId: null,
                    acceptedCount: search.acceptedCount,
                    expiresAt: search.proposal?.expiresAt,
                    //? L7: si alguien no aceptó, el grupo sigue con un
                    //? lugar libre mientras la API busca un reemplazo.
                    hasOpenSlot:
                        (search.proposal?.playerIds.length ?? _groupSize) <
                        _groupSize,
                    onCancel: () => _leaveQueue(context),
                  ),
                ),
              QuickMatchActive(:final search)
                  when search.status == 'CONFIRMED' =>
                _Confirmed(
                  isNewGroup: search.proposal?.type == 'NEW_GROUP',
                  matchId: search.proposal?.matchId,
                  acceptedCount: search.acceptedCount,
                  onCancel: () => _leaveQueue(context),
                ),
              QuickMatchActive(:final search) when search.status == 'EXPIRED' =>
                search.proposal?.type == 'OPEN_MATCH'
                    ? const _Expired()
                    : _QueueEnded(
                        declined: false,
                        onSearchAgain: _showInitialConfiguration,
                      ),
              QuickMatchActive(:final search) when _isLobby(search) => _Polling(
                child: _Lobby(proposal: search.proposal!),
              ),
              QuickMatchActive(:final search) => _Searching(search: search),
            },
          ),
        ),
      ),
    ),
  );

  /// One key per visually distinct step of the flow — not per state object —
  /// so `AnimatedSwitcher` only replays its transition when the step itself
  /// changes (e.g. searching → proposal), never on every silent poll tick
  /// that re-emits the same step.
  String _quickMatchStateKey(QuickMatchState state) => switch (state) {
    QuickMatchInitial() || QuickMatchLoading() => 'loading',
    QuickMatchFailure() => 'failure',
    QuickMatchIdle() => 'idle',
    QuickMatchActive(:final search)
        when search.status == 'CANCELLED' && _declined =>
      'declined',
    QuickMatchActive(:final search) when search.status == 'CANCELLED' => 'idle',
    QuickMatchActive(:final search)
        when search.status == 'PROPOSAL' && _isInvitation(search) =>
      'invitation',
    QuickMatchActive(:final search)
        when search.status == 'PROPOSAL' &&
            search.proposal?.status == 'PENDING' =>
      'proposal',
    QuickMatchActive(:final search)
        when search.status == 'CONFIRMED' && !_hasMatch(search) =>
      'waiting',
    QuickMatchActive(:final search) when search.status == 'CONFIRMED' =>
      'confirmed',
    QuickMatchActive(:final search) when search.status == 'EXPIRED' =>
      'expired',
    QuickMatchActive(:final search) when _isLobby(search) => 'lobby',
    QuickMatchActive() => 'searching',
  };

  void _showScheduleSheet(BuildContext context, QuickMatchSearchDto search) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          _QuickMatchSheetFrame(child: _ScheduleSheet(search: search)),
    );
  }

  //? Solo se abre desde el botón del estado idle. Cerrar la hoja deja al
  //? jugador en esta pantalla; antes navegaba al inicio por su cuenta.
  Future<void> _showInitialConfiguration() async {
    await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BlocProvider.value(
        value: context.read<QuickMatchCubit>(),
        child: const _QuickMatchConfigurationLoader(),
      ),
    );
  }
}

/// Lobby que se llena de a uno (S1): el jugador sigue SEARCHING y la
/// propuesta LOBBY lista a quienes ya están en el grupo.
bool _isLobby(QuickMatchSearchDto search) =>
    search.status == 'SEARCHING' &&
    search.proposal?.type == 'NEW_GROUP' &&
    search.proposal?.status == 'LOBBY';

/// Invitación por disponibilidad (S12): una propuesta NEW_GROUP pendiente
/// de alguien que no tocó "buscar". No alcanza con mirar la cantidad de
/// jugadores: un miembro del ready check cuyo grupo perdió a alguien también
/// queda PENDING con menos de 4.
bool _isInvitation(QuickMatchSearchDto search) {
  final proposal = search.proposal;
  return search.invitedByAvailability &&
      proposal != null &&
      proposal.type == 'NEW_GROUP' &&
      proposal.status == 'PENDING';
}

bool _hasMatch(QuickMatchSearchDto search) {
  final matchId = search.proposal?.matchId;
  return matchId != null && matchId.isNotEmpty;
}

/// Sin búsqueda activa. Antes abría "¿Cuándo quieres jugar?" sola en un
/// post-frame callback: al "Salir de la cola", cancel() emitía Idle y la hoja
/// aparecía encima del inicio mientras se navegaba. Ahora espera un toque.
final class _IdleQuickMatch extends StatelessWidget {
  const _IdleQuickMatch({required this.onStart});

  final Future<void> Function() onStart;

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(20, 36, 20, 28),
    children: [
      _PulseIcon(icon: AppIcons.bolt),
      const SizedBox(height: 20),
      Text(
        'No estás en la cola',
        textAlign: TextAlign.center,
        style: Theme.of(
          context,
        ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 10),
      const Text(
        'Elige horario y nivel y te buscamos jugadores.',
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 24),
      FilledButton.icon(
        key: const Key('quick-match.idle.start'),
        onPressed: onStart,
        icon: const Icon(AppIcons.bolt),
        label: const Text('Buscar partida'),
      ),
    ],
  );
}

/// Re-consulta la búsqueda en silencio mientras el hijo está montado, para
/// que aceptaciones de otros, la disolución del grupo o la creación de la
/// partida aparezcan sin depender del push (S11).
final class _Polling extends StatefulWidget {
  const _Polling({required this.child});

  /// Más corto que la espera de búsqueda: el ready check dura 2 minutos.
  static const interval = Duration(seconds: 3);

  final Widget child;

  @override
  State<_Polling> createState() => _PollingState();
}

final class _PollingState extends State<_Polling> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(
      _Polling.interval,
      (_) => context.read<QuickMatchCubit>().refreshSilently(),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Opens the same Quick Match preferences flow from Home before entering the
/// full search-status screen. The temporary Cubit owns only the submission;
/// after a successful start the route creates a fresh Cubit and loads state.
Future<void> showQuickMatchConfigurationSheet(BuildContext context) async {
  final started = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) => BlocProvider<QuickMatchCubit>(
      create: (_) => getIt<QuickMatchCubit>(),
      child: const _QuickMatchConfigurationLoader(),
    ),
  );

  if (started == true && context.mounted) {
    context.push(Routes.quickMatch);
  }
}

final class _QuickMatchConfigurationLoader extends StatelessWidget {
  const _QuickMatchConfigurationLoader();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: context.read<QuickMatchCubit>().defaultConfiguration(),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const _QuickMatchSheetFrame(
            child: Center(child: CircularProgressIndicator()),
          );
        }
        final configuration = snapshot.data;
        if (configuration == null) {
          return const _QuickMatchSheetFrame(
            child: _QuickMatchSetupError(
              message:
                  'Completá tu deporte y categoría para buscar una partida.',
            ),
          );
        }
        return _QuickMatchSetupSheet(config: configuration);
      },
    );
  }
}

final class _QuickMatchSetupError extends StatelessWidget {
  const _QuickMatchSetupError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(24),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(AppIcons.warning, color: Theme.of(context).colorScheme.error),
        const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center),
      ],
    ),
  );
}

final class _QuickMatchSetupSheet extends StatelessWidget {
  const _QuickMatchSetupSheet({required this.config});

  final QuickMatchConfiguration config;

  @override
  Widget build(BuildContext context) =>
      _QuickMatchSheetFrame(child: _ConfigurationSheet(config: config));
}

final class _QuickMatchSheetFrame extends StatelessWidget {
  const _QuickMatchSheetFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return FractionallySizedBox(
      heightFactor: .93,
      alignment: Alignment.bottomCenter,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: scheme.surfaceContainerLow,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
        ),
        child: SafeArea(top: false, child: child),
      ),
    );
  }
}

final class _ConfigurationSheet extends StatefulWidget {
  const _ConfigurationSheet({required this.config});
  final QuickMatchConfiguration config;

  @override
  State<_ConfigurationSheet> createState() => _ConfigurationSheetState();
}

final class _ConfigurationSheetState extends State<_ConfigurationSheet> {
  final List<DateStripDay> _days = buildDateStripDays(14);
  String _day = 'TODAY';
  late String _customDate = _days[3].key;
  final Set<String> _slots = {'EVENING'};
  bool _widenLevel = false;
  bool _includeOpenMatches = true;
  int _zoneKm = 10;
  bool _submitting = false;
  String? _error;
  late QuickMatchSportOption _selectedSport = widget.config.sports.first;

  void _selectSport(String sportId) {
    final selected = widget.config.sports.firstWhere(
      (option) => option.sport.id == sportId,
    );
    setState(() => _selectedSport = selected);
  }

  List<SegmentedOption<String>> _sportOptions() => widget.config.sports
      .map(
        (option) =>
            SegmentedOption(value: option.sport.id, label: option.sport.name),
      )
      .toList();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        const SizedBox(height: 8),
        Container(
          width: 40,
          height: 5,
          decoration: BoxDecoration(
            color: scheme.outline,
            borderRadius: BorderRadius.circular(99),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 12, 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '¿Cuándo quieres jugar?',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.4,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Nosotros buscamos jugadores de tu nivel.',
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontSize: 13.5,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Cerrar',
                onPressed: _submitting ? null : () => Navigator.pop(context),
                icon: const Icon(AppIcons.close),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            children: [
              _SectionLabel(label: 'Deporte'),
              SegmentedControl<String>(
                value: _selectedSport.sport.id,
                onChanged: _selectSport,
                options: _sportOptions(),
              ),
              _SectionLabel(label: 'Día'),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _ChoicePill(
                    label: 'Hoy',
                    selected: _day == 'TODAY',
                    onTap: () => setState(() => _day = 'TODAY'),
                  ),
                  _ChoicePill(
                    label: 'Mañana',
                    selected: _day == 'TOMORROW',
                    onTap: () => setState(() => _day = 'TOMORROW'),
                  ),
                  _ChoicePill(
                    label: 'Elegir fecha',
                    icon: AppIcons.calendar,
                    selected: _day == 'CUSTOM',
                    onTap: () => setState(() => _day = 'CUSTOM'),
                  ),
                ],
              ),
              if (_day == 'CUSTOM') ...[
                const SizedBox(height: 14),
                DateStrip(
                  days: _days,
                  value: _customDate,
                  onChanged: (value) => setState(() => _customDate = value),
                  horizontalPadding: 0,
                ),
              ],
              _SectionLabel(label: 'Horario'),
              Row(
                children: [
                  _TimeSlot(
                    label: 'Mañana',
                    hours: '7–11 am',
                    icon: AppIcons.sun,
                    selected: _slots.contains('MORNING'),
                    onTap: () => _toggleSlot('MORNING'),
                  ),
                  const SizedBox(width: 8),
                  _TimeSlot(
                    label: 'Tarde',
                    hours: '12–5 pm',
                    icon: AppIcons.sunset,
                    selected: _slots.contains('AFTERNOON'),
                    onTap: () => _toggleSlot('AFTERNOON'),
                  ),
                  const SizedBox(width: 8),
                  _TimeSlot(
                    label: 'Noche',
                    hours: '6–10 pm',
                    icon: AppIcons.moon,
                    selected: _slots.contains('EVENING'),
                    onTap: () => _toggleSlot('EVENING'),
                  ),
                ],
              ),
              const SizedBox(height: 7),
              Text(
                'Sugerido según tu disponibilidad guardada. Puedes marcar más de uno.',
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
              ),
              _SectionLabel(label: 'Nivel'),
              _PreferenceCard(
                child: Row(
                  children: [
                    _LevelTag(label: _selectedSport.categories.first.name),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _widenLevel ? 'Rango ampliado' : 'Tu categoría',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Incluye niveles cercanos para más opciones.',
                            style: TextStyle(
                              color: scheme.onSurfaceVariant,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch.adaptive(
                      value: _widenLevel,
                      onChanged: (value) => setState(() => _widenLevel = value),
                    ),
                  ],
                ),
              ),
              _SectionLabel(label: 'Zona'),
              Text(
                'Cerca de tu ubicación guardada',
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _ZoneChoice(label: '5 km', value: 5),
                  _ZoneChoice(label: '10 km', value: 10),
                  _ZoneChoice(label: 'Toda Caracas', value: 100),
                ],
              ),
              const SizedBox(height: 18),
              _PreferenceCard(
                child: Row(
                  children: [
                    Icon(AppIcons.people, color: scheme.primary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Sumarme a partidas ya armadas',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Si a una partida abierta le falta gente, te la proponemos primero.',
                            style: TextStyle(
                              color: scheme.onSurfaceVariant,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch.adaptive(
                      value: _includeOpenMatches,
                      onChanged: (value) =>
                          setState(() => _includeOpenMatches = value),
                    ),
                  ],
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style: TextStyle(color: scheme.error, fontSize: 13),
                ),
              ],
            ],
          ),
        ),
        DecoratedBox(
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: scheme.outlineVariant)),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
            child: Column(
              children: [
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    key: const Key('quick-match.configure.submit'),
                    onPressed: _submitting ? null : _submit,
                    icon: _submitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(AppIcons.bolt, size: 18),
                    label: Text(
                      _submitting ? 'Buscando...' : 'Entrar a la cola',
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Sin cobro ni reserva hasta que confirmes.',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _toggleSlot(String slot) {
    setState(() {
      if (_slots.contains(slot)) {
        if (_slots.length > 1) _slots.remove(slot);
      } else {
        _slots.add(slot);
      }
    });
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    final cubit = context.read<QuickMatchCubit>();
    await cubit.start({
      'sportId': _selectedSport.sport.id,
      'categoryId': _selectedSport.categories.first.id,
      'day': _day,
      if (_day == 'CUSTOM') 'date': _customDate,
      'slots': _slots.toList(),
      'widenLevel': _widenLevel,
      'zoneKm': _zoneKm,
      'includeOpenMatches': _includeOpenMatches,
    });
    if (!mounted) return;
    final state = cubit.state;
    if (state is QuickMatchActive) {
      Navigator.pop(context, true);
      return;
    }
    setState(() {
      _submitting = false;
      _error = state is QuickMatchFailure
          ? state.message
          : 'No pudimos iniciar la búsqueda.';
    });
  }

  Widget _ZoneChoice({required String label, required int value}) =>
      _ChoicePill(
        label: label,
        selected: _zoneKm == value,
        onTap: () => setState(() => _zoneKm = value),
      );
}

final class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 18, bottom: 9),
    child: Text(
      label,
      style: TextStyle(
        color: Theme.of(context).colorScheme.onSurfaceVariant,
        fontSize: 13,
        fontWeight: FontWeight.w700,
        letterSpacing: .3,
      ),
    ),
  );
}

final class _PreferenceCard extends StatelessWidget {
  const _PreferenceCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(
        color: Theme.of(context).colorScheme.outlineVariant,
        width: 1.5,
      ),
    ),
    child: child,
  );
}

final class _LevelTag extends StatelessWidget {
  const _LevelTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.tertiary,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      child: Text(
        label,
        style: TextStyle(
          color: Theme.of(context).colorScheme.onTertiary,
          fontSize: 12,
          fontWeight: FontWeight.w800,
        ),
      ),
    ),
  );
}

final class _ChoicePill extends StatelessWidget {
  const _ChoicePill({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: selected ? scheme.primaryContainer : scheme.surface,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 38,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? scheme.primary : scheme.outlineVariant,
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 15,
                  color: selected ? scheme.primary : scheme.onSurfaceVariant,
                ),
                const SizedBox(width: 5),
              ],
              Text(
                label,
                style: TextStyle(
                  color: selected ? scheme.primary : scheme.onSurface,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _TimeSlot extends StatelessWidget {
  const _TimeSlot({
    required this.label,
    required this.hours,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String hours;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Expanded(
      child: Material(
        color: selected ? scheme.primaryContainer : scheme.surface,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            height: 104,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: selected ? scheme.primary : scheme.outlineVariant,
                width: 1.5,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  icon,
                  color: selected ? scheme.primary : scheme.onSurfaceVariant,
                ),
                const Spacer(),
                Text(
                  label,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 2),
                Text(
                  hours,
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

final class _Proposal extends StatelessWidget {
  const _Proposal({
    required this.search,
    required this.exchangeRates,
    required this.onDecline,
  });

  final QuickMatchSearchDto search;
  final List<ExchangeRateRow> exchangeRates;
  final Future<void> Function() onDecline;

  @override
  Widget build(BuildContext context) {
    final proposal = search.proposal!;
    if (proposal.type == 'OPEN_MATCH') {
      return _OpenMatchProposal(
        search: search,
        proposal: proposal,
        exchangeRates: exchangeRates,
      );
    }
    return _Polling(
      child: _ReadyCheck(
        proposal: proposal,
        acceptedCount: search.acceptedCount,
        onDecline: onDecline,
      ),
    );
  }
}

final class _OpenMatchProposal extends StatelessWidget {
  const _OpenMatchProposal({
    required this.search,
    required this.proposal,
    required this.exchangeRates,
  });

  final QuickMatchSearchDto search;
  final QuickMatchProposalDto proposal;
  final List<ExchangeRateRow> exchangeRates;

  @override
  Widget build(BuildContext context) {
    final matchId = proposal.matchId;
    final match = matchId != null && getIt.isRegistered<MatchesRepository>()
        ? getIt<MatchesRepository>().getMatchDetail(matchId)
        : Future<MatchDetailDto?>.value(null);

    return FutureBuilder<MatchDetailDto?>(
      future: match,
      builder: (context, snapshot) => _OpenMatchProposalLayout(
        search: search,
        proposal: proposal,
        match: snapshot.data,
        exchangeRates: exchangeRates,
      ),
    );
  }
}

final class _OpenMatchProposalLayout extends StatelessWidget {
  const _OpenMatchProposalLayout({
    required this.search,
    required this.proposal,
    required this.match,
    required this.exchangeRates,
  });

  final QuickMatchSearchDto search;
  final QuickMatchProposalDto proposal;
  final MatchDetailDto? match;
  final List<ExchangeRateRow> exchangeRates;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final title = match == null
        ? 'Una partida compatible está lista'
        : '${match!.clubName ?? 'Club'} · ${match!.courtName ?? 'Cancha'}';
    final location = match?.locationLabel;
    final date = match?.scheduledAt ?? search.targetDate;

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
            children: [
              _ProposalEyebrow(),
              const SizedBox(height: 12),
              Text(
                '¡Partida encontrada!',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  letterSpacing: -.6,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Falta un jugador. ¿Te sumas?',
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 15),
              ),
              const SizedBox(height: 18),
              _OpenMatchCard(
                match: match,
                title: title,
                location: location,
                date: date,
                exchangeRates: exchangeRates,
              ),
              const SizedBox(height: 12),
              _ProposalHold(expiresAt: proposal.expiresAt),
              const SizedBox(height: 14),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(AppIcons.shield, color: scheme.primary, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Nada se cobra hasta que confirmes. Después pagas tu parte desde la partida.',
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontSize: 12.5,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        _ProposalFooter(
          onConfirm: () => context.read<QuickMatchCubit>().confirmProposal(),
          onContinue: () => context.read<QuickMatchCubit>().dismissProposal(),
        ),
      ],
    );
  }
}

final class _ProposalEyebrow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Align(
      alignment: Alignment.centerLeft,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: scheme.primary.withValues(alpha: .14),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(AppIcons.people, color: scheme.primary, size: 15),
              const SizedBox(width: 6),
              Text(
                'Partida abierta con cupo',
                style: TextStyle(
                  color: scheme.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _OpenMatchCard extends StatelessWidget {
  const _OpenMatchCard({
    required this.match,
    required this.title,
    required this.location,
    required this.date,
    required this.exchangeRates,
  });

  final MatchDetailDto? match;
  final String title;
  final String? location;
  final DateTime date;
  final List<ExchangeRateRow> exchangeRates;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final participants = match?.participants ?? const <MatchParticipantDto>[];
    final maxParticipants = match?.maxParticipants ?? 4;
    final openSpots = match?.openSpots ?? 1;
    final category = match?.categoryName ?? 'Tu categoría';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  _formatProposalDate(date),
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
              ),
              if (match != null)
                _ProposalPrice(
                  amountCents: match!.pricePerPlayerCents,
                  currency: match!.displayCurrency ?? match!.pricingCurrency,
                  scheduledAt: date,
                  exchangeRates: exchangeRates,
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(AppIcons.pin, size: 15, color: scheme.onSurfaceVariant),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          if (location != null && location!.isNotEmpty) ...[
            const SizedBox(height: 2),
            Padding(
              padding: const EdgeInsets.only(left: 21),
              child: Text(
                location!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _ProposalTag(label: category, emphasized: true),
              _ProposalTag(
                label:
                    '$openSpots cupo${openSpots == 1 ? '' : 's'} disponible${openSpots == 1 ? '' : 's'}',
              ),
            ],
          ),
          const SizedBox(height: 12),
          Divider(color: scheme.outlineVariant, height: 1),
          const SizedBox(height: 14),
          _ParticipantRow(
            participants: participants,
            maxParticipants: maxParticipants,
          ),
          const SizedBox(height: 8),
          Text(
            participants.isEmpty
                ? 'Confirmá para ver a los demás jugadores.'
                : 'Solo falta completar el último cupo.',
            style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

final class _ProposalPrice extends StatelessWidget {
  const _ProposalPrice({
    required this.amountCents,
    required this.currency,
    required this.scheduledAt,
    required this.exchangeRates,
  });

  final int amountCents;
  final String? currency;
  final DateTime scheduledAt;
  final List<ExchangeRateRow> exchangeRates;

  @override
  Widget build(BuildContext context) {
    final resolvedCurrency = CurrencyCode.fromApiValue(currency);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        DualPrice(
          primaryLabel: formatMoneyFromMinor(amountCents, resolvedCurrency),
          secondaryLabel: secondaryBsLabelSV(
            primaryMinor: amountCents,
            primaryCurrency: resolvedCurrency,
            rates: exchangeRates,
            effectiveDateIso: localCalendarDateIsoSV(scheduledAt),
          ),
          suffix: 'p/p',
          primarySize: 15,
        ),
        Text(
          'Precio por jugador',
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

final class _ProposalTag extends StatelessWidget {
  const _ProposalTag({required this.label, this.emphasized = false});

  final String label;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: emphasized ? scheme.tertiary : scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Text(
          label,
          style: TextStyle(
            color: emphasized ? scheme.onTertiary : scheme.onSurfaceVariant,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

final class _ParticipantRow extends StatelessWidget {
  const _ParticipantRow({
    required this.participants,
    required this.maxParticipants,
  });

  final List<MatchParticipantDto> participants;
  final int maxParticipants;

  @override
  Widget build(BuildContext context) {
    final displayed = participants.take(maxParticipants).toList();
    final openCount = (maxParticipants - displayed.length).clamp(
      0,
      maxParticipants,
    );
    return Row(
      children: [
        ...displayed.map(
          (participant) => Padding(
            padding: const EdgeInsets.only(right: 10),
            child: _ParticipantAvatar(
              name: participant.displayName ?? 'Jugador',
            ),
          ),
        ),
        ...List<Widget>.generate(
          openCount,
          (_) => Padding(
            padding: const EdgeInsets.only(right: 10),
            child: _OpenParticipantAvatar(),
          ),
        ),
      ],
    );
  }
}

final class _ParticipantAvatar extends StatelessWidget {
  const _ParticipantAvatar({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final initials = name
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .map((part) => part[0].toUpperCase())
        .join();
    return SizedBox(
      width: 48,
      child: Column(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: Theme.of(context).colorScheme.primary,
            child: Text(
              initials,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            name.split(' ').first,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

final class _OpenParticipantAvatar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      width: 48,
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: scheme.primary, width: 2),
            ),
            child: Icon(AppIcons.add, color: scheme.primary, size: 20),
          ),
          const SizedBox(height: 4),
          Text(
            'Tu lugar',
            style: TextStyle(
              color: scheme.primary,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

final class _ProposalHold extends StatelessWidget {
  const _ProposalHold({
    required this.expiresAt,
    this.label = 'Reservamos tu cupo por',
  });

  final DateTime expiresAt;
  final String label;

  @override
  Widget build(BuildContext context) => StreamBuilder<int>(
    stream: Stream.periodic(const Duration(seconds: 1), (value) => value),
    builder: (context, _) {
      final seconds = expiresAt.difference(clock.now()).inSeconds.clamp(0, 120);
      final scheme = Theme.of(context).colorScheme;
      return Container(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Icon(AppIcons.clock, color: scheme.primary, size: 17),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ),
                Text(
                  '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')} min',
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: seconds / 120,
              minHeight: 3,
              borderRadius: BorderRadius.circular(99),
            ),
          ],
        ),
      );
    },
  );
}

final class _ProposalFooter extends StatelessWidget {
  const _ProposalFooter({required this.onConfirm, required this.onContinue});

  final VoidCallback onConfirm;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      border: Border(
        top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
      ),
    ),
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
        child: Column(
          children: [
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: onConfirm,
                icon: const Icon(AppIcons.check),
                label: const Text('Confirmar cupo'),
              ),
            ),
            TextButton(
              onPressed: onContinue,
              child: const Text('Seguir buscando'),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Ready check NEW_GROUP, como la cola de League of Legends: los 4 jugadores
/// reciben la propuesta a la vez y la partida se arma solo si aceptan todos.
/// No hay selector de sede: al aceptar el 4º, la API reserva la cancha (S4).
/// El conteo sale de `acceptedCount`; antes el texto decía que "tres
/// jugadores quieren jugar" aunque nadie hubiera aceptado.
final class _ReadyCheck extends StatelessWidget {
  const _ReadyCheck({
    required this.proposal,
    required this.acceptedCount,
    required this.onDecline,
  });

  final QuickMatchProposalDto proposal;
  final int acceptedCount;
  final Future<void> Function() onDecline;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 18),
            children: [
              Text(
                '¡Partida encontrada!',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  letterSpacing: -.6,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Hay un grupo de $_groupSize jugadores compatible con tu horario y nivel. La partida se arma si aceptan todos.',
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 15),
              ),
              const SizedBox(height: 18),
              _ProposalHold(
                expiresAt: proposal.expiresAt,
                label: 'Tiempo para aceptar',
              ),
              const SizedBox(height: 14),
              _AcceptedProgress(acceptedCount: acceptedCount),
              const SizedBox(height: 14),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(AppIcons.shield, color: scheme.primary, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Si alguien rechaza o no acepta a tiempo, buscamos a otro jugador y tu lugar en el grupo se mantiene.',
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontSize: 12.5,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        _ReadyCheckFooter(
          onAccept: () => context.read<QuickMatchCubit>().confirmProposal(),
          onDecline: onDecline,
        ),
      ],
    );
  }
}

/// "X de 4 aceptaron" más un indicador por lugar del grupo.
final class _AcceptedProgress extends StatelessWidget {
  const _AcceptedProgress({required this.acceptedCount});

  final int acceptedCount;

  @override
  Widget build(BuildContext context) => _GroupProgress(
    filled: acceptedCount,
    label: (count) => '$count de $_groupSize aceptaron',
  );
}

/// Conteo del grupo sobre 4 con un indicador por lugar.
final class _GroupProgress extends StatelessWidget {
  const _GroupProgress({required this.filled, required this.label});

  final int filled;
  final String Function(int count) label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final accepted = filled.clamp(0, _groupSize);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label(accepted),
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          for (var i = 0; i < _groupSize; i++)
            Padding(
              padding: const EdgeInsets.only(left: 6),
              child: Icon(
                i < accepted ? AppIcons.checkCircle : AppIcons.pending,
                size: 22,
                color: i < accepted ? scheme.primary : scheme.onSurfaceVariant,
              ),
            ),
        ],
      ),
    );
  }
}

final class _ReadyCheckFooter extends StatelessWidget {
  const _ReadyCheckFooter({
    required this.onAccept,
    required this.onDecline,
    this.acceptLabel = 'Aceptar',
    this.declineLabel = 'Rechazar',
  });

  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final String acceptLabel;
  final String declineLabel;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      border: Border(
        top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
      ),
    ),
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
        child: Column(
          children: [
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: onAccept,
                icon: const Icon(AppIcons.check),
                label: Text(acceptLabel),
              ),
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onDecline,
                child: Text(declineLabel),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Lobby que se llena de a uno (S1). Se consulta cada pocos segundos para
/// que cada jugador que se suma aparezca sin depender del push.
final class _Lobby extends StatelessWidget {
  const _Lobby({required this.proposal});

  final QuickMatchProposalDto proposal;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 28),
      children: [
        _PulseIcon(icon: AppIcons.people),
        const SizedBox(height: 22),
        Text(
          'Grupo armándose',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w900,
            letterSpacing: -.5,
          ),
        ),
        const SizedBox(height: 7),
        Text(
          'Otros jugadores con tu horario y nivel ya están en el grupo. Te avisamos cuando se complete para confirmar la partida.',
          textAlign: TextAlign.center,
          style: TextStyle(color: scheme.onSurfaceVariant),
        ),
        const SizedBox(height: 20),
        _GroupProgress(
          filled: proposal.playerIds.length,
          label: (count) => '$count de $_groupSize jugadores',
        ),
        const SizedBox(height: 24),
        OutlinedButton(
          onPressed: () => _leaveQueue(context),
          child: const Text('Salir de la cola'),
        ),
      ],
    );
  }
}

/// Invitación por disponibilidad (S12): el jugador no buscó, pero su
/// disponibilidad coincide con un lobby abierto. Se suma solo si acepta.
/// No usa el texto del ready check: el grupo todavía no está completo.
final class _Invitation extends StatelessWidget {
  const _Invitation({required this.proposal, required this.onDecline});

  final QuickMatchProposalDto proposal;
  final Future<void> Function() onDecline;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 18),
            children: [
              Text(
                'Hay un grupo armándose a tu horario',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  letterSpacing: -.6,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Coincide con tu disponibilidad. Si te sumas, te avisamos cuando el grupo se complete para confirmar la partida.',
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 15),
              ),
              const SizedBox(height: 18),
              _ProposalHold(
                expiresAt: proposal.expiresAt,
                label: 'Tiempo para responder',
              ),
              const SizedBox(height: 14),
              _GroupProgress(
                filled: proposal.playerIds.length,
                label: (count) => '$count de $_groupSize jugadores',
              ),
            ],
          ),
        ),
        _ReadyCheckFooter(
          acceptLabel: 'Sumarme',
          declineLabel: 'No, gracias',
          onAccept: () => context.read<QuickMatchCubit>().confirmProposal(),
          onDecline: onDecline,
        ),
      ],
    );
  }
}

String _formatProposalDate(DateTime value) {
  final local = value.toLocal();
  final now = clock.now();
  final today = DateTime(now.year, now.month, now.day);
  final date = DateTime(local.year, local.month, local.day);
  final day = date == today
      ? 'Hoy'
      : date == today.add(const Duration(days: 1))
      ? 'Mañana'
      : '${local.day}/${local.month}';
  final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final suffix = local.hour >= 12 ? 'pm' : 'am';
  return '$day · $hour:${local.minute.toString().padLeft(2, '0')} $suffix';
}

final class _Searching extends StatefulWidget {
  const _Searching({required this.search});

  final QuickMatchSearchDto search;

  @override
  State<_Searching> createState() => _SearchingState();
}

final class _SearchingState extends State<_Searching> {
  /// How often the waiting screen silently re-fetches the search while it
  /// stays open, so a proposal/group update surfaces without the player
  /// needing to leave and reopen the screen.
  static const _pollInterval = Duration(seconds: 5);

  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _pollTimer = Timer.periodic(
      _pollInterval,
      (_) => context.read<QuickMatchCubit>().refreshSilently(),
    );
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final search = widget.search;
    final noMatch = search.noMatchYet;
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 32, 20, 20),
            children: [
              _PulseIcon(icon: noMatch ? AppIcons.bell : AppIcons.search),
              const SizedBox(height: 22),
              Text(
                noMatch ? 'Seguimos buscando' : 'Buscando jugadores',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  letterSpacing: -.5,
                ),
              ),
              const SizedBox(height: 7),
              Text(
                _searchSummary(search),
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                _zoneSummary(search.zoneKm),
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontSize: 12.5,
                ),
              ),
              const SizedBox(height: 22),
              _QueueProgressCard(search: search),
              const SizedBox(height: 14),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    AppIcons.bell,
                    size: 17,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Puedes cerrar la app. Te enviamos una notificación.',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 12.5,
                      ),
                    ),
                  ),
                ],
              ),
              if (noMatch) ...[
                const SizedBox(height: 20),
                _NoMatchActions(search: search),
              ],
            ],
          ),
        ),
        _QueueFooter(
          onEdit: () => _showScheduleSheet(context),
          onLeave: () => _leaveQueue(context),
        ),
      ],
    );
  }

  void _showScheduleSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          _QuickMatchSheetFrame(child: _ScheduleSheet(search: widget.search)),
    );
  }
}

String _searchSummary(QuickMatchSearchDto search) {
  final date = search.targetDate.toLocal();
  final now = clock.now();
  final today = DateTime(now.year, now.month, now.day);
  final target = DateTime(date.year, date.month, date.day);
  final day = switch (target.difference(today).inDays) {
    0 => 'Hoy',
    1 => 'Mañana',
    _ => '${date.day}/${date.month}',
  };
  final slots = <String, String>{
    'MORNING': 'mañana',
    'AFTERNOON': 'tarde',
    'EVENING': 'noche',
  };
  final selected = search.slots
      .map((slot) => slots[slot] ?? slot.toLowerCase())
      .join(', ');
  return '$day · ${selected.isEmpty ? 'tu horario' : selected}';
}

String _zoneSummary(int zoneKm) =>
    zoneKm >= 100 ? 'En toda Caracas' : 'Hasta $zoneKm km de tu ubicación';

final class _QueueProgressCard extends StatelessWidget {
  const _QueueProgressCard({required this.search});

  final QuickMatchSearchDto search;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
    ),
    child: Column(
      children: [
        _QueueProgressStep(
          state: search.includeOpenMatches
              ? _QueueStepState.complete
              : _QueueStepState.pending,
          title: 'Revisando partidas abiertas',
          subtitle: search.includeOpenMatches
              ? 'Ninguna con cupo para ti en este momento'
              : 'Desactivado en tu búsqueda',
        ),
        _QueueProgressStep(
          state: _QueueStepState.active,
          title: 'Buscando jugadores cerca de ti',
          subtitle: 'Personas de tu nivel que también quieren jugar',
        ),
        const _QueueProgressStep(
          state: _QueueStepState.pending,
          title: 'Te avisaremos apenas haya una opción',
          subtitle: 'Tendrás 2 minutos para confirmar',
          isLast: true,
        ),
      ],
    ),
  );
}

enum _QueueStepState { complete, active, pending }

final class _QueueProgressStep extends StatelessWidget {
  const _QueueProgressStep({
    required this.state,
    required this.title,
    required this.subtitle,
    this.isLast = false,
  });

  final _QueueStepState state;
  final String title;
  final String subtitle;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = state == _QueueStepState.pending
        ? scheme.outline
        : scheme.primary;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 22,
            child: Column(
              children: [
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: state == _QueueStepState.complete
                        ? color
                        : Colors.transparent,
                    shape: BoxShape.circle,
                    border: Border.all(color: color, width: 2),
                  ),
                  child: state == _QueueStepState.complete
                      ? Icon(AppIcons.check, size: 14, color: scheme.onPrimary)
                      : state == _QueueStepState.active
                      ? Padding(
                          padding: const EdgeInsets.all(4),
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                            ),
                          ),
                        )
                      : null,
                ),
                if (!isLast)
                  Expanded(
                    child: Container(width: 2, color: scheme.outlineVariant),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

final class _QueueFooter extends StatelessWidget {
  const _QueueFooter({required this.onEdit, required this.onLeave});

  final VoidCallback onEdit;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      border: Border(
        top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
      ),
    ),
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
        child: Column(
          children: [
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onEdit,
                icon: const Icon(AppIcons.sliders),
                label: const Text('Editar preferencias'),
              ),
            ),
            TextButton(
              onPressed: onLeave,
              child: const Text('Salir de la cola'),
            ),
          ],
        ),
      ),
    ),
  );
}

final class _NoMatchActions extends StatelessWidget {
  const _NoMatchActions({required this.search});

  final QuickMatchSearchDto search;

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
    ),
    child: Column(
      children: [
        ListTile(
          leading: const Icon(AppIcons.clock),
          title: const Text('Cambiar horario'),
          subtitle: const Text('Suma la tarde o prueba mañana'),
          onTap: () => showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            useSafeArea: true,
            backgroundColor: Colors.transparent,
            builder: (_) =>
                _QuickMatchSheetFrame(child: _ScheduleSheet(search: search)),
          ),
        ),
        ListTile(
          leading: const Icon(AppIcons.pin),
          title: const Text('Ampliar zona'),
          subtitle: Text(
            search.zoneKm >= 100
                ? 'Ya buscas en toda Caracas'
                : 'Busca más lejos para encontrar antes',
          ),
          onTap: search.zoneKm >= 100
              ? null
              : () => context.read<QuickMatchCubit>().expandZone(),
        ),
        ListTile(
          leading: const Icon(AppIcons.list),
          title: const Text('Ver partidas abiertas'),
          subtitle: const Text('Elige tú una partida y únete'),
          onTap: () => context.go(Routes.discoverMatches),
        ),
      ],
    ),
  );
}

final class _ScheduleSheet extends StatefulWidget {
  const _ScheduleSheet({required this.search});
  final QuickMatchSearchDto search;
  @override
  State<_ScheduleSheet> createState() => _ScheduleSheetState();
}

final class _ScheduleSheetState extends State<_ScheduleSheet> {
  late String _day;
  late final Set<String> _slots;

  @override
  void initState() {
    super.initState();
    final date = widget.search.targetDate.toLocal();
    final now = clock.now();
    final target = DateTime(date.year, date.month, date.day);
    final today = DateTime(now.year, now.month, now.day);
    _day = target.difference(today).inDays == 1 ? 'TOMORROW' : 'TODAY';
    _slots = {...widget.search.slots};
    if (_slots.isEmpty) _slots.add('EVENING');
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Cambiar horario', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          children: ['TODAY', 'TOMORROW']
              .map(
                (day) => ChoiceChip(
                  label: Text(day == 'TODAY' ? 'Hoy' : 'Mañana'),
                  selected: _day == day,
                  onSelected: (_) => setState(() => _day = day),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children:
              const [
                    ('MORNING', 'Mañana'),
                    ('AFTERNOON', 'Tarde'),
                    ('EVENING', 'Noche'),
                  ]
                  .map(
                    (entry) => FilterChip(
                      label: Text(entry.$2),
                      selected: _slots.contains(entry.$1),
                      onSelected: (selected) => setState(() {
                        if (selected) {
                          _slots.add(entry.$1);
                        } else if (_slots.length > 1) {
                          _slots.remove(entry.$1);
                        }
                      }),
                    ),
                  )
                  .toList(),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () {
            Navigator.pop(context);
            context.read<QuickMatchCubit>().changeSchedule(
              day: _day,
              slots: _slots.toList(),
            );
          },
          child: const Text('Actualizar búsqueda'),
        ),
      ],
    ),
  );
}

/// Expiración de una propuesta OPEN_MATCH: la búsqueda sigue activa (S8).
final class _Expired extends StatelessWidget {
  const _Expired();

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(20, 36, 20, 28),
    children: [
      _PulseIcon(icon: AppIcons.clock),
      const SizedBox(height: 20),
      Text(
        'Se liberó el cupo',
        textAlign: TextAlign.center,
        style: Theme.of(
          context,
        ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 10),
      const Text(
        'Pasaron los 2 minutos y el cupo se liberó. No se cobró nada.',
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 20),
      const _SurfaceMessage(
        text:
            'Tu búsqueda sigue activa y podés volver a intentarlo cuando quieras.',
      ),
      const SizedBox(height: 24),
      FilledButton(
        onPressed: () => context.read<QuickMatchCubit>().continueSearching(),
        child: const Text('Seguir buscando'),
      ),
      OutlinedButton(
        onPressed: () => _leaveQueue(context),
        child: const Text('Salir de la cola'),
      ),
    ],
  );
}

/// El jugador salió de la cola de un ready check NEW_GROUP: no aceptó a
/// tiempo (EXPIRED) o rechazó (CANCELLED). Su búsqueda ya terminó, así que
/// "Volver al inicio" solo navega, sin cancelar nada (L7).
final class _QueueEnded extends StatelessWidget {
  const _QueueEnded({
    required this.declined,
    required this.onSearchAgain,
    this.invitation = false,
  });

  final bool declined;

  /// Lo rechazado fue una invitación por disponibilidad (S12).
  final bool invitation;
  final Future<void> Function() onSearchAgain;

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(20, 36, 20, 28),
    children: [
      _PulseIcon(icon: declined ? AppIcons.close : AppIcons.clock),
      const SizedBox(height: 20),
      Text(
        declined
            ? (invitation
                  ? 'Rechazaste la invitación'
                  : 'Rechazaste la partida')
            : 'La propuesta expiró',
        textAlign: TextAlign.center,
        style: Theme.of(
          context,
        ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 10),
      Text(
        declined
            ? (invitation
                  ? 'No te sumaste al grupo. No se cobró nada.'
                  : 'Saliste de la cola. No se cobró nada.')
            : 'No aceptaste a tiempo y saliste de la cola. No se cobró nada.',
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 20),
      const _SurfaceMessage(text: 'Puedes volver a la cola cuando quieras.'),
      const SizedBox(height: 24),
      FilledButton(
        onPressed: onSearchAgain,
        child: const Text('Volver a buscar'),
      ),
      OutlinedButton(
        onPressed: () => context.go(Routes.home),
        child: const Text('Volver al inicio'),
      ),
    ],
  );
}

final class _PulseIcon extends StatelessWidget {
  const _PulseIcon({required this.icon});
  final IconData icon;
  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    return Center(
      child: Container(
        width: 116,
        height: 116,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: color.withValues(alpha: .28), width: 10),
          color: color.withValues(alpha: .12),
        ),
        child: Container(
          margin: const EdgeInsets.all(14),
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
          child: Icon(
            icon,
            color: Theme.of(context).colorScheme.onPrimary,
            size: 34,
          ),
        ),
      ),
    );
  }
}

final class _SurfaceMessage extends StatelessWidget {
  const _SurfaceMessage({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Text(text, textAlign: TextAlign.center),
    ),
  );
}

final class _Confirmed extends StatelessWidget {
  const _Confirmed({
    required this.isNewGroup,
    required this.matchId,
    required this.acceptedCount,
    this.expiresAt,
    this.hasOpenSlot = false,
    required this.onCancel,
  });
  final bool isNewGroup;
  final String? matchId;

  /// Aceptaciones reales del ready check (`acceptedCount` de la API).
  final int acceptedCount;

  /// Límite del ready check; se muestra mientras se espera a los demás.
  final DateTime? expiresAt;

  /// El grupo tiene menos de 4 miembros: alguien no aceptó y la API busca
  /// un reemplazo. No hay a quién esperar, así que no se muestra el contador.
  final bool hasOpenSlot;

  /// Cancela la búsqueda mientras el grupo sigue formándose (issue #121).
  /// No se ofrece una vez que ya existe partido (`hasMatch`): a esa altura
  /// "cancelar la búsqueda" ya no tiene sentido, lo que correspondería es
  /// salir del partido desde su propia pantalla de detalle.
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final hasMatch = matchId != null && matchId!.isNotEmpty;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 42, 20, 28),
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Theme.of(
                      context,
                    ).colorScheme.primary.withValues(alpha: .35),
                    blurRadius: 26,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Icon(
                AppIcons.checkCircle,
                color: Theme.of(context).colorScheme.onPrimary,
                size: 44,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              isNewGroup && !hasMatch
                  ? hasOpenSlot
                        ? 'Buscando un jugador más'
                        : 'Esperando a los demás jugadores'
                  : (isNewGroup
                        ? '¡Participación confirmada!'
                        : '¡Cupo confirmado!'),
              textAlign: TextAlign.center,
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Text(
              isNewGroup
                  ? hasMatch
                        ? 'La partida ya está lista. Consultá la sede y los próximos pasos.'
                        : hasOpenSlot
                        ? 'Alguien no aceptó y salió del grupo. Tu lugar se mantiene mientras buscamos un reemplazo.'
                        : 'Aceptaste la partida. Cuando acepten todos, reservamos la cancha y armamos la partida.'
                  : 'Ya estás dentro. Consultá los detalles y pagá tu parte desde la partida.',
              textAlign: TextAlign.center,
            ),
            if (isNewGroup && !hasMatch) ...[
              const SizedBox(height: 18),
              _AcceptedProgress(acceptedCount: acceptedCount),
              if (expiresAt != null && !hasOpenSlot) ...[
                const SizedBox(height: 12),
                _ProposalHold(
                  expiresAt: expiresAt!,
                  label: 'Tiempo para que acepten',
                ),
              ],
            ],
            const SizedBox(height: 26),
            if (hasMatch)
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  key: const Key('quick-match.open-match'),
                  onPressed: () => context.go(Routes.matchDetail(matchId!)),
                  icon: const Icon(AppIcons.racquetSport),
                  label: const Text('Ver partida'),
                ),
              ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => context.go(Routes.home),
                child: const Text('Volver al inicio'),
              ),
            ),
            if (!hasMatch)
              TextButton(
                onPressed: onCancel,
                child: const Text('Salir de la cola'),
              ),
          ],
        ),
      ],
    );
  }
}

final class _Failure extends StatelessWidget {
  const _Failure({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => ErrorState(
    icon: AppIcons.warning,
    message: message,
    onRetry: () => context.read<QuickMatchCubit>().load(),
  );
}

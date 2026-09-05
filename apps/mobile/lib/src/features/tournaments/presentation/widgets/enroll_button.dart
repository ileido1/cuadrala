import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../cubit/tournament_registrations_cubit.dart';
import '../cubit/tournament_registrations_state.dart';
import '../tournament_status_view.dart';

/// Control de inscripción del jugador en el encabezado del torneo.
///
/// Antes era un botón único que no miraba el estado del torneo: se ofrecía
/// siempre, y fuera de DRAFT/OPEN la API lo cortaba con 409 TORNEO_CERRADO. Y
/// como el único texto era "Cancelar inscripción", el jugador tampoco sabía si
/// ya lo habían aceptado o seguía esperando — distinción que importa, porque el
/// cuadro se arma solo con los inscriptos confirmados.
///
/// Ahora responde dos preguntas de una: si puede entrar, y si ya está adentro.
class EnrollButton extends StatelessWidget {
  const EnrollButton({super.key, required this.tournamentStatus});

  /// Estado del torneo. `null` mientras no se cargó: se falla cerrado.
  final String? tournamentStatus;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<TournamentRegistrationsCubit, TournamentRegistrationsState>(
      builder: (context, state) {
        if (state is! TournamentRegistrationsLoaded) {
          return const SizedBox.shrink();
        }

        final cubit = context.read<TournamentRegistrationsCubit>();
        final userId = cubit.currentUserId;
        final registration = userId == null ? null : state.registrationFor(userId);
        final rosterOpen = isTournamentRosterOpen(tournamentStatus);

        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (state.registerError != null)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Text(
                  state.registerError!,
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
              ),
            if (registration != null) ...[
              _RegistrationChip(status: registration.status),
              //? La baja tiene la misma ventana que el alta en la API, así que
              //? fuera de ella el botón no se ofrece.
              if (rosterOpen) ...[
                const SizedBox(width: 8),
                TextButton(
                  key: const Key('tournament.withdrawButton'),
                  onPressed: state.registering ? null : cubit.withdraw,
                  child: const Text('Salir'),
                ),
              ],
            ] else if (rosterOpen)
              FilledButton.icon(
                //? El theme global usa Size.fromHeight(48) (ancho mínimo = ∞),
                //? que revienta dentro de un Row (ancho sin límite). Acá se
                //? acota para que el botón se ajuste a su contenido.
                style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
                onPressed: state.registering ? null : cubit.register,
                icon: state.registering
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.person_add),
                label: const Text('Inscribirme'),
              )
            else
              Text(
                'Inscripciones cerradas',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
          ],
        );
      },
    );
  }
}

/// Dice al jugador en qué punto está su inscripción, no solo que existe.
class _RegistrationChip extends StatelessWidget {
  const _RegistrationChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final confirmed = status.toUpperCase() == 'CONFIRMED';
    final color = confirmed ? Colors.green : Colors.orange;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(confirmed ? Icons.check_circle : Icons.hourglass_top, size: 15, color: color),
          const SizedBox(width: 6),
          Text(
            confirmed ? 'Estás dentro' : 'Falta que te acepten',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:cuadrala_mobile/src/features/shell/presentation/shell_screen.dart';
import 'package:cuadrala_mobile/src/router/routes.dart';
import 'package:cuadrala_mobile/src/router/shell_branches.dart';

void main() {
  for (final tournamentsEnabled in [true, false]) {
    test(
      'should keep shell branches and tabs aligned when tournamentsEnabled is $tournamentsEnabled',
      () {
        final destinations = shellDestinations(
          tournamentsEnabled: tournamentsEnabled,
        );
        final branches = shellBranchesFor(
          tournamentsEnabled: tournamentsEnabled,
        );
        final tabs = shellTabsFor(tournamentsEnabled: tournamentsEnabled);

        final expectedPaths = tournamentsEnabled
            ? [
                Routes.home,
                Routes.partidas,
                Routes.torneos,
                Routes.descubrir,
                Routes.avisos,
                Routes.perfil,
              ]
            : [
                Routes.home,
                Routes.partidas,
                Routes.descubrir,
                Routes.avisos,
                Routes.perfil,
              ];
        final expectedLabels = tournamentsEnabled
            ? ['Inicio', 'Partidas', 'Torneos', 'Descubrir', 'Avisos', 'Perfil']
            : ['Inicio', 'Partidas', 'Descubrir', 'Avisos', 'Perfil'];

        expect(branches, hasLength(destinations.length));
        expect(tabs, hasLength(destinations.length));
        expect(
          destinations.map((destination) => destination.path),
          expectedPaths,
        );
        expect(
          destinations.map((destination) => destination.label),
          expectedLabels,
        );

        for (var index = 0; index < destinations.length; index++) {
          final rootRoute = branches[index].routes.single as GoRoute;
          expect(rootRoute.path, destinations[index].path);
          expect(tabs[index].label, destinations[index].label);
        }

        final inicioIndex = tabs.indexWhere((tab) => tab.label == 'Inicio');
        final inicioRoute = branches[inicioIndex].routes.single as GoRoute;
        expect(inicioIndex, 0);
        expect(inicioRoute.path, Routes.home);
        expect(inicioRoute.path, isNot(Routes.perfil));
      },
    );
  }
}

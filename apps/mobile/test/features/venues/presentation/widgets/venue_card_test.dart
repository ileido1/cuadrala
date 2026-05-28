import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/venues/data/models/venue_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/widgets/venue_card.dart';

VenueDto _venue({
  String id = 'v1',
  String name = 'Club Padel Norte',
  String? address = 'Av. Corrientes 1234',
  String? imageUrl,
  double? distanceKm,
  List<String> sports = const ['PADEL'],
}) {
  return VenueDto(
    id: id,
    name: name,
    address: address,
    latitude: -34.6,
    longitude: -58.4,
    imageUrl: imageUrl,
    distanceKm: distanceKm,
    sports: sports,
  );
}

Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

void main() {
  group('VenueCard', () {
    testWidgets('muestra el nombre del venue', (tester) async {
      await tester.pumpWidget(_wrap(VenueCard(venue: _venue(), onTap: () {})));
      expect(find.text('Club Padel Norte'), findsOneWidget);
    });

    testWidgets('muestra la dirección', (tester) async {
      await tester.pumpWidget(_wrap(VenueCard(venue: _venue(), onTap: () {})));
      expect(find.text('Av. Corrientes 1234'), findsOneWidget);
    });

    testWidgets('muestra placeholder cuando imageUrl es null', (tester) async {
      await tester.pumpWidget(_wrap(VenueCard(venue: _venue(imageUrl: null), onTap: () {})));
      // No debe lanzar excepciones y debe mostrar algún placeholder
      expect(find.byType(VenueCard), findsOneWidget);
      expect(find.byIcon(Icons.location_on), findsOneWidget);
    });

    testWidgets('muestra chip de distancia cuando distanceKm no es null', (tester) async {
      await tester.pumpWidget(
        _wrap(VenueCard(venue: _venue(distanceKm: 1.2), onTap: () {})),
      );
      expect(find.textContaining('km'), findsOneWidget);
    });

    testWidgets('no muestra chip de distancia cuando distanceKm es null', (tester) async {
      await tester.pumpWidget(
        _wrap(VenueCard(venue: _venue(distanceKm: null), onTap: () {})),
      );
      expect(find.textContaining('km'), findsNothing);
    });

    testWidgets('llama onTap al hacer tap en la card', (tester) async {
      var tapped = false;
      await tester.pumpWidget(
        _wrap(VenueCard(venue: _venue(), onTap: () => tapped = true)),
      );
      await tester.tap(find.byType(VenueCard));
      expect(tapped, isTrue);
    });

    testWidgets('SC-2.5: venue con imageUrl null no lanza excepciones', (tester) async {
      await tester.pumpWidget(
        _wrap(VenueCard(venue: _venue(imageUrl: null), onTap: () {})),
      );
      await tester.pump();
      expect(tester.takeException(), isNull);
    });
  });
}

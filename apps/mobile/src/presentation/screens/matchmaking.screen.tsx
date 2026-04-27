import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useMatchmakingSuggestionsQuery } from '../../hooks/use_matchmaking_suggestions_query';
import { useSyncTabOnFocus } from '../../hooks/use_sync_tab_on_focus';
import { useAppStore } from '../../state/app.store';
import { getErrorMessage } from '../../utils/error_message';
import { isUuidString } from '../../utils/uuid';
import { AppButton } from '../components/app_button';
import { AppCard } from '../components/app_card';
import { AppTextInput } from '../components/app_text_input';
import { ScreenFeedback } from '../components/screen_feedback';

export function MatchmakingScreen() {
  useSyncTabOnFocus('matchmaking');
  const filters = useAppStore((_state) => _state.filters);
  const setFilters = useAppStore((_state) => _state.setFilters);
  const lastCreatedMatchId = useAppStore((_state) => _state.lastCreatedMatchId);

  const matchId = filters.matchmakingMatchId;
  const limit = filters.matchmakingLimit;

  const enabled = useMemo(() => isUuidString(matchId), [matchId]);
  const limitClamped = useMemo(() => {
    if (!Number.isFinite(limit)) return 10;
    return Math.min(50, Math.max(1, Math.floor(limit)));
  }, [limit]);

  const query = useMatchmakingSuggestionsQuery(matchId.trim(), limitClamped, enabled);

  const errorMessage =
    query.isError && query.error !== null ? getErrorMessage(query.error) : null;

  return (
    <ScrollView
      accessibilityLabel="Pantalla de matchmaking"
      contentContainerStyle={STYLES.scroll}
    >
      <Text accessibilityRole="header" style={STYLES.title}>
        Matchmaking
      </Text>
      <Text style={STYLES.subtitle}>
        Sugerencias para completar un partido (modo americano / partido).
      </Text>
      <ScreenFeedback message={errorMessage} variant="error" />
      <AppCard accessibilityLabel="Parámetros de búsqueda">
        <AppTextInput
          accessibilityHint="UUID del partido"
          label="matchId"
          onChangeText={(_text) => {
            setFilters({ matchmakingMatchId: _text });
          }}
          placeholder="UUID del partido"
          value={matchId}
        />
        <AppTextInput
          accessibilityHint="Entre 1 y 50"
          keyboardType="numeric"
          label="limit"
          onChangeText={(_text) => {
            const PARSED = Number.parseInt(_text, 10);
            if (Number.isNaN(PARSED)) {
              setFilters({ matchmakingLimit: 10 });
              return;
            }
            setFilters({ matchmakingLimit: PARSED });
          }}
          value={String(limit)}
        />
        {lastCreatedMatchId !== null ? (
          <AppButton
            accessibilityLabel="Usar el identificador del último partido creado"
            onPress={() => {
              setFilters({ matchmakingMatchId: lastCreatedMatchId });
            }}
            variant="secondary"
          >
            Usar último matchId
          </AppButton>
        ) : null}
        {!enabled && matchId.trim().length > 0 ? (
          <ScreenFeedback
            message="Introduce un matchId con formato UUID para cargar sugerencias."
            variant="info"
          />
        ) : null}
      </AppCard>
      <AppCard accessibilityLabel="Listado de sugerencias">
        <Text style={STYLES.cardTitle}>Sugerencias</Text>
        {query.isLoading ? <Text>Cargando…</Text> : null}
        {query.data !== undefined && query.data.length === 0 ? (
          <Text>No hay sugerencias disponibles.</Text>
        ) : null}
        {query.data?.map((_item) => (
          <View accessibilityLabel={`Sugerencia ${_item.name}`} key={_item.userId} style={STYLES.row}>
            <Text style={STYLES.name}>{_item.name}</Text>
            <Text style={STYLES.meta}>
              {_item.source}
              {_item.points !== undefined ? ` · ${_item.points} pts` : ''}
            </Text>
            <Text style={STYLES.meta}>{_item.userId}</Text>
          </View>
        ))}
      </AppCard>
    </ScrollView>
  );
}

const STYLES = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 8,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#555',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    paddingVertical: 8,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    color: '#555',
  },
});

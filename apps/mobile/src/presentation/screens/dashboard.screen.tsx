import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { API_BASE_URL } from '../../config/env';
import { useHealthQuery } from '../../hooks/use_health_query';
import { useSyncTabOnFocus } from '../../hooks/use_sync_tab_on_focus';
import { useAppStore } from '../../state/app.store';
import { getErrorMessage } from '../../utils/error_message';
import { AppButton } from '../components/app_button';
import { AppCard } from '../components/app_card';
import { ScreenFeedback } from '../components/screen_feedback';
import type { RootTabParamList } from '../navigation/root_tab_param_list';

type NavigationProp = BottomTabNavigationProp<RootTabParamList>;

export function DashboardScreen() {
  useSyncTabOnFocus('dashboard');
  const navigation = useNavigation<NavigationProp>();
  const { data, isLoading, isError, error, refetch, isFetching } = useHealthQuery();
  const activeTab = useAppStore((_state) => _state.activeTab);
  const lastCreatedMatchId = useAppStore((_state) => _state.lastCreatedMatchId);

  const errorMessage = isError ? getErrorMessage(error) : null;

  return (
    <ScrollView
      accessibilityLabel="Pantalla de inicio"
      contentContainerStyle={STYLES.scroll}
    >
      <Text accessibilityRole="header" style={STYLES.title}>
        Cuadrala Padel
      </Text>
      <Text style={STYLES.subtitle}>Fase 4: navegación, API y estado global.</Text>
      <ScreenFeedback message={errorMessage} variant="error" />
      <AppCard accessibilityLabel="Tarjeta de estado de la API">
        <Text style={STYLES.cardTitle}>API</Text>
        <Text style={STYLES.muted}>Base URL: {API_BASE_URL}</Text>
        {isLoading ? <Text>Cargando salud…</Text> : null}
        {data !== undefined ? (
          <>
            <Text>Estado: {data.status}</Text>
            <Text>Servicio: {data.service}</Text>
            <Text accessibilityLabel={`Marca de tiempo ${data.timestamp}`}>
              Última respuesta: {data.timestamp}
            </Text>
          </>
        ) : null}
        {isFetching && !isLoading ? <Text>Actualizando…</Text> : null}
        <AppButton
          accessibilityLabel="Actualizar estado de salud de la API"
          onPress={() => {
            void refetch();
          }}
        >
          Actualizar salud
        </AppButton>
      </AppCard>
      <AppCard accessibilityLabel="Tarjeta de estado local">
        <Text style={STYLES.cardTitle}>App</Text>
        <Text>Pestaña activa (store): {activeTab}</Text>
        <Text>Último partido creado: {lastCreatedMatchId ?? '—'}</Text>
      </AppCard>
      <View style={STYLES.quickRow}>
        <AppButton
          accessibilityLabel="Ir a la pantalla de crear partido americano"
          onPress={() => {
            navigation.navigate('CreateMatch');
          }}
        >
          Crear partido
        </AppButton>
        <AppButton
          accessibilityLabel="Ir a la pantalla de matchmaking"
          onPress={() => {
            navigation.navigate('Matchmaking');
          }}
          variant="secondary"
        >
          Matchmaking
        </AppButton>
      </View>
      <View style={STYLES.quickRow}>
        <AppButton
          accessibilityLabel="Ir a la pantalla de ranking"
          onPress={() => {
            navigation.navigate('Ranking');
          }}
          variant="secondary"
        >
          Ranking
        </AppButton>
      </View>
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
    fontSize: 24,
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
  muted: {
    color: '#666',
    fontSize: 13,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
});

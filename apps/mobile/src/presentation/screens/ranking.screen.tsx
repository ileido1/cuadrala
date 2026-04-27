import { ScrollView, StyleSheet, Text } from 'react-native';

import { useRecalculateRankingMutation } from '../../hooks/use_recalculate_ranking_mutation';
import { useSyncTabOnFocus } from '../../hooks/use_sync_tab_on_focus';
import { useAppStore } from '../../state/app.store';
import { getErrorMessage } from '../../utils/error_message';
import { isUuidString } from '../../utils/uuid';
import { AppButton } from '../components/app_button';
import { AppCard } from '../components/app_card';
import { AppTextInput } from '../components/app_text_input';
import { ScreenFeedback } from '../components/screen_feedback';

export function RankingScreen() {
  useSyncTabOnFocus('ranking');
  const filters = useAppStore((_state) => _state.filters);
  const setFilters = useAppStore((_state) => _state.setFilters);
  const mutation = useRecalculateRankingMutation();

  const categoryId = filters.rankingCategoryId;
  const canSubmit = isUuidString(categoryId);

  const serverError =
    mutation.isError && mutation.error !== null ? getErrorMessage(mutation.error) : null;
  const validationMessage =
    !canSubmit && categoryId.trim().length > 0
      ? 'El categoryId debe ser un UUID válido.'
      : null;
  const feedbackError = validationMessage ?? serverError;

  const result = mutation.isSuccess ? mutation.data : undefined;

  return (
    <ScrollView accessibilityLabel="Pantalla de ranking" contentContainerStyle={STYLES.scroll}>
      <Text accessibilityRole="header" style={STYLES.title}>
        Ranking
      </Text>
      <Text style={STYLES.subtitle}>Recalcular ranking por categoría.</Text>
      <ScreenFeedback message={feedbackError} variant="error" />
      {result !== undefined ? (
        <ScreenFeedback
          message={`Actualizado. Entradas: ${String(result.entriesUpdated)} · categoría: ${result.categoryId}`}
          variant="success"
        />
      ) : null}
      <AppCard accessibilityLabel="Formulario de recálculo de ranking">
        <AppTextInput
          accessibilityHint="UUID de la categoría"
          label="categoryId"
          onChangeText={(_text) => {
            setFilters({ rankingCategoryId: _text });
          }}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={categoryId}
        />
        <AppButton
          accessibilityLabel="Recalcular ranking para la categoría indicada"
          disabled={mutation.isPending || !canSubmit}
          onPress={() => {
            mutation.mutate(categoryId.trim());
          }}
        >
          {mutation.isPending ? 'Recalculando…' : 'Recalcular ranking'}
        </AppButton>
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
});

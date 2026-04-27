import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import type { CreateAmericanoBody } from '../../infrastructure/api/americano.api';
import { useCreateAmericanoMutation } from '../../hooks/use_create_americano_mutation';
import { useSyncTabOnFocus } from '../../hooks/use_sync_tab_on_focus';
import { useAppStore } from '../../state/app.store';
import { getErrorMessage } from '../../utils/error_message';
import { parseParticipantIds } from '../../utils/participants';
import { isUuidString } from '../../utils/uuid';
import { AppButton } from '../components/app_button';
import { AppCard } from '../components/app_card';
import { AppTextInput } from '../components/app_text_input';
import { ScreenFeedback } from '../components/screen_feedback';

export function CreateMatchScreen() {
  useSyncTabOnFocus('create_match');
  const [categoryId, setCategoryId] = useState('');
  const [participantsRaw, setParticipantsRaw] = useState('');
  const [courtId, setCourtId] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const setLastCreatedMatchId = useAppStore((_state) => _state.setLastCreatedMatchId);
  const mutation = useCreateAmericanoMutation();

  const serverError =
    mutation.isError && mutation.error !== null ? getErrorMessage(mutation.error) : null;
  const feedbackError = validationMessage ?? serverError;

  const onSubmit = () => {
    setValidationMessage(null);
    const IDS = parseParticipantIds(participantsRaw);
    if (!isUuidString(categoryId)) {
      setValidationMessage('El categoryId debe ser un UUID válido.');
      return;
    }
    if (IDS.length < 2) {
      setValidationMessage('Se requieren al menos dos participantes (UUIDs).');
      return;
    }
    const INVALID = IDS.filter((_id) => !isUuidString(_id));
    if (INVALID.length > 0) {
      setValidationMessage('Cada participante debe ser un UUID válido.');
      return;
    }
    const BODY: CreateAmericanoBody = {
      categoryId: categoryId.trim(),
      participantUserIds: IDS,
    };
    if (courtId.trim().length > 0) {
      if (!isUuidString(courtId)) {
        setValidationMessage('courtId debe ser un UUID válido o vacío.');
        return;
      }
      BODY.courtId = courtId.trim();
    }
    if (tournamentId.trim().length > 0) {
      if (!isUuidString(tournamentId)) {
        setValidationMessage('tournamentId debe ser un UUID válido o vacío.');
        return;
      }
      BODY.tournamentId = tournamentId.trim();
    }
    if (scheduledAt.trim().length > 0) {
      BODY.scheduledAt = scheduledAt.trim();
    }
    mutation.mutate(BODY, {
      onSuccess: (_data) => {
        setLastCreatedMatchId(_data.matchId);
      },
    });
  };

  const successData = mutation.isSuccess ? mutation.data : undefined;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={STYLES.flex}
    >
      <ScrollView
        accessibilityLabel="Pantalla para crear partido americano"
        contentContainerStyle={STYLES.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" style={STYLES.title}>
          Crear americano
        </Text>
        <ScreenFeedback message={feedbackError} variant="error" />
        {successData !== undefined ? (
          <ScreenFeedback
            message={`Partido creado. matchId: ${successData.matchId}`}
            variant="success"
          />
        ) : null}
        <AppCard accessibilityLabel="Formulario de creación de partido">
          <AppTextInput
            accessibilityHint="UUID de la categoría"
            label="categoryId"
            onChangeText={setCategoryId}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={categoryId}
          />
          <AppTextInput
            accessibilityHint="Lista de UUID de participantes separados por coma o salto de línea"
            label="participantUserIds"
            multiline
            onChangeText={setParticipantsRaw}
            placeholder="uuid1, uuid2, uuid3…"
            value={participantsRaw}
          />
          <AppTextInput
            accessibilityHint="Opcional"
            label="courtId (opcional)"
            onChangeText={setCourtId}
            value={courtId}
          />
          <AppTextInput
            accessibilityHint="Opcional"
            label="tournamentId (opcional)"
            onChangeText={setTournamentId}
            value={tournamentId}
          />
          <AppTextInput
            accessibilityHint="Fecha ISO 8601 con offset, opcional"
            label="scheduledAt (opcional)"
            onChangeText={setScheduledAt}
            placeholder="2026-04-07T12:00:00.000Z"
            value={scheduledAt}
          />
          <AppButton
            accessibilityLabel="Enviar formulario para crear partido americano"
            disabled={mutation.isPending}
            onPress={onSubmit}
          >
            {mutation.isPending ? 'Creando…' : 'Crear partido'}
          </AppButton>
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const STYLES = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
});

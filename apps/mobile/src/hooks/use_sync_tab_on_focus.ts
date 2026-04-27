import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

import type { AppTabId } from '../state/app.store';
import { useAppStore } from '../state/app.store';

export function useSyncTabOnFocus(_tab: AppTabId) {
  const setActiveTab = useAppStore((_state) => _state.setActiveTab);
  useFocusEffect(
    useCallback(() => {
      setActiveTab(_tab);
    }, [_tab, setActiveTab]),
  );
}

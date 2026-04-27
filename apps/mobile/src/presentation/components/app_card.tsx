import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

type AppCardProps = PropsWithChildren<{
  accessibilityLabel?: string;
}>;

export function AppCard(_props: AppCardProps) {
  const { children, accessibilityLabel } = _props;
  return (
    <View accessibilityLabel={accessibilityLabel} style={STYLES.card}>
      {children}
    </View>
  );
}

const STYLES = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    gap: 8,
    backgroundColor: '#fafafa',
  },
});

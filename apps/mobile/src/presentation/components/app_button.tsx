import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type AppButtonProps = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  variant?: 'primary' | 'secondary';
}>;

export function AppButton(_props: AppButtonProps) {
  const { onPress, disabled, accessibilityLabel, variant = 'primary', children } = _props;
  const IS_PRIMARY = variant === 'primary';
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        STYLES.base,
        IS_PRIMARY ? STYLES.primary : STYLES.secondary,
        Boolean(disabled) && STYLES.disabled,
        pressed && !disabled ? STYLES.pressed : undefined,
      ]}
    >
      <Text style={[STYLES.label, IS_PRIMARY ? STYLES.labelOnPrimary : STYLES.labelOnSecondary]}>
        {children}
      </Text>
    </Pressable>
  );
}

const STYLES = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#0d6efd',
  },
  secondary: {
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  labelOnPrimary: {
    color: '#fff',
  },
  labelOnSecondary: {
    color: '#212529',
  },
});

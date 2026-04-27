import { StyleSheet, Text, View } from 'react-native';

type FeedbackVariant = 'error' | 'success' | 'info';

const VARIANT_STYLES: Record<
  FeedbackVariant,
  { backgroundColor: string; borderColor: string; color: string }
> = {
  error: {
    backgroundColor: '#fdecea',
    borderColor: '#f5c2c0',
    color: '#842029',
  },
  success: {
    backgroundColor: '#d1e7dd',
    borderColor: '#badbcc',
    color: '#0f5132',
  },
  info: {
    backgroundColor: '#cff4fc',
    borderColor: '#b6effb',
    color: '#055160',
  },
};

type ScreenFeedbackProps = {
  message: string | null;
  variant: FeedbackVariant;
  accessibilityLabel?: string;
};

export function ScreenFeedback(_props: ScreenFeedbackProps) {
  const { message, variant, accessibilityLabel } = _props;
  if (message === null || message.length === 0) {
    return null;
  }
  const COLORS = VARIANT_STYLES[variant];
  return (
    <View
      accessibilityLabel={accessibilityLabel ?? message}
      accessibilityRole="alert"
      style={[
        STYLES.container,
        { backgroundColor: COLORS.backgroundColor, borderColor: COLORS.borderColor },
      ]}
    >
      <Text style={[STYLES.text, { color: COLORS.color }]}>{message}</Text>
    </View>
  );
}

const STYLES = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
});

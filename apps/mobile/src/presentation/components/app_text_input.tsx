import { StyleSheet, Text, TextInput, View } from 'react-native';

type AppTextInputProps = {
  label: string;
  value: string;
  onChangeText: (_text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'numbers-and-punctuation';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  accessibilityHint?: string;
};

export function AppTextInput(_props: AppTextInputProps) {
  const {
    label,
    value,
    onChangeText,
    placeholder,
    multiline,
    keyboardType,
    autoCapitalize,
    accessibilityHint,
  } = _props;
  const INPUT_ID = label.replace(/\s+/g, '-').toLowerCase();
  return (
    <View style={STYLES.wrapper}>
      <Text accessibilityLabel={label} nativeID={`${INPUT_ID}-label`} style={STYLES.label}>
        {label}
      </Text>
      <TextInput
        accessibilityHint={accessibilityHint}
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize ?? 'none'}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        nativeID={`${INPUT_ID}-input`}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={[STYLES.input, multiline === true ? STYLES.inputMultiline : undefined]}
        value={value}
      />
    </View>
  );
}

const STYLES = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});

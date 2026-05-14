import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { theme } from '../../shell/theme';

type LabeledFieldProps = TextInputProps & {
  label: string;
  errorMessage?: string;
};

export function LabeledField({ label, errorMessage, style, ...rest }: LabeledFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, errorMessage ? styles.inputError : null, style]}
        {...rest}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacingMd,
  },
  label: {
    color: theme.textPrimary,
    fontWeight: '600',
    marginBottom: theme.spacingXs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.spacingMd,
    paddingVertical: theme.spacingSm,
    fontSize: 16,
    color: theme.textPrimary,
    backgroundColor: theme.background,
  },
  inputError: {
    borderColor: theme.destructive,
  },
  error: {
    marginTop: theme.spacingXs,
    color: theme.destructive,
    fontSize: 13,
  },
});

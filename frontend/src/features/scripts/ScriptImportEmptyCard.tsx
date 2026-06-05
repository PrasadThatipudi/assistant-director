import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { theme } from '../../shell/theme';
import { PrimaryButton } from '../../shared/ui/PrimaryButton';

export type ScriptImportEmptyCardProps = {
  disabled: boolean;
  importStatusText: string | null;
  onChooseFile: () => void | Promise<void>;
  onPaste: () => void | Promise<void>;
};

const CARD_SHADOW = Platform.select<ViewStyle>({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  android: {
    elevation: 4,
  },
  web: {
    boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.1)',
  },
  default: {},
});

export function ScriptImportEmptyCard({
  disabled,
  importStatusText,
  onChooseFile,
  onPaste,
}: ScriptImportEmptyCardProps) {
  const subtitleWeb = Platform.OS === 'web' ? ' or drop a .txt file on this card.' : '';
  const subtitle = `Use a UTF-8 .txt file in the Assistant Director template, or paste from your clipboard.${subtitleWeb}`;

  return (
    <View style={[styles.card, CARD_SHADOW]}>
      <Ionicons
        name="cloud-upload-outline"
        size={44}
        color={theme.primaryAction}
        accessibilityLabel="Upload screenplay"
      />
      <Text style={styles.title}>Add your screenplay</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {importStatusText ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={theme.primaryAction} size="small" />
          <Text style={styles.statusText}>{importStatusText}</Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        <PrimaryButton
          label={disabled ? 'Importing…' : 'Choose .txt file'}
          variant="primary"
          disabled={disabled}
          onPress={() => void onChooseFile()}
        />
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Paste screenplay from clipboard"
          disabled={disabled}
          onPress={() => void onPaste()}
          hitSlop={8}
        >
          <Text style={[styles.pasteLink, disabled && styles.pasteLinkDisabled]}>Paste from clipboard</Text>
        </Pressable>
      </View>
      <Text style={styles.footnote}>
        Files stay only on this device and are never sent to the server.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: theme.background,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderLight,
    padding: theme.spacingLg,
    alignItems: 'center',
    gap: theme.spacingSm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacingXs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacingSm,
    paddingVertical: theme.spacingXs,
  },
  statusText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  actions: {
    width: '100%',
    gap: theme.spacingMd,
    marginTop: theme.spacingSm,
  },
  pasteLink: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.primaryAction,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  pasteLinkDisabled: {
    opacity: 0.45,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacingXs,
  },
});

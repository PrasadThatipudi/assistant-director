import { useCallback, useLayoutEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../shell/navigationTypes';
import { theme } from '../../../shell/theme';
import { PrimaryButton } from '../../../shared/ui/PrimaryButton';
import { Screen } from '../../../shared/ui/Screen';
import {
  formatScriptValidationError,
  getScriptCacheRow,
  importScriptForProjectLocally,
  isSpScreenplayFileName,
  type ScriptImportPhase,
} from '../../scripts';
import { getApiBaseUrl } from '../../../shared/lib/env';
import { projectRepository } from '../data/projectRepository';
import { useProject } from '../hooks/useProject';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectDetail'>;

function importPhaseLabel(phase: ScriptImportPhase): string {
  if (phase === 'validating') {
    return 'Validating screenplay…';
  }
  return 'Saving on this device…';
}

function shouldShowExpoGoHttpBanner(): boolean {
  const base = getApiBaseUrl();
  return Constants.executionEnvironment === 'storeClient' && base.toLowerCase().startsWith('http://');
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ProjectDetailScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const { project, loading, refresh } = useProject(projectId);
  const [scriptMeta, setScriptMeta] = useState<ReturnType<typeof getScriptCacheRow>>(null);
  const [scriptImporting, setScriptImporting] = useState(false);
  const [scriptImportPhase, setScriptImportPhase] = useState<ScriptImportPhase | null>(null);
  const [expoGoBannerDismissed, setExpoGoBannerDismissed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setScriptMeta(getScriptCacheRow(projectId));
    }, [projectId]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: project?.title ?? 'Project',
      headerRight: () =>
        project ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit project"
            onPress={() => navigation.navigate('ProjectEdit', { projectId: project.id })}
            hitSlop={8}
          >
            <Text style={styles.headerAction}>Edit</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, project]);

  if (loading && !project) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primaryAction} />
        </View>
      </Screen>
    );
  }

  if (!project) {
    return (
      <Screen>
        <Text style={styles.errorText}>This project could not be found.</Text>
        <PrimaryButton label="Back to dashboard" onPress={() => navigation.popToTop()} />
      </Screen>
    );
  }

  const confirmArchive = () => {
    Alert.alert(
      'Archive project?',
      'Archived projects stay available when you enable “Show archived” on the dashboard.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            await projectRepository.archive(project.id);
            await refresh();
            navigation.popToTop();
          },
        },
      ],
    );
  };

  const pickAndAttachScript = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.length) {
        return;
      }
      const asset = picked.assets[0];
      const pickedName = asset.name ?? 'script';
      if (!isSpScreenplayFileName(pickedName)) {
        Alert.alert(
          'Wrong file type',
          'Only .sp screenplay files can be attached. Save or export your script with the .sp extension and try again.',
        );
        return;
      }

      setScriptImporting(true);
      setScriptImportPhase('validating');
      const attachment = await importScriptForProjectLocally(
        project.id,
        asset.uri,
        pickedName,
        'text/x-sp',
        (phase) => setScriptImportPhase(phase),
      );
      setScriptMeta(getScriptCacheRow(project.id));

      const successMessage = `"${pickedName}" is saved on this device only (v${attachment.version}). The server never receives your screenplay bytes.`;

      const cachedAfterImport = getScriptCacheRow(project.id);
      const alertButtons: { text: string; style?: 'cancel'; onPress?: () => void }[] = [
        { text: 'OK', style: 'cancel' },
      ];
      if (cachedAfterImport) {
        alertButtons.unshift({
          text: 'Open script',
          onPress: () => navigation.navigate('ScriptReader', { projectId: project.id }),
        });
      }
      Alert.alert('Script attached', successMessage, alertButtons);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Import failed';
      const validationAlert = formatScriptValidationError(message);
      if (validationAlert) {
        Alert.alert(validationAlert.title, validationAlert.message);
        return;
      }
      if (message.includes('SCRIPT_IMPORT_TOO_LARGE')) {
        Alert.alert('File too large', 'Choose a screenplay under 20 MB.');
        return;
      }
      if (message.startsWith('SCRIPT_IMPORT_')) {
        Alert.alert(
          'Could not save script',
          'The file could not be read or written to secure storage on this device. Try picking the file again.',
        );
        return;
      }
      Alert.alert('Import failed', message);
    } finally {
      setScriptImporting(false);
      setScriptImportPhase(null);
    }
  };

  const confirmUnarchive = () => {
    Alert.alert('Restore project?', 'This project will return to your active list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: async () => {
          await projectRepository.unarchive(project.id);
          await refresh();
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{project.title}</Text>
        {project.description.length > 0 ? (
          <Text style={styles.description}>{project.description}</Text>
        ) : (
          <Text style={styles.placeholder}>No description yet.</Text>
        )}

        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Created</Text>
          <Text style={styles.metaValue}>{formatTimestamp(project.createdAt)}</Text>
          <Text style={styles.metaLabel}>Last updated</Text>
          <Text style={styles.metaValue}>{formatTimestamp(project.updatedAt)}</Text>
          {project.isArchived && project.archivedAt ? (
            <>
              <Text style={styles.metaLabel}>Archived</Text>
              <Text style={styles.metaValue}>{formatTimestamp(project.archivedAt)}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.scriptBlock}>
          {shouldShowExpoGoHttpBanner() && !expoGoBannerDismissed ? (
            <View style={styles.expoGoBanner}>
              <Text style={styles.expoGoBannerText}>
                Sync and registration may fail in Expo Go with http:// to your computer. Use a development
                build or an https:// API URL.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpoGoBannerDismissed(true)}
                hitSlop={8}
              >
                <Text style={styles.expoGoBannerDismiss}>Dismiss</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={styles.metaLabel}>Script (this device)</Text>
          {scriptMeta ? (
            <>
              <Text style={styles.metaValue}>
                v{scriptMeta.version} — {scriptMeta.mimeType}
              </Text>
              <PrimaryButton
                label="Open script"
                disabled={scriptImporting}
                onPress={() => navigation.navigate('ScriptReader', { projectId: project.id })}
              />
            </>
          ) : (
            <Text style={styles.helper}>
              Attach a .sp screenplay. Files stay only on this device; they are never sent to the server.
            </Text>
          )}
          {scriptImporting && scriptImportPhase ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color={theme.primaryAction} size="small" />
              <Text style={styles.uploadingText}>{importPhaseLabel(scriptImportPhase)}</Text>
            </View>
          ) : null}
          <PrimaryButton
            label={scriptImporting ? 'Importing…' : 'Attach script'}
            variant="secondary"
            disabled={scriptImporting}
            onPress={() => void pickAndAttachScript()}
          />
        </View>

        {project.isArchived ? (
          <PrimaryButton label="Restore project" onPress={confirmUnarchive} />
        ) : (
          <PrimaryButton label="Archive project" variant="destructive" onPress={confirmArchive} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    color: theme.primaryAction,
    fontWeight: '600',
    fontSize: 16,
    paddingHorizontal: theme.spacingMd,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: theme.spacingMd,
    paddingBottom: theme.spacingLg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.textSecondary,
  },
  placeholder: {
    fontSize: 15,
    color: theme.textSecondary,
    fontStyle: 'italic',
  },
  metaBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    paddingTop: theme.spacingMd,
    gap: theme.spacingXs,
  },
  scriptBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    paddingTop: theme.spacingMd,
    gap: theme.spacingSm,
  },
  helper: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacingSm,
    paddingVertical: theme.spacingXs,
  },
  uploadingText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  expoGoBanner: {
    backgroundColor: theme.canvas,
    borderColor: theme.borderLight,
    borderWidth: 1,
    borderRadius: theme.radiusMd,
    padding: theme.spacingMd,
    gap: theme.spacingSm,
  },
  expoGoBannerText: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.textSecondary,
  },
  expoGoBannerDismiss: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primaryAction,
    alignSelf: 'flex-end',
  },
  metaLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 15,
    color: theme.textPrimary,
    marginBottom: theme.spacingSm,
    fontVariant: ['tabular-nums'],
  },
  errorText: {
    color: theme.textSecondary,
    marginBottom: theme.spacingMd,
    fontSize: 16,
  },
});

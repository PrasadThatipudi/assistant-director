import { useCallback, useLayoutEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
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
  importScriptTextForProjectLocally,
  isScreenplayTemplateFileName,
  type LocalScriptAttachment,
  type ScriptImportPhase,
} from '../../scripts';
import { ScriptImportEmptyCard } from '../../scripts/ScriptImportEmptyCard';
import { WebScriptDropZone } from '../../scripts/WebScriptDropZone';
import { formatAttachedScriptSummary } from '../../scripts/scriptUiCopy';
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

const WRONG_EXTENSION_MESSAGE =
  'Only .txt files in the Assistant Director screenplay template can be attached. Save your script as UTF-8 plain text with a .txt extension and try again.';

const PASTED_SCREENPLAY_FILENAME = 'Pasted screenplay.txt';

function handleScriptImportFailure(e: unknown): void {
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
  Alert.alert('Import failed', 'Something went wrong. Try again.');
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

  const announceScriptAttached = (pickedName: string, version: number) => {
    setScriptMeta(getScriptCacheRow(project.id));
    const successMessage = `"${pickedName}" is saved on this device only (version ${version}). The server never receives your screenplay bytes.`;
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
  };

  const runScriptImport = async (
    importer: (onPhase: (phase: ScriptImportPhase) => void) => Promise<LocalScriptAttachment>,
    displayName: string,
  ) => {
    setScriptImporting(true);
    setScriptImportPhase('validating');
    try {
      const attachment = await importer((phase) => setScriptImportPhase(phase));
      announceScriptAttached(displayName, attachment.version);
    } catch (e) {
      handleScriptImportFailure(e);
    } finally {
      setScriptImporting(false);
      setScriptImportPhase(null);
    }
  };

  const pickAndAttachScript = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['text/plain', 'text/*'],
      });
      if (picked.canceled || !picked.assets?.length) {
        return;
      }
      const asset = picked.assets[0];
      const pickedName = asset.name ?? 'script.txt';
      if (!isScreenplayTemplateFileName(pickedName)) {
        Alert.alert('Wrong file type', WRONG_EXTENSION_MESSAGE);
        return;
      }

      await runScriptImport(
        (onPhase) =>
          importScriptForProjectLocally(project.id, asset.uri, pickedName, 'text/plain', onPhase),
        pickedName,
      );
    } catch (e) {
      handleScriptImportFailure(e);
    }
  };

  const pasteScriptFromClipboard = async () => {
    try {
      const hasString = await Clipboard.hasStringAsync();
      if (!hasString) {
        Alert.alert('Nothing to paste', 'Your clipboard does not contain text.');
        return;
      }
      const text = await Clipboard.getStringAsync();
      if (!text.trim()) {
        Alert.alert('Nothing to paste', 'Your clipboard is empty.');
        return;
      }

      await runScriptImport(
        (onPhase) =>
          importScriptTextForProjectLocally(
            project.id,
            text,
            { sourceFilename: PASTED_SCREENPLAY_FILENAME, mimeType: 'text/plain' },
            onPhase,
          ),
        PASTED_SCREENPLAY_FILENAME,
      );
    } catch (e) {
      handleScriptImportFailure(e);
    }
  };

  const importDroppedOrPastedText = (text: string, sourceFileName: string) => {
    void runScriptImport(
      (onPhase) =>
        importScriptTextForProjectLocally(
          project.id,
          text,
          { sourceFilename: sourceFileName, mimeType: 'text/plain' },
          onPhase,
        ),
      sourceFileName,
    );
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
                {formatAttachedScriptSummary({
                  version: scriptMeta.version,
                  sourceFilename: scriptMeta.sourceFilename,
                })}
              </Text>
              <PrimaryButton
                label="Open script"
                disabled={scriptImporting}
                onPress={() => navigation.navigate('ScriptReader', { projectId: project.id })}
              />
            </>
          ) : Platform.OS === 'web' ? (
            <WebScriptDropZone
              disabled={scriptImporting}
              onAcceptedText={(text, name) => importDroppedOrPastedText(text, name)}
              onRejectedNonTxt={() => Alert.alert('Wrong file type', WRONG_EXTENSION_MESSAGE)}
            >
              <ScriptImportEmptyCard
                disabled={scriptImporting}
                importStatusText={
                  scriptImporting && scriptImportPhase ? importPhaseLabel(scriptImportPhase) : null
                }
                onChooseFile={pickAndAttachScript}
                onPaste={pasteScriptFromClipboard}
              />
            </WebScriptDropZone>
          ) : (
            <ScriptImportEmptyCard
              disabled={scriptImporting}
              importStatusText={
                scriptImporting && scriptImportPhase ? importPhaseLabel(scriptImportPhase) : null
              }
              onChooseFile={pickAndAttachScript}
              onPaste={pasteScriptFromClipboard}
            />
          )}
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

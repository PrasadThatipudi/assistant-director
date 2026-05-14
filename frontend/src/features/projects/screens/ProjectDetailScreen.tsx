import { useCallback, useLayoutEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../shell/navigationTypes';
import { theme } from '../../../shell/theme';
import { PrimaryButton } from '../../../shared/ui/PrimaryButton';
import { Screen } from '../../../shared/ui/Screen';
import { useBootstrap } from '../../../shared/context/BootstrapContext';
import { getScriptCacheRow, uploadScriptForProject } from '../../scripts/scriptStorage';
import { projectRepository } from '../data/projectRepository';
import { useProject } from '../hooks/useProject';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectDetail'>;

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
  const { canPerformOperations, isOfflineMode, bootstrapState } = useBootstrap();
  const [scriptMeta, setScriptMeta] = useState<ReturnType<typeof getScriptCacheRow>>(null);

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

  const pickAndUploadScript = async () => {
    // Check bootstrap state before allowing upload
    if (!canPerformOperations) {
      Alert.alert(
        'App not ready',
        bootstrapState === 'loading' || bootstrapState === 'retrying'
          ? 'The app is still initializing. Please wait a moment and try again.'
          : 'App initialization failed. Please restart the app or check your connection.',
      );
      return;
    }

    try {
      const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.length) {
        return;
      }
      const asset = picked.assets[0];
      await uploadScriptForProject(
        project.id,
        asset.uri,
        asset.name ?? 'script',
        asset.mimeType ?? 'application/octet-stream',
      );
      setScriptMeta(getScriptCacheRow(project.id));
      
      const successMessage = isOfflineMode 
        ? 'Script saved locally. It will sync when you go online.'
        : 'Script uploaded successfully and cached locally.';
      Alert.alert('Script saved', successMessage);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed';
      if (message.includes('API is not configured')) {
        Alert.alert(
          'Backend not configured',
          'The API endpoint is not set. Check that EXPO_PUBLIC_API_BASE_URL is set in frontend/.env and restart Metro.',
        );
        return;
      }
      if (message.includes('AUTH_REQUIRED_FOR_UPLOAD') || message.includes('Unknown user')) {
        Alert.alert(
          'Authentication issue',
          'The app cannot authenticate with the server. This may happen if the app started while offline. Try restarting the app with a network connection.',
        );
        return;
      }
      if (message.includes('Project not found')) {
        Alert.alert(
          'Project sync pending',
          'This project hasn\'t synced to the server yet. In offline mode, scripts are saved locally and will upload when you go online.',
        );
        return;
      }
      if (message.includes('USER_REGISTER_NETWORK:')) {
        Alert.alert(
          'Network connection issue',
          'Expo Go often blocks plain HTTP to your computer on Wi‑Fi. Use a development build (`expo run:ios` / `expo run:android` after installing dependencies) so native settings apply, or point EXPO_PUBLIC_API_BASE_URL at an HTTPS URL (e.g. ngrok). See the README section “Expo Go, LAN HTTP, and development builds”.',
        );
        return;
      }
      if (message.includes('SCRIPT_UPLOAD_NETWORK:')) {
        Alert.alert(
          'Upload failed',
          'Same as registration: Expo Go plus http:// to your LAN is unreliable. Prefer a dev build with cleartext/ATS from app.config, or an HTTPS API URL. Confirm Safari on the phone can open your API /docs URL.',
        );
        return;
      }
      if (message.includes('CREATE_PROJECT_NETWORK:')) {
        Alert.alert(
          'Could not create project on server',
          'The device could not reach the API over the network. Check EXPO_PUBLIC_API_BASE_URL, Wi‑Fi, and whether you are on Expo Go with plain HTTP (see README).',
        );
        return;
      }
      Alert.alert('Upload failed', message);
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
          <Text style={styles.metaLabel}>Script (offline cache)</Text>
          {scriptMeta ? (
            <>
              <Text style={styles.metaValue}>
                Cached v{scriptMeta.version} — {scriptMeta.mimeType}
              </Text>
              <PrimaryButton
                label="Open cached script"
                onPress={() => navigation.navigate('ScriptReader', { projectId: project.id })}
              />
            </>
          ) : (
            <Text style={styles.helper}>Upload while online to keep a local copy for offline reading.</Text>
          )}
          <PrimaryButton
            label="Upload script"
            variant="secondary"
            onPress={() => void pickAndUploadScript()}
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

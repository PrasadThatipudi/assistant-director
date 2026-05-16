import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../shell/navigationTypes';
import { theme } from '../../../shell/theme';
import { LabeledField } from '../../../shared/ui/LabeledField';
import { Screen } from '../../../shared/ui/Screen';
import { BackendConnectivityTest } from '../../../shared/debug/BackendConnectivityTest';
import { useBootstrap } from '../../../shared/context/BootstrapContext';
import { projectRepository } from '../data/projectRepository';
import { validateProjectDraft } from '../domain/project.validators';
import { useProject } from '../hooks/useProject';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectEdit'>;

export function ProjectEditScreen({ navigation, route }: Props) {
  const projectId = route.params?.projectId;
  const isCreate = !projectId;
  const { project, loading } = useProject(projectId);
  const { bootstrapState, canPerformOperations, isOfflineMode } = useBootstrap();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!project) {
      return;
    }
    setTitle(project.title);
    setDescription(project.description);
  }, [project]);

  const persist = useCallback(async () => {
    console.log('[ProjectEdit] Starting persist operation', {
      isCreate,
      projectId,
      title: title.substring(0, 50),
      bootstrapState,
      canPerformOperations
    });
    setFormError(null);

    // Check if bootstrap is complete before allowing operations
    if (!canPerformOperations) {
      const message = bootstrapState === 'loading' || bootstrapState === 'retrying'
        ? 'App is still initializing. Please wait a moment and try again.'
        : 'App initialization failed. Please retry or restart the app.';
      console.log('[ProjectEdit] Bootstrap not ready:', { bootstrapState, message });
      setFormError(message);
      return;
    }

    const result = validateProjectDraft({ title, description });
    if (!result.ok) {
      console.log('[ProjectEdit] Validation failed:', result.message);
      setFormError(result.message);
      return;
    }
    console.log('[ProjectEdit] Validation passed');

    setSaving(true);
    try {
      if (isCreate) {
        console.log('[ProjectEdit] Creating new project...');
        const created = await projectRepository.create(result.value);
        console.log('[ProjectEdit] Project created successfully:', created.id);
        navigation.replace('ProjectDetail', { projectId: created.id });
        return;
      }
      if (!projectId) {
        console.log('[ProjectEdit] No projectId for update, returning');
        return;
      }
      console.log('[ProjectEdit] Updating existing project:', projectId);
      const updated = await projectRepository.update(projectId, result.value);
      if (!updated) {
        console.log('[ProjectEdit] Update failed - project no longer exists');
        setFormError('Project no longer exists.');
        return;
      }
      console.log('[ProjectEdit] Project updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('[ProjectEdit] Save operation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[ProjectEdit] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      // Display user-friendly error messages based on error type
      if (errorMessage.includes('App bootstrap incomplete')) {
        setFormError('App is still initializing. Please wait a moment and try again.');
      } else if (errorMessage.includes('USER_REGISTER_NETWORK')) {
        setFormError('Cannot connect to the server. Check your internet connection and ensure the backend is running.');
      } else if (errorMessage.includes('SQLITE')) {
        setFormError('Database error. Try restarting the app.');
      } else {
        setFormError(`Save failed: ${errorMessage}`);
      }
    } finally {
      setSaving(false);
      console.log('[ProjectEdit] Persist operation completed, saving state reset');
    }
  }, [description, isCreate, navigation, projectId, title]);

  useLayoutEffect(() => {
    const isSaveDisabled = saving || !canPerformOperations;
    const saveButtonText = (() => {
      if (saving) return 'Saving...';
      if (bootstrapState === 'loading' || bootstrapState === 'retrying') return 'Loading...';
      if (bootstrapState === 'failed') return 'Failed';
      if (isOfflineMode) return 'Save (Offline)';
      return 'Save';
    })();

    navigation.setOptions({
      title: isCreate ? 'New project' : 'Edit project',
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save project"
          onPress={() => {
            if (!isSaveDisabled) {
              void persist();
            }
          }}
          hitSlop={8}
          disabled={isSaveDisabled}
        >
          <Text style={[styles.headerAction, isSaveDisabled && styles.headerDisabled]}>
            {saveButtonText}
          </Text>
        </Pressable>
      ),
    });
  }, [isCreate, navigation, persist, saving, canPerformOperations, bootstrapState, isOfflineMode]);

  if (!isCreate && loading && !project) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primaryAction} />
        </View>
      </Screen>
    );
  }

  if (!isCreate && !loading && !project) {
    return (
      <Screen>
        <Text style={styles.errorText}>This project could not be found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {formError ? <Text style={styles.banner}>{formError}</Text> : null}

      {/* Bootstrap status indicator */}
      {bootstrapState !== 'success' && (
        <View style={[
          styles.statusBanner,
          bootstrapState === 'offline' ? styles.statusOffline : styles.statusLoading
        ]}>
          <Text style={styles.statusText}>
            {bootstrapState === 'loading' && '🔄 Initializing app...'}
            {bootstrapState === 'retrying' && '🔄 Retrying connection...'}
            {bootstrapState === 'failed' && '⚠️ Connection failed'}
            {bootstrapState === 'offline' && '📱 Offline mode - changes will sync later'}
          </Text>
        </View>
      )}

      <LabeledField label="Title" value={title} onChangeText={setTitle} autoFocus={isCreate} />
      <LabeledField
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        style={styles.descriptionInput}
      />
      {__DEV__ && <BackendConnectivityTest />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    color: theme.primaryAction,
    fontWeight: '700',
    fontSize: 16,
    paddingHorizontal: theme.spacingMd,
  },
  headerDisabled: {
    opacity: 0.4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    backgroundColor: '#FFF4F4',
    borderColor: theme.destructive,
    borderWidth: StyleSheet.hairlineWidth,
    color: theme.destructive,
    padding: theme.spacingSm,
    borderRadius: theme.radiusSm,
    marginBottom: theme.spacingMd,
  },
  statusBanner: {
    padding: theme.spacingSm,
    borderRadius: theme.radiusSm,
    marginBottom: theme.spacingMd,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusLoading: {
    backgroundColor: '#FFF9E6',
    borderColor: '#F59E0B',
  },
  statusOffline: {
    backgroundColor: '#F0F9FF',
    borderColor: '#3B82F6',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  descriptionInput: {
    minHeight: 140,
  },
  errorText: {
    color: theme.textSecondary,
    fontSize: 16,
  },
});

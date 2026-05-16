import { useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../shell/navigationTypes';
import { theme } from '../../../shell/theme';
import { Screen } from '../../../shared/ui/Screen';
import { useBootstrap } from '../../../shared/context/BootstrapContext';
import { ProjectListItem } from '../components/ProjectListItem';
import { useProjects } from '../hooks/useProjects';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const { active, archived, loading, refresh } = useProjects();
  const { isOfflineMode, bootstrapState } = useBootstrap();
  const [showArchived, setShowArchived] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create new project"
          onPress={() => navigation.navigate('ProjectEdit', {})}
          hitSlop={8}
        >
          <Text style={styles.headerAction}>New</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <Screen padded={false}>
      {/* Bootstrap status indicator */}
      {isOfflineMode && (
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>📱 Offline mode - changes will sync when connected</Text>
        </View>
      )}

      <View style={styles.toolbar}>
        <Text style={styles.toolbarLabel}>Show archived</Text>
        <Switch
          accessibilityLabel="Toggle archived projects"
          value={showArchived}
          onValueChange={setShowArchived}
          trackColor={{ false: theme.borderLight, true: theme.primaryAction }}
          thumbColor={theme.background}
        />
      </View>
      {loading && active.length === 0 && archived.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primaryAction} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.primaryAction} />
          }
        >
          <Text style={styles.sectionLabel}>Active projects</Text>
          {active.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No active projects</Text>
              <Text style={styles.emptyBody}>
                Tap New to create your first production workspace.
              </Text>
            </View>
          ) : (
            active.map((project) => (
              <ProjectListItem
                key={project.id}
                project={project}
                onPress={() =>
                  navigation.navigate('ProjectDetail', { projectId: project.id })
                }
              />
            ))
          )}

          {showArchived ? (
            <View style={styles.archivedBlock}>
              <Text style={styles.sectionLabel}>Archived</Text>
              {archived.length === 0 ? (
                <Text style={styles.muted}>No archived projects yet.</Text>
              ) : (
                archived.map((project) => (
                  <ProjectListItem
                    key={project.id}
                    project={project}
                    onPress={() =>
                      navigation.navigate('ProjectDetail', { projectId: project.id })
                    }
                  />
                ))
              )}
            </View>
          ) : null}
        </ScrollView>
      )}
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacingMd,
    paddingVertical: theme.spacingSm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    backgroundColor: theme.canvas,
  },
  toolbarLabel: {
    color: theme.textPrimary,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: theme.spacingLg,
  },
  sectionLabel: {
    marginTop: theme.spacingMd,
    marginBottom: theme.spacingSm,
    paddingHorizontal: theme.spacingMd,
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  archivedBlock: {
    marginTop: theme.spacingSm,
  },
  muted: {
    paddingHorizontal: theme.spacingMd,
    color: theme.textSecondary,
    fontSize: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingHorizontal: theme.spacingMd,
    paddingVertical: theme.spacingSm,
    gap: theme.spacingSm,
  },
  emptyTitle: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyBody: {
    color: theme.textSecondary,
    fontSize: 15,
    lineHeight: 20,
  },
  offlineIndicator: {
    backgroundColor: '#F0F9FF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3B82F6',
    paddingHorizontal: theme.spacingMd,
    paddingVertical: theme.spacingSm,
  },
  offlineText: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

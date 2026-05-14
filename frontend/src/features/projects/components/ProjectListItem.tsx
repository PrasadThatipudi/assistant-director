import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Project } from '../domain/project.types';
import { theme } from '../../../shell/theme';

type ProjectListItemProps = {
  project: Project;
  onPress: () => void;
};

export function ProjectListItem({ project, onPress }: ProjectListItemProps) {
  const meta = new Date(project.updatedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={1}>
          {project.title}
        </Text>
        {project.description.length > 0 ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {project.description}
          </Text>
        ) : null}
        <Text style={styles.meta}>Updated {meta}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: theme.spacingMd,
    paddingHorizontal: theme.spacingMd,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  pressed: {
    backgroundColor: theme.canvas,
  },
  textBlock: {
    gap: theme.spacingXs,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  meta: {
    color: theme.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});

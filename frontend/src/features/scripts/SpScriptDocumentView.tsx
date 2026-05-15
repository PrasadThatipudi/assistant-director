import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SpDocument } from './parsing/scriptParsingAdapter';

import { theme } from '../../shell/theme';

type Props = {
  document: SpDocument;
};

export function SpScriptDocumentView({ document }: Props) {
  const headerEntries = Object.entries(document.header);
  const sceneSignature = useMemo(
    () => document.scenes.map((s) => s.number).join(','),
    [document],
  );
  const [collapsedSceneNumbers, setCollapsedSceneNumbers] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setCollapsedSceneNumbers(new Set());
  }, [sceneSignature]);

  const isCollapsed = useCallback(
    (sceneNumber: number) => collapsedSceneNumbers.has(sceneNumber),
    [collapsedSceneNumbers],
  );

  const toggleScene = useCallback((sceneNumber: number) => {
    setCollapsedSceneNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(sceneNumber)) {
        next.delete(sceneNumber);
      } else {
        next.add(sceneNumber);
      }
      return next;
    });
  }, []);

  const expandAllScenes = useCallback(() => {
    setCollapsedSceneNumbers(new Set());
  }, []);

  const collapseAllScenes = useCallback(() => {
    setCollapsedSceneNumbers(new Set(document.scenes.map((s) => s.number)));
  }, [document.scenes]);

  const allScenesCollapsed =
    document.scenes.length > 0 && collapsedSceneNumbers.size === document.scenes.length;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={[styles.headerCard, { borderColor: theme.borderLight, backgroundColor: theme.canvas }]}>
        {headerEntries.length === 0 ? (
          <Text style={[styles.muted, { color: theme.textSecondary }]}>No document header</Text>
        ) : (
          headerEntries.map(([k, v]) => (
            <Text key={k} style={[styles.headerRow, { color: theme.textPrimary }]}>
              <Text style={styles.headerKey}>{k}: </Text>
              {v}
            </Text>
          ))
        )}
      </View>

      {document.scenes.length > 0 ? (
        <View style={styles.sceneToolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={allScenesCollapsed ? 'Expand all scenes' : 'Collapse all scenes'}
            onPress={allScenesCollapsed ? expandAllScenes : collapseAllScenes}
            hitSlop={8}
          >
            <Text style={[styles.sceneToolbarLink, { color: theme.primaryAction }]}>
              {allScenesCollapsed ? 'Expand all' : 'Collapse all'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {document.scenes.map((scene) => {
        const collapsed = isCollapsed(scene.number);
        return (
          <View
            key={scene.number}
            style={[styles.sceneCard, { borderColor: theme.borderLight, backgroundColor: theme.canvas }]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Scene ${scene.number}`}
              accessibilityState={{ expanded: !collapsed }}
              onPress={() => toggleScene(scene.number)}
              hitSlop={4}
            >
              <View style={styles.sceneHeaderRow}>
                <Text style={[styles.sceneTitle, { color: theme.textPrimary }]}>Scene {scene.number}</Text>
                <Text style={[styles.sceneChevron, { color: theme.textSecondary }]}>
                  {collapsed ? '▶' : '▼'}
                </Text>
              </View>
            </Pressable>

            {Object.entries(scene.meta).map(([k, v]) => (
              <Text key={k} style={[styles.metaRow, { color: theme.textSecondary }]}>
                <Text style={[styles.metaKey, { color: theme.textPrimary }]}>{k}: </Text>
                {v}
              </Text>
            ))}

            {!collapsed
              ? scene.blocks.map((block, idx) => {
                  const key = `${scene.number}-${idx}`;
                  if (block.kind === 'action') {
                    return (
                      <View
                        key={key}
                        style={[
                          styles.noteBlock,
                          { borderLeftColor: theme.primaryAction, backgroundColor: theme.canvas },
                        ]}
                      >
                        <Text style={[styles.blockLabel, { color: theme.primaryAction }]}>Action</Text>
                        <Text style={[styles.noteBody, { color: theme.textPrimary }]}>
                          {block.lines.join('\n')}
                        </Text>
                      </View>
                    );
                  }
                  if (block.kind === 'note') {
                    return (
                      <View
                        key={key}
                        style={[
                          styles.noteBlock,
                          { borderLeftColor: theme.warning, backgroundColor: theme.canvas },
                        ]}
                      >
                        <Text style={[styles.blockLabel, { color: theme.warning }]}>{block.noteType}</Text>
                        <Text style={[styles.noteBody, { color: theme.textPrimary }]}>
                          {block.lines.join('\n')}
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <View key={key} style={styles.block}>
                      <Text style={[styles.character, { color: theme.textPrimary }]}>{block.character}</Text>
                      <Text style={[styles.dialogue, { color: theme.textPrimary }]}>{block.lines.join('\n')}</Text>
                    </View>
                  );
                })
              : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 24,
    gap: 16,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    gap: 6,
  },
  headerRow: {
    fontSize: 15,
    lineHeight: 22,
  },
  headerKey: {
    fontWeight: '600',
  },
  muted: {
    fontSize: 14,
  },
  sceneToolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sceneToolbarLink: {
    fontSize: 15,
    fontWeight: '600',
  },
  sceneCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    gap: 12,
  },
  sceneHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sceneTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  sceneChevron: {
    fontSize: 14,
    marginLeft: theme.spacingSm,
  },
  metaRow: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaKey: {
    fontWeight: '600',
  },
  block: {
    gap: 4,
  },
  blockLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteBlock: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    gap: 4,
  },
  noteBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  character: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dialogue: {
    fontSize: 15,
    lineHeight: 22,
    marginLeft: 8,
  },
});

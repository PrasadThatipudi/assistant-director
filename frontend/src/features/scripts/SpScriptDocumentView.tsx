import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SpDocument } from './parsing/scriptParsingAdapter';

import { theme } from '../../shell/theme';

type Props = {
  document: SpDocument;
};

export function SpScriptDocumentView({ document }: Props) {
  const headerEntries = Object.entries(document.header);

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

      {document.scenes.map((scene) => (
        <View
          key={scene.number}
          style={[styles.sceneCard, { borderColor: theme.borderLight, backgroundColor: theme.canvas }]}
        >
          <Text style={[styles.sceneTitle, { color: theme.textPrimary }]}>Scene {scene.number}</Text>
          {Object.entries(scene.meta).map(([k, v]) => (
            <Text key={k} style={[styles.metaRow, { color: theme.textSecondary }]}>
              <Text style={[styles.metaKey, { color: theme.textPrimary }]}>{k}: </Text>
              {v}
            </Text>
          ))}

          {scene.blocks.map((block, idx) => {
            const key = `${scene.number}-${idx}`;
            if (block.kind === 'action') {
              return (
                <View key={key} style={styles.block}>
                  <Text style={[styles.blockLabel, { color: theme.textSecondary }]}>Action</Text>
                  <Text style={[styles.actionBody, { color: theme.textPrimary }]}>{block.lines.join('\n')}</Text>
                </View>
              );
            }
            if (block.kind === 'note') {
              return (
                <View
                  key={key}
                  style={[styles.noteBlock, { borderLeftColor: theme.warning, backgroundColor: theme.canvas }]}
                >
                  <Text style={[styles.blockLabel, { color: theme.warning }]}>{block.noteType}</Text>
                  <Text style={[styles.noteBody, { color: theme.textPrimary }]}>{block.lines.join('\n')}</Text>
                </View>
              );
            }
            return (
              <View key={key} style={styles.block}>
                <Text style={[styles.character, { color: theme.textPrimary }]}>{block.character}</Text>
                <Text style={[styles.dialogue, { color: theme.textPrimary }]}>{block.lines.join('\n')}</Text>
              </View>
            );
          })}
        </View>
      ))}
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
  sceneCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    gap: 12,
  },
  sceneTitle: {
    fontSize: 18,
    fontWeight: '700',
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
  actionBody: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
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

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../shell/navigationTypes';
import { theme } from '../../shell/theme';
import { Screen } from '../../shared/ui/Screen';
import { parseResultOk, parseSpDocument } from './parsing/scriptParsingAdapter';
import { readCachedScriptAsText } from './scriptStorage';
import { SpScriptDocumentView } from './SpScriptDocumentView';

type Props = NativeStackScreenProps<RootStackParamList, 'ScriptReader'>;

export function ScriptReaderScreen({ route }: Props) {
  const { projectId } = route.params;
  const [body, setBody] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const text = await readCachedScriptAsText(projectId);
      if (active) {
        setBody(text);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId]);

  const parseOutcome =
    body != null && !body.startsWith('Cached file (') ? parseSpDocument(body) : null;
  const parsedOk = parseOutcome != null && parseResultOk(parseOutcome);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={theme.primaryAction} />
      </Screen>
    );
  }

  if (body == null) {
    return (
      <Screen>
        <Text style={styles.muted}>
          No script for this project. Attach a .sp file from the project detail screen.
        </Text>
      </Screen>
    );
  }

  const isBinaryPlaceholder = body.startsWith('Cached file (');

  if (isBinaryPlaceholder) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.muted}>{body}</Text>
        </ScrollView>
      </Screen>
    );
  }

  if (parsedOk && parseOutcome?.document && !showRaw) {
    return (
      <Screen>
        <View style={styles.toolbar}>
          <Pressable onPress={() => setShowRaw(true)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.toolbarLink}>Raw text</Text>
          </Pressable>
        </View>
        <SpScriptDocumentView document={parseOutcome.document} />
      </Screen>
    );
  }

  return (
    <Screen>
      {parseOutcome != null && parseOutcome.errors.length > 0 ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Could not structure this script</Text>
          {parseOutcome.errors.slice(0, 5).map((e) => (
            <Text key={`${e.line}-${e.code}`} style={styles.bannerLine}>
              Line {e.line}: {e.code}
            </Text>
          ))}
        </View>
      ) : null}
      {parsedOk ? (
        <View style={styles.toolbar}>
          <Pressable onPress={() => setShowRaw(false)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.toolbarLink}>Structured view</Text>
          </Pressable>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.body} selectable>
          {body}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: theme.spacingLg,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.textPrimary,
  },
  muted: {
    color: theme.textSecondary,
    fontSize: 15,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingBottom: theme.spacingSm,
  },
  toolbarLink: {
    color: theme.primaryAction,
    fontSize: 15,
    fontWeight: '600',
  },
  banner: {
    backgroundColor: theme.canvas,
    borderColor: theme.borderLight,
    borderWidth: 1,
    borderRadius: theme.radiusMd,
    padding: theme.spacingMd,
    marginBottom: theme.spacingMd,
    gap: 4,
  },
  bannerTitle: {
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  bannerLine: {
    fontSize: 13,
    color: theme.textSecondary,
  },
});

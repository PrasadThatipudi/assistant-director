import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../shell/navigationTypes';
import { theme } from '../../shell/theme';
import { Screen } from '../../shared/ui/Screen';
import { readCachedScriptAsText } from './scriptStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'ScriptReader'>;

export function ScriptReaderScreen({ route }: Props) {
  const { projectId } = route.params;
  const [body, setBody] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        <Text style={styles.muted}>No cached script for this project. Upload while online first.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
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
});

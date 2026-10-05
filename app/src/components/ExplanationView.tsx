import { ReactNode } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Markdown } from '../Markdown';
import { C } from '../theme';
import { useLoadingMessage } from '../useExplanation';

export function ExplanationView({
  photoUri,
  loading,
  error,
  result,
  badge,
  footer,
}: {
  photoUri: string;
  loading: boolean;
  error: string | null;
  result: string | null;
  badge?: ReactNode;
  footer?: ReactNode;
}) {
  const loadingMessage = useLoadingMessage(loading);
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View>
        <Image source={{ uri: photoUri }} style={styles.photo} />
        {badge && <View style={styles.badge}>{badge}</View>}
      </View>
      {loading && (
        <View style={[styles.card, styles.loadingCard]}>
          <ActivityIndicator color={C.orange} size="large" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      )}
      {error && (
        <View style={[styles.card, styles.errorCard]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {result && (
        <View style={styles.card}>
          <Markdown text={result} />
        </View>
      )}
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 24, gap: 14 },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: C.card,
    backgroundColor: C.line,
  },
  badge: { position: 'absolute', left: 12, top: 12 },
  card: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: C.line,
  },
  loadingCard: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  loadingText: { color: C.inkSoft, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  errorCard: { backgroundColor: C.dangerSoft, borderColor: C.dangerSoft },
  errorText: { color: C.danger, fontSize: 15, lineHeight: 22 },
});

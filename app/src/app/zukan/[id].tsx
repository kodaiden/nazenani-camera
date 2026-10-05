import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Level } from '../../api';
import { ExplanationView } from '../../components/ExplanationView';
import { LevelTabs } from '../../components/LevelTabs';
import { NoBadge } from '../../components/ui';
import { loadLevel } from '../../storage';
import { C } from '../../theme';
import { useExplanation } from '../../useExplanation';
import { deleteEntry, formatNo, getEntry, photoFile, saveExplanation } from '../../zukan';

export default function ZukanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = Number(id);
  const entry = useMemo(() => getEntry(entryId), [entryId]);
  const photo = photoFile(entryId);
  const [level, setLevel] = useState<Level | null>(null);

  // 保存済みの学年はすぐ出す。ほかの学年は保存した写真から解説を取り直して追記する
  const { result, error, loading, show, reset } = useExplanation((lv, text) => saveExplanation(entryId, lv, text));

  useEffect(() => {
    if (!entry) return;
    reset(entry.explanations);
    loadLevel().then((saved) => {
      const first = saved && entry.explanations[saved] ? saved : (Object.keys(entry.explanations)[0] as Level);
      setLevel(first);
      show(() => photo.base64(), first);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  function changeLevel(lv: Level) {
    setLevel(lv);
    show(() => photo.base64(), lv);
  }

  function confirmDelete() {
    Alert.alert('図鑑から消す？', `${formatNo(entryId)} を消すと元に戻せません`, [
      { text: 'やめる', style: 'cancel' },
      {
        text: '消す',
        style: 'destructive',
        onPress: () => {
          deleteEntry(entryId);
          router.back();
        },
      },
    ]);
  }

  if (!entry) {
    return (
      <SafeAreaView style={[styles.root, styles.missing]}>
        <Text style={styles.missingText}>見つかりませんでした</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ 図鑑にもどる</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ 図鑑</Text>
        </Pressable>
        <View style={styles.titleWrap}>
          <NoBadge text={formatNo(entry.id)} />
          <Text style={styles.title} numberOfLines={1}>
            {entry.title}
          </Text>
        </View>
      </View>

      {level && <LevelTabs level={level} onChange={changeLevel} disabled={loading} />}

      <ExplanationView
        photoUri={photo.uri}
        loading={loading}
        error={error}
        result={result}
        footer={
          <Pressable onPress={confirmDelete} style={styles.delete}>
            <Text style={styles.deleteText}>図鑑から消す</Text>
          </Pressable>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: 10, gap: 10 },
  back: { fontSize: 16, fontWeight: '700', color: C.orangeDark },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: C.ink },
  delete: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  deleteText: { fontSize: 14, fontWeight: '700', color: C.danger },
  missing: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  missingText: { fontSize: 16, color: C.inkSoft },
});

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoBadge, PrimaryButton } from '../../components/ui';
import { C } from '../../theme';
import { Entry, formatNo, listEntries, photoFile } from '../../zukan';

const backToCamera = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function ZukanScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useFocusEffect(
    useCallback(() => {
      setEntries(listEntries());
    }, []),
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={backToCamera} hitSlop={12}>
          <Text style={styles.back}>‹ カメラ</Text>
        </Pressable>
        <Text style={styles.title}>図鑑</Text>
        <Text style={styles.count}>{entries.length}こ</Text>
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>まだ何も登録されていません</Text>
          <Text style={styles.emptyBody}>気になるものを撮ると、ここに番号つきで集まっていきます</Text>
          <PrimaryButton label="撮りにいく" onPress={backToCamera} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => String(e.id)}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push({ pathname: '/zukan/[id]', params: { id: String(item.id) } })}
            >
              <Image source={{ uri: photoFile(item.id).uri }} style={styles.thumb} />
              <View style={styles.cardBody}>
                <NoBadge text={formatNo(item.id)} />
                <Text style={styles.name} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  back: { fontSize: 16, fontWeight: '700', color: C.orangeDark },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: C.ink, textAlign: 'center' },
  count: { fontSize: 15, fontWeight: '700', color: C.inkSoft, minWidth: 56, textAlign: 'right' },
  list: { padding: 16, gap: 14 },
  row: { gap: 14 },
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.line,
    overflow: 'hidden',
  },
  thumb: { width: '100%', aspectRatio: 1, backgroundColor: C.line },
  cardBody: { padding: 10, gap: 6 },
  name: { fontSize: 15, fontWeight: '800', color: C.ink, lineHeight: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
  emptyBody: { fontSize: 15, lineHeight: 23, color: C.inkSoft, textAlign: 'center', marginBottom: 8 },
});

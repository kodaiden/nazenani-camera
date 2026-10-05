import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Level } from '../api';
import { ExplanationView } from '../components/ExplanationView';
import { LevelTabs } from '../components/LevelTabs';
import { NoBadge, PrimaryButton } from '../components/ui';
import { loadLevel, saveLevel } from '../storage';
import { C } from '../theme';
import { useExplanation } from '../useExplanation';
import { addEntry, formatNo, listEntries, saveExplanation } from '../zukan';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [level, setLevel] = useState<Level>('jhs');
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [shooting, setShooting] = useState(false);
  const [entryId, setEntryId] = useState<number | null>(null);
  const [zukanCount, setZukanCount] = useState(0);
  const entryIdRef = useRef<number | null>(null);
  const photoRef = useRef<{ uri: string; base64: string } | null>(null);

  // 解説が取れたら図鑑に登録(2回目以降は同じ項目に学年違いの解説を追加)
  const { result, error, loading, show, reset } = useExplanation((lv, text) => {
    try {
      if (entryIdRef.current == null) {
        if (!photoRef.current) return;
        const entry = addEntry(photoRef.current.uri, lv, text);
        entryIdRef.current = entry.id;
        setEntryId(entry.id);
        setZukanCount((n) => n + 1);
      } else {
        saveExplanation(entryIdRef.current, lv, text);
      }
    } catch {
      // 保存に失敗しても解説の表示は続ける
    }
  });

  useEffect(() => {
    loadLevel().then((lv) => lv && setLevel(lv));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setZukanCount(listEntries().length);
    }, []),
  );

  async function shoot() {
    if (shooting) return;
    setShooting(true);
    try {
      const pic = await cameraRef.current?.takePictureAsync({ quality: 1 });
      if (!pic) return;
      // サーバーに送る前に長辺1024pxへ縮める
      const ctx = ImageManipulator.manipulate(pic.uri);
      if (Math.max(pic.width, pic.height) > 1024) {
        ctx.resize(pic.width >= pic.height ? { width: 1024 } : { height: 1024 });
      }
      const rendered = await ctx.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      if (!saved.base64) return;
      const next = { uri: saved.uri, base64: saved.base64 };
      reset();
      entryIdRef.current = null;
      setEntryId(null);
      setPhoto(next);
      photoRef.current = next;
      show(() => next.base64, level);
    } catch {
      Alert.alert('うまく撮れなかったみたい', 'もう一回試してみて');
    } finally {
      setShooting(false);
    }
  }

  function changeLevel(lv: Level) {
    setLevel(lv);
    saveLevel(lv);
    if (photo && !loading) show(() => photo.base64, lv);
  }

  function retake() {
    reset();
    setPhoto(null);
    photoRef.current = null;
    setEntryId(null);
    entryIdRef.current = null;
  }

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.root, styles.permWrap]}>
        <Image source={require('../../assets/icon.png')} style={styles.permIcon} />
        <Text style={styles.permTitle}>なぜ？なに？カメラ</Text>
        <Text style={styles.permBody}>
          気になるものを撮ると、{'\n'}そのしくみを解説します
        </Text>
        <PrimaryButton label="カメラを使う" onPress={requestPermission} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>なぜ？なに？カメラ</Text>
        <Pressable style={styles.zukanButton} onPress={() => router.push('/zukan')}>
          <Text style={styles.zukanButtonText}>図鑑</Text>
          {zukanCount > 0 && <Text style={styles.zukanCount}>{zukanCount}</Text>}
        </Pressable>
      </View>

      <LevelTabs level={level} onChange={changeLevel} disabled={loading} />

      {photo ? (
        <>
          <ExplanationView
            photoUri={photo.uri}
            loading={loading}
            error={error}
            result={result}
            badge={entryId != null && <NoBadge text={`図鑑に登録 ${formatNo(entryId)}`} />}
          />
          <View style={styles.footer}>
            <PrimaryButton label="もう一回撮る" onPress={retake} />
          </View>
        </>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          <View style={styles.hint}>
            <Text style={styles.hintText}>気になるものをまんなかに</Text>
          </View>
          <View pointerEvents="none" style={styles.frame}>
            <View style={[styles.corner, styles.cTL]} />
            <View style={[styles.corner, styles.cTR]} />
            <View style={[styles.corner, styles.cBL]} />
            <View style={[styles.corner, styles.cBR]} />
          </View>
          <Pressable
            style={[styles.shutter, shooting && styles.shutterBusy]}
            onPress={shoot}
            disabled={shooting}
            accessibilityLabel="撮影する"
          >
            <View style={styles.shutterInner} />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const CORNER = 28;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  logo: { width: 34, height: 34, borderRadius: 9 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: 0.5 },
  zukanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  zukanButtonText: { fontSize: 15, fontWeight: '800', color: C.ink },
  zukanCount: {
    backgroundColor: C.sun,
    color: C.ink,
    fontSize: 12,
    fontWeight: '800',
    minWidth: 22,
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },

  cameraWrap: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  hint: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(43,33,24,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  hintText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  frame: { position: 'absolute', top: '22%', bottom: '28%', left: '14%', right: '14%' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: C.sun },
  cTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  cTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
  shutter: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: C.orange },
  shutterBusy: { opacity: 0.5 },

  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },

  permWrap: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  permIcon: { width: 120, height: 120, borderRadius: 30, marginBottom: 8 },
  permTitle: { fontSize: 26, fontWeight: '800', color: C.ink },
  permBody: { fontSize: 16, lineHeight: 26, color: C.inkSoft, textAlign: 'center', marginBottom: 8 },
});

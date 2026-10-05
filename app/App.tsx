import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { analyze, Level, LEVELS } from './src/api';
import { Markdown } from './src/Markdown';
import { loadLevel, saveLevel } from './src/storage';

const C = {
  accent: '#8b4513',
  accent2: '#2a6b8f',
  bg: '#f5f1e6',
  text: '#2b2b2b',
  muted: '#7a7264',
};

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [level, setLevel] = useState<Level>('jhs');
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shooting, setShooting] = useState(false);
  // 同じ写真で学年を行き来したときに再リクエストしないためのキャッシュ
  const cache = useRef<Partial<Record<Level, string>>>({});
  const loadingMessage = useLoadingMessage(loading);

  useEffect(() => {
    loadLevel().then((lv) => lv && setLevel(lv));
  }, []);

  async function run(base64: string, lv: Level) {
    const cached = cache.current[lv];
    setError(null);
    if (cached) {
      setResult(cached);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const text = await analyze(base64, lv);
      cache.current[lv] = text;
      setResult(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function shoot() {
    if (shooting) return;
    setShooting(true);
    try {
      await capture();
    } catch {
      setError('うまく撮れなかったみたい。もう一回試してみて');
    } finally {
      setShooting(false);
    }
  }

  async function capture() {
    const pic = await cameraRef.current?.takePictureAsync({ quality: 1 });
    if (!pic) return;
    // サーバーに送る前に長辺1024pxへ縮める
    const ctx = ImageManipulator.manipulate(pic.uri);
    const longest = Math.max(pic.width, pic.height);
    if (longest > 1024) {
      ctx.resize(pic.width >= pic.height ? { width: 1024 } : { height: 1024 });
    }
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    if (!saved.base64) return;
    cache.current = {};
    setPhoto({ uri: saved.uri, base64: saved.base64 });
    run(saved.base64, level);
  }

  function changeLevel(lv: Level) {
    setLevel(lv);
    saveLevel(lv);
    if (photo && !loading) run(photo.base64, lv);
  }

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Text style={styles.permTitle}>なぜ？なに？カメラ</Text>
        <Text style={[styles.body, styles.centerText]}>気になるものを撮るには、{'\n'}カメラを使わせてね</Text>
        <Pressable style={styles.primary} onPress={requestPermission}>
          <Text style={styles.primaryText}>カメラを使う</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>なぜ？なに？カメラ</Text>
      </View>

      <View style={styles.tabs}>
        {LEVELS.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => changeLevel(l.id)}
            disabled={loading}
            style={[styles.tab, level === l.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, level === l.id && styles.tabTextActive]}>{l.label}</Text>
          </Pressable>
        ))}
      </View>

      {photo ? (
        <ScrollView contentContainerStyle={styles.resultWrap}>
          <Image source={{ uri: photo.uri }} style={styles.thumb} />
          {loading && (
            <View style={styles.center}>
              <ActivityIndicator color={C.accent} />
              <Text style={styles.muted}>{loadingMessage}</Text>
            </View>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          {result && <Markdown text={result} />}
          <Pressable
            style={styles.primary}
            onPress={() => {
              setPhoto(null);
              setResult(null);
              setError(null);
            }}
          >
            <Text style={styles.primaryText}>もう一回撮る</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          <Pressable
            style={[styles.shutter, shooting && styles.shutterBusy]}
            onPress={shoot}
            disabled={shooting}
            accessibilityLabel="撮影する"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// 待ち時間が長くなるほど言葉を変えて、固まってないことを伝える
function useLoadingMessage(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  if (elapsed < 6) return 'じっくり観察中…';
  if (elapsed < 15) return 'しくみを調べてる…';
  if (elapsed < 40) return 'もう少し待ってね。最初の1回は時間がかかることがあるよ';
  return 'サーバーを準備中…あと少し';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  header: { backgroundColor: C.accent, paddingVertical: 12, paddingHorizontal: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  permTitle: { fontSize: 22, fontWeight: '700', color: C.accent },
  tabs: {
    flexDirection: 'row',
    margin: 12,
    padding: 3,
    backgroundColor: '#ede7d8',
    borderRadius: 999,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#666', fontSize: 14 },
  tabTextActive: { color: C.accent, fontWeight: '700' },
  cameraWrap: { flex: 1, marginHorizontal: 12, marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  shutter: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 5,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  shutterBusy: { opacity: 0.5 },
  resultWrap: { padding: 16, gap: 16 },
  thumb: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: '#ddd' },
  body: { fontSize: 16, lineHeight: 26, color: C.text },
  centerText: { textAlign: 'center' },
  muted: { color: C.muted },
  error: { color: '#c0392b' },
  primary: {
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

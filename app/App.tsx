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
import { C } from './src/theme';

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
      <SafeAreaView style={[styles.root, styles.permWrap]}>
        <Image source={require('./assets/icon.png')} style={styles.permIcon} />
        <Text style={styles.permTitle}>なぜ？なに？カメラ</Text>
        <Text style={styles.permBody}>
          気になるものを撮ると、{'\n'}そのしくみを解説します
        </Text>
        <Pressable style={styles.primary} onPress={requestPermission}>
          <Text style={styles.primaryText}>カメラを使う</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  function retake() {
    setPhoto(null);
    setResult(null);
    setError(null);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Image source={require('./assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>なぜ？なに？カメラ</Text>
      </View>

      <View style={styles.levels}>
        {LEVELS.map((l) => {
          const active = level === l.id;
          return (
            <Pressable
              key={l.id}
              onPress={() => changeLevel(l.id)}
              disabled={loading}
              style={[styles.level, active && styles.levelActive]}
            >
              <Text style={[styles.levelText, active && styles.levelTextActive]}>{l.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {photo ? (
        <>
          <ScrollView contentContainerStyle={styles.resultWrap}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
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
          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={styles.primary} onPress={retake}>
              <Text style={styles.primaryText}>もう一回撮る</Text>
            </Pressable>
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

const CORNER = 28;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  logo: { width: 34, height: 34, borderRadius: 9 },
  title: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: 0.5 },

  levels: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  level: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.line,
  },
  levelActive: { backgroundColor: C.orange, borderColor: C.orange },
  levelText: { fontSize: 15, fontWeight: '700', color: C.inkSoft },
  levelTextActive: { color: '#fff' },

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

  resultWrap: { paddingHorizontal: 16, paddingBottom: 24, gap: 14 },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: C.card,
    backgroundColor: C.line,
  },
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

  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  primary: {
    backgroundColor: C.orange,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    paddingHorizontal: 32,
    borderBottomWidth: 4,
    borderBottomColor: C.orangeDark,
  },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  permWrap: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  permIcon: { width: 120, height: 120, borderRadius: 30, marginBottom: 8 },
  permTitle: { fontSize: 26, fontWeight: '800', color: C.ink },
  permBody: { fontSize: 16, lineHeight: 26, color: C.inkSoft, textAlign: 'center', marginBottom: 8 },
});

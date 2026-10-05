import { useEffect, useRef, useState } from 'react';

import { analyze, Level } from './api';

type Cache = Partial<Record<Level, string>>;

// 写真1枚ぶんの解説を学年ごとに取得・キャッシュする
export function useExplanation(onFetched?: (level: Level, text: string) => void) {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cache = useRef<Cache>({});
  const onFetchedRef = useRef(onFetched);
  useEffect(() => {
    onFetchedRef.current = onFetched;
  });

  async function show(base64: () => Promise<string> | string, level: Level) {
    setError(null);
    const cached = cache.current[level];
    if (cached) {
      setResult(cached);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const text = await analyze(await base64(), level);
      cache.current[level] = text;
      setResult(text);
      onFetchedRef.current?.(level, text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function reset(initial: Cache = {}) {
    cache.current = { ...initial };
    setResult(null);
    setError(null);
  }

  return { result, error, loading, show, reset };
}

// 待ち時間が長くなるほど言葉を変えて、固まってないことを伝える
export function useLoadingMessage(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => {
      clearInterval(id);
      setElapsed(0);
    };
  }, [active]);
  if (elapsed < 6) return 'じっくり観察中…';
  if (elapsed < 15) return 'しくみを調べてる…';
  if (elapsed < 40) return 'もう少し待ってね。最初の1回は時間がかかることがあるよ';
  return 'サーバーを準備中…あと少し';
}

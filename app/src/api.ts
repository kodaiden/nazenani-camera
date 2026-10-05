export type Level = 'elementary' | 'jhs' | 'hs' | 'adult';

export const LEVELS: { id: Level; label: string }[] = [
  { id: 'elementary', label: '小学' },
  { id: 'jhs', label: '中学' },
  { id: 'hs', label: '高校' },
  { id: 'adult', label: '大人' },
];

// 開発中は .env の EXPO_PUBLIC_API_URL で Mac のローカルサーバーを指せる
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://nazenani-camera.onrender.com';

export async function analyze(imageBase64: string, level: Level): Promise<string> {
  // Render 無料プランは寝起きに1分前後かかるので長めに待つ
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 150_000);
  try {
    const res = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
      body: JSON.stringify({ image: imageBase64, level }),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? `サーバーエラー (HTTP ${res.status})`);
    if (typeof json?.text !== 'string') throw new Error('サーバーから予期しない応答');
    return json.text;
  } catch (e) {
    if (timedOut) throw new Error('時間がかかりすぎたみたい。もう一回試してみて');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

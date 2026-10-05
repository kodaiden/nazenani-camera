import { Directory, File, Paths } from 'expo-file-system';

import type { Level } from './api';

// 図鑑は端末内だけに保存する(アカウント不要・写真を外に出さない)
// zukan/index.json に一覧、zukan/<id>.jpg に写真
export type Entry = {
  id: number;
  createdAt: number;
  title: string;
  explanations: Partial<Record<Level, string>>;
};

type Index = { nextId: number; entries: Entry[] };

// 読み込み時ではなく使うときに作る(ファイル保存がない環境でも import で落ちないように)
const zukanDir = () => new Directory(Paths.document, 'zukan');
const indexFile = () => new File(zukanDir(), 'index.json');

function ensureDir() {
  const dir = zukanDir();
  if (!dir.exists) dir.create({ intermediates: true });
}

function readIndex(): Index {
  ensureDir();
  const file = indexFile();
  if (!file.exists) return { nextId: 1, entries: [] };
  try {
    return JSON.parse(file.textSync()) as Index;
  } catch {
    return { nextId: 1, entries: [] };
  }
}

function writeIndex(index: Index) {
  ensureDir();
  const file = indexFile();
  if (!file.exists) file.create();
  file.write(JSON.stringify(index));
}

export function photoFile(id: number) {
  return new File(zukanDir(), `${id}.jpg`);
}

export function listEntries(): Entry[] {
  try {
    return [...readIndex().entries].sort((a, b) => b.id - a.id);
  } catch {
    return [];
  }
}

export function getEntry(id: number): Entry | undefined {
  return readIndex().entries.find((e) => e.id === id);
}

export function addEntry(photoUri: string, level: Level, text: string): Entry {
  const index = readIndex();
  const entry: Entry = {
    id: index.nextId,
    createdAt: Date.now(),
    title: extractTitle(text),
    explanations: { [level]: text },
  };
  new File(photoUri).copy(photoFile(entry.id));
  // 番号は消しても再利用しない(図鑑の No. が変わらないように)
  writeIndex({ nextId: index.nextId + 1, entries: [...index.entries, entry] });
  return entry;
}

export function saveExplanation(id: number, level: Level, text: string) {
  const index = readIndex();
  const entry = index.entries.find((e) => e.id === id);
  if (!entry) return;
  entry.explanations[level] = text;
  writeIndex(index);
}

export function deleteEntry(id: number) {
  const index = readIndex();
  writeIndex({ ...index, entries: index.entries.filter((e) => e.id !== id) });
  const photo = photoFile(id);
  if (photo.exists) photo.delete();
}

export const formatNo = (id: number) => `No.${String(id).padStart(3, '0')}`;

// 「これは何？」の直後の行から名前を取り出す。太字があればそれを優先
export function extractTitle(text: string): string {
  const lines = text.split('\n').map((l) => l.trim());
  const head = lines.findIndex((l) => /これは何/.test(l));
  const first = lines.slice(head + 1).find((l) => l && !l.startsWith('#') && !/^-{3,}$/.test(l)) ?? '';
  const bold = first.match(/\*\*(.+?)\*\*/);
  const raw = (bold ? bold[1] : first.split(/[。、！!]/)[0])
    .replace(/[*「」『』]/g, '')
    .replace(/^(これは|これ|それは)/, '')
    .replace(/(だよ|です|だね|である)$/, '')
    .trim();
  const name = raw.replace(/（.*?）|\(.*?\)/g, '').trim() || raw;
  return name.length > 20 ? `${name.slice(0, 20)}…` : name || 'なにか';
}

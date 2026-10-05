import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { C } from './theme';

// サーバーの返答は見出し(#)・太字(**)・箇条書き(-)・教科リンク(■)程度なので最小限だけ描画する
function Inline({ text, style, links }: { text: string; style?: object; links?: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={links ? styles.boldLinks : styles.bold}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

const stripBold = (t: string) => t.replace(/\*\*/g, '');

function renderLine(raw: string, i: number, inLinks: boolean): ReactNode {
  const line = raw.trimEnd();
  if (!line.trim()) return <View key={i} style={styles.gap} />;
  if (/^-{3,}$/.test(line.trim())) return null;

  const h = line.match(/^#{1,6}\s+(.*)$/);
  if (h) {
    return (
      <View key={i} style={styles.headingRow}>
        <View style={[styles.headingDot, inLinks && styles.headingDotLinks]} />
        <Text style={[styles.heading, inLinks && styles.linksText]}>{stripBold(h[1])}</Text>
      </View>
    );
  }

  const li = line.match(/^(\s*)[-*・]\s+(.*)$/);
  if (li) {
    return (
      <View key={i} style={[styles.li, { paddingLeft: li[1].length * 6 }]}>
        <Text style={[styles.bullet, inLinks && styles.linksText]}>•</Text>
        <Inline text={li[2]} links={inLinks} style={[styles.body, styles.flex, inLinks && styles.linksText]} />
      </View>
    );
  }
  return <Inline key={i} text={line} links={inLinks} style={[styles.body, inLinks && styles.linksText]} />;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  // 「■ これ、学校で習う…」以降は教科リンクとしてカードにまとめる
  const linkStart = lines.findIndex((l) => /^\s*(#{1,6}\s*)?■/.test(l));
  const main = linkStart >= 0 ? lines.slice(0, linkStart) : lines;
  const links = linkStart >= 0 ? lines.slice(linkStart) : [];

  return (
    <View style={styles.wrap}>
      {main.map((l, i) => renderLine(l, i, false))}
      {links.length > 0 && (
        <View style={styles.links}>
          <Text style={styles.linksTitle}>{stripBold(links[0].replace(/^\s*#*\s*■\s*/, ''))}</Text>
          {links.slice(1).map((l, i) => renderLine(l, i, true))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  gap: { height: 8 },
  body: { fontSize: 16, lineHeight: 27, color: C.ink },
  bold: { fontWeight: '800', color: C.orangeDark },
  boldLinks: { fontWeight: '800', color: C.tealDark },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 },
  headingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.sun },
  headingDotLinks: { backgroundColor: C.teal },
  heading: { fontSize: 18, fontWeight: '800', color: C.ink, flexShrink: 1 },
  li: { flexDirection: 'row', gap: 6 },
  bullet: { fontSize: 16, lineHeight: 27, color: C.orange, fontWeight: '800' },
  flex: { flex: 1 },
  links: {
    marginTop: 14,
    backgroundColor: C.tealSoft,
    borderRadius: 18,
    padding: 16,
    gap: 2,
  },
  linksTitle: { fontSize: 16, fontWeight: '800', color: C.tealDark, marginBottom: 6 },
  linksText: { color: C.tealDark },
});

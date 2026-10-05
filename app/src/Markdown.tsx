import { StyleSheet, Text, View } from 'react-native';

// サーバーの返答は見出し(#)・太字(**)・箇条書き(-)・区切り(■)程度なので最小限だけ描画する
function Inline({ text, style }: { text: string; style?: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={styles.bold}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <View style={styles.wrap}>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={i} style={styles.gap} />;
        const h = line.match(/^#{1,6}\s+(.*)$/);
        if (h) return <Inline key={i} text={h[1]} style={styles.heading} />;
        if (line.startsWith('■')) return <Inline key={i} text={line} style={styles.subject} />;
        const li = line.match(/^(\s*)[-*・]\s+(.*)$/);
        if (li)
          return (
            <View key={i} style={[styles.li, { paddingLeft: li[1].length * 6 }]}>
              <Text style={styles.body}>・</Text>
              <Inline text={li[2]} style={[styles.body, styles.flex]} />
            </View>
          );
        return <Inline key={i} text={line} style={styles.body} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  gap: { height: 8 },
  body: { fontSize: 16, lineHeight: 26, color: '#2b2b2b' },
  bold: { fontWeight: '700', color: '#8b4513' },
  heading: { fontSize: 18, fontWeight: '700', color: '#8b4513', marginTop: 4 },
  subject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2a6b8f',
    backgroundColor: '#eef4f8',
    borderLeftWidth: 4,
    borderLeftColor: '#2a6b8f',
    padding: 8,
    marginTop: 4,
  },
  li: { flexDirection: 'row' },
  flex: { flex: 1 },
});

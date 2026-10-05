import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Level, LEVELS } from '../api';
import { C } from '../theme';

export function LevelTabs({
  level,
  onChange,
  disabled,
}: {
  level: Level;
  onChange: (lv: Level) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.levels}>
      {LEVELS.map((l) => {
        const active = level === l.id;
        return (
          <Pressable
            key={l.id}
            onPress={() => onChange(l.id)}
            disabled={disabled}
            style={[styles.level, active && styles.levelActive]}
          >
            <Text style={[styles.levelText, active && styles.levelTextActive]}>{l.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
});

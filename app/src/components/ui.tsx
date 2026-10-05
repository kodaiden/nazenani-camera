import { Pressable, StyleSheet, Text } from 'react-native';

import { C } from '../theme';

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.primary} onPress={onPress}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function NoBadge({ text }: { text: string }) {
  return <Text style={styles.no}>{text}</Text>;
}

const styles = StyleSheet.create({
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
  no: {
    alignSelf: 'flex-start',
    backgroundColor: C.sun,
    color: C.ink,
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
});

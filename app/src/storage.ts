import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type { Level } from './api';

const DEVICE_KEY = 'device_id';
const LEVEL_KEY = 'level';

let deviceId: string | null = null;

// サーバーの回数制限に使う端末ID。初回に作って保存する
export async function getDeviceId(): Promise<string> {
  if (deviceId) return deviceId;
  try {
    deviceId = await SecureStore.getItemAsync(DEVICE_KEY);
    if (!deviceId) {
      deviceId = randomUUID();
      await SecureStore.setItemAsync(DEVICE_KEY, deviceId);
    }
  } catch {
    deviceId ??= randomUUID();
  }
  return deviceId;
}

export async function loadLevel(): Promise<Level | null> {
  try {
    return (await SecureStore.getItemAsync(LEVEL_KEY)) as Level | null;
  } catch {
    return null;
  }
}

export function saveLevel(level: Level) {
  SecureStore.setItemAsync(LEVEL_KEY, level).catch(() => {});
}

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_TOKEN_KEY = "session-token";

function getWebStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export async function getStoredSessionToken() {
  if (Platform.OS === "web") {
    const storage = getWebStorage();
    return storage?.getItem(SESSION_TOKEN_KEY) ?? null;
  }

  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export async function setStoredSessionToken(token: string) {
  if (Platform.OS === "web") {
    const storage = getWebStorage();

    if (storage) {
      storage.setItem(SESSION_TOKEN_KEY, token);
    }

    return;
  }

  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

export async function clearStoredSessionToken() {
  if (Platform.OS === "web") {
    const storage = getWebStorage();

    if (storage) {
      storage.removeItem(SESSION_TOKEN_KEY);
    }

    return;
  }

  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}

import type { LoginInput } from "@paridade-risco/shared";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const input: LoginInput = { email: email.trim(), password };
  const isValid = input.email.length > 0 && input.password.length > 0;

  async function handleLogin() {
    if (!isValid || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(input);
    } catch {
      Alert.alert("Falha no login", "Verifique email e senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen title="Login" subtitle="Acesse sua carteira v2 com sessao real e segura.">
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// AUTH_ACCESS</Text>
        <Field label="Email" onChangeText={setEmail} value={email} />
        <Field label="Senha" onChangeText={setPassword} secureTextEntry value={password} />
        <PrimaryButton label={isSubmitting ? "Entrando" : "Entrar"} onPress={handleLogin} />
      </View>
    </Screen>
  );
}

function Field(props: {
  label: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        style={styles.fieldInput}
        value={props.value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
  },
  fieldInput: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: 14,
  },
});

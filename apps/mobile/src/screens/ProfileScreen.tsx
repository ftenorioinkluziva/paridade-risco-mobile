import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../hooks/useAppData";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export function ProfileScreen() {
  const { signOut } = useAuth();
  const { data: profile } = useProfile();

  const items = [
    { label: "Nome", value: profile?.name ?? "..." },
    { label: "Email", value: profile?.email ?? "..." },
    { label: "Cesta ativa", value: profile?.activeBasketName ?? "..." },
  ];

  return (
    <Screen
      title="Perfil"
      subtitle="Configuracoes essenciais da conta e preferencia de alocacao."
      action={<PrimaryButton label="Editar" />}
    >
      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.initials ?? ".."}</Text>
        </View>
        <View style={styles.identityBlock}>
          <Text style={styles.name}>{profile?.name ?? "Carregando perfil"}</Text>
          <Text style={styles.role}>{profile?.roleLabel ?? ""}</Text>
        </View>
      </View>

      <View style={styles.list}>
        <Text style={styles.sectionLabel}>// ACCOUNT_CONFIG</Text>
        {items.map((item) => (
          <View key={item.label} style={styles.item}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.logoutCard}>
        <Text style={styles.logoutTitle}>Sessao</Text>
        <Text style={styles.logoutText}>
          A autenticacao da V2 sera unificada e sem dependencias de localStorage.
        </Text>
        <PrimaryButton label="Sair" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 14,
    padding: 24,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
    borderRadius: 4,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  avatarText: {
    color: colors.primary,
    fontFamily: typography.mono,
    fontSize: 24,
    fontWeight: "700",
  },
  identityBlock: {
    alignItems: "center",
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  role: {
    color: colors.textMuted,
    fontSize: 14,
  },
  list: {
    gap: 12,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  item: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  label: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  logoutCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  logoutTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});

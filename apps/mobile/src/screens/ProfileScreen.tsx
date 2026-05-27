import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../hooks/useAppData";
import { apiClient } from "../services/api/client";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";

export function ProfileScreen() {
  const { signOut } = useAuth();
  const { data: profile, refetch: refetchProfile } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [birthDateInput, setBirthDateInput] = useState("");

  function syncInputs() {
    setPhoneInput(profile?.phone ?? "");
    setBirthDateInput(profile?.birthDate ? profile.birthDate.slice(0, 10) : "");
  }

  async function handleSaveProfile() {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.updateProfile({
        birthDate: birthDateInput ? new Date(`${birthDateInput}T00:00:00.000Z`).toISOString() : null,
        phone: phoneInput.trim() || null,
      });
      await refetchProfile();
      setIsEditing(false);
    } catch {
      Alert.alert("Perfil nao salvo", "Revise telefone e data de nascimento antes de tentar novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  const items = [
    { label: "Nome", value: profile?.name ?? "..." },
    { label: "Email", value: profile?.email ?? "..." },
    { label: "Telefone", value: profile?.phone ?? "Nao informado" },
    { label: "Nascimento", value: profile?.birthDate ? new Date(profile.birthDate).toLocaleDateString("pt-BR") : "Nao informado" },
    { label: "Tipo de acesso", value: profile?.roleLabel ?? profile?.role ?? "Investidor" },
    { label: "Alvo ativo", value: profile?.activeBasketName ?? "..." },
  ];

  return (
    <Screen
      title="Perfil"
      subtitle="Dados da conta usados para acesso e calculo da carteira."
      action={
        <PrimaryButton
          label={isEditing ? "Cancelar" : "Editar"}
          onPress={() => {
            if (isEditing) {
              setIsEditing(false);
              return;
            }

            syncInputs();
            setIsEditing(true);
          }}
        />
      }
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
        <Text style={styles.sectionLabel}>// CONFIG_CONTA</Text>
        {items.map((item) => (
          <View key={item.label} style={styles.item}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.value}</Text>
          </View>
        ))}
      </View>

      {isEditing ? (
        <View style={styles.editorCard}>
          <Text style={styles.editorTitle}>Completar dados da conta</Text>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Telefone</Text>
            <TextInput onChangeText={setPhoneInput} style={styles.fieldInput} value={phoneInput} />
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Data de nascimento (AAAA-MM-DD)</Text>
            <TextInput onChangeText={setBirthDateInput} style={styles.fieldInput} value={birthDateInput} />
          </View>
          <PrimaryButton label={isSaving ? "Salvando" : "Salvar perfil"} onPress={() => void handleSaveProfile()} />
        </View>
      ) : null}

      <View style={styles.logoutCard}>
        <Text style={styles.logoutTitle}>Sessao</Text>
        <Text style={styles.logoutText}>
          Encerre o acesso quando terminar de consultar sua carteira neste dispositivo.
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
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.md,
    padding: layout.space.xxl,
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
    fontSize: 20,
    fontWeight: "600",
  },
  identityBlock: {
    alignItems: "center",
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
    lineHeight: 22,
  },
  role: {
    color: colors.textMuted,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: typographyScale.sm.fontWeight,
  },
  list: {
    gap: 12,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "700",
    letterSpacing: 0,
  },
  item: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.xs,
    padding: layout.space.lg,
  },
  label: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "600",
  },
  value: {
    color: colors.text,
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
    lineHeight: 22,
  },
  editorCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 4,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  editorTitle: {
    color: colors.text,
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
    lineHeight: 22,
  },
  fieldWrap: {
    gap: 4,
  },
  fieldLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "600",
  },
  fieldInput: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    color: colors.text,
    minHeight: 42,
    paddingHorizontal: 12,
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
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
    lineHeight: 22,
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: typographyScale.md.fontSize,
    fontWeight: typographyScale.md.fontWeight,
    lineHeight: 20,
  },
});

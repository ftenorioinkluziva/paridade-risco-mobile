"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Screen } from "@/components/Screen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

export default function PerfilPage() {
  const { user, signOut, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (!user) {
    return null;
  }

  const fields: { label: string; value: string | null }[] = [
    { label: "NOME", value: user.name },
    { label: "EMAIL", value: user.email },
    { label: "TELEFONE", value: user.phone },
    { label: "FUNCAO", value: user.role },
    { label: "NASCIMENTO", value: user.birthDate },
  ];

  return (
    <Screen
      title="Perfil"
      subtitle="Suas informações de cadastro."
    >
      <div style={styles.section}>
        <div style={styles.sectionLabel}>// DADOS_PESSOAIS</div>

        {fields.map((field) => (
          <div key={field.label} style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>{field.label}</label>
            <span style={styles.fieldValue}>
              {field.value ?? "—"}
            </span>
          </div>
        ))}
      </div>

      <PrimaryButton
        label="Sair"
        tone="danger"
        onPress={handleSignOut}
      />
    </Screen>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: layout.space.md,
    padding: layout.space.lg,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.xxs,
  },
  fieldLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
  },
  fieldValue: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 500,
  },
};
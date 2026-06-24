"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Screen } from "@/components/Screen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { InputField } from "@/components/InputField";
import { InlineAlert } from "@/components/InlineAlert";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function PerfilPage() {
  const { user, signOut, isAuthenticated, refetchUser } = useAuth();
  const router = useRouter();

  const [editMode, setEditMode] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  function enterEditMode() {
    setEditPhone(user?.phone ?? "");
    setEditBirthDate(toDateInput(user?.birthDate));
    setEditError(null);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setEditError(null);
  }

  async function handleSave() {
    setEditing(true);
    setEditError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: editPhone.trim() || null,
          birthDate: editBirthDate ? new Date(editBirthDate + "T12:00:00").toISOString() : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? `Erro ${res.status}`);
      }
      setEditMode(false);
      refetchUser();
    } catch (err: any) {
      setEditError(err.message ?? "Erro ao salvar. Tente novamente.");
    } finally {
      setEditing(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (!user) return null;

  const fields: { label: string; value: string | null }[] = [
    { label: "NOME", value: user.name },
    { label: "EMAIL", value: user.email },
    { label: "FUNCAO", value: user.role },
  ];

  return (
    <Screen
      title="Perfil"
      subtitle="Suas informações de cadastro."
      action={
        <PrimaryButton
          label={editMode ? "Editando..." : "Editar"}
          onPress={enterEditMode}
          tone="neutral"
          disabled={editMode || editing}
        />
      }
    >
      {editError ? (
        <InlineAlert title="Erro" message={editError} tone="danger" />
      ) : null}

      {editMode ? (
        <div style={styles.editSection}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Telefone</label>
            <InputField value={editPhone} onChange={setEditPhone} placeholder="Ex.: (11) 99999-9999" />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Data de nascimento</label>
            <InputField type="date" value={editBirthDate} onChange={setEditBirthDate} />
          </div>
          <div style={styles.editActions}>
            <PrimaryButton label={editing ? "Salvando..." : "Salvar"} onPress={handleSave} disabled={editing} />
            <PrimaryButton label="Cancelar" onPress={cancelEdit} tone="neutral" disabled={editing} />
          </div>
        </div>
      ) : (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>// DADOS_PESSOAIS</div>
          {fields.map((field) => (
            <div key={field.label} style={styles.fieldWrap}>
              <label style={styles.fieldLabel}>{field.label}</label>
              <span style={styles.fieldValue}>{field.value ?? "—"}</span>
            </div>
          ))}
          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>TELEFONE</label>
            <span style={styles.fieldValue}>{user.phone ?? "—"}</span>
          </div>
          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>NASCIMENTO</label>
            <span style={styles.fieldValue}>{user.birthDate?.slice(0, 10) ?? "—"}</span>
          </div>
        </div>
      )}

      <PrimaryButton label="Sair" tone="danger" onPress={handleSignOut} />
    </Screen>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 4,
    borderWidth: 1, borderStyle: "solid", display: "flex", flexDirection: "column",
    gap: layout.space.md, padding: layout.space.lg,
  },
  sectionLabel: {
    color: colors.textSoft, fontFamily: typography.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
  },
  fieldWrap: { display: "flex", flexDirection: "column", gap: layout.space.xxs },
  fieldLabel: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 11 },
  fieldValue: { color: colors.text, fontFamily: typography.mono, fontSize: 14, fontWeight: 500 },
  editSection: { display: "flex", flexDirection: "column", gap: layout.space.lg },
  fieldGroup: { display: "flex", flexDirection: "column", gap: layout.space.sm },
  label: {
    color: colors.textMuted, fontFamily: typography.mono, fontSize: 11, fontWeight: 700,
    letterSpacing: 0.6, textTransform: "uppercase" as const,
  },
  editActions: { display: "flex", gap: layout.space.sm },
};

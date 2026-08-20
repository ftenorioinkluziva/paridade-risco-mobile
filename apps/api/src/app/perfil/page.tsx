"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/AuthGuard";
import { Screen } from "@/components/Screen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { InputField } from "@/components/InputField";
import { InlineAlert } from "@/components/InlineAlert";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_NAV_LINKS } from "@/components/NavBar";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { authClient } from "@/lib/auth-client";

function toDateInput(dateVal: unknown): string {
  if (!dateVal) return "";
  if (dateVal instanceof Date) return dateVal.toISOString().slice(0, 10);
  if (typeof dateVal === "string") return dateVal.slice(0, 10);
  try {
    return new Date(dateVal as any).toISOString().slice(0, 10);
  } catch {
    return String(dateVal).slice(0, 10);
  }
}

export default function PerfilPage() {
  return (
    <AuthGuard>
      <PerfilContent />
    </AuthGuard>
  );
}

function PerfilContent() {
  const { user, signOut, refetchUser } = useAuth();
  const router = useRouter();

  // Dados Pessoais
  const [editMode, setEditMode] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editTelegram, setEditTelegram] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // MCP Token
  const [mcpCopied, setMcpCopied] = useState(false);
  const [mcpToken, setMcpToken] = useState<string | null>(null);
  const [mcpKeys, setMcpKeys] = useState<Array<{ id: string; start?: string | null; expiresAt?: Date | string | null }>>([]);
  const [mcpBusy, setMcpBusy] = useState(false);
  const [mcpError, setMcpError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMcpKeys() {
      const result = await authClient.apiKey.list({
        query: { configId: "mcp", limit: 20 },
      });
      if (result.error) {
        setMcpError(result.error.message ?? "Não foi possível consultar os tokens MCP");
        return;
      }
      setMcpKeys((result.data?.apiKeys ?? []) as typeof mcpKeys);
    }

    void loadMcpKeys();
  }, []);

  // Pluggy Integration
  const [pluggyClientId, setPluggyClientId] = useState("");
  const [pluggyClientSecret, setPluggyClientSecret] = useState("");
  const [pluggyItemId, setPluggyItemId] = useState("");
  const [pluggySecretMasked, setPluggySecretMasked] = useState<string | null>(null);
  const [isPluggyConfigured, setIsPluggyConfigured] = useState(false);
  const [pluggyMessage, setPluggyMessage] = useState<{ text: string; tone: "success" | "warning" | "danger" } | null>(null);
  const [testingPluggy, setTestingPluggy] = useState(false);
  const [savingPluggy, setSavingPluggy] = useState(false);
  const [syncingPluggy, setSyncingPluggy] = useState(false);

  function copyMcpToken() {
    if (!mcpToken) return;
    navigator.clipboard.writeText(mcpToken).then(() => {
      setMcpCopied(true);
      setTimeout(() => setMcpCopied(false), 2000);
    }).catch(() => {});
  }

  async function generateMcpToken(kind: "mcp" | "cli") {
    setMcpBusy(true);
    setMcpError(null);
    try {
      const response = await fetch("/api/auth/mcp-token", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: kind === "cli" ? "CLI principal" : "MCP principal",
          permissions: kind === "cli" ? ["read", "sync"] : ["read", "sync", "mapping"],
        }),
      });
      const created = await response.json();
      if (!response.ok || !created?.key) {
        throw new Error(created?.error?.message ?? created?.error ?? "Não foi possível gerar o token MCP");
      }

      const previousKeys = mcpKeys;
      setMcpToken(created.key);
      setMcpKeys([created, ...previousKeys] as typeof mcpKeys);
      await Promise.all(previousKeys.map((key) => authClient.apiKey.delete({ configId: "mcp", keyId: key.id })));
      setMcpKeys([created] as typeof mcpKeys);
    } catch (error) {
      setMcpError(error instanceof Error ? error.message : "Não foi possível gerar o token MCP");
    } finally {
      setMcpBusy(false);
    }
  }

  async function revokeMcpTokens() {
    setMcpBusy(true);
    setMcpError(null);
    try {
      await Promise.all(mcpKeys.map((key) => authClient.apiKey.delete({ configId: "mcp", keyId: key.id })));
      setMcpKeys([]);
      setMcpToken(null);
    } catch (error) {
      setMcpError(error instanceof Error ? error.message : "Não foi possível revogar o token MCP");
    } finally {
      setMcpBusy(false);
    }
  }

  useEffect(() => {
    async function loadPluggyProfile() {
      try {
        const res = await fetch("/api/profile/pluggy", {
          credentials: "same-origin",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.isConfigured) {
            setIsPluggyConfigured(true);
            setPluggyClientId(data.clientId ?? "");
            setPluggyItemId(data.itemId ?? "");
            setPluggySecretMasked(data.secretMasked ?? null);
          }
        }
      } catch {
        // Falha silenciosa ao carregar credenciais
      }
    }

    void loadPluggyProfile();
  }, []);

  function enterEditMode() {
    setEditPhone(user?.phone ?? "");
    setEditBirthDate(toDateInput(user?.birthDate));
    setEditTelegram(user?.telegramChatId ?? "");
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
        credentials: "same-origin",
        body: JSON.stringify({
          phone: editPhone.trim() || null,
          birthDate: editBirthDate ? new Date(editBirthDate + "T12:00:00").toISOString() : null,
          telegramChatId: editTelegram.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? `Erro ${res.status}`);
      }
      setEditMode(false);
      await refetchUser();
    } catch (err: any) {
      setEditError(err.message ?? "Erro ao salvar. Tente novamente.");
    } finally {
      setEditing(false);
    }
  }

  async function handleTestPluggy() {
    setTestingPluggy(true);
    setPluggyMessage(null);
    try {
      const res = await fetch("/api/profile/pluggy/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          clientId: pluggyClientId.trim(),
          clientSecret: pluggyClientSecret.trim() || undefined,
          itemId: pluggyItemId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Falha ao testar conexão");
      }
      setPluggyMessage({
        text: `Teste bem-sucedido! Conector: ${data.connectorName} (Status: ${data.status})`,
        tone: "success",
      });
    } catch (err: any) {
      setPluggyMessage({
        text: err.message ?? "Erro ao testar credenciais",
        tone: "danger",
      });
    } finally {
      setTestingPluggy(false);
    }
  }

  async function handleSavePluggy() {
    setSavingPluggy(true);
    setPluggyMessage(null);
    try {
      const res = await fetch("/api/profile/pluggy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          clientId: pluggyClientId.trim(),
          clientSecret: pluggyClientSecret.trim() || undefined,
          itemId: pluggyItemId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao salvar credenciais");
      }
      setIsPluggyConfigured(true);
      setPluggySecretMasked(data.secretMasked ?? null);
      setPluggyClientSecret("");
      setPluggyMessage({
        text: "Credenciais da Pluggy salvas com sucesso no seu perfil!",
        tone: "success",
      });
    } catch (err: any) {
      setPluggyMessage({
        text: err.message ?? "Erro ao salvar credenciais",
        tone: "danger",
      });
    } finally {
      setSavingPluggy(false);
    }
  }

  async function handleSyncPluggy() {
    setSyncingPluggy(true);
    setPluggyMessage(null);
    try {
      const res = await fetch("/api/integrations/pluggy/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao sincronizar dados");
      }
      setPluggyMessage({
        text: `Sincronização concluída! ${data.sync?.accounts ?? 0} contas, ${data.sync?.investments ?? 0} investimentos e ${data.sync?.transactions ?? 0} transações atualizadas.`,
        tone: "success",
      });
    } catch (err: any) {
      setPluggyMessage({
        text: err.message ?? "Falha na sincronização",
        tone: "danger",
      });
    } finally {
      setSyncingPluggy(false);
    }
  }

  async function handleDeletePluggy() {
    if (!confirm("Tem certeza que deseja remover suas credenciais da Pluggy?")) return;
    setPluggyMessage(null);
    try {
      const res = await fetch("/api/profile/pluggy", {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        setIsPluggyConfigured(false);
        setPluggyClientId("");
        setPluggyClientSecret("");
        setPluggyItemId("");
        setPluggySecretMasked(null);
        setPluggyMessage({
          text: "Credenciais da Pluggy removidas com sucesso.",
          tone: "warning",
        });
      }
    } catch (err: any) {
      setPluggyMessage({
        text: err.message ?? "Erro ao remover credenciais",
        tone: "danger",
      });
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
      subtitle="Suas informações de cadastro e integrações."
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
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Telegram Chat ID</label>
            <InputField value={editTelegram} onChange={setEditTelegram} placeholder="Ex.: 1234567890" />
            <span style={{ color: colors.textSoft, fontFamily: typography.mono, fontSize: 11 }}>
              Envie /id para @userinfobot no Telegram para descobrir seu chat_id
            </span>
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
            <span style={styles.fieldValue}>{toDateInput(user.birthDate) || "—"}</span>
          </div>
          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>TELEGRAM</label>
            <span style={styles.fieldValue}>{user.telegramChatId ?? "—"}</span>
          </div>
        </div>
      )}

      {/* Seção de Integração Pluggy */}
      <section style={{ ...styles.section, marginTop: layout.space.xl }}>
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionLabel}>// INTEGRAÇÃO_PLUGGY (OPEN_FINANCE)</div>
            <p style={styles.description}>
              Configure suas credenciais da Pluggy para sincronizar contas bancárias e investimentos automaticamente.
            </p>
          </div>
          {isPluggyConfigured ? (
            <span style={styles.badgeSuccess}>CONECTADO</span>
          ) : (
            <span style={styles.badgeNeutral}>NÃO CONFIGURADO</span>
          )}
        </div>

        {pluggyMessage ? (
          <InlineAlert
            title={pluggyMessage.tone === "success" ? "Sucesso" : pluggyMessage.tone === "danger" ? "Erro" : "Atenção"}
            message={pluggyMessage.text}
            tone={pluggyMessage.tone}
          />
        ) : null}

        <div style={styles.fieldGroup}>
          <label style={styles.label}>PLUGGY_CLIENT_ID</label>
          <InputField
            value={pluggyClientId}
            onChange={setPluggyClientId}
            placeholder="Ex.: 3c529b85-4759-4716-9ad1-25c21a2a4e73"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            PLUGGY_CLIENT_SECRET {pluggySecretMasked ? `(Salvo: ${pluggySecretMasked})` : ""}
          </label>
          <InputField
            type="password"
            value={pluggyClientSecret}
            onChange={setPluggyClientSecret}
            placeholder={pluggySecretMasked ? "Deixe em branco para manter a chave atual" : "Cole seu Client Secret aqui"}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>PLUGGY_ITEM_ID</label>
          <InputField
            value={pluggyItemId}
            onChange={setPluggyItemId}
            placeholder="Ex.: 92f92e1e-4e01-4231-ba8c-6d8db3d2ff65"
          />
          <span style={{ color: colors.textSoft, fontFamily: typography.mono, fontSize: 11 }}>
            ID do banco ou conector gerado no Pluggy Dashboard / MeuPluggy
          </span>
        </div>

        <div style={styles.editActions}>
          <PrimaryButton
            label={testingPluggy ? "Testando..." : "Testar Conexão"}
            onPress={handleTestPluggy}
            tone="neutral"
            disabled={testingPluggy || savingPluggy || !pluggyClientId || !pluggyItemId}
          />
          <PrimaryButton
            label={savingPluggy ? "Salvando..." : "Salvar no Perfil"}
            onPress={handleSavePluggy}
            disabled={savingPluggy || testingPluggy || !pluggyClientId || !pluggyItemId}
          />
          {isPluggyConfigured ? (
            <>
              <PrimaryButton
                label={syncingPluggy ? "Sincronizando..." : "Sincronizar Agora"}
                onPress={handleSyncPluggy}
                tone="neutral"
                disabled={syncingPluggy}
              />
              <PrimaryButton
                label="Desconectar"
                onPress={handleDeletePluggy}
                tone="danger"
                disabled={syncingPluggy || savingPluggy}
              />
            </>
          ) : null}
        </div>
      </section>

      {/* Seção MCP */}
      <div style={{ ...styles.section, marginTop: layout.space.xl }}>
        <div style={styles.sectionLabel}>// MCP_TOKEN</div>
        <p style={{ color: colors.textMuted, fontFamily: typography.mono, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          Credencial revogável para MCP ou CLI, com permissões limitadas, expiração em 90 dias e revogação independente da sua sessão.
        </p>
        {mcpToken ? (
          <>
            <div
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border, borderWidth: 1, borderStyle: "solid",
                borderRadius: 4, padding: "10px 12px", fontFamily: typography.mono, fontSize: 12,
                color: colors.text, wordBreak: "break-all",
              }}
            >
              {mcpToken}
            </div>
            <InlineAlert title="Token exibido uma única vez" tone="warning" message="Copie agora: o valor completo não será exibido novamente após sair desta página." />
            <div style={{ display: "flex", gap: layout.space.sm }}>
              <PrimaryButton
                label={mcpCopied ? "Copiado!" : "Copiar token"}
                onPress={copyMcpToken}
                tone="neutral"
              />
              <PrimaryButton label="Revogar" onPress={revokeMcpTokens} tone="danger" disabled={mcpBusy} />
            </div>
          </>
        ) : mcpKeys.length > 0 ? (
          <>
            <p style={{ color: colors.text, fontFamily: typography.mono, fontSize: 12, margin: 0 }}>
              Token ativo: {mcpKeys[0]?.start ?? "pr_mcp_..."} · expira em {mcpKeys[0]?.expiresAt ? new Date(mcpKeys[0].expiresAt).toLocaleDateString("pt-BR") : "data não informada"}
            </p>
            <div style={{ display: "flex", gap: layout.space.sm, flexWrap: "wrap" }}>
              <PrimaryButton label={mcpBusy ? "Gerando..." : "Gerar nova chave CLI"} onPress={() => generateMcpToken("cli")} disabled={mcpBusy} />
              <PrimaryButton label={mcpBusy ? "Gerando..." : "Gerar novo token MCP"} onPress={() => generateMcpToken("mcp")} disabled={mcpBusy} tone="neutral" />
              <PrimaryButton label="Revogar" onPress={revokeMcpTokens} tone="danger" disabled={mcpBusy} />
            </div>
          </>
        ) : (
          <div style={{ display: "flex", gap: layout.space.sm, flexWrap: "wrap" }}>
            <PrimaryButton label={mcpBusy ? "Gerando..." : "Gerar chave CLI"} onPress={() => generateMcpToken("cli")} disabled={mcpBusy} />
            <PrimaryButton label={mcpBusy ? "Gerando..." : "Gerar token MCP"} onPress={() => generateMcpToken("mcp")} disabled={mcpBusy} tone="neutral" />
          </div>
        )}
        {mcpError ? <InlineAlert title="Erro no token MCP" tone="danger" message={mcpError} /> : null}
      </div>

      {user.role === "admin" ? (
        <section style={{ ...styles.section, marginTop: layout.space.xl }}>
          <div style={styles.sectionLabel}>// ACESSO_ADMINISTRATIVO</div>
          <p style={styles.adminDescription}>
            Ferramentas operacionais disponíveis para administradores.
          </p>
          <div style={styles.adminLinks}>
            {ADMIN_NAV_LINKS.map((link) => (
              <Link key={link.path} href={link.path} style={styles.adminLink}>
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

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
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: layout.space.md,
    flexWrap: "wrap",
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
  editActions: { display: "flex", gap: layout.space.sm, flexWrap: "wrap" },
  description: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 12, lineHeight: "18px", margin: "4px 0 0 0" },
  adminDescription: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 12, lineHeight: "18px", margin: 0 },
  adminLinks: { display: "flex", flexWrap: "wrap", gap: layout.space.sm },
  adminLink: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    border: `1px solid ${colors.border}`,
    borderRadius: layout.radius.md,
    color: colors.text,
    display: "inline-flex",
    fontFamily: typography.mono,
    fontSize: 12,
    minHeight: layout.touch.minimum,
    padding: `${layout.space.xs}px ${layout.space.md}px`,
    textDecoration: "none",
  },
  badgeSuccess: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    borderRadius: 4,
    color: "#22c55e",
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    letterSpacing: 0.6,
  },
  badgeNeutral: {
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: 4,
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    letterSpacing: 0.6,
  },
};

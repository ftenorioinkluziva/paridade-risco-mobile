"use client";

import { useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { InlineAlert } from "@/components/InlineAlert";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { api, usePluggyWebhookEvents } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/formatters";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

const statusLabel: Record<string, string> = {
  RECEIVED: "Recebido",
  PROCESSING: "Processando",
  SUCCEEDED: "Processado",
  FAILED: "Falhou",
  IGNORED: "Ignorado",
};

function statusColor(status: string) {
  if (status === "SUCCEEDED") return colors.success;
  if (status === "FAILED") return colors.danger;
  if (status === "RECEIVED" || status === "PROCESSING") return colors.warning;
  return colors.textMuted;
}

export default function PluggyEventsPage() {
  const events = usePluggyWebhookEvents();
  const [refreshing, setRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    await events.refetch();
    setRefreshing(false);
  }

  async function retry(eventId: string) {
    setRetryingId(eventId);
    setActionError(null);
    try {
      await api.retryPluggyWebhookEvent(eventId);
      await events.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível reenfileirar o evento");
    } finally {
      setRetryingId(null);
    }
  }

  const eventList = events.data ?? [];

  return (
    <AuthGuard>
      <Screen
        title="Eventos Pluggy"
        subtitle="Acompanhe recebimento, processamento e reprocessamento dos eventos de conexão."
        action={<PrimaryButton label={refreshing ? "Atualizando..." : "Atualizar eventos"} disabled={refreshing} onPress={refresh} tone="neutral" />}
      >
        {actionError ? <InlineAlert title="Evento não reenfileirado" message={actionError} tone="danger" /> : null}
        {events.error ? <InlineAlert title="Erro nos eventos Pluggy" message={events.error} tone="danger" /> : null}
        {events.isLoading ? <div style={styles.emptyState}>Carregando eventos Pluggy...</div> : null}
        {!events.isLoading && eventList.length === 0 ? <div style={styles.emptyState}>Nenhum evento Pluggy associado a esta conta.</div> : null}
        {!events.isLoading && eventList.length > 0 ? (
          <div style={styles.list}>
            <div style={styles.listHeader}>
              <div style={styles.sectionLabel}>// WEBHOOK_EVENTS</div>
              <span style={styles.muted}>Payload bruto não é exibido</span>
            </div>
            {eventList.map((event: any) => (
              <div key={event.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={styles.nameBlock}>
                    <strong style={styles.name}>{event.event}</strong>
                    <span style={styles.meta}>eventId: {event.eventId}</span>
                  </div>
                  <span style={{ ...styles.status, color: statusColor(event.status) }}>{statusLabel[event.status] ?? event.status}</span>
                </div>
                <div style={styles.details}>
                  <span>Item: {event.itemId ?? "não identificado"}</span>
                  <span>Recebido: {formatDateTime(event.receivedAt)}</span>
                  <span>Tentativas: {event.attempts}</span>
                  {event.processedAt ? <span>Processado: {formatDateTime(event.processedAt)}</span> : null}
                </div>
                {event.lastError ? <div style={styles.error}>{event.lastError}</div> : null}
                {event.status === "FAILED" || event.status === "IGNORED" ? (
                  <div style={styles.actionRow}>
                    <PrimaryButton label={retryingId === event.id ? "Reenfileirando..." : "Reprocessar evento"} disabled={retryingId !== null} onPress={() => retry(event.id)} tone="neutral" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </Screen>
    </AuthGuard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { display: "flex", flexDirection: "column", gap: layout.space.sm },
  listHeader: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "center" },
  card: { display: "flex", flexDirection: "column", gap: layout.space.sm, padding: layout.space.md, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  cardTop: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "flex-start" },
  nameBlock: { display: "flex", flexDirection: "column", gap: 4 },
  name: { color: colors.text, fontSize: 14 },
  meta: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 11 },
  status: { fontFamily: typography.mono, fontSize: 11, fontWeight: 700 },
  details: { display: "flex", gap: layout.space.md, flexWrap: "wrap", color: colors.textMuted, fontFamily: typography.mono, fontSize: 11 },
  error: { color: colors.danger, fontSize: 12, lineHeight: "18px" },
  actionRow: { display: "flex", gap: layout.space.sm, alignItems: "center", flexWrap: "wrap" },
  sectionLabel: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.8 },
  muted: { color: colors.textMuted, fontSize: 12 },
  emptyState: { color: colors.textMuted, padding: layout.space.xl, textAlign: "center" },
};

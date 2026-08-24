"use client";

import { useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { InlineAlert } from "@/components/InlineAlert";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { api, useAssets, usePluggySourceActivationReadiness, usePluggyProjection } from "@/context/AuthContext";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

type AssetOption = { id: string; ticker: string; name: string };

const statusLabel: Record<string, string> = {
  MAPEADO: "Mapeado",
  SUGERIDO: "Candidato encontrado",
  PENDENTE: "Revisão necessária",
  FORA_DA_ESTRATEGIA: "Fora da estratégia",
};

const freshnessLabel: Record<string, string> = {
  FRESH: "Dados atualizados",
  STALE: "Dados desatualizados",
  UNAVAILABLE: "Sem sincronização disponível",
};

const connectionStatusLabel: Record<string, string> = {
  "item/error": "Erro na conexão",
  "item/waiting_user_input": "Aguardando autorização",
  "item/waiting_user_action": "Aguardando ação do usuário",
  DELETED: "Conexão removida",
};

const outsideStrategyReasons = [
  { value: "OUTRA_ESTRATEGIA", label: "Pertence a outra estratégia" },
  { value: "PREVIDENCIA", label: "Previdência ou planejamento de longo prazo" },
  { value: "FORA_DA_CESTA", label: "Não pertence à cesta ativa" },
  { value: "DADOS_INSUFICIENTES", label: "Dados insuficientes para classificar" },
];
const outsideStrategyReasonLabels = Object.fromEntries(outsideStrategyReasons.map((reason) => [reason.value, reason.label]));

export default function PluggyPage() {
  const projection = usePluggyProjection();
  const readiness = usePluggySourceActivationReadiness();
  const assets = useAssets();
  const [selectedAssets, setSelectedAssets] = useState<Record<string, string>>({});
  const [selectedOutsideReasons, setSelectedOutsideReasons] = useState<Record<string, string>>({});
  const [busyInvestmentId, setBusyInvestmentId] = useState<string | null>(null);
  const [sourceActivationBusy, setSourceActivationBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function syncNow() {
    setSyncBusy(true);
    setActionError(null);
    try {
      await api.syncPluggy();
      await Promise.all([projection.refetch(), readiness.refetch()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível sincronizar o Pluggy");
    } finally {
      setSyncBusy(false);
    }
  }

  async function approveMapping(investmentId: string, assetId: string) {
    if (!assetId) return;
    setBusyInvestmentId(investmentId);
    setActionError(null);
    try {
      await api.createPluggyMapping(investmentId, assetId);
      await Promise.all([projection.refetch(), readiness.refetch()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível aprovar o mapeamento");
    } finally {
      setBusyInvestmentId(null);
    }
  }

  async function removeMapping(investmentId: string) {
    setBusyInvestmentId(investmentId);
    setActionError(null);
    try {
      await api.deletePluggyMapping(investmentId);
      await Promise.all([projection.refetch(), readiness.refetch()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível remover o mapeamento");
    } finally {
      setBusyInvestmentId(null);
    }
  }

  async function markOutsideStrategy(investmentId: string) {
    const reason = selectedOutsideReasons[investmentId];
    if (!reason) return;
    setBusyInvestmentId(investmentId);
    setActionError(null);
    try {
      await api.markPluggyOutsideStrategy(investmentId, reason);
      await Promise.all([projection.refetch(), readiness.refetch()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível classificar o investimento");
    } finally {
      setBusyInvestmentId(null);
    }
  }

  async function approveSourceActivation() {
    setSourceActivationBusy(true);
    setActionError(null);
    try {
      await api.approvePluggySourceActivation();
      await readiness.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível aprovar a fonte Pluggy");
    } finally {
      setSourceActivationBusy(false);
    }
  }

  const investments = projection.data?.investments ?? [];
  const assetOptions = (assets.data ?? []) as AssetOption[];
  const mappedCount = projection.data?.totals?.mappedCount ?? 0;
  const pendingCount = projection.data?.totals?.pendingCount ?? 0;
  const outsideStrategyCount = projection.data?.totals?.outsideStrategyCount ?? 0;
  const connectionIssues = (projection.data?.connections ?? []).filter((connection: any) => (
    connection.status === "item/error" ||
    connection.status === "item/waiting_user_input" ||
    connection.status === "item/waiting_user_action" ||
    connection.status === "DELETED"
  ));

  return (
    <AuthGuard>
      <Screen
        pageId="pluggy"
        width="wide"
        title="Pluggy"
        subtitle="Revise os investimentos observados antes de ativar a fonte Pluggy."
      >
        {actionError ? <InlineAlert title="Ação não concluída" message={actionError} tone="danger" /> : null}
        {projection.error ? <InlineAlert title="Erro na projeção Pluggy" message={projection.error} tone="danger" /> : null}
        {readiness.error ? <InlineAlert title="Erro no gate de ativação" message={readiness.error} tone="danger" /> : null}

        {connectionIssues.length > 0 ? (
          <div style={styles.connectionAlert}>
            <div>
              <div style={styles.sectionLabel}>// AÇÃO_NECESSÁRIA_NA_CONEXÃO</div>
              {connectionIssues.map((connection: any) => (
                <div key={connection.id} style={styles.connectionIssue}>
                  <strong>{connectionStatusLabel[connection.status] ?? connection.status}</strong>
                  <span>{connection.connectorName ?? "Instituição Pluggy"} · item {connection.itemId}</span>
                  {connection.lastError ? <span>{connection.lastError}</span> : null}
                </div>
              ))}
            </div>
            <div style={styles.connectionAction}>
              <PrimaryButton label={syncBusy ? "Tentando sincronizar..." : "Tentar sincronizar"} disabled={syncBusy} onPress={syncNow} tone="neutral" />
              <span style={styles.muted}>Se a autorização estiver pendente, reconecte a instituição pelo fluxo Pluggy.</span>
            </div>
          </div>
        ) : null}

        {projection.data?.freshness ? (
          <div style={styles.freshness}>
            <div>
              <div style={styles.sectionLabel}>// FRESCOR_DOS_DADOS</div>
              <div style={{ ...styles.freshnessTitle, color: projection.data.freshness.status === "FRESH" ? colors.success : colors.warning }}>
                {freshnessLabel[projection.data.freshness.status] ?? projection.data.freshness.status}
              </div>
            </div>
            <div style={styles.freshnessMeta}>
              <span>
                Última sincronização: {projection.data.freshness.latestSyncAt
                  ? formatDateTime(projection.data.freshness.latestSyncAt)
                  : "nunca"}
              </span>
              {projection.data.freshness.ageMinutes !== null ? (
                <span>Idade: {Math.round(projection.data.freshness.ageMinutes)} min</span>
              ) : null}
            </div>
            <PrimaryButton
              label={syncBusy ? "Sincronizando..." : "Sincronizar agora"}
              disabled={syncBusy}
              onPress={syncNow}
              tone="neutral"
            />
          </div>
        ) : null}

        {readiness.data ? (
          <div style={{ ...styles.gate, borderColor: readiness.data.canActivatePluggy ? colors.success : colors.warning }}>
            <div style={styles.gateHeader}>
              <div>
                <div style={styles.sectionLabel}>// GATE_ATIVACAO_FONTE</div>
                <div style={styles.gateTitle}>
                  {readiness.data.currentMode === "PLUGGY"
                    ? "Fonte Pluggy ativa"
                    : readiness.data.canActivatePluggy ? "Pronto para revisão final" : "Ativação bloqueada"}
                </div>
              </div>
              <span style={{ ...styles.status, color: readiness.data.canActivatePluggy ? colors.success : colors.warning }}>
                {readiness.data.currentMode} → {readiness.data.candidateMode}
              </span>
            </div>
            <div style={styles.gateText}>{readiness.data.nextAction}</div>
            {readiness.data.canActivatePluggy && readiness.data.currentMode === "MANUAL" ? (
              <div style={styles.sourceActivationAction}>
                <PrimaryButton
                  label={sourceActivationBusy ? "Aprovando fonte..." : "Aprovar fonte Pluggy"}
                  disabled={sourceActivationBusy}
                  onPress={approveSourceActivation}
                />
                <span style={styles.muted}>A aprovação muda apenas a fonte de leitura da carteira.</span>
              </div>
            ) : null}
            <div style={styles.metrics}>
              <span>Mapeados: {mappedCount}</span>
              <span>Pendentes: {pendingCount}</span>
              <span>Fora da estratégia: {outsideStrategyCount}</span>
              <span>CRUD manual: {readiness.data.manualCrudStatus}</span>
            </div>
            {readiness.data.blockers?.length > 0 ? (
              <div style={styles.blockers}>
                {readiness.data.blockers.map((blocker: string) => <div key={blocker}>• {blocker}</div>)}
              </div>
            ) : null}
            {readiness.data.warnings?.length > 0 ? (
              <div style={styles.warnings}>
                {readiness.data.warnings.map((warning: string) => <div key={warning}>• {warning}</div>)}
              </div>
            ) : null}
          </div>
        ) : null}

        {projection.isLoading ? <div style={styles.emptyState}>Carregando investimentos Pluggy...</div> : null}
        {!projection.isLoading && investments.length === 0 ? (
          <div style={styles.emptyState}>Nenhum investimento Pluggy sincronizado.</div>
        ) : null}

        {!projection.isLoading && investments.length > 0 ? (
          <div style={styles.list}>
            <div style={styles.listHeader}>
              <div style={styles.sectionLabel}>// INVESTIMENTOS_OBSERVADOS</div>
              <span style={styles.muted}>A aprovação é sempre explícita</span>
            </div>
            {investments.map((investment: any) => {
              const isMapped = investment.classification.mappingStatus === "MAPEADO";
              const isOutsideStrategy = investment.classification.mappingStatus === "FORA_DA_ESTRATEGIA";
              const candidateId = investment.mappingCandidate?.assetId ?? "";
              const selectedAssetId = selectedAssets[investment.id] ?? candidateId;
              const selectedOutsideReason = selectedOutsideReasons[investment.id] ?? "";
              const busy = busyInvestmentId === investment.id;

              return (
                <div key={investment.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <div style={styles.nameBlock}>
                      <span style={styles.name}>{investment.name}</span>
                      <span style={styles.meta}>
                        {investment.code ?? investment.isin ?? "Sem identificador"} · {investment.type ?? "Tipo desconhecido"}
                      </span>
                    </div>
                    <span style={{ ...styles.status, color: isMapped ? colors.success : colors.warning }}>
                      {statusLabel[investment.classification.mappingStatus] ?? investment.classification.mappingStatus}
                    </span>
                  </div>
                  <div style={styles.valueRow}>
                    <span style={styles.meta}>Valor observado</span>
                    <span style={styles.value}>{formatCurrency(investment.currentValue)}</span>
                  </div>
                  {investment.mappingCandidate ? (
                    <div style={styles.candidate}>Candidato: <strong>{investment.mappingCandidate.ticker}</strong> — {investment.mappingCandidate.name}</div>
                  ) : null}
                  {isOutsideStrategy ? (
                    <div style={styles.outsideReason}>
                      Motivo: {outsideStrategyReasonLabels[investment.decisionReason] ?? investment.decisionReason ?? investment.classification.reason}
                    </div>
                  ) : null}
                  <div style={styles.actionRow}>
                    {isMapped ? (
                      <PrimaryButton label={busy ? "Removendo..." : "Remover vínculo"} tone="danger" disabled={busy} onPress={() => removeMapping(investment.id)} />
                    ) : isOutsideStrategy ? (
                      <PrimaryButton label={busy ? "Reabrindo..." : "Reabrir revisão"} tone="neutral" disabled={busy} onPress={() => removeMapping(investment.id)} />
                    ) : (
                      <>
                        <select
                          value={selectedAssetId}
                          disabled={busy}
                          onChange={(event) => setSelectedAssets((current) => ({ ...current, [investment.id]: event.target.value }))}
                          style={styles.select}
                        >
                          <option value="">Escolher ativo estratégico</option>
                          {assetOptions.map((asset) => <option key={asset.id} value={asset.id}>{asset.ticker} — {asset.name}</option>)}
                        </select>
                        <PrimaryButton label={busy ? "Aprovando..." : "Aprovar mapeamento"} disabled={busy || !selectedAssetId} onPress={() => approveMapping(investment.id, selectedAssetId)} />
                        <select
                          aria-label={`Motivo fora da estratégia para ${investment.name}`}
                          value={selectedOutsideReason}
                          disabled={busy}
                          onChange={(event) => setSelectedOutsideReasons((current) => ({ ...current, [investment.id]: event.target.value }))}
                          style={styles.select}
                        >
                          <option value="">Se não pertence, escolha o motivo</option>
                          {outsideStrategyReasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                        </select>
                        <PrimaryButton label={busy ? "Salvando..." : "Fora da estratégia"} tone="neutral" disabled={busy || !selectedOutsideReason} onPress={() => markOutsideStrategy(investment.id)} />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </Screen>
    </AuthGuard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  gate: { display: "flex", flexDirection: "column", gap: layout.space.sm, padding: layout.space.lg, backgroundColor: colors.accentPanel, borderWidth: 1, borderStyle: "solid", borderRadius: layout.radius.md },
  gateHeader: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "flex-start" },
  gateTitle: { color: colors.text, fontSize: 18, fontWeight: 700, marginTop: 4 },
  gateText: { color: colors.textMuted, fontSize: 13, lineHeight: "18px" },
  sourceActivationAction: { display: "flex", gap: layout.space.sm, alignItems: "center", flexWrap: "wrap" },
  metrics: { display: "flex", gap: layout.space.md, flexWrap: "wrap", color: colors.textSoft, fontFamily: typography.mono, fontSize: 11 },
  blockers: { display: "flex", flexDirection: "column", gap: 4, color: colors.warning, fontSize: 12, lineHeight: "18px" },
  warnings: { display: "flex", flexDirection: "column", gap: 4, color: colors.primary, fontSize: 12, lineHeight: "18px" },
  freshness: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "center", flexWrap: "wrap", padding: layout.space.md, backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: layout.radius.md, borderWidth: 1, borderStyle: "solid" },
  freshnessTitle: { fontSize: 14, fontWeight: 700, marginTop: 4 },
  freshnessMeta: { display: "flex", flexDirection: "column", gap: 4, color: colors.textMuted, fontFamily: typography.mono, fontSize: 11 },
  connectionAlert: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "center", flexWrap: "wrap", padding: layout.space.md, backgroundColor: colors.accentPanel, border: `1px solid ${colors.warning}`, borderRadius: layout.radius.md },
  connectionIssue: { display: "flex", flexDirection: "column", gap: 3, color: colors.text, fontSize: 12, marginTop: 6 },
  connectionAction: { display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start", maxWidth: 360 },
  sectionLabel: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.8 },
  list: { display: "flex", flexDirection: "column", gap: layout.space.sm },
  listHeader: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "center" },
  muted: { color: colors.textMuted, fontSize: 12 },
  card: { display: "flex", flexDirection: "column", gap: layout.space.sm, padding: layout.space.md, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: layout.radius.md, borderWidth: 1, borderStyle: "solid" },
  cardTop: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "flex-start" },
  nameBlock: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 },
  name: { color: colors.text, fontSize: 15, fontWeight: 600 },
  meta: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 11 },
  status: { fontFamily: typography.mono, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  valueRow: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "center" },
  value: { color: colors.text, fontFamily: typography.mono, fontSize: 14, fontWeight: 700 },
  candidate: { color: colors.primary, fontSize: 12, lineHeight: "18px" },
  outsideReason: { color: colors.textMuted, fontSize: 12, lineHeight: "18px" },
  actionRow: { display: "flex", gap: layout.space.sm, alignItems: "center", flexWrap: "wrap" },
  select: { flex: 1, minWidth: 220, minHeight: layout.touch.minimum, padding: "0 8px", color: colors.text, backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md, fontSize: 12 },
  emptyState: { color: colors.textMuted, padding: layout.space.xl, textAlign: "center" },
};

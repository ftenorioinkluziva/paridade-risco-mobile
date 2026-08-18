"use client";

import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/AuthGuard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

type Props = {
  title: string;
  legacyLabel: string;
};

export function LegacyRouteNotice({ title, legacyLabel }: Props) {
  const router = useRouter();

  return (
    <AuthGuard>
      <Screen title={title} subtitle="Esta área está em transição para a experiência baseada em dados conectados.">
        <div style={styles.card}>
          <div style={styles.kicker}>// ESCOPO_LEGADO_DESATIVADO</div>
          <div style={styles.title}>{legacyLabel}</div>
          <div style={styles.message}>
            A gestão manual foi pausada enquanto a carteira observada se torna a fonte principal do produto.
            Seus dados legados continuam preservados para compatibilidade e eventual rollback.
          </div>
          <div style={styles.actions}>
            <PrimaryButton label="Abrir investimentos" onPress={() => router.push("/investimentos")} />
            <PrimaryButton label="Ver saúde financeira" tone="neutral" onPress={() => router.push("/saude-financeira")} />
          </div>
        </div>
      </Screen>
    </AuthGuard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.md,
    padding: layout.space.xl,
    backgroundColor: colors.accentPanel,
    border: `1px solid ${colors.border}`,
    borderRadius: layout.radius.md,
  },
  kicker: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 700,
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: "21px",
    maxWidth: 680,
  },
  actions: {
    display: "flex",
    gap: layout.space.sm,
    flexWrap: "wrap",
  },
};

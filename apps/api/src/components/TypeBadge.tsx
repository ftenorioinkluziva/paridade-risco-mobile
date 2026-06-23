"use client";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

type Props = {
  label: string;
  variant?: "buy" | "sell";
};

const VARIANT_MAP: Record<string, "buy" | "sell"> = {
  COMPRA: "buy", APORTAR: "buy", COMPRAR: "buy",
  VENDA: "sell", RETIRAR: "sell", VENDER: "sell",
};

export function TypeBadge({ label, variant }: Props) {
  const resolved = variant ?? VARIANT_MAP[label] ?? "buy";
  const isBuy = resolved === "buy";

  return (
    <span
      style={{
        ...styles.badge,
        backgroundColor: isBuy ? "rgba(59,130,246,0.15)" : "rgba(245,158,11,0.15)",
        borderColor: isBuy ? "rgba(59,130,246,0.4)" : "rgba(245,158,11,0.4)",
      }}
    >
      <span style={{ ...styles.text, color: isBuy ? colors.buyBlue : colors.warning }}>{label}</span>
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: "inline-flex",
    borderRadius: 4,
    padding: "2px 6px",
    borderWidth: 1,
    borderStyle: "solid",
  },
  text: {
    fontFamily: typography.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
};
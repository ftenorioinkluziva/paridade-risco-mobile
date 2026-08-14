import type { AssetType } from "@paridade-risco/shared";

export type PluggyMappingStatus = "MAPEADO" | "SUGERIDO" | "PENDENTE" | "FORA_DA_ESTRATEGIA";

export interface PluggyInvestmentClassification {
  riskBucket: AssetType;
  mappingStatus: PluggyMappingStatus;
  reason: string;
}

export function resolvePluggyMappingStatus(input: {
  hasPersistedMapping: boolean;
  hasMappingCandidate: boolean;
  persistedStatus?: PluggyMappingStatus;
}): PluggyMappingStatus {
  if (input.persistedStatus === "FORA_DA_ESTRATEGIA") return "FORA_DA_ESTRATEGIA";
  if (input.hasPersistedMapping) return "MAPEADO";
  return input.hasMappingCandidate ? "SUGERIDO" : "PENDENTE";
}

function normalized(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, " ")
    .trim();
}

function containsAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function classifyPluggyInvestment(input: {
  code?: string | null;
  name?: string | null;
  type?: string | null;
  subtype?: string | null;
  issuer?: string | null;
  hasMappingCandidate?: boolean;
}): PluggyInvestmentClassification {
  const descriptor = normalized([
    input.code,
    input.name,
    input.type,
    input.subtype,
    input.issuer,
  ].filter(Boolean).join(" "));

  let riskBucket: AssetType = "OUTRO";
  let reason = "Nenhuma regra de classificação foi encontrada";

  if (containsAny(descriptor, ["ETF"])) {
    riskBucket = "ETF";
    reason = "Identificador ou descrição contém ETF";
  } else if (containsAny(descriptor, ["CRYPTO", "CRIPTO", "BITCOIN", "BTC", "ETHEREUM", "ETH"])) {
    riskBucket = "CRYPTO";
    reason = "Identificador ou descrição indica criptoativo";
  } else if (containsAny(descriptor, ["COMMODITY", "GOLD", "OURO", "SILVER", "PRATA"])) {
    riskBucket = "COMMODITY";
    reason = "Identificador ou descrição indica commodity";
  } else if (containsAny(descriptor, [
    "FIXED INCOME",
    "RENDA FIXA",
    "CDB",
    "LCI",
    "LCA",
    "TESOURO",
    "BOND",
    "DEBENTURE",
    "CRI",
    "CRA",
    "RDB",
  ])) {
    riskBucket = "RENDA_FIXA";
    reason = "Identificador ou descrição indica renda fixa";
  } else if (containsAny(descriptor, ["CASH", "CAIXA", "MONEY MARKET", "CHECKING", "SAVINGS"])) {
    riskBucket = "CAIXA";
    reason = "Identificador ou descrição indica caixa";
  }

  return {
    riskBucket,
    mappingStatus: resolvePluggyMappingStatus({
      hasPersistedMapping: false,
      hasMappingCandidate: Boolean(input.hasMappingCandidate),
    }),
    reason,
  };
}

function identifierKey(value: string | null | undefined) {
  return normalized(value).replace(/ /g, "");
}

export function findMappingCandidate(
  investment: { code: string | null; isin: string | null },
  localAssets: Array<{ id: string; ticker: string; sourceTicker: string | null; name: string; type: AssetType }>,
) {
  const identifiers = [investment.code, investment.isin].map(identifierKey).filter(Boolean);
  if (identifiers.length === 0) return null;

  return localAssets.find((asset) => {
    const assetIdentifiers = [asset.ticker, asset.sourceTicker].map(identifierKey).filter(Boolean);
    return assetIdentifiers.some((assetIdentifier) => identifiers.includes(assetIdentifier));
  }) ?? null;
}

export function isPluggyCreditCard(type: string | null, subtype: string | null) {
  return containsAny(normalized(`${type ?? ""} ${subtype ?? ""}`), ["CREDIT CARD", "CARTAO", "CREDITCARD"]);
}

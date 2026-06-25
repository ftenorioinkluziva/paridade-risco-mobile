#!/usr/bin/env node

/**
 * Paridade de Risco Telegram Bot
 *
 * Bot determinístico — sem LLM, sem alucinação.
 * Consulta a API REST real e formata respostas em markdown.
 *
 * Uso:
 *   TELEGRAM_BOT_TOKEN=xxx API_URL=https://... node src/bot.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env directly (avoids shell redaction) ────────────────────────────

const ENV_PATH = join(__dirname, "..", ".env");
if (existsSync(ENV_PATH)) {
  const envContent = readFileSync(ENV_PATH, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && val) process.env[key] = val;
  }
}

// ─── Config ──────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

const API_URL = (process.env.API_URL || "https://paridaderisco.blackboxinovacao.com.br").replace(/\/+$/, "");
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "2000", 10); // ms between polls
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── Telegram API helpers ────────────────────────────────────────────────────

let lastUpdateId = 0;

async function tgGetUpdates() {
  const url = `${TG_API}/getUpdates?timeout=30&allowed_updates=["message"]`;
  const offset = lastUpdateId > 0 ? `&offset=${lastUpdateId + 1}` : "";
  try {
    const res = await fetch(url + offset);
    const data = await res.json();
    if (!data.ok) return [];
    for (const update of data.result || []) {
      if (update.update_id > lastUpdateId) lastUpdateId = update.update_id;
    }
    return data.result || [];
  } catch (e) {
    console.error("getUpdates error:", e.message);
    return [];
  }
}

async function tgSendMessage(chatId, text, parseMode = "Markdown") {
  try {
    await fetch(`${TG_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.error("sendMessage error:", e.message);
  }
}

// ─── API Client ──────────────────────────────────────────────────────────────

async function apiCall(path, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(`${API_URL}${path}`, { headers });
    if (res.status === 401) return { error: "unauthorized" };
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    return { data };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── Token Resolution ────────────────────────────────────────────────────────

async function resolveToken(chatId) {
  const { data } = await apiCall(`/api/auth/token-by-telegram?chat_id=${chatId}`, null);
  if (!data || !data.token) return null;
  return data;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function fmtCurrency(v) {
  if (v == null || isNaN(v)) return "—";
  return `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(v) {
  if (v == null || isNaN(v)) return "—";
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(2).replace(".", ",")}%`;
}

function driftEmoji(drift) {
  if (drift == null) return "⬜";
  const abs = Math.abs(drift);
  if (abs < 1) return "✅";
  if (abs < 3) return "🟡";
  return "🔴";
}

// ─── Command Handlers ────────────────────────────────────────────────────────

async function handleCarteira(chatId, user) {
  const { token, name } = user;

  // Fetch all data in parallel
  const [portfolio, prices, rebalance, basket] = await Promise.all([
    apiCall("/api/portfolio/summary", token),
    apiCall("/api/assets/prices", token),
    apiCall("/api/rebalance/preview", token),
    apiCall("/api/baskets/active", token),
  ]);

  // Check errors
  if (portfolio.error || !portfolio.data) {
    return `😕 ${name}, não consegui acessar sua carteira. Tente fazer login novamente no app.`;
  }

  const p = portfolio.data;
  const lines = [];

  lines.push(`📊 *Olá, ${name || "investidor"}!*`);
  lines.push("");

  // Summary
  lines.push(`💰 *Total:* ${fmtCurrency(p.totalValue)}`);
  lines.push(`📈 *Ganho não realizado:* ${fmtCurrency(p.unrealizedGain)}`);
  lines.push(`💵 *Caixa:* ${fmtCurrency(p.cashBalance)}`);
  lines.push("");

  // Drift
  if (rebalance.data) {
    const r = rebalance.data;
    lines.push(`📋 *Cesta ativa:* ${r.targetBasketName || "—"}`);
    lines.push(`🎯 *Drift:* ${fmtPct(r.driftPercentage)}`);
    lines.push("");
  }

  // Positions
  if (p.positions?.length > 0) {
    lines.push("▸ *Posições*");
    for (const pos of p.positions) {
      const ticker = pos.ticker || pos.symbol || "—";
      const allocPct = pos.allocationPercentage != null ? fmtPct(pos.allocationPercentage) : "—";
      const val = pos.currentValue != null ? fmtCurrency(pos.currentValue) : "—";
      const gain = pos.gain != null ? fmtCurrency(pos.gain) : "—";
      lines.push(`  *${ticker}*: ${allocPct} — ${val} (${gain})`);
    }
    lines.push("");
  }

  // Funds
  if (p.funds?.length > 0) {
    lines.push("▸ *Fundos de investimento*");
    for (const fund of p.funds) {
      const val = fund.currentValue != null ? fmtCurrency(fund.currentValue) : "—";
      const gain = fund.gain != null ? fmtCurrency(fund.gain) : "—";
      const name = fund.name || fund.ticker || "—";
      lines.push(`  📦 *${name}*: ${val} (${gain})`);
    }
    lines.push("");
  }

  // Rebalance actions
  if (rebalance.data?.actions?.length > 0) {
    const actions = rebalance.data.actions;
    lines.push("🔄 *Ações de rebalanceamento*");
    for (const a of actions) {
      const arrow = a.action === "APORTAR" ? "🟢 Comprar" : "🔴 Reduzir";
      lines.push(`  ${arrow} *${a.ticker}*: ${fmtCurrency(a.amount)} (${fmtPct(a.targetPercentage)} alvo)`);
    }
    lines.push("");
  }

  // Sign-off
  lines.push("💡 *Dica:* pergunte 'rebalance' para ver o passo a passo ou 'cenário' para análise macro.");
  lines.push("_Dados da API em tempo real — sem IA na consulta._");

  return lines.join("\n");
}

async function handleRebalance(chatId, user) {
  const { token, name } = user;

  const [rebalance, portfolio] = await Promise.all([
    apiCall("/api/rebalance/preview", token),
    apiCall("/api/portfolio/summary", token),
  ]);

  if (rebalance.error || !rebalance.data) {
    return `😕 ${name}, não consegui calcular o rebalanceamento.`;
  }

  const r = rebalance.data;
  const p = portfolio.data;
  const lines = [];

  lines.push(`🔄 *Rebalanceamento — ${name || "investidor"}*`);
  lines.push("");

  if (r.driftPercentage != null) {
    if (r.driftPercentage < 1) {
      lines.push("✅ *Carteira equilibrada!* Drift de apenas " + fmtPct(r.driftPercentage));
    } else {
      lines.push(`⚠️ *Drift de ${fmtPct(r.driftPercentage)}* — requer ajustes:`);
      lines.push("");
      if (r.actions?.length > 0) {
        // Sort by amount descending
        const sorted = [...r.actions].sort((a, b) => b.amount - a.amount);
        lines.push("| # | Ação | Ativo | Valor | Alvo |");
        lines.push("|---|------|-------|-------|------|");
        sorted.forEach((a, i) => {
          const action = a.action === "APORTAR" ? "🟢 Comprar" : "🔴 Vender";
          lines.push(`| ${i + 1} | ${action} | *${a.ticker}* | ${fmtCurrency(a.amount)} | ${fmtPct(a.targetPercentage)} |`);
        });
      }
    }
  }

  if (p) {
    lines.push("");
    lines.push(`💰 *Total:* ${fmtCurrency(p.totalValue)}`);
    lines.push(`💵 *Caixa disponível:* ${fmtCurrency(p.cashBalance)}`);
  }

  return lines.join("\n");
}

async function handleCenario(chatId, user) {
  const lines = [];

  // Fetch BCB data in parallel
  const [selicRes, ipcaRes, ibcRes, dolarRes] = await Promise.all([
    fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/3?formato=json").catch(() => null),
    fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/3?formato=json").catch(() => null),
    fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.24363/dados/ultimos/3?formato=json").catch(() => null),
    fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.3698/dados/ultimos/3?formato=json").catch(() => null),
  ]);

  const selic = selicRes?.ok ? await selicRes.json() : null;
  const ipca = ipcaRes?.ok ? await ipcaRes.json() : null;
  const ibc = ibcRes?.ok ? await ibcRes.json() : null;
  const dolar = dolarRes?.ok ? await dolarRes.json() : null;

  const selicAtual = selic?.[selic.length - 1]?.valor;
  const selicAntigo = selic?.[0]?.valor;
  const selicTendencia = selicAtual && selicAntigo
    ? (parseFloat(selicAtual) < parseFloat(selicAntigo) ? "caindo 📉" :
       parseFloat(selicAtual) > parseFloat(selicAntigo) ? "subindo 📈" : "estável ➡️")
    : "—";

  const ipcaAtual = ipca?.[ipca.length - 1]?.valor;
  const ipcaAnterior = ipca?.[ipca.length - 2]?.valor;
  const ipcaTendencia = ipcaAtual && ipcaAnterior
    ? (parseFloat(ipcaAtual) > parseFloat(ipcaAnterior) ? "acelerando 🔴" : "desacelerando 🟢")
    : "—";

  const ibcAtual = ibc?.[ibc.length - 1]?.valor;
  const ibcAnterior = ibc?.[ibc.length - 2]?.valor;
  const ibcTendencia = ibcAtual && ibcAnterior
    ? (parseFloat(ibcAtual) >= parseFloat(ibcAnterior) ? "crescendo 🟢" : "caindo 🔴")
    : "—";

  const dolarAtual = dolar?.[dolar.length - 1]?.valor;

  // Classify scenario (C1-C4)
  const pibSubindo = ibcTendencia.includes("crescendo");
  const ipcaSubindo = ipcaTendencia.includes("acelerando");

  let cenario, cenarioIcon;
  if (pibSubindo && !ipcaSubindo) { cenario = "C1"; cenarioIcon = "🌱"; }
  else if (pibSubindo && ipcaSubindo) { cenario = "C2"; cenarioIcon = "🟡"; }
  else if (!pibSubindo && ipcaSubindo) { cenario = "C3"; cenarioIcon = "🔴"; }
  else { cenario = "C4"; cenarioIcon = "🔵"; }

  // Build response
  lines.push(`🔮 *Cenário Macro* — ${new Date().toLocaleDateString("pt-BR")}`);
  lines.push("");

  lines.push(`📊 *Classificação:* ${cenarioIcon} **${cenario}**`);
  lines.push("");

  lines.push("▸ *Indicadores*");
  lines.push(`  💰 Selic: **${parseFloat(selicAtual || 0).toFixed(2)}%** — ${selicTendencia}`);
  lines.push(`  📈 IPCA 12m: **${parseFloat(ipcaAtual || 0).toFixed(2)}%** — ${ipcaTendencia}`);
  lines.push(`  🏭 IBC-Br (PIB): **${ibcAtual || "—"}** — ${ibcTendencia}`);
  lines.push(`  💵 Dólar: **R$ ${parseFloat(dolarAtual || 0).toFixed(2)}**`);
  lines.push("");

  // Scenario description
  const descricoes = {
    C1: "Crescimento econômico com inflação controlada. Favorece: BOVA11, XFIX11, IB5M11. Posição comprada em risco.",
    C2: "Crescimento com inflação. Cenário misto. CDI e B5P211 como proteção. Cautela com renda variável.",
    C3: "Estagflação — PIB caindo, inflação subindo. Dólar e B5P211 como hedge. Evitar renda variável.",
    C4: "Recessão com desinflação. IFRM11 e pré-fixados se beneficiam. Cenário defensivo.",
  };
  lines.push(`📖 *${descricoes[cenario]}*`);
  lines.push("");

  lines.push("💡 *Dica:* pergunte 'carteira' para ver como seu portfólio se comporta neste cenário.");
  lines.push("_Dados: BCB SGS — atualização diária._");

  return lines.join("\n");
}

async function handleAjuda(chatId, user) {
  const lines = [];
  lines.push("🤖 *Paridade de Risco Bot*");
  lines.push("");
  lines.push("Comandos disponíveis:");
  lines.push("");
  lines.push("📊 *carteira* — resumo da sua carteira");
  lines.push("🔄 *rebalance* — preview de rebalanceamento");
  lines.push("🔮 *cenário* — classificação macro com dados do BCB");
  lines.push("💰 *aportar* — onde investir seu dinheiro");
  lines.push("💹 *preços* — preços atualizados dos ativos");
  lines.push("📋 *transações* — últimas movimentações");
  lines.push("📦 *fundos* — fundos de investimento");
  lines.push("👤 *perfil* — seus dados de cadastro");
  lines.push("❓ *ajuda* — esta mensagem");
  lines.push("");
  lines.push("📌 *Primeiro uso?*");
  lines.push("1. Acesse paridaderisco.blackboxinovacao.com.br");
  lines.push("2. Crie sua conta e faça login");
  lines.push("3. Vá em Perfil > Editar > Telegram Chat ID");
  lines.push(`4. Insira \`${chatId}\` e salve`);
  lines.push("5. Pronto! Já pode me perguntar.");
  return lines.join("\n");
}

async function handleTransacoes(chatId, user) {
  const { token, name } = user;
  const { data } = await apiCall("/api/transactions", token);
  if (!data || !data.length) {
    return `${name}, nenhuma transação encontrada.`;
  }
  const lines = [`📋 *Últimas transações*`];
  const recentes = data.slice(0, 8);
  for (const tx of recentes) {
    const tipo = tx.type === "COMPRA" ? "🟢 Compra" : "🔴 Venda";
    const ticker = tx.assetTicker || tx.ticker || "—";
    const qtd = tx.shares || 0;
    const preco = tx.pricePerShare ? fmtCurrency(tx.pricePerShare) : "—";
    const total = tx.totalAmount != null ? fmtCurrency(tx.totalAmount) : "—";
    const dataStr = tx.tradedAt ? tx.tradedAt.slice(0, 10) : "—";
    lines.push(`  ${tipo} *${ticker}* — ${qtd} x ${preco} = ${total} (${dataStr})`);
  }
  return lines.join("\n");
}

async function handleFundos(chatId, user) {
  const { token, name } = user;
  const { data } = await apiCall("/api/funds", token);
  if (!data || !data.length) {
    return `${name}, nenhum fundo de investimento cadastrado.`;
  }
  const lines = [`📦 *Fundos de Investimento*`];
  for (const f of data) {
    const val = f.currentValue != null ? fmtCurrency(f.currentValue) : "—";
    const ini = f.initialInvestment != null ? fmtCurrency(f.initialInvestment) : "—";
    const gain = f.gain != null ? fmtCurrency(f.gain) : "—";
    const nome = f.name || f.ticker || "—";
    lines.push(`  📦 *${nome}*: ${val} (investido ${ini}, ganho ${gain})`);
  }
  return lines.join("\n");
}

async function handlePrecos(chatId, user) {
  const { token, name } = user;
  const { data } = await apiCall("/api/assets/prices", token);
  if (!data || !data.length) {
    return `${name}, nenhum preço disponível.`;
  }
  const lines = [`💹 *Preços dos Ativos*`];
  for (const a of data) {
    const ticker = a.ticker || "—";
    const preco = a.price != null ? fmtCurrency(a.price) : "—";
    const dataStr = a.priceDate ? a.priceDate.slice(0, 10) : "—";
    const tipo = a.calculationType || "";
    lines.push(`  *${ticker}*: ${preco} (${dataStr})${tipo ? ` [${tipo}]` : ""}`);
  }
  return lines.join("\n");
}

async function handlePerfil(chatId, user) {
  const { token, name } = user;
  const lines = [`👤 *Perfil*`];
  lines.push(`  Nome: *${user.name || "—"}*`);
  lines.push(`  Email: *${user.email || "—"}*`);
  // Try fetching profile for more details
  const { data } = await apiCall("/api/profile", token);
  if (data) {
    lines.push(`  Telefone: ${data.phone || "—"}`);
    if (data.birthDate) lines.push(`  Nascimento: ${data.birthDate.slice(0, 10)}`);
    lines.push(`  Função: ${data.roleLabel || data.role || "—"}`);
    lines.push(`  Cesta ativa: ${data.activeBasketName || "—"}`);
    lines.push(`  Telegram ID: ${data.telegramChatId || "—"}`);
  }
  return lines.join("\n");
}

async function handleAportar(chatId, user) {
  const { token, name } = user;
  const [portfolio, rebalance] = await Promise.all([
    apiCall("/api/portfolio/summary", token),
    apiCall("/api/rebalance/preview", token),
  ]);
  if (portfolio.error) return `😕 ${name}, não consegui acessar sua carteira.`;
  const p = portfolio.data;
  const r = rebalance.data;
  const lines = [`💰 *Onde investir — ${name || "investidor"}*`];
  lines.push(`  Caixa disponível: ${fmtCurrency(p.cashBalance || 0)}`);
  lines.push("");
  if (r?.actions?.length > 0) {
    const aportes = r.actions.filter(a => a.action === "APORTAR").sort((a, b) => b.amount - a.amount);
    if (aportes.length > 0) {
      lines.push("▸ *Prioridade de aporte*");
      for (const a of aportes) {
        lines.push(`  ${a.ticker === "IFRM11" ? "🥇" : "🥈"} *${a.ticker}*: precisa de ${fmtCurrency(a.amount)} (alvo ${fmtPct(a.targetPercentage)})`);
      }
      lines.push("");
    }
    const reducoes = r.actions.filter(a => a.action !== "APORTAR").sort((a, b) => b.amount - a.amount);
    if (reducoes.length > 0) {
      lines.push("▸ *Ativos com excesso*");
      for (const a of reducoes) {
        lines.push(`  🔴 *${a.ticker}*: ${fmtCurrency(a.amount)} acima do alvo`);
      }
    }
  } else {
    lines.push("✅ Carteira equilibrada! Nenhum ajuste necessário.");
  }
  return lines.join("\n");
}

// ─── Message Router ──────────────────────────────────────────────────────────

function detectIntent(text) {
  const t = (text || "").toLowerCase().trim();

  if (/^(oi|ola|olá|bom dia|boa tarde|boa noite|hello|hey)/i.test(t)) return "greeting";
  if (/^\/carteira$|carteira|portfolio|posição|resumo|como está|patrimônio|saldo/i.test(t)) return "carteira";
  if (/^\/rebalance$|rebalance|drift|ajustar|corrigir|comprar|vender|aportar/i.test(t)) return "rebalance";
  if (/^\/cenario$|^\/cenário$|cenário|cenario|macroecon|pib|ipca|selic|juros|inflação/i.test(t)) return "cenario";
  if (/^\/ajuda$|^\/start$|ajuda|help|comando|o que fazer|funciona/i.test(t)) return "ajuda";
  if (/^\/transacoes$|transaç|transac|movimenta|extrato/i.test(t)) return "transacoes";
  if (/^\/fundos$|fundos/i.test(t)) return "fundos";
  if (/^\/precos$|^\/preços$|preços|precos|cotação|cotacao/i.test(t)) return "precos";
  if (/^\/perfil$|perfil/i.test(t)) return "perfil";
  if (/^\/aportar$|aportar|onde investir|aplicar|sobra/i.test(t)) return "aportar";
  return "carteira"; // default
}

async function handleMessage(chatId, text) {
  // Resolve user
  const user = await resolveToken(chatId);
  if (!user) {
    return await handleAjuda(chatId, null);
  }

  const intent = detectIntent(text);
  console.log(`[${chatId}] intent=${intent} user=${user.name}`);

  switch (intent) {
    case "greeting":
      return `Olá, *${user.name || "investidor"}*! 🖐️\n\nQuer saber como está sua carteira? É só perguntar!`;
    case "carteira":
      return await handleCarteira(chatId, user);
    case "rebalance":
      return await handleRebalance(chatId, user);
    case "cenario":
      return await handleCenario(chatId, user);
    case "ajuda":
      return await handleAjuda(chatId, null);
    case "transacoes":
      return await handleTransacoes(chatId, user);
    case "fundos":
      return await handleFundos(chatId, user);
    case "precos":
      return await handlePrecos(chatId, user);
    case "perfil":
      return await handlePerfil(chatId, user);
    case "aportar":
      return await handleAportar(chatId, user);
    default:
      return await handleCarteira(chatId, user);
  }
}

// ─── Main Loop ───────────────────────────────────────────────────────────────

async function main() {
  console.log(`[Paridade Risco Bot] Starting...`);
  console.log(`  API: ${API_URL}`);
  console.log(`  Poll interval: ${POLL_INTERVAL}ms`);

  // Verify token
  const me = await (await fetch(`${TG_API}/getMe`)).json();
  if (!me.ok) {
    console.error("Invalid bot token:", me);
    process.exit(1);
  }
  console.log(`  Bot: @${me.result.username}`);

  console.log(`[Paridade Risco Bot] Listening...`);

  while (true) {
    try {
      const updates = await tgGetUpdates();

      for (const update of updates) {
        const msg = update.message;
        if (!msg || !msg.text) continue;

        const chatId = msg.chat.id;
        const text = msg.text;

        console.log(`[${chatId}] ${msg.from?.first_name || "?"}: ${text.slice(0, 80)}`);

        // Send typing action first
        try {
          await fetch(`${TG_API}/sendChatAction?chat_id=${chatId}&action=typing`);
        } catch { /* ignore */ }

        const reply = await handleMessage(chatId, text);
        await tgSendMessage(chatId, reply);
      }
    } catch (e) {
      console.error("Poll error:", e.message);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
# AGENTS.md - Synkra AIOX Constitution & Brain

> **Documento Mandatório de Governança Agentiva**  
> Este arquivo é a constituição central e o repositório de contexto do projeto **Paridade Risco**. Ele instrui qualquer assistente LLM e agente de IA sobre a arquitetura do sistema, modelos de dados, pilhas tecnológicas, decisões de negócio, parâmetros de ambiente e proibições categóricas. Nenhuma alteração de código pode violar as regras aqui estabelecidas.

---

<!-- AIOX-MANAGED-START: core -->
## 1. Regras Centrais de Governança (Core Rules)

1. **Siga a Constitution**: Respeite os princípios em `.aiox-core/constitution.md`.
2. **Hierarquia Inegociável**: `CLI First -> Observability Second -> UI Third`. Toda funcionalidade deve ser executável e testável via CLI/MCP antes de qualquer interface gráfica.
3. **Desenvolvimento Orientado a Stories**: Todo trabalho deve estar vinculado a uma story em `docs/stories/` com critérios de aceitação claros.
4. **Sem Invenções (No Invention Rule)**: A IA não deve supor requisitos, endpoints, tabelas ou fluxos fora dos artefatos documentados.
5. **Quality Gates Obrigatórios**: Todo código produzido deve passar nos linters, verificadores de tipo e suítes de teste antes da conclusão.
<!-- AIOX-MANAGED-END: core -->

---

## 2. Visão do Produto e Decisões Chave de Negócio

### 2.1. Propósito do Produto
**Paridade Risco** é uma ferramenta de apoio à decisão financeira focada no **investidor individual** que administra sua própria carteira (sem modelo multi-inquilino de assessoria para terceiros). Seu objetivo central é permitir que o usuário consulte a carteira consolidada e responda em segundos:
1. *A carteira precisa de rebalanceamento?*
2. *Se sim, quais ativos comprar ou vender?*
3. *Qual valor ou quantidade movimentar para retornar à paridade/alvo?*

### 2.2. Princípios de Decisão de Negócio
- **Decisão antes de exploração**: Cada tela, comando CLI ou ferramenta MCP prioriza a próxima ação financeira necessária.
- **Menos opções, mais clareza**: Redução de caminhos concorrentes e ruído operacional.
- **Rastreabilidade de Saldo e Caixa**: O caixa disponível, ativos sob custódia e fundos de investimento convergem para a fórmula de alocação da cesta ativa (`selected_basket_id`).
- **Idempotência Operacional**: Toda operação que muta posições, sincroniza conexões ou executa ordens deve garantir chave de idempotência (`idempotency_records`).
- **Dualidade de Origem (Manual vs Open Finance)**: O usuário pode gerenciar transações manuais ou conectar suas contas bancárias e corretoras via Open Finance (Pluggy), com mapeamento manual e aprovação explícita de ativos (`portfolio_source_preferences`).

---

## 3. Pilha Tecnológica (Tech Stack)

| Camada | Tecnologia | Detalhes |
|---|---|---|
| **Arquitetura** | Monorepo npm workspaces | `apps/*`, `packages/*` |
| **Backend & Web API** | Next.js 15+ (App Router, Node.js runtime) | Route Handlers, Server Components, TypeScript |
| **Banco de Dados & ORM** | PostgreSQL 16+ & Drizzle ORM | Migrações declarativas via `drizzle-kit` (`apps/api/drizzle/`) |
| **Autenticação & Sessões** | Better Auth | Sessões com cookies, tokens e suporte a API Keys (`apikey`) |
| **Integrações de Mercado** | Profit / WebSockets & REST | Ingestão e cache de cotações em tempo real (`live_quotes`) |
| **Open Finance** | Pluggy API & Webhooks | Sincronização de contas, investimentos, empréstimos e extratos |
| **Agent / MCP Layer** | Model Context Protocol SDK (`@modelcontextprotocol/sdk`) | `apps/remote-mcp` (SSE/HTTP) e `packages/local-mcp` (Stdio) |
| **CLI & Automação** | Node.js, Commander.js | `packages/cli` (`paridade` CLI client) |
| **Notificações** | Telegram Bot (`telegraf`) | `packages/telegram-bot` conectado a contas via `telegramChatId` |
| **Contratos & Schemas** | Zod + TypeScript | Validação runtime compartilhada em `packages/shared` |
| **Qualidade & Testes** | Playwright (E2E), Node Test Runner / Vitest, ESLint | Testes responsivos, smoke, gates de regressão e validação estrutural |

---

## 4. Arquitetura do Sistema e Estrutura de Pastas

```
paridade-risco-mobile/
├── .aiox-core/                 # Framework de governança, personas de agentes e scripts AIOX
├── apps/
│   ├── api/                    # Backend Next.js 15, Drizzle schema, rotas REST e Webhooks
│   └── remote-mcp/             # Servidor MCP remoto para agentes de IA interagirem com o core
├── packages/
│   ├── cli/                    # CLI operacional (CLI First) para consulta e gestão da carteira
│   ├── local-mcp/              # Servidor MCP local (Stdio) para agentes locais
│   ├── shared/                 # Schemas Zod, contratos, cálculos de rebalanceamento e formatadores
│   └── telegram-bot/           # Bot de alertas e interações via Telegram
├── docs/                       # Documentação técnica, épicos e stories ativas
│   ├── epics/                  # Documentos de Épicos
│   └── stories/                # Histórias de desenvolvimento rastreáveis
├── scripts/                    # Scripts de validação e manutenção do monorepo
├── tests/                      # Suítes de testes ponta a ponta (E2E Playwright)
├── AGENTS.md                   # Este arquivo - Constituição e Contexto da IA
├── DESIGN.md                   # Design System e regras visuais restritivas
└── PRODUCT.md                  # Visão e princípios de produto
```

---

## 5. Modelo de Dados e Esquema do Banco (PostgreSQL / Drizzle)

O banco de dados é modelado com Drizzle ORM em `apps/api/src/db/schema.ts`.

### 5.1. Enums do Sistema
- `asset_type`: `ETF`, `RENDA_FIXA`, `CRYPTO`, `COMMODITY`, `CAIXA`, `OUTRO`
- `asset_calculation_type`: `PRECO` (calculado por cotação de mercado), `PERCENTUAL` (calculado por taxa/alvo fixo)
- `transaction_type`: `COMPRA`, `VENDA`
- `basket_status`: `ATIVA`, `RASCUNHO`
- `user_role`: `ADMIN`, `USER`

### 5.2. Entidades Principais e Relacionamentos
1. **`users`**: Entidade central de usuário.
   - Campos: `id`, `name`, `email`, `telegramChatId`, `selectedBasketId`, `role`, `isActive`, `createdAt`, `updatedAt`.
2. **`sessions` & `accounts` & `verifications`**: Gestão de autenticação via Better Auth.
3. **`apikey`**: Chaves de API para integrações seguras (CLI e agentes), com suporte a rate-limiting e expiração.
4. **`assets`**: Catálogo de ativos de investimento (`ticker`, `sourceTicker`, `type`, `calculationType`, `isActive`).
5. **`historical_prices`**: Cotações de fechamento diário por ativo (`assetId`, `priceDate`, `price`).
6. **`live_quotes`**: Cotações intradiárias em tempo real (`assetId`, `source`, `last`, `open`, `high`, `low`, `rawData`, `receivedAt`).
7. **`portfolios`**: Posição consolidada de saldo de caixa (`userId`, `cashBalance`).
8. **`transactions`**: Histórico transacional manual ou importado (`userId`, `assetId`, `type`, `shares`, `pricePerShare`, `tradedAt`).
9. **`baskets` & `basket_allocations`**: Metas de alocação de risco.
   - `baskets`: `userId`, `name`, `description`, `status` (`ATIVA` ou `RASCUNHO`).
   - `basket_allocations`: Chave composta (`basketId`, `assetId`), com `targetPercentage` (soma das fatias deve totalizar 100%).
10. **`investment_funds`**: Posições em fundos com indexadores associados (`userId`, `initialInvestment`, `currentValue`, `indexAssetId`).
11. **`idempotency_records`**: Prevenção de duplicidade em mutações (`userId`, `operation`, `key`, `requestHash`, `responseBody`, `responseStatus`).
12. **`portfolio_source_preferences`**: Configuração de custódia do usuário (`sourceMode`: `MANUAL` ou `PLUGGY`).
13. **Módulo Pluggy (Open Finance)**:
    - `pluggy_connections`: Itens conectados, status de consentimento e última sincronização.
    - `pluggy_accounts`: Contas correntes, limites de crédito e saldos.
    - `pluggy_investments`: Posições brutas recebidas das instituições financeiras.
    - `pluggy_investment_mappings`: Mapeamento e reconciliação entre um `pluggyInvestmentId` e um `assetId` interno do sistema.
    - `pluggy_transactions`: Extrato transacional bancário/cartões.
    - `pluggy_loans`: Empréstimos e financiamentos.
    - `pluggy_sync_runs`: Auditoria de execuções de sincronização.
    - `pluggy_webhook_events`: Fila de eventos assíncronos recebidos da Pluggy.
    - `user_pluggy_credentials`: Credenciais dedicadas do usuário quando aplicável.

---

## 6. Parâmetros e Variáveis de Ambiente

As variáveis devem ser configuradas nos arquivos `.env` das aplicações e no runtime:

```env
# --- Banco de Dados ---
DATABASE_URL="postgresql://paridade:paridade@localhost:5432/paridade"
LEGACY_DATABASE_URL="postgresql://user:pass@host:5432/legacy_db" # Usado apenas em migrações legadas

# --- Autenticação (Better Auth) ---
BETTER_AUTH_SECRET="chave-secreta-minimo-32-caracteres"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# --- Open Finance (Pluggy) ---
PLUGGY_CLIENT_ID="seu-pluggy-client-id"
PLUGGY_CLIENT_SECRET="seu-pluggy-client-secret"
PLUGGY_WEBHOOK_URL="https://seu-dominio.com/api/integrations/pluggy/webhooks"

# --- Cotações & Provedores de Mercado ---
PROFIT_WS_URL="wss://..."
PROFIT_API_KEY="..."

# --- Notificações & Bot ---
TELEGRAM_BOT_TOKEN="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"

# --- Serviços MCP & CLI ---
MCP_PORT=3001
API_BASE_URL="http://localhost:3000"
```

---

## 7. Proibições Categóricas e Restrições Mandatórias (Strict Guardrails)

Para preservar a integridade arquitetural, a IA **NUNCA DEVE**:

1. ❌ **Violação de Design & Identidade**:
   - **Proibido** usar o **Verde** como cor decorativa (`The Green Means Decision Rule`). Verde é reservado estritamente para ação primária de rebalanceamento, seleção ativa ou resultado positivo.
   - **Proibido** adicionar elementos gráficos de gamificação, confetes, banners de marketing, temas coloridos de fintechs infantis ou layouts sobrecarregados estilo terminal Bloomberg.
   - **Proibido** indicar ganho/perda exclusivamente por cor. Sempre inclua rótulo textual legível e acessível (`WCAG AA`).
2. ❌ **Invenção e Desvio de Requisitos**:
   - **Proibido** criar endpoints REST, mutations ou tabelas que não estejam referenciados em uma história em `docs/stories/`.
   - **Proibido** alterar fórmulas de balanceamento e paridade de risco sem teste unitário correspondente em `packages/shared/test/`.
3. ❌ **Bypass de Qualidade & Banco de Dados**:
   - **Proibido** alterar o schema do banco (`apps/api/src/db/schema.ts`) sem gerar a respectiva migração em `apps/api/drizzle/` via `npm run db:generate`.
   - **Proibido** submeter código com erros de lint (`npm run lint`), falhas de tipagem (`npm run typecheck`) ou quebras de testes (`npm test`).
4. ❌ **Violação de Autoridade e Governança**:
   - Agentes de desenvolvimento (`@dev`) não realizam `git push` direto para o repositório remoto ou criação de tags (autoridade exclusiva de `@devops`).
   - A inteligência de negócio deve residir no core e nos contratos compartilhados (`packages/shared`), nunca duplicada de forma descoordenada na interface web.

---

<!-- AIOX-MANAGED-START: quality -->
## 8. Comandos e Quality Gates

Execute os comandos padronizados na raiz do monorepo:

```bash
# Validações de Qualidade
npm run lint                  # Executa verificação de ESLint em todos os pacotes
npm run typecheck             # Executa checagem de tipos TypeScript
npm test                      # Executa a suíte de testes unitários e de integração

# Banco de Dados
npm run db:generate           # Gera arquivos SQL de migração com base no schema
npm run db:migrate            # Aplica as migrações no PostgreSQL
npm run db:studio             # Abre o Drizzle Studio para inspeção

# Execução em Desenvolvimento
npm run dev:api               # Inicia o servidor Next.js API/Web
npm run dev:cli               # Executa o CLI local
npm run dev:remote-mcp        # Inicia o servidor MCP remoto

# Testes E2E (Playwright)
npm run e2e:smoke             # Executa smoke tests rápidos
npm run e2e:critical          # Executa testes de fluxos críticos
npm run e2e:responsive        # Valida comportamento em resoluções mobile

# Governança e Sincronização AIOX
npm run sync:ide              # Sincroniza configurações para IDEs suportadas
npm run sync:ide:check        # Valida integridade das configurações
npm run validate:structure    # Valida estrutura de caminhos do monorepo
npm run validate:agents       # Valida definições de agentes
```
<!-- AIOX-MANAGED-END: quality -->

---

<!-- AIOX-MANAGED-START: shortcuts -->
## 9. Atalhos de Agentes e Personas (Agent Shortcuts)

Para interagir com personas especializadas do framework Synkra AIOX, use `/skills` ou os atalhos abaixo:

- `@architect`, `/architect` -> `.aiox-core/development/agents/architect.md` (Arquitetura e decisões estruturais)
- `@dev`, `/dev` -> `.aiox-core/development/agents/dev.md` (Implementação de stories e testes)
- `@qa`, `/qa` -> `.aiox-core/development/agents/qa.md` (Quality assurance, planos de teste e gates)
- `@pm`, `/pm` -> `.aiox-core/development/agents/pm.md` (Gestão de produto e roadmap)
- `@po`, `/po` -> `.aiox-core/development/agents/po.md` (Requisitos, critérios de aceitação e backlog)
- `@sm`, `/sm` -> `.aiox-core/development/agents/sm.md` (Scrum Master e facilitação de histórias)
- `@analyst`, `/analyst` -> `.aiox-core/development/agents/analyst.md` (Análise de negócio e pesquisa)
- `@devops`, `/devops` -> `.aiox-core/development/agents/devops.md` (CI/CD, releases, infraestrutura e push)
- `@data-engineer`, `/data-engineer` -> `.aiox-core/development/agents/data-engineer.md` (Modelagem de dados e ETL)
- `@ux-design-expert`, `/ux-design-expert` -> `.aiox-core/development/agents/ux-design-expert.md` (Design system e UX mobile)
- `@squad-creator`, `/squad-creator` -> `.aiox-core/development/agents/squad-creator.md` (Criação de novos squads)
- `@aiox-master`, `/aiox-master` -> `.aiox-core/development/agents/aiox-master.md` (Orquestração geral)
<!-- AIOX-MANAGED-END: shortcuts -->

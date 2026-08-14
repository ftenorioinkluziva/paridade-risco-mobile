# Contratos de leitura Pluggy no MCP

## Objetivo

Expor no MCP as informações Pluggy já normalizadas pela API, permitindo que um agente responda perguntas financeiras com dados atuais, frescor e alertas explicáveis sem ler o banco diretamente.

## Ferramentas

| Ferramenta | Fonte | Uso principal |
|---|---|---|
| `pluggy_financial_overview` | `/api/integrations/pluggy/financial-overview` | Caixa, cartões, fluxo, obrigações e liquidez |
| `pluggy_financial_health` | `/api/integrations/pluggy/financial-health` | Saúde financeira, dívida, empréstimos e alertas |
| `pluggy_investment_projection` | `/api/integrations/pluggy/projection` | Investimentos observados, mapeamentos, classificações e frescor |
| `pluggy_rebalance_preview` | `/api/integrations/pluggy/rebalance/preview` | Aderência à cesta, cobertura, liquidez e ações sugeridas |
| `pluggy_migration_readiness` | `/api/integrations/pluggy/migration-readiness` | Bloqueios e próxima ação para a fonte Pluggy |

As duas ferramentas com período aceitam `days` entre 1 e 365; quando omitido, a API utiliza 90 dias.

## Segurança e limites

- Todas as ferramentas são somente leitura.
- A autenticação continua sendo feita com `Authorization: Bearer <session token>`.
- O MCP recebe dados da API normalizada, nunca credenciais Pluggy nem o payload bruto do provedor.
- Mapeamentos, classificação `FORA_DA_ESTRATEGIA`, aprovação de migração e sincronizações continuam fora deste primeiro lote e exigirão operações de escrita com confirmação explícita.

## Fonte canônica

Os contratos ficam em `packages/shared/src/contracts.mjs`. O MCP local, o MCP remoto e os adaptadores que usam o catálogo compartilham as mesmas definições e a mesma validação de resposta.

## Validação

- Os contratos rejeitam entradas fora dos limites e respostas incompatíveis.
- Os cinco endpoints foram chamados autenticados contra o Docker local usando o cliente compartilhado do MCP.

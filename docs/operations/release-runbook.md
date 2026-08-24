# Runbook de release, smoke e rollback — Paridade Risco

Este runbook é o procedimento operacional da promoção controlada do `master`. Ele não contém credenciais, cookies ou dados pessoais. O responsável pelo release é o `@devops`; o `@qa` aprova as evidências antes do merge.

## 1. Pré-condições e critérios de abortar

Antes de abrir o PR:

1. Confirmar que a story está `Ready for Review` ou `Done`, a branch parte do `origin/master` atualizado e não há mudanças não relacionadas no commit.
2. Executar `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build:api`.
3. Executar `npm run e2e:gate`; o runner usa Compose efêmero, mock Pluggy e limpeza idempotente.
4. Abortar se qualquer gate falhar, houver migração não revisada, healthcheck não responder ou logs exibirem segredos.

O merge só ocorre com os checks obrigatórios do PR verdes. O workflow de deploy também executa os gates de qualidade antes de construir ou promover a imagem.

## 2. Promoção controlada

1. Criar branch `codex/<epic>-<story>`, implementar e registrar a File List na story.
2. Abrir PR contra `master` com resumo, riscos, migrações, evidências e plano de rollback.
3. Aguardar `Chromium smoke + critical flows`, CodeRabbit e os gates de qualidade.
4. Fazer merge pelo PR. O push em `master` inicia `.github/workflows/deploy-api.yml`.
5. O deploy faz `git pull --ff-only`, constrói API/bot, sobe Compose, executa migrações, verifica API/bot e publica o remote MCP. Não usar `--force`, `reset --hard` ou alteração destrutiva de volume.

## 3. Smoke pós-deploy

Registrar data, SHA, IDs dos workflows e resultado, sem copiar headers ou payloads:

| Verificação | Evidência esperada | Abortamento |
|---|---|---|
| Health | `GET /api/health` retorna `200` e `ok=true` | qualquer erro ou resposta não-JSON |
| Autenticação | login autenticado e sessão válida no E2E | cookie/token exposto ou login quebrado |
| Resumo/cesta | resumo, cesta ativa e perfil carregam | erro 5xx ou cesta inconsistente |
| Cotações | ativos retornam os 9 tickers canônicos | ticker fora da lista ou preço indisponível sem aviso |
| Scheduler | logs mostram `*/7 10-16`, captura `30 17`, timezone `America/Sao_Paulo`, `planned22=12474`, `planned25=14175`, `margin25=825` | cadência diferente, retries não contabilizados ou margem negativa |
| Pluggy | conexão, projeção/saúde e frescor carregam; webhook/fallback aparecem nos logs | estado stale sem aviso, duplicação ou segredo em log |
| CRUD manual | POST/PUT/DELETE de transação retornam `410` e `MANUAL_TRANSACTIONS_DISABLED`; GET técnico continua disponível | qualquer mutação aceita |
| Serviços | `docker compose ps` sem restart loop; API, scheduler, worker, bot e MCP saudáveis | serviço reiniciando ou healthcheck falho |

Para o smoke determinístico, executar `npm run e2e:gate`. Para inspeção local, usar `docker compose ps`, `docker compose logs --since=10m price-scheduler pluggy-scheduler pluggy-webhook-worker api` e remover/ocultar qualquer valor sensível antes de anexar a evidência.

## 4. Quota e capacidade

O orçamento mensal de cotações é 15.000 chamadas. A configuração aprovada usa 9 ETFs, intervalo de 7 minutos e uma captura final diária:

- 12.474 chamadas estimadas em 22 pregões;
- 14.175 chamadas estimadas em 25 pregões;
- margem máxima planejada: 825 chamadas, antes de retries.

O log do `price-scheduler` deve ser conferido a cada release. Para até 20 conexões Pluggy, confirmar que o fallback mantém skip por item fresco, coalescência/lock e contadores de `planned`, `executed`, `skipped`, `succeeded` e `failed`. Quota próxima, sync duplicado ou crescimento de stale exige abortar a promoção e abrir incidente.

## 5. Janela de observação e incidente

Manter observação por pelo menos 15 minutos após o healthcheck e uma janela completa de fallback/webhook quando houver alteração Pluggy. Comunicar SHA, workflow, sintoma, horário, impacto e ação tomada. Não anexar `.env`, cookies, tokens, payloads de webhook ou dados financeiros identificáveis.

## 6. Rollback seguro

1. Identificar o SHA anterior aprovado no PR/deploy imediatamente anterior.
2. Se o problema for aplicação, abrir PR de revert do commit de release e repetir os gates; não fazer force-push.
3. Após o merge do revert, aguardar o deploy do SHA anterior e repetir health, autenticação, resumo, cotações, Pluggy e logs.
4. Se a falha envolver migração, interromper novas escritas, preservar o banco e executar o procedimento de restauração aprovado pelo operador de banco em ambiente controlado. Não executar `drizzle-kit drop`, `docker compose down -v` ou restauração destrutiva em produção.
5. Validar que scheduler, worker, bot e remote MCP voltaram ao mesmo SHA/configuração compatível. O rollback nunca reativa CRUD manual, sessões legadas ou credenciais em URL.

### Dry-run obrigatório

O ensaio de rollback usa uma branch temporária ou ambiente isolado: simular health falho, migração falha e cron incorreto; confirmar que o pipeline interrompe a promoção, preserva logs sanitizados e permite retornar ao SHA anterior. O ambiente E2E deve ser destruído apenas após a coleta de evidência sanitizada.

## 7. Evidência mínima do release

- SHA promovido e SHA anterior;
- URL do PR e IDs dos workflows de PR, E2E e deploy;
- saída sanitizada de health, `docker compose ps` e logs dos schedulers;
- resultado do `npm run e2e:gate`;
- confirmação de 9 ETFs, orçamento, frescor Pluggy e CRUD manual bloqueado;
- resultado do dry-run de rollback e eventual decisão de abortar/promover.

# Migração de autenticação do MCP remoto

## Contrato canônico

Use `POST /mcp` com o token de sessão no header `Authorization: Bearer <token>`. Tokens ausentes, inválidos ou expirados retornam `401` com erro canônico. Headers `x-user-id` nunca definem a identidade.

## Retirada e compatibilidade

A rota legada com credencial no path foi removida e não possui flag de reativação. Requisições nesse formato recebem `404`; nenhum modo de compatibilidade pode transportar segredo no path.

O logger registra `/mcp`, `/` ou `[redacted-path]`; nunca registra o header de autorização nem o caminho legado. A rota legada deve ser removida após o sunset, depois de confirmar que não há uso por métricas agregadas sem credenciais.

## Implantação e rollback

1. Implantar `/mcp` e migrar consumidores para Bearer.
2. Monitorar respostas da rota redigida e erros `401`, sem capturar credenciais.
3. Se um consumidor crítico falhar, fazer rollback do deployment para a versão operacional aprovada ou desativar o novo endpoint no ingress; nunca reativar uma rota com token no path.
4. Manter Bearer no endpoint sem segredo na URL em qualquer configuração de rollback.
5. Confirmar por teste e scan que código, configuração e documentação operacional não oferecem a rota legada.

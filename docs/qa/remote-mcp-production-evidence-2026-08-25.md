# Remote MCP — evidência de produção

**Data:** 2026-08-25
**Deploy:** `898fed4`
**Workflow:** [Deploy API 32847801089](https://github.com/ftenorioinkluziva/paridade-risco-mobile/actions/runs/32847801089)
**Endpoint:** `https://paridaderisco.blackboxinovacao.com.br/mcp`

## Resultado

- Proxy Host encontrado: id `2`, domínio `paridaderisco.blackboxinovacao.com.br`.
- Encaminhamento principal preservado para `http://paridade-risco-api:3000`.
- Custom Location `/mcp` criada para `http://paridade-risco-remote-mcp:3000`, sem rewrite de path.
- WebSocket/SSE habilitados pelo template do Nginx Proxy Manager, com buffering desativado e timeout prolongado.
- `POST /mcp` sem autenticação: `401` JSON `UNAUTHORIZED`.
- `POST /mcp` com Bearer inválido: `401` JSON `UNAUTHORIZED`.
- `POST /mcp` com token MCP temporário: `200` JSON-RPC válido; a chave foi revogada no mesmo processo.
- Health interno do Remote MCP: `200` e serviço `paridade-risco-remote-mcp`.
- Containers API, banco, schedulers, worker, bot e Remote MCP: `Up`/healthy.
- Smoke público independente: `GET /` retornou `200` e `POST /mcp` sem Bearer retornou `401`.

Nenhum token, credencial, cookie ou payload financeiro foi persistido na evidência.

## Operação futura

- O endpoint canônico é `POST /mcp` com `Authorization: Bearer <token>`; token não deve ser colocado na URL.
- O script de configuração do NPM não usa credenciais padrão nem executa limpeza destrutiva do Docker.
- O monitor público `Remote MCP Monitor` valida `/api/health` e a resposta `401` canônica do `/mcp` a cada 15 minutos.
- A renovação do certificado `npm-17` permanece uma atividade separada; não afeta este domínio.

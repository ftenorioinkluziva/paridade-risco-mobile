# Autenticação da CLI por chave de API

A CLI usa uma chave revogável com os escopos mínimos `read` e `sync`. Ela não recebe email ou senha e não chama `/api/auth/login`.

## Emitir e configurar

1. Entre na aplicação web e abra **Perfil → MCP_TOKEN**.
2. Gere uma chave com os escopos `read` e `sync`. O valor completo é mostrado uma única vez.
3. Configure sem colocar o segredo na linha de comando:

```powershell
$env:PARIDADE_API_KEY = Read-Host "Chave de API" -MaskInput
npx pr auth configure
Remove-Item Env:PARIDADE_API_KEY
```

Em Linux/macOS, prefira um prompt oculto ou um secret manager e exporte `PARIDADE_API_KEY` apenas para a execução. A CLI também aceita a chave por `stdin`. Nunca use a chave como argumento.

O arquivo fica em `~/.config/paridade-risco/config.json` com permissão `0600`. `pr config show` e `pr auth status` exibem apenas ID, validade e escopos, nunca o segredo.

## Verificar, rotacionar e revogar

```text
pr auth status
pr auth clear
```

Para rotacionar, gere uma nova chave no Perfil, execute novamente `pr auth configure`, valide com `pr auth status` e revogue a anterior. Se uma chave já validada desaparecer antes da expiração, a CLI informa `API_KEY_REVOKED`; chaves expiradas, inválidas, ausentes ou sem escopo possuem códigos distintos.

## Janela de compatibilidade e rollback

Durante a observação, sessões antigas continuam aceitas por padrão e geram apenas telemetria sanitizada com `event`, `consumer` e `outcome`.

- Desativar somente para CLI no servidor: `LEGACY_SESSION_AUTH_CLI_ENABLED=false`.
- Desativar para todos os consumidores: `LEGACY_SESSION_AUTH_ENABLED=false`.
- Desativar a leitura local de sessão pela CLI: `PARIDADE_CLI_LEGACY_SESSION_ENABLED=false`.
- Rollback: restaurar a flag correspondente para `true` e recriar o container da API.

A remoção definitiva do fallback compartilhado depende da Story 5.5 e de uma janela sem uso legado.

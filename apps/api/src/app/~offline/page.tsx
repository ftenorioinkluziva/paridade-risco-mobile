export default function OfflinePage() {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Sem conexão — Paridade de Risco</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: #16171B;
            color: #FFFFFF;
            font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
          }
          .card {
            background: #1E2026;
            border: 1px solid #2A2B30;
            border-radius: 8px;
            padding: 32px;
            text-align: center;
            max-width: 400px;
            width: 100%;
          }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
          p { color: #A1A1AA; font-size: 14px; line-height: 1.5; }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="icon">📡</div>
          <h1>Sem conexão</h1>
          <p>Você está offline. Conecte-se à internet e tente novamente.</p>
        </div>
      </body>
    </html>
  );
}
"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { ContentState, ResponsiveGrid, ResponsiveTable } from "@/components/ResponsivePrimitives";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";

const longTicker = "CONTEUDO_FINANCEIRO_EXTENSO_SEM_ESPACOS_QUE_NAO_DEVE_ROMPER_O_VIEWPORT";

export default function UiLabPage() {
  return (
    <AuthGuard>
      <Screen
        width="wide"
        title="Laboratório de interface"
        subtitle="Fixtures visuais para validar densidade, estados, conteúdo extremo e interação responsiva."
        action={<PrimaryButton label="Ação essencial" onPress={() => undefined} />}
      >
        <ResponsiveGrid columns={4}>
          <article className="responsive-card"><strong>Normal</strong><p>Conteúdo financeiro disponível e pronto para decisão.</p></article>
          <ContentState title="Estado vazio" description="Nenhum item foi encontrado para este recorte." />
          <ContentState tone="loading" title="Carregando" description="Atualizando as informações mais recentes." />
          <ContentState tone="danger" title="Não foi possível carregar" description="Tente novamente sem perder o contexto atual." action={<PrimaryButton label="Tentar novamente" tone="neutral" onPress={() => undefined} />} />
        </ResponsiveGrid>

        <section className="responsive-card">
          <strong>Conteúdo longo</strong>
          <p>{longTicker}</p>
          <p>Texto contínuo para confirmar que cards, listas e descrições permanecem legíveis sem criar overflow horizontal.</p>
        </section>

        <ResponsiveTable label="Exemplo de tabela financeira responsiva">
          <thead><tr><th>Ativo</th><th>Posição</th><th>Alocação</th><th>Decisão</th></tr></thead>
          <tbody>
            <tr><td>IVVB11</td><td>R$ 12.345,67</td><td>25,00%</td><td>Manter</td></tr>
            <tr><td>GOLD11</td><td>R$ 8.765,43</td><td>17,50%</td><td>Comprar gradualmente</td></tr>
          </tbody>
        </ResponsiveTable>
      </Screen>
    </AuthGuard>
  );
}

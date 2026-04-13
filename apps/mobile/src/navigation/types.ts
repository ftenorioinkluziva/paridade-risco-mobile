export type RootTabParamList = {
  Resumo: undefined;
  Fundos: undefined;
  Transacoes: undefined;
  Cestas: undefined;
  Perfil: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
  NovaTransacao: undefined;
  Rebalanceamento: undefined;
  DetalheCesta: { basketId: string };
};

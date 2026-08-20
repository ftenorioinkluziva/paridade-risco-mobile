-- Deactivate legacy test assets, keeping active only strategy assets from /cotacoes
UPDATE assets SET is_active = false WHERE ticker NOT IN (
  'B5P211', 'BOVA11', 'DOLA11', 'FIXA11', 'IB5M11', 'IMAB11', 'IRFM11', 'LFTS11', 'SMAL11', 'SPXI11', 'XFIX11'
);
UPDATE assets SET is_active = true WHERE ticker IN (
  'B5P211', 'BOVA11', 'DOLA11', 'FIXA11', 'IB5M11', 'IMAB11', 'IRFM11', 'LFTS11', 'SMAL11', 'SPXI11', 'XFIX11'
);

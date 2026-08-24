-- Retire ETFs removed from the strategic monitoring scope without deleting history.
UPDATE assets SET is_active = false WHERE ticker IN ('SMAL11', 'SPXI11', 'BOVV11');

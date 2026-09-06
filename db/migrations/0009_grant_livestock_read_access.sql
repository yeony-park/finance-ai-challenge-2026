DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'jeomjeom_rag_ro') THEN
    GRANT SELECT ON cattle_auction_prices, pig_auction_prices, livestock_disease_events
    TO jeomjeom_rag_ro;
  END IF;
END
$$;

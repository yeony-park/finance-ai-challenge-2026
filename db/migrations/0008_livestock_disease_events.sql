CREATE TABLE livestock_disease_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_event_id text NOT NULL,
  disease text NOT NULL,
  species text NOT NULL,
  occurred_on date NOT NULL,
  province text NOT NULL,
  city_county text NOT NULL,
  region text NOT NULL,
  head_count integer,
  head_count_basis text NOT NULL,
  latitude numeric(10,7) NOT NULL,
  longitude numeric(10,7) NOT NULL,
  location_precision text NOT NULL,
  source_url text NOT NULL,
  source_meta jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT livestock_disease_events_natural_key UNIQUE (disease, source_event_id),
  CONSTRAINT livestock_disease_events_disease_check CHECK (disease IN ('ASF','FMD','LSD')),
  CONSTRAINT livestock_disease_events_species_check CHECK (species IN ('cattle','pig','goat')),
  CONSTRAINT livestock_disease_events_head_count_basis_check CHECK (head_count_basis IN ('raised','culled'))
);

CREATE INDEX livestock_disease_events_species_date_idx
  ON livestock_disease_events (species, occurred_on);
CREATE INDEX livestock_disease_events_disease_region_idx
  ON livestock_disease_events (disease, province, occurred_on);

BEGIN;
-- Domain owner: tenant
-- Plane: tenant-plane
-- Lifecycle: create/update linkage
-- Reason: query-critical / constraints / joins
-- Indexes: unique(source_rfq_id)
-- RLS: no new policy needed; trades remain tenant-scoped by tenant_id
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS source_rfq_id UUID;
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conname = 'trades_source_rfq_id_fk'
    AND conrelid = 'public.trades'::regclass
) THEN
ALTER TABLE public.trades
ADD CONSTRAINT trades_source_rfq_id_fk FOREIGN KEY (source_rfq_id) REFERENCES public.rfqs(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conname = 'trades_source_rfq_id_key'
    AND conrelid = 'public.trades'::regclass
) THEN
ALTER TABLE public.trades
ADD CONSTRAINT trades_source_rfq_id_key UNIQUE (source_rfq_id);
END IF;
END $$;
DO $$
DECLARE v_column_count int;
v_fk_count int;
v_unique_count int;
BEGIN
SELECT COUNT(*) INTO v_column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'trades'
  AND column_name = 'source_rfq_id';
IF v_column_count <> 1 THEN RAISE EXCEPTION 'EXC-ENABLER-003 FAIL: trades.source_rfq_id column missing';
END IF;
SELECT COUNT(*) INTO v_fk_count
FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = rc.constraint_name
  AND kcu.constraint_schema = rc.constraint_schema
WHERE kcu.table_schema = 'public'
  AND kcu.table_name = 'trades'
  AND kcu.column_name = 'source_rfq_id';
IF v_fk_count <> 1 THEN RAISE EXCEPTION 'EXC-ENABLER-003 FAIL: trades.source_rfq_id FK missing';
END IF;
SELECT COUNT(*) INTO v_unique_count
FROM pg_constraint
WHERE conname = 'trades_source_rfq_id_key'
  AND conrelid = 'public.trades'::regclass;
IF v_unique_count <> 1 THEN RAISE EXCEPTION 'EXC-ENABLER-003 FAIL: trades.source_rfq_id unique constraint missing';
END IF;
RAISE NOTICE 'EXC-ENABLER-003 PASS: RFQ-to-trade linkage column, FK, and unique constraint created';
END $$;
COMMIT;
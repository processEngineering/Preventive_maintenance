BEGIN;

DO $$
BEGIN
  IF current_database() <> 'mtc_migration_backup' THEN
    RAISE EXCEPTION
      'This cleanup is restricted to the staging database mtc_migration_backup';
  END IF;
END;
$$;

DELETE FROM public.chslr_result AS result
WHERE result.created_at >= TIMESTAMPTZ '2026-10-28 00:00:00+07'
  AND result.created_at < TIMESTAMPTZ '2026-10-29 00:00:00+07';

DELETE FROM public.chslr_result AS result
USING public.chslr_log AS log
WHERE result.log_id = log.id
  AND log.created_at >= TIMESTAMPTZ '2026-10-28 00:00:00+07'
  AND log.created_at < TIMESTAMPTZ '2026-10-29 00:00:00+07';

DELETE FROM public.chslr_log
WHERE created_at >= TIMESTAMPTZ '2026-10-28 00:00:00+07'
  AND created_at < TIMESTAMPTZ '2026-10-29 00:00:00+07';

DELETE FROM public.clhmi_results AS result
WHERE result.created_at >= TIMESTAMPTZ '2026-10-28 00:00:00+07'
  AND result.created_at < TIMESTAMPTZ '2026-10-29 00:00:00+07';

DELETE FROM public.clhmi_results AS result
USING public.clhmi AS form
WHERE result.clhmi_id = form.id
  AND form.created_at >= TIMESTAMPTZ '2026-10-28 00:00:00+07'
  AND form.created_at < TIMESTAMPTZ '2026-10-29 00:00:00+07';

DELETE FROM public.clhmi
WHERE created_at >= TIMESTAMPTZ '2026-10-28 00:00:00+07'
  AND created_at < TIMESTAMPTZ '2026-10-29 00:00:00+07';

DELETE FROM public.clpm_result AS result
USING public.clpm_log AS log
WHERE result.log_id = log.id
  AND log.created_at >= TIMESTAMPTZ '2026-10-28 00:00:00+07'
  AND log.created_at < TIMESTAMPTZ '2026-10-29 00:00:00+07';

DELETE FROM public.clpm_log
WHERE created_at >= TIMESTAMPTZ '2026-10-28 00:00:00+07'
  AND created_at < TIMESTAMPTZ '2026-10-29 00:00:00+07';

DELETE FROM public."Lkmr_result"
WHERE created_at >= TIMESTAMPTZ '2026-10-28 00:00:00+07'
  AND created_at < TIMESTAMPTZ '2026-10-29 00:00:00+07';

DELETE FROM public.kartu_riwayat_items
WHERE created_at >= TIMESTAMPTZ '2026-10-28 00:00:00+07'
  AND created_at < TIMESTAMPTZ '2026-10-29 00:00:00+07';

COMMIT;

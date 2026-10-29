BEGIN;

DO $$
DECLARE
  role_can_login boolean;
  role_is_superuser boolean;
  role_inherits boolean;
BEGIN
  IF current_database() <> 'mtc' THEN
    RAISE EXCEPTION 'This script is restricted to mtc';
  END IF;

  SELECT rolcanlogin, rolsuper, rolinherit
    INTO role_can_login, role_is_superuser, role_inherits
    FROM pg_roles
    WHERE rolname = 'mtc_api_provisioner';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Required provisioner role mtc_api_provisioner does not exist';
  END IF;
  IF NOT role_can_login THEN
    RAISE EXCEPTION 'mtc_api_provisioner must be a LOGIN role';
  END IF;
  IF role_is_superuser THEN
    RAISE EXCEPTION 'mtc_api_provisioner must not be a superuser';
  END IF;
  IF role_inherits THEN
    RAISE EXCEPTION 'mtc_api_provisioner must be created with NOINHERIT';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pg_auth_members
      WHERE member = 'mtc_api_provisioner'::regrole::oid
  ) THEN
    RAISE EXCEPTION 'mtc_api_provisioner must not be a member of another role';
  END IF;
END;
$$;

GRANT CONNECT ON DATABASE mtc TO mtc_api_provisioner;
GRANT USAGE ON SCHEMA public TO mtc_api_provisioner;
GRANT SELECT (id) ON TABLE public.profiles TO mtc_api_provisioner;
GRANT SELECT (profile_id, email_normalized, password_hash)
  ON TABLE public.app_users TO mtc_api_provisioner;
GRANT INSERT (profile_id, email)
  ON TABLE public.app_users TO mtc_api_provisioner;
GRANT SELECT (token_hash, profile_id, consumed_at)
  ON TABLE public.app_setup_tokens TO mtc_api_provisioner;
GRANT INSERT (token_hash, profile_id, expires_at)
  ON TABLE public.app_setup_tokens TO mtc_api_provisioner;
GRANT DELETE ON TABLE public.app_setup_tokens TO mtc_api_provisioner;

COMMIT;
